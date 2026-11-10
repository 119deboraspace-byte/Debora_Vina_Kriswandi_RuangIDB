import { z } from "zod";
import type { SessionUser } from "./auth";
import { withImmediateTransaction, queryAll, queryOne, execute } from "./db";
import { getRoom, getSettings, getBookingDetail } from "./data";
import { newId, newVerificationCode } from "./ids";
import { notify, notifyRole, queueEmail, recordAudit, sectionEmail } from "./notify";
import type { BookingStatus, RoomCondition } from "./rbac";
import { BORROWER_LABEL, borrowerTypeForRole, isApprovedStatus } from "./rbac";
import {
  addDays,
  durationMinutes,
  formatDateId,
  formatTimeRange,
  isSunday,
  monthRoman,
  minutesOf,
  nowIso,
  OPERATING_END,
  OPERATING_START,
  overlaps,
  todayWita,
} from "./time";

export const bookingSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Jam mulai tidak valid."),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Jam selesai tidak valid."),
});

export const bookingFacilitySchema = z.object({
  name: z.string().min(1).max(80),
  section: z.enum(["IT", "OPERASIONAL", "SECURITY", "BAA"]),
  qty: z.coerce.number().int().min(1).max(500),
});

export const bookingSchema = z.object({
  borrowerType: z.enum(["DOSEN", "MAHASISWA", "ORGANISASI"], {
    message: "Pilih atas nama peminjam.",
  }),
  requesterName: z.string().min(2, "Nama peminjam wajib diisi.").max(120),
  requesterContact: z.string().min(6, "Kontak (WhatsApp/email) wajib diisi.").max(120),
  nim: z.string().max(30).optional().nullable(),
  jurusan: z.string().max(120).optional().nullable(),
  organizationId: z.string().max(60).optional().nullable(),
  ketuaName: z.string().max(120).optional().nullable(),
  ketuaNim: z.string().max(30).optional().nullable(),
  sekretarisName: z.string().max(120).optional().nullable(),
  sekretarisNim: z.string().max(30).optional().nullable(),
  activityName: z.string().min(3, "Nama kegiatan wajib diisi.").max(120),
  activityDescription: z.string().min(10, "Deskripsi kegiatan minimal 10 karakter.").max(500),
  activityType: z.string().min(1, "Jenis kegiatan wajib dipilih.").max(40),
  participants: z.coerce.number().int().min(1, "Jumlah peserta wajib diisi.").max(1000),
  roomId: z.string().min(1, "Ruangan wajib dipilih."),
  sessions: z.array(bookingSessionSchema).min(1, "Tambahkan minimal satu sesi jadwal.").max(10),
  facilities: z.array(bookingFacilitySchema).max(40).default([]),
  securityRequested: z.boolean().default(false),
  academicActivity: z.boolean().default(false),
  attachmentId: z.string().max(60).optional().nullable(),
  agreement: z.boolean().default(false),
  asDraft: z.boolean().default(false),
});

export type BookingPayload = z.infer<typeof bookingSchema>;

export interface SlotIssue {
  date: string;
  start: string;
  end: string;
  message: string;
  code?: "CAPACITY" | "CONFLICT" | "LEAD" | "GENERAL";
  suggestions?: Array<{ start: string; end: string }>;
}

export interface SlotCheckResult {
  ok: boolean;
  roomId: string;
  approvalClass: "A" | "B" | "C";
  status: BookingStatus;
  issues: SlotIssue[];
  requiresApproval: boolean;
  requiresKemahasiswaan: boolean;
}

interface OccupyingSessionRow {
  date: string;
  start_time: string;
  end_time: string;
  activity_name: string;
  requester_name: string;
  status: string;
}

function settings() {
  const raw = getSettings();
  return {
    windowDays: Number(raw.window_days ?? 14),
    minLeadA: Number(raw.min_lead_a ?? 1),
    minLeadBC: Number(raw.min_lead_bc ?? 3),
    maxDuration: Number(raw.max_duration_minutes ?? 360),
    operatingStart: raw.operating_start ?? OPERATING_START,
    operatingEnd: raw.operating_end ?? OPERATING_END,
  };
}

function occupyingSessions(roomId: string, date: string): OccupyingSessionRow[] {
  return queryAll<OccupyingSessionRow>(
    `SELECT s.date, s.start_time, s.end_time, b.activity_name, b.requester_name, b.status
     FROM booking_sessions s
     JOIN bookings b ON b.id = s.booking_id
     WHERE s.room_id = ? AND s.date = ?
       AND b.status IN ('PENDING_ADMIN1', 'PENDING_ADMIN2', 'APPROVED')`,
    [roomId, date],
  );
}

function dayBlock(roomId: string, date: string): { condition: RoomCondition | null; blocked: boolean; note: string | null } {
  const override = queryOne<{ condition: RoomCondition | null; situation: string | null; note: string | null }>(
    `SELECT condition, situation, note FROM room_overrides WHERE room_id = ? AND date = ?`,
    [roomId, date],
  );
  const blocks = queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM room_blocks WHERE room_id = ? AND date = ?`,
    [roomId, date],
  );
  return {
    condition: override?.condition ?? null,
    blocked: override?.situation === "DITOLAK" || (blocks?.n ?? 0) > 0,
    note: override?.note ?? null,
  };
}

function freeSuggestions(roomId: string, date: string, start: string, end: string): Array<{ start: string; end: string }> {
  const duration = Math.max(30, durationMinutes(start, end));
  const open = minutesOf(OPERATING_START);
  const close = minutesOf(OPERATING_END);
  const out: Array<{ start: string; end: string }> = [];
  for (let minute = open; minute + duration <= close && out.length < 2; minute += 30) {
    const candidateStart = toTime(minute);
    const candidateEnd = toTime(minute + duration);
    if (isWindowFree(roomId, date, candidateStart, candidateEnd)) {
      out.push({ start: candidateStart, end: candidateEnd });
    }
  }
  return out;
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isWindowFree(roomId: string, date: string, start: string, end: string): boolean {
  const occupied = occupyingSessions(roomId, date).some((row) =>
    overlaps(start, end, row.start_time, row.end_time),
  );
  if (occupied) return false;
  const blocks = queryAll<{ start_time: string; end_time: string }>(
    `SELECT start_time, end_time FROM room_blocks WHERE room_id = ? AND date = ?`,
    [roomId, date],
  );
  return !blocks.some((block) => overlaps(start, end, block.start_time, block.end_time));
}

/**
 * Validasi lengkap sebelum menyimpan. Dipakai oleh endpoint cek-slot (untuk
 * umpan balik langsung di form) dan oleh transaksi simpan.
 */
export function checkSlots(
  payload: BookingPayload,
  user: SessionUser,
  options: { skipAgreement?: boolean } = {},
): SlotCheckResult {
  const room = getRoom(payload.roomId);
  if (!room) {
    return {
      ok: false,
      roomId: payload.roomId,
      approvalClass: "A",
      status: "PENDING_ADMIN1",
      requiresApproval: true,
      requiresKemahasiswaan: false,
      issues: [{ date: "", start: "", end: "", message: "Ruangan tidak ditemukan." }],
    };
  }

  const config = settings();
  const today = todayWita();
  const issues: SlotIssue[] = [];
  const lead = room.approvalClass === "A" ? config.minLeadA : config.minLeadBC;
  const earliest = addDays(today, lead);
  const latest = addDays(today, config.windowDays - 1);
  const isAulaRoom = room.code === "AULA" || room.category.toLowerCase() === "aula";

  // Jenis peminjam dan identitas wajib mengikuti akun yang masuk. Form sudah
  // mengunci pilihan ini; validasi ini menjaga API tetap konsisten bila payload
  // dimanipulasi langsung.
  const expectedBorrower = borrowerTypeForRole(user.role);
  if (expectedBorrower && payload.borrowerType !== expectedBorrower) {
    issues.push({
      date: "",
      start: "",
      end: "",
      message: `Jenis peminjam harus ${BORROWER_LABEL[expectedBorrower]} sesuai akun yang masuk.`,
    });
  }
  if (user.role === "STUDENT" && user.nimNidn && payload.nim !== user.nimNidn) {
    issues.push({
      date: "",
      start: "",
      end: "",
      message: "NIM harus sesuai dengan akun mahasiswa yang masuk.",
    });
  }
  if (user.role === "LECTURER" && user.nimNidn && payload.nim !== user.nimNidn) {
    issues.push({
      date: "",
      start: "",
      end: "",
      message: "Kode dosen harus sesuai dengan akun dosen yang masuk.",
    });
  }
  if (user.role === "LECTURER" && !payload.nim) {
    issues.push({
      date: "",
      start: "",
      end: "",
      message: "Kode dosen belum diatur pada profil. Hubungi admin akademik.",
    });
  }
  if (
    (user.role === "STUDENT" || user.role === "LECTURER") &&
    user.jurusan &&
    payload.jurusan !== user.jurusan
  ) {
    issues.push({
      date: "",
      start: "",
      end: "",
      message: "Jurusan/program studi harus sesuai dengan profil akun.",
    });
  }
  if (user.role === "ORGANIZATION") {
    if (!user.organizationId) {
      issues.push({
        date: "",
        start: "",
        end: "",
        message: "Akun organisasi belum terhubung ke organisasi. Hubungi Kemahasiswaan.",
      });
    } else if (payload.organizationId !== user.organizationId) {
      issues.push({
        date: "",
        start: "",
        end: "",
        message: "Organisasi harus sesuai dengan akun organisasi yang masuk.",
      });
    }
  }

  if (!room.isActive) {
    issues.push({ date: "", start: "", end: "", message: `${room.name} sedang tidak aktif.` });
  }
  if (room.condition === "RUSAK" || room.condition === "DITUTUP") {
    issues.push({
      date: "",
      start: "",
      end: "",
      message: `${room.name} berstatus ${room.condition === "RUSAK" ? "Rusak" : "Ditutup"} dan tidak dapat diajukan.`,
    });
  }
  if (payload.participants > room.capacity) {
    issues.push({
      date: "",
      start: "",
      end: "",
      code: "CAPACITY",
      message: `Jumlah peserta ${payload.participants} melebihi kapasitas ${room.name} (${room.capacity} orang). Pengajuan otomatis ditolak.`,
    });
  }
  if (payload.borrowerType === "MAHASISWA" && (!payload.nim || !payload.jurusan)) {
    issues.push({ date: "", start: "", end: "", message: "NIM dan jurusan wajib diisi untuk mahasiswa." });
  }
  if (payload.borrowerType === "ORGANISASI") {
    if (!payload.organizationId) {
      issues.push({ date: "", start: "", end: "", message: "Pilih organisasi mahasiswa." });
    }
    if (!payload.ketuaName || !payload.sekretarisName) {
      issues.push({
        date: "",
        start: "",
        end: "",
        message: "Nama Ketua dan Sekretaris Panitia wajib diisi.",
      });
    }
    if (payload.organizationId) {
      const org = queryOne<{ status: string; name: string }>(
        `SELECT status, name FROM organizations WHERE id = ?`,
        [payload.organizationId],
      );
      if (!org) {
        issues.push({ date: "", start: "", end: "", message: "Organisasi tidak ditemukan." });
      } else if (org.status !== "VERIFIED") {
        issues.push({
          date: "",
          start: "",
          end: "",
          message: `${org.name} belum diverifikasi Kemahasiswaan. Pengajuan organisasi belum dapat dikirim.`,
        });
      }
    }
  }
  if (payload.borrowerType === "ORGANISASI" && !payload.attachmentId) {
    issues.push({
      date: "",
      start: "",
      end: "",
      message: "Lampiran proposal/rundown wajib untuk pengajuan organisasi.",
    });
  }
  if (!options.skipAgreement && !payload.agreement) {
    issues.push({
      date: "",
      start: "",
      end: "",
      message: "Centang pernyataan tanggung jawab sebelum mengirim.",
    });
  }

  const seen = new Set<string>();
  for (const session of payload.sessions) {
    const label = formatDateId(session.date, "short");
    if (session.date < today) {
      issues.push({ ...session, message: `${label}: tanggal sudah lewat.` });
      continue;
    }
    if (session.date < earliest) {
      issues.push({
        ...session,
        message: `${label}: minimal H-${lead} untuk ${room.approvalClass === "A" ? "Kelas A" : "Kelas B/C"}.`,
      });
    }
    if (session.date > latest) {
      issues.push({
        ...session,
        message: `${label}: di luar jendela ${config.windowDays} hari live table.`,
      });
    }
    if (isAulaRoom && isSunday(session.date)) {
      issues.push({
        ...session,
        message: `${label}: Aula tidak dapat digunakan pada hari Minggu.`,
      });
      continue;
    }
    if (minutesOf(session.start) >= minutesOf(session.end)) {
      issues.push({ ...session, message: `${label}: jam selesai harus setelah jam mulai.` });
      continue;
    }
    if (session.start < config.operatingStart || session.end > config.operatingEnd) {
      issues.push({
        ...session,
        message: `${label}: di luar jam operasional ${formatTimeRange(config.operatingStart, config.operatingEnd)}.`,
      });
    }
    if (durationMinutes(session.start, session.end) > config.maxDuration) {
      issues.push({
        ...session,
        message: `${label}: durasi melebihi ${config.maxDuration / 60} jam per sesi.`,
      });
    }
    const key = `${session.date}|${session.start}|${session.end}`;
    if (seen.has(key)) {
      issues.push({ ...session, message: `${label}: sesi ganda pada jam yang sama.` });
      continue;
    }
    seen.add(key);

    const day = dayBlock(room.id, session.date);
    if (day.condition === "RUSAK" || day.condition === "DITUTUP" || day.blocked) {
      issues.push({
        ...session,
        message: `${label}: ruangan ditolak${day.note ? ` (${day.note})` : ""}.`,
      });
      continue;
    }

    const conflict = occupyingSessions(room.id, session.date).find((row) =>
      overlaps(session.start, session.end, row.start_time, row.end_time),
    );
    if (conflict) {
      issues.push({
        ...session,
        message: `${label}: bentrok dengan "${conflict.activity_name}" (${formatTimeRange(conflict.start_time, conflict.end_time)}).`,
        suggestions: freeSuggestions(room.id, session.date, session.start, session.end),
      });
    }
  }

  return {
    ok: issues.length === 0,
    roomId: room.id,
    approvalClass: room.approvalClass,
    status: "PENDING_ADMIN1",
    requiresApproval: true,
    requiresKemahasiswaan: payload.borrowerType === "ORGANISASI",
    issues,
  };
}

function assignDocumentNumber(): string {
  const today = todayWita();
  const year = Number(today.slice(0, 4));
  const row = queryOne<{ last_number: number }>(`SELECT last_number FROM doc_counters WHERE year = ?`, [
    year,
  ]);
  // Nomor yang sudah terpakai menjadi lantai, supaya data seed/import tidak bentrok.
  const used = queryOne<{ max_no: number | null }>(
    `SELECT MAX(CAST(substr(document_no, 1, 3) AS INTEGER)) AS max_no
     FROM bookings WHERE document_no IS NOT NULL`,
  );
  const next = Math.max(row?.last_number ?? 0, used?.max_no ?? 0) + 1;
  execute(
    `INSERT INTO doc_counters (year, last_number) VALUES (?, ?)
     ON CONFLICT(year) DO UPDATE SET last_number = excluded.last_number`,
    [year, next],
  );
  return `${String(next).padStart(3, "0")}/IM-PR/IDB/${monthRoman(today)}/${year}`;
}

export interface CreateBookingResult {
  ok: boolean;
  error?: string;
  issues?: SlotIssue[];
  bookingId?: string;
  status?: BookingStatus;
}

export function createBooking(
  payload: BookingPayload,
  user: SessionUser,
  options: { skipAgreement?: boolean } = {},
): CreateBookingResult {
  const check = checkSlots(payload, user, options);
  const room = getRoom(payload.roomId);
  if (!room) return { ok: false, error: "Ruangan tidak ditemukan." };

  if (payload.asDraft) {
    const id = withImmediateTransaction(() => {
      const now = nowIso();
      const bookingId = insertBookingRow(payload, user, room.id, "DRAFT", now);
      insertSessionsAndFacilities(bookingId, payload);
      recordAudit({
        actorId: user.id,
        actorName: user.name,
        action: "CREATE_DRAFT",
        entity: "booking",
        entityId: bookingId,
        after: { status: "DRAFT", activity: payload.activityName },
      });
      return bookingId;
    });
    return { ok: true, bookingId: id, status: "DRAFT" };
  }

  if (!check.ok) {
    if (check.issues.some((issue) => issue.code === "CAPACITY")) {
      recordAudit({
        actorId: user.id,
        actorName: user.name,
        action: "AUTO_REJECT_CAPACITY",
        entity: "room",
        entityId: room.id,
        after: {
          activity: payload.activityName,
          participants: payload.participants,
          capacity: room.capacity,
        },
      });
    }
    return {
      ok: false,
      error: check.issues[0]?.message ?? "Pengajuan belum valid.",
      issues: check.issues,
    };
  }

  try {
    const result = withImmediateTransaction(() => {
      // Cek ulang di dalam transaksi: inilah titik atomik BR-01/BR-02.
      const recheck = checkSlots(payload, user, options);
      if (!recheck.ok) {
        throw new BookingError(recheck.issues[0]?.message ?? "Slot sudah terisi.", recheck.issues);
      }

      const now = nowIso();
      const status: BookingStatus = "PENDING_ADMIN1";
      const bookingId = insertBookingRow(payload, user, room.id, status, now);
      insertSessionsAndFacilities(bookingId, payload);

      if (payload.attachmentId) {
        execute(`UPDATE attachments SET booking_id = ? WHERE id = ? AND uploaded_by = ?`, [
          bookingId,
          payload.attachmentId,
          user.id,
        ]);
      }

      notify({
        userId: user.id,
        title: "Pengajuan dikirim",
        body: `${payload.activityName} menunggu approve Bagian Akademik.`,
        href: `/pengajuan/${bookingId}`,
      });
      notifyRole("ADMIN1", {
        title: "Pengajuan baru menunggu",
        body: `${payload.activityName} (${room.code}) oleh ${payload.requesterName}.`,
        href: `/admin/persetujuan?focus=${bookingId}`,
      });

      recordAudit({
        actorId: user.id,
        actorName: user.name,
        action: "CREATE",
        entity: "booking",
        entityId: bookingId,
        after: { status, activity: payload.activityName, room: room.code },
      });

      return { bookingId, status };
    });
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message, issues: error.issues };
    }
    if (error instanceof Error && error.message.includes("CAPACITY_EXCEEDED")) {
      return {
        ok: false,
        error: "Jumlah peserta melebihi kapasitas ruangan. Pengajuan otomatis ditolak.",
      };
    }
    throw error;
  }
}

class BookingError extends Error {
  issues: SlotIssue[];
  constructor(message: string, issues: SlotIssue[] = []) {
    super(message);
    this.issues = issues;
  }
}

function insertBookingRow(
  payload: BookingPayload,
  user: SessionUser,
  roomId: string,
  status: BookingStatus,
  now: string,
  documentNo: string | null = null,
  verificationCode: string | null = null,
): string {
  const bookingId = newId("bk");
  const orgName = payload.organizationId
    ? (queryOne<{ name: string }>(`SELECT name FROM organizations WHERE id = ?`, [
        payload.organizationId,
      ])?.name ?? null)
    : null;

  execute(
    `INSERT INTO bookings (
      id, document_no, verification_code, requester_id, organization_id, borrower_type,
      requester_name, requester_contact, nim, jurusan, org_name, ketua_name, ketua_nim,
      sekretaris_name, sekretaris_nim, activity_name, activity_description, activity_type,
      participants, room_id, status, academic_activity, security_requested, plotting_requested,
      submitted_at, approved_at, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      bookingId,
      documentNo,
      verificationCode,
      user.id,
      payload.organizationId ?? null,
      payload.borrowerType,
      payload.requesterName,
      payload.requesterContact,
      payload.nim ?? null,
      payload.jurusan ?? null,
      orgName,
      payload.ketuaName ?? null,
      payload.ketuaNim ?? null,
      payload.sekretarisName ?? null,
      payload.sekretarisNim ?? null,
      payload.activityName,
      payload.activityDescription,
      payload.activityType,
      payload.participants,
      roomId,
      status,
      payload.borrowerType === "DOSEN" || payload.academicActivity ? 1 : 0,
      payload.securityRequested ? 1 : 0,
      getRoom(roomId)?.needsPlotting ? 1 : 0,
      status === "DRAFT" ? null : now,
      null,
      now,
      now,
    ],
  );
  return bookingId;
}

function insertSessionsAndFacilities(bookingId: string, payload: BookingPayload): void {
  payload.sessions.forEach((session, index) => {
    execute(
      `INSERT INTO booking_sessions (id, booking_id, room_id, date, start_time, end_time)
       VALUES (?,?,?,?,?,?)`,
      [
        `${bookingId}_s${index + 1}`,
        bookingId,
        payload.roomId,
        session.date,
        session.start,
        session.end,
      ],
    );
  });
  payload.facilities.forEach((facility, index) => {
    execute(
      `INSERT INTO booking_facilities (id, booking_id, name, section, qty)
       VALUES (?,?,?,?,?)`,
      [`${bookingId}_f${index + 1}`, bookingId, facility.name, facility.section, facility.qty],
    );
  });
}

export interface DecisionResult {
  ok: boolean;
  error?: string;
  status?: BookingStatus;
}

export function decideBooking(input: {
  bookingId: string;
  actor: SessionUser;
  decision: "APPROVED" | "REJECTED" | "REVISION";
  note?: string;
  roomChecked?: boolean;
}): DecisionResult {
  const booking = getBookingDetail(input.bookingId);
  if (!booking) return { ok: false, error: "Pengajuan tidak ditemukan." };

  const isAdmin1Stage = booking.status === "PENDING_ADMIN1" && input.actor.role === "ADMIN1";
  const isAdmin2Stage = booking.status === "PENDING_ADMIN2" && input.actor.role === "ADMIN2";
  if (!isAdmin1Stage && !isAdmin2Stage) {
    return { ok: false, error: "Anda tidak berwenang memutuskan pengajuan ini pada tahap sekarang." };
  }
  if ((input.decision === "REJECTED" || input.decision === "REVISION") && !input.note?.trim()) {
    return { ok: false, error: "Alasan/catatan wajib diisi untuk penolakan atau permintaan revisi." };
  }
  if (
    input.decision === "APPROVED" &&
    booking.borrowerType === "ORGANISASI" &&
    isAdmin1Stage &&
    !input.roomChecked
  ) {
    return {
      ok: false,
      error: "Centang hasil pengecekan ruangan sebelum menyetujui pengajuan organisasi.",
    };
  }

  const now = nowIso();
  const nextStatus: BookingStatus =
    input.decision === "APPROVED"
      ? isAdmin1Stage && booking.borrowerType === "ORGANISASI"
        ? "PENDING_ADMIN2"
        : "APPROVED"
      : input.decision === "REJECTED"
        ? "REJECTED"
        : "REVISION";

  withImmediateTransaction(() => {
    execute(
      `INSERT INTO approvals (id, booking_id, stage, actor_id, actor_name, decision, note, room_check, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        newId("apr"),
        booking.id,
        isAdmin1Stage ? "ADMIN1" : "ADMIN2",
        input.actor.id,
        input.actor.name,
        input.decision,
        input.note?.trim() ?? null,
        input.roomChecked ? 1 : null,
        now,
      ],
    );

    let documentNo = booking.documentNo;
    let verificationCode = booking.verificationCode;
    if (nextStatus === "APPROVED") {
      if (!documentNo) documentNo = assignDocumentNumber();
      if (!verificationCode) verificationCode = newVerificationCode();
    }

    execute(
      `UPDATE bookings SET status = ?, decision_note = ?, note_from_admin = ?, document_no = ?, verification_code = ?, approved_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        nextStatus,
        input.note?.trim() ?? null,
        input.decision === "REVISION" ? input.note?.trim() ?? null : booking.noteFromAdmin,
        documentNo,
        verificationCode,
        nextStatus === "APPROVED" ? now : booking.approvedAt,
        now,
        booking.id,
      ],
    );

    if (nextStatus === "PENDING_ADMIN2") {
      notifyRole("ADMIN2", {
        title: "Menunggu approve tahap 2",
        body: `${booking.activityName} (${booking.roomCode}) disetujui Bagian Akademik.`,
        href: `/admin/persetujuan?focus=${booking.id}`,
      });
      notify({
        userId: booking.requesterId,
        title: "Disetujui tahap 1",
        body: `${booking.activityName} menunggu approve tahap akhir.`,
        href: `/pengajuan/${booking.id}`,
      });
    } else if (nextStatus === "APPROVED") {
      notify({
        userId: booking.requesterId,
        title: "Pengajuan disetujui",
        body: `${booking.activityName} disetujui. Internal Memo siap diunduh.`,
        href: `/pengajuan/${booking.id}`,
      });
      const sections = new Set(booking.facilities.map((f) => f.section));
      if (booking.securityRequested) sections.add("SECURITY");
      if (booking.roomNeedsPlotting) sections.add("BAA");
      for (const section of sections) {
        const email = sectionEmail(section);
        if (email) {
          queueEmail(
            email,
            `[RuangIDB] ${booking.activityName} — ${booking.roomName}`,
            `Pengajuan disetujui. Mohon siapkan fasilitas ${section} sesuai memo ${documentNo}.`,
          );
        }
      }
    } else {
      notify({
        userId: booking.requesterId,
        title: input.decision === "REJECTED" ? "Pengajuan ditolak" : "Pengajuan perlu revisi",
        body: input.note?.trim() || booking.activityName,
        href: `/pengajuan/${booking.id}`,
      });
    }

    recordAudit({
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: input.decision,
      entity: "booking",
      entityId: booking.id,
      before: { status: booking.status },
      after: {
        status: nextStatus,
        note: input.note ?? null,
        roomChecked: input.roomChecked ?? null,
      },
    });
  });

  return { ok: true, status: nextStatus };
}

/** Ubah draft atau pengajuan yang diminta revisi, lalu kirim ulang. */
export function updateBooking(input: {
  bookingId: string;
  payload: BookingPayload;
  user: SessionUser;
}): CreateBookingResult {
  const existing = getBookingDetail(input.bookingId);
  if (!existing) return { ok: false, error: "Pengajuan tidak ditemukan." };
  if (existing.requesterId !== input.user.id) {
    return { ok: false, error: "Bukan pengajuan Anda." };
  }
  if (existing.status !== "DRAFT" && existing.status !== "REVISION") {
    return { ok: false, error: "Hanya draft atau pengajuan revisi yang dapat diubah." };
  }

  const room = getRoom(input.payload.roomId);
  if (!room) return { ok: false, error: "Ruangan tidak ditemukan." };

  const draft = input.payload.asDraft;
  const check = draft ? null : checkSlots(input.payload, input.user);
  if (check && !check.ok) {
    if (check.issues.some((issue) => issue.code === "CAPACITY")) {
      recordAudit({
        actorId: input.user.id,
        actorName: input.user.name,
        action: "AUTO_REJECT_CAPACITY",
        entity: "room",
        entityId: room.id,
        after: {
          activity: input.payload.activityName,
          participants: input.payload.participants,
          capacity: room.capacity,
        },
      });
    }
    return { ok: false, error: check.issues[0]?.message, issues: check.issues };
  }

  try {
    const status = withImmediateTransaction(() => {
      if (!draft) {
        const recheck = checkSlots(input.payload, input.user);
        if (!recheck.ok) {
          throw new BookingError(recheck.issues[0]?.message ?? "Slot sudah terisi.", recheck.issues);
        }
      }

      const nextStatus: BookingStatus = draft ? "DRAFT" : "PENDING_ADMIN1";
      const now = nowIso();
      const orgName = input.payload.organizationId
        ? (queryOne<{ name: string }>(`SELECT name FROM organizations WHERE id = ?`, [
            input.payload.organizationId,
          ])?.name ?? null)
        : null;

      execute(
        `UPDATE bookings SET
           requester_id = ?, organization_id = ?, borrower_type = ?, requester_name = ?,
           requester_contact = ?, nim = ?, jurusan = ?, org_name = ?, ketua_name = ?,
           ketua_nim = ?, sekretaris_name = ?, sekretaris_nim = ?, activity_name = ?,
           activity_description = ?, activity_type = ?, participants = ?, room_id = ?,
           status = ?, academic_activity = ?, security_requested = ?, plotting_requested = ?,
           document_no = ?, verification_code = ?, decision_note = NULL, note_from_admin = NULL,
           submitted_at = ?, approved_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.user.id,
          input.payload.organizationId ?? null,
          input.payload.borrowerType,
          input.payload.requesterName,
          input.payload.requesterContact,
          input.payload.nim ?? null,
          input.payload.jurusan ?? null,
          orgName,
          input.payload.ketuaName ?? null,
          input.payload.ketuaNim ?? null,
          input.payload.sekretarisName ?? null,
          input.payload.sekretarisNim ?? null,
          input.payload.activityName,
          input.payload.activityDescription,
          input.payload.activityType,
          input.payload.participants,
          room.id,
          nextStatus,
          input.payload.borrowerType === "DOSEN" || input.payload.academicActivity ? 1 : 0,
          input.payload.securityRequested ? 1 : 0,
          room.needsPlotting ? 1 : 0,
          null,
          null,
          draft ? null : now,
          null,
          now,
          input.bookingId,
        ],
      );

      execute(`DELETE FROM booking_sessions WHERE booking_id = ?`, [input.bookingId]);
      execute(`DELETE FROM booking_facilities WHERE booking_id = ?`, [input.bookingId]);
      insertSessionsAndFacilities(input.bookingId, input.payload);

      if (input.payload.attachmentId) {
        execute(`UPDATE attachments SET booking_id = NULL WHERE booking_id = ? AND id <> ?`, [
          input.bookingId,
          input.payload.attachmentId,
        ]);
        execute(`UPDATE attachments SET booking_id = ? WHERE id = ? AND uploaded_by = ?`, [
          input.bookingId,
          input.payload.attachmentId,
          input.user.id,
        ]);
      }

      if (!draft) {
        notifyRole("ADMIN1", {
          title: "Pengajuan dikirim ulang",
          body: `${input.payload.activityName} (${room.code}) menunggu persetujuan.`,
          href: `/admin/persetujuan?focus=${input.bookingId}`,
        });
      }

      recordAudit({
        actorId: input.user.id,
        actorName: input.user.name,
        action: draft ? "UPDATE_DRAFT" : "RESUBMIT",
        entity: "booking",
        entityId: input.bookingId,
        before: { status: existing.status },
        after: { status: nextStatus, activity: input.payload.activityName },
      });

      return nextStatus;
    });

    return { ok: true, bookingId: input.bookingId, status };
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message, issues: error.issues };
    }
    if (error instanceof Error && error.message.includes("CAPACITY_EXCEEDED")) {
      return {
        ok: false,
        error: "Jumlah peserta melebihi kapasitas ruangan. Pengajuan otomatis ditolak.",
      };
    }
    throw error;
  }
}

export function cancelBooking(input: {
  bookingId: string;
  actor: SessionUser;
  reason: string;
}): DecisionResult {
  const booking = getBookingDetail(input.bookingId);
  if (!booking) return { ok: false, error: "Pengajuan tidak ditemukan." };

  const isOwner = booking.requesterId === input.actor.id;
  const isAdmin = input.actor.role === "ADMIN1" || input.actor.role === "ADMIN2";
  if (!isOwner && !isAdmin) return { ok: false, error: "Anda tidak berwenang membatalkan pengajuan ini." };
  if (booking.status === "CANCELLED") return { ok: false, error: "Pengajuan sudah dibatalkan." };
  if (booking.status === "REJECTED") return { ok: false, error: "Pengajuan sudah ditolak." };
  if (isOwner && !isAdmin) {
    if (isApprovedStatus(booking.status)) {
      const firstDate = booking.sessions[0]?.date;
      if (firstDate && firstDate <= todayWita()) {
        return { ok: false, error: "Pembatalan oleh pengaju paling lambat H-1 sebelum kegiatan." };
      }
    }
    if (!input.reason.trim()) return { ok: false, error: "Alasan pembatalan wajib diisi." };
  }

  const now = nowIso();
  withImmediateTransaction(() => {
    execute(
      `UPDATE bookings SET status = 'CANCELLED', cancelled_at = ?, decision_note = ?, updated_at = ? WHERE id = ?`,
      [now, input.reason.trim() || null, now, booking.id],
    );
    execute(
      `INSERT INTO approvals (id, booking_id, stage, actor_id, actor_name, decision, note, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        newId("apr"),
        booking.id,
        isAdmin ? "ADMIN1" : "AUTO",
        input.actor.id,
        input.actor.name,
        "CANCELLED",
        input.reason.trim() || null,
        now,
      ],
    );
    recordAudit({
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: "CANCEL",
      entity: "booking",
      entityId: booking.id,
      before: { status: booking.status },
      after: { status: "CANCELLED", reason: input.reason },
    });
    if (isAdmin) {
      notify({
        userId: booking.requesterId,
        title: "Jadwal dibatalkan admin",
        body: `${booking.activityName}: ${input.reason || "dibatalkan oleh admin"}.`,
        href: `/pengajuan/${booking.id}`,
      });
    } else {
      notifyRole("ADMIN1", {
        title: "Pengajuan dibatalkan",
        body: `${booking.activityName} (${booking.roomCode}) dibatalkan oleh pengaju.`,
        href: `/admin/persetujuan`,
      });
    }
  });

  return { ok: true, status: "CANCELLED" };
}

/** Kirim ulang draft atau pengajuan yang diminta revisi. */
export function submitBooking(bookingId: string, user: SessionUser): CreateBookingResult {
  const booking = getBookingDetail(bookingId);
  if (!booking) return { ok: false, error: "Pengajuan tidak ditemukan." };
  if (booking.requesterId !== user.id) return { ok: false, error: "Bukan pengajuan Anda." };
  if (booking.status !== "DRAFT" && booking.status !== "REVISION") {
    return { ok: false, error: "Hanya draft atau pengajuan revisi yang dapat dikirim." };
  }

  const payload: BookingPayload = {
    borrowerType: booking.borrowerType as BookingPayload["borrowerType"],
    requesterName: booking.requesterName,
    requesterContact: booking.requesterContact,
    nim: booking.nim,
    jurusan: booking.jurusan,
    organizationId: booking.organizationId,
    ketuaName: booking.ketuaName,
    ketuaNim: booking.ketuaNim,
    sekretarisName: booking.sekretarisName,
    sekretarisNim: booking.sekretarisNim,
    activityName: booking.activityName,
    activityDescription: booking.activityDescription,
    activityType: booking.activityType,
    participants: booking.participants,
    roomId: booking.roomId,
    sessions: booking.sessions.map((s) => ({ date: s.date, start: s.start, end: s.end })),
    facilities: booking.facilities.map((f) => ({
      name: f.name,
      section: f.section as BookingPayload["facilities"][number]["section"],
      qty: f.qty,
    })),
    securityRequested: booking.securityRequested,
    academicActivity: booking.academicActivity,
    attachmentId: booking.attachments[0]?.id ?? null,
    agreement: true,
    asDraft: false,
  };

  const check = checkSlots(payload, user);
  if (!check.ok) return { ok: false, error: check.issues[0]?.message, issues: check.issues };

  const room = getRoom(booking.roomId);
  if (!room) return { ok: false, error: "Ruangan tidak ditemukan." };
  const status: BookingStatus = "PENDING_ADMIN1";
  const now = nowIso();

  withImmediateTransaction(() => {
    execute(
      `UPDATE bookings SET status = ?, submitted_at = ?, approved_at = ?, document_no = ?, verification_code = ?, updated_at = ?
       WHERE id = ?`,
      [status, now, null, null, null, now, booking.id],
    );
    notifyRole("ADMIN1", {
      title: "Pengajuan dikirim ulang",
      body: `${booking.activityName} (${booking.roomCode}) menunggu persetujuan.`,
      href: `/admin/persetujuan?focus=${booking.id}`,
    });
    recordAudit({
      actorId: user.id,
      actorName: user.name,
      action: "SUBMIT",
      entity: "booking",
      entityId: booking.id,
      before: { status: booking.status },
      after: { status },
    });
  });

  return { ok: true, bookingId: booking.id, status };
}

import type { DatabaseSync } from "node:sqlite";
import { newId, newVerificationCode } from "./ids";
import { hashPassword } from "./password";
import { monthRoman, nowIso, todayWita, addDays } from "./time";

export const DEMO_PASSWORD = "RuangIDB#2026";

const ORGANIZATIONS: Array<{ id: string; name: string; kind: string; status: string }> = [
  { id: "org_bem", name: "Badan Eksekutif Mahasiswa (BEM)", kind: "BEM", status: "VERIFIED" },
  { id: "org_hmj_bd", name: "HMJ Bisnis Digital", kind: "HIMA", status: "VERIFIED" },
  { id: "org_hmj_mb", name: "HMJ Manajemen Bisnis", kind: "HIMA", status: "VERIFIED" },
  { id: "org_hmj_dkv", name: "HMJ Desain Komunikasi Visual", kind: "HIMA", status: "VERIFIED" },
  { id: "org_hmj_di", name: "HMJ Desain Interior", kind: "HIMA", status: "VERIFIED" },
  { id: "org_hmj_dm", name: "HMJ Desain Mode", kind: "HIMA", status: "VERIFIED" },
  { id: "org_hmj_stib", name: "HMJ Sistem Teknologi Informasi & Bisnis", kind: "HIMA", status: "VERIFIED" },
  { id: "org_hmj_ar", name: "HMJ Arsitektur", kind: "HIMA", status: "VERIFIED" },
  { id: "org_lontar", name: "UKM Lontar", kind: "UKM", status: "PENDING" },
  { id: "org_thunder", name: "UKM Thunder", kind: "UKM", status: "VERIFIED" },
  { id: "org_creative", name: "UKM Creative Preuneur", kind: "UKM", status: "VERIFIED" },
  { id: "org_gravity_music", name: "UKM Gravity Music Squad", kind: "UKM", status: "VERIFIED" },
  { id: "org_gravity_fc", name: "UKM Gravity Football Club", kind: "UKM", status: "VERIFIED" },
  { id: "org_kamala", name: "UKM Kamala Rajni", kind: "UKM", status: "VERIFIED" },
  { id: "org_putra_putri", name: "UKM Putra - Putri Kampus", kind: "UKM", status: "VERIFIED" },
  { id: "org_dewata", name: "UKM Dewata Air Soft", kind: "UKM", status: "VERIFIED" },
  { id: "org_obscura", name: "UKM Obscura", kind: "UKM", status: "VERIFIED" },
  { id: "org_bluerange", name: "UKM Bluerange", kind: "UKM", status: "VERIFIED" },
  { id: "org_teater", name: "UKM Teater Biru Jingga", kind: "UKM", status: "VERIFIED" },
  { id: "org_goldmonk", name: "UKM Gold Monk Yoga", kind: "UKM", status: "VERIFIED" },
  { id: "org_perkamen", name: "UKM Perkamen", kind: "UKM", status: "VERIFIED" },
  { id: "org_widya", name: "UKM Widya Buana", kind: "UKM", status: "VERIFIED" },
];

interface SeedRoom {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  category: string;
  capacity: number;
  approvalClass: "A" | "B" | "C";
  condition?: string;
  needsPlotting?: boolean;
  notes?: string;
  facilities?: Array<[string, string, number]>;
}

const ROOMS: SeedRoom[] = [
  // Kelas A — ruangan reguler
  { id: "room_a12", code: "A.1.2", name: "Ruang Kelas A.1.2", building: "Gedung IDB", floor: 1, category: "Ruang Kelas", capacity: 40, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_a23", code: "A.2.3", name: "Ruang Kelas A.2.3", building: "Gedung IDB", floor: 2, category: "Ruang Kelas", capacity: 40, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_b13", code: "B.1.3", name: "Ruang Kelas B.1.3", building: "Gedung IDB", floor: 1, category: "Ruang Kelas", capacity: 40, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c13", code: "C.1.3", name: "Ruang Kelas C.1.3", building: "Gedung NMC", floor: 1, category: "Ruang Kelas", capacity: 36, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c21", code: "C.2.1", name: "Ruang Kelas C.2.1", building: "Gedung NMC", floor: 2, category: "Ruang Kelas", capacity: 36, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c22", code: "C.2.2", name: "Ruang Kelas C.2.2", building: "Gedung NMC", floor: 2, category: "Ruang Kelas", capacity: 36, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c23", code: "C.2.3", name: "Ruang Kelas C.2.3", building: "Gedung NMC", floor: 2, category: "Ruang Kelas", capacity: 36, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c31", code: "C.3.1", name: "Ruang Kelas C.3.1", building: "Gedung NMC", floor: 3, category: "Ruang Kelas", capacity: 30, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c32", code: "C.3.2", name: "Ruang Kelas C.3.2", building: "Gedung NMC", floor: 3, category: "Ruang Kelas", capacity: 30, approvalClass: "A", condition: "PERLU_PERAWATAN", notes: "AC unit 2 menunggu perbaikan.", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c33", code: "C.3.3", name: "Ruang Kelas C.3.3", building: "Gedung NMC", floor: 3, category: "Ruang Kelas", capacity: 30, approvalClass: "A", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },

  // Kelas B — Lab Komputer
  { id: "room_a13", code: "A.1.3", name: "Lab Komputer 1", building: "Gedung IDB", floor: 1, category: "Lab Komputer", capacity: 36, approvalClass: "B", facilities: [["Komputer", "IT", 36], ["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_a21", code: "A.2.1", name: "Lab Komputer 2", building: "Gedung IDB", floor: 2, category: "Lab Komputer", capacity: 36, approvalClass: "B", facilities: [["Komputer", "IT", 36], ["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_a22", code: "A.2.2", name: "Lab Komputer 3", building: "Gedung IDB", floor: 2, category: "Lab Komputer", capacity: 36, approvalClass: "B", facilities: [["Komputer", "IT", 36], ["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c11", code: "C.1.1", name: "Lab Komputer 4", building: "Gedung NMC", floor: 1, category: "Lab Komputer", capacity: 36, approvalClass: "B", facilities: [["Komputer", "IT", 36], ["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_c12", code: "C.1.2", name: "Lab Komputer 5", building: "Gedung NMC", floor: 1, category: "Lab Komputer", capacity: 36, approvalClass: "B", condition: "RUSAK", notes: "Proyektor utama rusak, menunggu penggantian.", facilities: [["Komputer", "IT", 36], ["Proyektor", "IT", 1], ["AC", "IT", 2]] },

  // Kelas C — ruangan khusus
  { id: "room_a11", code: "A.1.1", name: "Studio Pola", building: "Gedung IDB", floor: 1, category: "Studio", capacity: 30, approvalClass: "C", facilities: [["Meja Kerja", "OPERASIONAL", 12], ["Mesin Jahit", "OPERASIONAL", 8], ["AC", "IT", 2]] },
  { id: "room_a14", code: "A.1.4", name: "Studio Foto", building: "Gedung IDB", floor: 1, category: "Studio", capacity: 20, approvalClass: "C", facilities: [["Lampu Studio", "IT", 4], ["Backdrop", "OPERASIONAL", 1], ["AC", "IT", 1]] },
  { id: "room_b11", code: "B.1.1", name: "Lab IMAC", building: "Gedung IDB", floor: 1, category: "Lab Khusus", capacity: 30, approvalClass: "C", facilities: [["iMac M1", "IT", 30], ["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_b12", code: "B.1.2", name: "Inkubator Bisnis", building: "Gedung IDB", floor: 1, category: "Inkubator", capacity: 50, approvalClass: "C", facilities: [["Proyektor", "IT", 1], ["Sound", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_b14", code: "B.1.4", name: "Lab Fashion", building: "Gedung IDB", floor: 1, category: "Lab Khusus", capacity: 30, approvalClass: "C", facilities: [["Mesin Jahit", "OPERASIONAL", 10], ["Meja Potong", "OPERASIONAL", 4], ["AC", "IT", 2]] },
  { id: "room_b21", code: "B.2.1", name: "Ruang Internasional", building: "Gedung IDB", floor: 2, category: "Ruang Khusus", capacity: 40, approvalClass: "C", facilities: [["Proyektor", "IT", 1], ["Video Conference", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_b22", code: "B.2.2", name: "Ruang Magister", building: "Gedung IDB", floor: 2, category: "Ruang Khusus", capacity: 30, approvalClass: "C", facilities: [["Proyektor", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_aula", code: "AULA", name: "Aula IDB Bali", building: "Gedung IDB", floor: 1, category: "Aula", capacity: 300, approvalClass: "C", needsPlotting: true, facilities: [["Sound System", "IT", 1], ["Mic", "IT", 4], ["Proyektor", "IT", 1], ["AC", "IT", 6]] },
  { id: "room_rooftop", code: "ROOFTOP", name: "Rooftop IDB Bali", building: "Gedung IDB", floor: 4, category: "Area Terbuka", capacity: 120, approvalClass: "C", needsPlotting: true, facilities: [["Sound System", "IT", 1], ["Tenda", "OPERASIONAL", 4]] },
  { id: "room_gs1", code: "GS-1", name: "Gedung Serbaguna Lt. 1", building: "Gedung Serbaguna", floor: 1, category: "Gedung Serbaguna", capacity: 200, approvalClass: "C", needsPlotting: true, facilities: [["Sound System", "IT", 1], ["Mic", "IT", 2], ["AC", "IT", 4]] },
  { id: "room_gs2", code: "GS-2", name: "Gedung Serbaguna Lt. 2", building: "Gedung Serbaguna", floor: 2, category: "Gedung Serbaguna", capacity: 150, approvalClass: "C", needsPlotting: true, facilities: [["Sound System", "IT", 1], ["Mic", "IT", 2], ["AC", "IT", 4]] },
  { id: "room_gs3", code: "GS-3", name: "Gedung Serbaguna Lt. 3", building: "Gedung Serbaguna", floor: 3, category: "Gedung Serbaguna", capacity: 100, approvalClass: "C", needsPlotting: true, facilities: [["Sound System", "IT", 1], ["AC", "IT", 2]] },
  { id: "room_gedungb", code: "GEDUNG-B", name: "Gedung B (Gear Inc)", building: "Gedung IDB", floor: 1, category: "Ruang Khusus", capacity: 80, approvalClass: "C", needsPlotting: true, facilities: [["Proyektor", "IT", 1], ["Sound System", "IT", 1], ["AC", "IT", 4]] },
  { id: "room_gallery", code: "GALLERY", name: "Creative Gallery", building: "Gedung IDB", floor: 1, category: "Galeri", capacity: 60, approvalClass: "C", needsPlotting: true, facilities: [["Lampu Pameran", "IT", 12], ["AC", "IT", 2]] },
];

interface SeedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  nimNidn?: string;
  jurusan?: string;
  phone?: string;
  organizationId?: string;
}

const USERS: SeedUser[] = [
  { id: "user_admin1", name: "Ni Luh Putu Ariyani, S.E., M.M.", email: "admin1@idbbali.ac.id", role: "ADMIN1", phone: "0812 3900 1001" },
  { id: "user_admin2", name: "Gede Yudha Pratama, S.Ds., M.Ds.", email: "admin2@idbbali.ac.id", role: "ADMIN2", phone: "0812 3900 1002" },
  { id: "user_dosen", name: "Dr. I Wayan Adnyana, S.T., M.Ds.", email: "dosen@idbbali.ac.id", role: "LECTURER", nimNidn: "0812345678", jurusan: "Arsitektur", phone: "0812 3456 7890" },
  { id: "user_mhs", name: "Kadek Ayu Pramesti", email: "mahasiswa@idbbali.ac.id", role: "STUDENT", nimNidn: "236120940018", jurusan: "Desain Komunikasi Visual", phone: "0819 8765 4321" },
  { id: "user_bem", name: "Made Bagus Pradipta", email: "bem@idbbali.ac.id", role: "ORGANIZATION", nimNidn: "226120940007", jurusan: "Manajemen Bisnis", phone: "0817 2233 4455", organizationId: "org_bem" },
  { id: "user_lontar", name: "Ni Kadek Sinta Dewi", email: "ukm.lontar@idbbali.ac.id", role: "ORGANIZATION", nimNidn: "236120940102", jurusan: "Desain Interior", phone: "0813 5566 7788", organizationId: "org_lontar" },
];

function insert(db: DatabaseSync, sql: string, values: unknown[]): void {
  db.prepare(sql).run(...(values as never[]));
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

interface SeedBookingInput {
  id: string;
  requesterId: string;
  borrowerType: string;
  requesterName: string;
  requesterContact: string;
  organizationId?: string;
  nim?: string;
  jurusan?: string;
  orgName?: string;
  ketua?: string;
  ketuaNim?: string;
  sekretaris?: string;
  sekretarisNim?: string;
  activityName: string;
  activityDescription: string;
  activityType: string;
  participants: number;
  roomId: string;
  status: string;
  daysFromNow: number;
  start: string;
  end: string;
  extraSessions?: Array<{ day: number; start: string; end: string }>;
  security?: boolean;
  plotting?: boolean;
  note?: string;
  facilities?: Array<[string, string, number]>;
  docNumber?: string;
  createdDaysAgo?: number;
}

function seedBooking(db: DatabaseSync, input: SeedBookingInput): void {
  const today = todayWita();
  const created = isoDaysAgo(input.createdDaysAgo ?? 6);
  const submitted = isoDaysAgo((input.createdDaysAgo ?? 6) - 1);
  const approvedAt = input.status === "APPROVED" ? isoDaysAgo(2) : null;
  const date = addDays(today, input.daysFromNow);

  insert(
    db,
    `INSERT INTO bookings (
      id, document_no, verification_code, requester_id, organization_id, borrower_type,
      requester_name, requester_contact, nim, jurusan, org_name, ketua_name, ketua_nim,
      sekretaris_name, sekretaris_nim, activity_name, activity_description, activity_type,
      participants, room_id, status, academic_activity, security_requested, plotting_requested,
      note_from_admin, decision_note, submitted_at, approved_at, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.id,
      input.docNumber ?? null,
      input.docNumber ? newVerificationCode() : null,
      input.requesterId,
      input.organizationId ?? null,
      input.borrowerType,
      input.requesterName,
      input.requesterContact,
      input.nim ?? null,
      input.jurusan ?? null,
      input.orgName ?? null,
      input.ketua ?? null,
      input.ketuaNim ?? null,
      input.sekretaris ?? null,
      input.sekretarisNim ?? null,
      input.activityName,
      input.activityDescription,
      input.activityType,
      input.participants,
      input.roomId,
      input.status,
      input.borrowerType === "DOSEN" ? 1 : 0,
      input.security ? 1 : 0,
      input.plotting ? 1 : 0,
      input.status === "REVISION" ? "Lengkapi rundown dan jumlah kursi." : null,
      input.status === "REJECTED" ? "Ruangan sedang dalam perbaikan." : null,
      submitted,
      approvedAt,
      created,
      isoDaysAgo(1),
    ],
  );

  const sessions: Array<{ day: number; start: string; end: string }> = [
    { day: input.daysFromNow, start: input.start, end: input.end },
    ...(input.extraSessions ?? []),
  ];
  sessions.forEach((s, index) => {
    insert(
      db,
      `INSERT INTO booking_sessions (id, booking_id, room_id, date, start_time, end_time)
       VALUES (?,?,?,?,?,?)`,
      [
        `${input.id}_s${index + 1}`,
        input.id,
        input.roomId,
        addDays(today, s.day),
        s.start,
        s.end,
      ],
    );
  });

  (input.facilities ?? []).forEach(([name, section, qty], index) => {
    insert(
      db,
      `INSERT INTO booking_facilities (id, booking_id, name, section, qty)
       VALUES (?,?,?,?,?)`,
      [`${input.id}_f${index + 1}`, input.id, name, section, qty],
    );
  });

  if (input.status === "APPROVED") {
    insert(
      db,
      `INSERT INTO approvals (id, booking_id, stage, actor_id, actor_name, decision, note, room_check, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        newId("apr"),
        input.id,
        "ADMIN1",
        "user_admin1",
        USERS[0].name,
        "APPROVED",
        "Ruangan siap dipakai.",
        input.borrowerType === "ORGANISASI" ? 1 : null,
        isoDaysAgo(3),
      ],
    );
    if (input.borrowerType === "ORGANISASI") {
      insert(
        db,
        `INSERT INTO approvals (id, booking_id, stage, actor_id, actor_name, decision, note, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [newId("apr"), input.id, "ADMIN2", "user_admin2", USERS[1].name, "APPROVED", "Kegiatan kemahasiswaan disetujui.", isoDaysAgo(2)],
      );
    }
  }
  if (input.status === "PENDING_ADMIN2") {
    insert(
      db,
      `INSERT INTO approvals (id, booking_id, stage, actor_id, actor_name, decision, note, room_check, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [newId("apr"), input.id, "ADMIN1", "user_admin1", USERS[0].name, "APPROVED", "Plotting dan kesiapan ruangan dicek.", 1, isoDaysAgo(1)],
    );
  }
  if (input.status === "REJECTED") {
    insert(
      db,
      `INSERT INTO approvals (id, booking_id, stage, actor_id, actor_name, decision, note, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [newId("apr"), input.id, "ADMIN1", "user_admin1", USERS[0].name, "REJECTED", "Ruangan sedang dalam perbaikan.", isoDaysAgo(1)],
    );
  }
  if (input.status === "REVISION") {
    insert(
      db,
      `INSERT INTO approvals (id, booking_id, stage, actor_id, actor_name, decision, note, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [newId("apr"), input.id, "ADMIN1", "user_admin1", USERS[0].name, "REVISION", "Lengkapi rundown dan jumlah kursi.", isoDaysAgo(2)],
    );
  }
}

export function seedInitialData(db: DatabaseSync): void {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number } | undefined;
  if (count && count.n > 0) return;
  resetAndSeed(db);
}

export function resetAndSeed(db: DatabaseSync): void {
  const tables = [
    "approvals",
    "booking_facilities",
    "booking_sessions",
    "attachments",
    "notifications",
    "audit_logs",
    "email_outbox",
    "bookings",
    "room_blocks",
    "room_overrides",
    "room_facilities",
    "rooms",
    "login_attempts",
    "doc_counters",
    "settings",
    "users",
    "organizations",
  ];
  db.exec("PRAGMA foreign_keys = OFF;");
  for (const table of tables) db.exec(`DELETE FROM ${table};`);
  db.exec("PRAGMA foreign_keys = ON;");

  const now = nowIso();
  const passwordHash = hashPassword(DEMO_PASSWORD);

  for (const org of ORGANIZATIONS) {
    insert(
      db,
      `INSERT INTO organizations (id, name, kind, status, leader_name, created_at)
       VALUES (?,?,?,?,?,?)`,
      [org.id, org.name, org.kind, org.status, null, now],
    );
  }

  for (const user of USERS) {
    const orgStatus = user.organizationId
      ? ORGANIZATIONS.find((org) => org.id === user.organizationId)?.status
      : null;
    const isActive = user.role === "ORGANIZATION" && orgStatus !== "VERIFIED" ? 0 : 1;
    insert(
      db,
      `INSERT INTO users (id, name, email, password_hash, role, nim_nidn, jurusan, phone, organization_id, is_active, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        user.id,
        user.name,
        user.email,
        passwordHash,
        user.role,
        user.nimNidn ?? null,
        user.jurusan ?? null,
        user.phone ?? null,
        user.organizationId ?? null,
        isActive,
        now,
      ],
    );
  }

  for (const room of ROOMS) {
    insert(
      db,
      `INSERT INTO rooms (id, code, name, building, floor, category, capacity, approval_class, condition, needs_plotting, is_active, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        room.id,
        room.code,
        room.name,
        room.building,
        room.floor,
        room.category,
        room.capacity,
        room.approvalClass,
        room.condition ?? "BAIK",
        room.needsPlotting ? 1 : 0,
        1,
        room.notes ?? null,
        now,
      ],
    );
    for (const [name, section, qty] of room.facilities ?? []) {
      insert(
        db,
        `INSERT INTO room_facilities (id, room_id, name, section, qty, fixed)
         VALUES (?,?,?,?,?,1)`,
        [newId("rf"), room.id, name, section, qty],
      );
    }
  }

  const settings: Array<[string, string]> = [
    ["window_days", "14"],
    ["min_lead_a", "1"],
    ["min_lead_bc", "3"],
    ["max_duration_minutes", "360"],
    ["operating_start", "07:00"],
    ["operating_end", "20:00"],
    ["max_participants_default", "300"],
  ];
  for (const [key, value] of settings) {
    insert(db, `INSERT INTO settings (key, value) VALUES (?,?)`, [key, value]);
  }

  const year = new Date().getUTCFullYear();
  const roman = monthRoman(todayWita());

  seedBooking(db, {
    id: "bk_bem_pemira",
    requesterId: "user_bem",
    borrowerType: "ORGANISASI",
    requesterName: "Made Bagus Pradipta",
    requesterContact: "0817 2233 4455",
    organizationId: "org_bem",
    orgName: "Badan Eksekutif Mahasiswa (BEM)",
    ketua: "Made Bagus Pradipta",
    ketuaNim: "226120940007",
    sekretaris: "Putu Rani Maharani",
    sekretarisNim: "226120940021",
    activityName: "Pembukaan Ormawa Expo 2026",
    activityDescription:
      "Pembukaan pameran organisasi mahasiswa, diikuti seluruh HMJ dan UKM IDB Bali.",
    activityType: "Organisasi",
    participants: 250,
    roomId: "room_aula",
    status: "APPROVED",
    daysFromNow: 1,
    start: "08:00",
    end: "12:00",
    extraSessions: [{ day: 2, start: "07:00", end: "12:00" }],
    security: true,
    plotting: true,
    facilities: [
      ["Sound System", "IT", 1],
      ["Mic", "IT", 4],
      ["Kursi", "OPERASIONAL", 250],
      ["Panggung", "OPERASIONAL", 1],
      ["Penjagaan acara", "SECURITY", 1],
    ],
    docNumber: `001/IM-PR/IDB/${roman}/${year}`,
    createdDaysAgo: 9,
  });

  seedBooking(db, {
    id: "bk_dkv_imac",
    requesterId: "user_mhs",
    borrowerType: "ORGANISASI",
    requesterName: "Kadek Ayu Pramesti",
    requesterContact: "0819 8765 4321",
    organizationId: "org_hmj_dkv",
    orgName: "HMJ Desain Komunikasi Visual",
    nim: "236120940018",
    jurusan: "Desain Komunikasi Visual",
    ketua: "Kadek Ayu Pramesti",
    ketuaNim: "236120940018",
    sekretaris: "Bagus Adi Saputra",
    sekretarisNim: "236120940044",
    activityName: "Workshop Motion Graphics",
    activityDescription: "Pelatihan motion graphics untuk mahasiswa DKV semester 3.",
    activityType: "Workshop",
    participants: 28,
    roomId: "room_b11",
    status: "PENDING_ADMIN2",
    daysFromNow: 3,
    start: "13:00",
    end: "16:00",
    facilities: [
      ["iMac M1", "IT", 28],
      ["Proyektor", "IT", 1],
    ],
    createdDaysAgo: 5,
  });

  seedBooking(db, {
    id: "bk_mhs_a12",
    requesterId: "user_mhs",
    borrowerType: "MAHASISWA",
    requesterName: "Kadek Ayu Pramesti",
    requesterContact: "0819 8765 4321",
    nim: "236120940018",
    jurusan: "Desain Komunikasi Visual",
    activityName: "Rapat Panitia Pameran Tugas Akhir",
    activityDescription: "Koordinasi divisi acara dan publikasi pameran tugas akhir.",
    activityType: "Rapat",
    participants: 18,
    roomId: "room_a12",
    status: "APPROVED",
    daysFromNow: 0,
    start: "10:00",
    end: "12:00",
    facilities: [["Proyektor", "IT", 1]],
    docNumber: `002/IM-PR/IDB/${roman}/${year}`,
    createdDaysAgo: 3,
  });

  seedBooking(db, {
    id: "bk_dosen_b13",
    requesterId: "user_dosen",
    borrowerType: "DOSEN",
    requesterName: "Dr. I Wayan Adnyana, S.T., M.Ds.",
    requesterContact: "0812 3456 7890",
    nim: "0812345678",
    jurusan: "Arsitektur",
    activityName: "Kuliah Tamu Arsitektur Tropis",
    activityDescription: "Kuliah tamu bersama praktisi arsitektur tropis.",
    activityType: "Akademik",
    participants: 38,
    roomId: "room_b13",
    status: "APPROVED",
    daysFromNow: 1,
    start: "14:00",
    end: "16:00",
    facilities: [
      ["Proyektor", "IT", 1],
      ["Mic", "IT", 1],
    ],
    docNumber: `003/IM-PR/IDB/${roman}/${year}`,
    createdDaysAgo: 2,
  });

  seedBooking(db, {
    id: "bk_thunder_gs2",
    requesterId: "user_bem",
    borrowerType: "ORGANISASI",
    requesterName: "Made Bagus Pradipta",
    requesterContact: "0817 2233 4455",
    organizationId: "org_thunder",
    orgName: "UKM Thunder",
    ketua: "Agus Setiawan",
    ketuaNim: "226120940061",
    sekretaris: "Ni Putu Ayu Lestari",
    sekretarisNim: "226120940062",
    activityName: "Latihan Rutin Dance Competition",
    activityDescription: "Latihan intensif persiapan lomba dance antar kampus.",
    activityType: "Organisasi",
    participants: 45,
    roomId: "room_gs2",
    status: "PENDING_ADMIN1",
    daysFromNow: 4,
    start: "09:00",
    end: "15:00",
    security: true,
    facilities: [["Sound System", "IT", 1], ["Mic", "IT", 2]],
    createdDaysAgo: 4,
  });

  seedBooking(db, {
    id: "bk_mhs_reject",
    requesterId: "user_mhs",
    borrowerType: "MAHASISWA",
    requesterName: "Kadek Ayu Pramesti",
    requesterContact: "0819 8765 4321",
    nim: "236120940018",
    jurusan: "Desain Komunikasi Visual",
    activityName: "Belajar Kelompok Desain Editorial",
    activityDescription: "Diskusi kelompok mata kuliah desain editorial.",
    activityType: "Akademik",
    participants: 12,
    roomId: "room_a23",
    status: "REJECTED",
    daysFromNow: 4,
    start: "08:00",
    end: "10:00",
    createdDaysAgo: 5,
  });

  seedBooking(db, {
    id: "bk_lontar_revision",
    requesterId: "user_lontar",
    borrowerType: "ORGANISASI",
    requesterName: "Ni Kadek Sinta Dewi",
    requesterContact: "0813 5566 7788",
    organizationId: "org_lontar",
    orgName: "UKM Lontar",
    ketua: "Ni Kadek Sinta Dewi",
    ketuaNim: "236120940102",
    sekretaris: "I Made Arta Wiguna",
    sekretarisNim: "236120940103",
    activityName: "Pentas Sastra Bali",
    activityDescription: "Pembacaan puisi dan diskusi sastra Bali.",
    activityType: "Lomba",
    participants: 40,
    roomId: "room_c31",
    status: "REVISION",
    daysFromNow: 6,
    start: "13:00",
    end: "15:00",
    createdDaysAgo: 6,
  });

  seedBooking(db, {
    id: "bk_bem_aula2",
    requesterId: "user_bem",
    borrowerType: "ORGANISASI",
    requesterName: "Made Bagus Pradipta",
    requesterContact: "0817 2233 4455",
    organizationId: "org_bem",
    orgName: "Badan Eksekutif Mahasiswa (BEM)",
    ketua: "Made Bagus Pradipta",
    ketuaNim: "226120940007",
    sekretaris: "Putu Rani Maharani",
    sekretarisNim: "226120940021",
    activityName: "Dialog Rektor dengan Mahasiswa",
    activityDescription: "Forum aspirasi mahasiswa bersama Rektor IDB Bali.",
    activityType: "Seminar",
    participants: 180,
    roomId: "room_aula",
    status: "PENDING_ADMIN1",
    daysFromNow: 8,
    start: "09:00",
    end: "11:30",
    security: true,
    plotting: true,
    facilities: [["Sound System", "IT", 1], ["Mic", "IT", 3]],
    createdDaysAgo: 1,
  });

  seedBooking(db, {
    id: "bk_mhs_c23",
    requesterId: "user_mhs",
    borrowerType: "MAHASISWA",
    requesterName: "Kadek Ayu Pramesti",
    requesterContact: "0819 8765 4321",
    nim: "236120940018",
    jurusan: "Desain Komunikasi Visual",
    activityName: "Foto Produk Tugas Akhir",
    activityDescription: "Sesi foto produk untuk tugas akhir desain kemasan.",
    activityType: "Akademik",
    participants: 6,
    roomId: "room_c23",
    status: "APPROVED",
    daysFromNow: 5,
    start: "16:00",
    end: "18:00",
    docNumber: `004/IM-PR/IDB/${roman}/${year}`,
    createdDaysAgo: 2,
  });

  seedBooking(db, {
    id: "bk_dosen_lab",
    requesterId: "user_dosen",
    borrowerType: "DOSEN",
    requesterName: "Dr. I Wayan Adnyana, S.T., M.Ds.",
    requesterContact: "0812 3456 7890",
    nim: "0812345678",
    jurusan: "Arsitektur",
    activityName: "Praktikum Pemodelan 3D",
    activityDescription: "Praktikum kelas pemodelan 3D untuk mahasiswa arsitektur.",
    activityType: "Akademik",
    participants: 34,
    roomId: "room_a21",
    status: "PENDING_ADMIN1",
    daysFromNow: 9,
    start: "08:00",
    end: "11:00",
    facilities: [["Komputer", "IT", 34]],
    createdDaysAgo: 3,
  });

  // Slot ditutup oleh admin (BR-05)
  insert(
    db,
    `INSERT INTO room_blocks (id, room_id, date, start_time, end_time, reason, created_by, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      "block_aula_maint",
      "room_aula",
      todayWita(),
      "07:00",
      "17:00",
      "Perawatan panggung dan pengecekan tata suara.",
      "user_admin1",
      isoDaysAgo(2),
    ],
  );
  insert(
    db,
    `INSERT INTO room_blocks (id, room_id, date, start_time, end_time, reason, created_by, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      "block_lab_kuliah",
      "room_a13",
      addDays(todayWita(), 1),
      "08:00",
      "10:00",
      "Jadwal kuliah Pemrograman Web (kelas reguler).",
      "user_admin1",
      isoDaysAgo(4),
    ],
  );

  // Override kondisi/situasi per tanggal (inline edit admin)
  insert(
    db,
    `INSERT INTO room_overrides (id, room_id, date, condition, situation, note, updated_by, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      "ov_c32_today",
      "room_c32",
      todayWita(),
      "PERLU_PERAWATAN",
      null,
      "AC unit 2 sedang diperbaiki.",
      "user_admin1",
      isoDaysAgo(0),
    ],
  );
  insert(
    db,
    `INSERT INTO room_overrides (id, room_id, date, condition, situation, note, updated_by, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      "ov_rooftop_block",
      "room_rooftop",
      addDays(todayWita(), 2),
      null,
      "DITOLAK",
      "Renovasi deck lantai.",
      "user_admin1",
      isoDaysAgo(1),
    ],
  );

  // Notifikasi awal
  const notifications: Array<[string, string, string, string, number]> = [
    ["user_admin1", "Pengajuan baru menunggu", "Dialog Rektor dengan Mahasiswa (Aula) menunggu persetujuan Anda.", "/admin/persetujuan", 0],
    ["user_admin2", "Menunggu persetujuan tahap 2", "Workshop Motion Graphics (Lab IMAC) sudah disetujui Bagian Akademik.", "/admin/persetujuan", 0],
    ["user_mhs", "Pengajuan disetujui", "Rapat Panitia Pameran Tugas Akhir di A.1.2 disetujui Bagian Akademik.", "/pengajuan/bk_mhs_a12", 0],
    ["user_bem", "Memo siap diunduh", "Internal Memo Pembukaan Ormawa Expo 2026 sudah tersedia.", "/pengajuan/bk_bem_pemira", 0],
  ];
  notifications.forEach(([userId, title, body, href, read], index) => {
    insert(
      db,
      `INSERT INTO notifications (id, user_id, title, body, href, is_read, created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [`ntf_seed_${index + 1}`, userId, title, body, href, read, isoDaysAgo(1)],
    );
  });

  // Log audit awal
  insert(
    db,
    `INSERT INTO audit_logs (id, actor_id, actor_name, action, entity, entity_id, before_json, after_json, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      "log_seed_1",
      "user_admin1",
      USERS[0].name,
      "APPROVE",
      "booking",
      "bk_bem_pemira",
      null,
      JSON.stringify({ status: "PENDING_ADMIN2" }),
      isoDaysAgo(3),
    ],
  );
  insert(
    db,
    `INSERT INTO audit_logs (id, actor_id, actor_name, action, entity, entity_id, before_json, after_json, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      "log_seed_2",
      "user_admin2",
      USERS[1].name,
      "APPROVE",
      "booking",
      "bk_bem_pemira",
      JSON.stringify({ status: "PENDING_ADMIN2" }),
      JSON.stringify({ status: "APPROVED" }),
      isoDaysAgo(2),
    ],
  );

  // Email simulasi untuk bagian terkait
  insert(
    db,
    `INSERT INTO email_outbox (id, to_email, subject, body, created_at)
     VALUES (?,?,?,?,?)`,
    [
      "mail_seed_1",
      "it@idbbali.ac.id",
      "Fasilitas IT untuk Pembukaan Ormawa Expo 2026",
      "Mohon siapkan Sound System, Mic (4), dan Proyektor di Aula IDB Bali.",
      isoDaysAgo(2),
    ],
  );
}

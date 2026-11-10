import type { SessionUser } from "./auth";
import { execute, queryAll, queryOne, withImmediateTransaction } from "./db";
import { newId } from "./ids";
import { notify, recordAudit } from "./notify";
import type { RoomCondition, RoomSituation } from "./rbac";
import { addDays, formatTimeRange, nowIso, todayWita } from "./time";

export function updateRoomState(input: {
  roomId: string;
  date: string;
  condition: RoomCondition | null;
  situation: RoomSituation | null;
  note: string | null;
  actor: SessionUser;
}): { ok: boolean; error?: string } {
  const room = queryOne<{ id: string; condition: RoomCondition; name: string }>(
    `SELECT id, condition, name FROM rooms WHERE id = ?`,
    [input.roomId],
  );
  if (!room) return { ok: false, error: "Ruangan tidak ditemukan." };
  if (input.date < todayWita()) return { ok: false, error: "Tidak dapat mengubah tanggal yang sudah lewat." };

  const before = queryOne<{
    condition: RoomCondition | null;
    situation: string | null;
    note: string | null;
  }>(`SELECT condition, situation, note FROM room_overrides WHERE room_id = ? AND date = ?`, [
    input.roomId,
    input.date,
  ]);

  const empty = !input.condition && !input.situation && !input.note;
  if (empty) {
    execute(`DELETE FROM room_overrides WHERE room_id = ? AND date = ?`, [input.roomId, input.date]);
  } else {
    execute(
      `INSERT INTO room_overrides (id, room_id, date, condition, situation, note, updated_by, updated_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(room_id, date) DO UPDATE SET
         condition = excluded.condition,
         situation = excluded.situation,
         note = excluded.note,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
      [
        newId("ov"),
        input.roomId,
        input.date,
        input.condition,
        input.situation,
        input.note,
        input.actor.id,
        nowIso(),
      ],
    );
  }

  recordAudit({
    actorId: input.actor.id,
    actorName: input.actor.name,
    action: "UPDATE_ROOM_STATE",
    entity: "room",
    entityId: input.roomId,
    before: before ?? null,
    after: { date: input.date, condition: input.condition, situation: input.situation, note: input.note },
  });

  return { ok: true };
}

export function updateRoomMaster(input: {
  roomId: string;
  patch: {
    name?: string;
    building?: string;
    floor?: number;
    category?: string;
    capacity?: number;
    approvalClass?: "A" | "B" | "C";
    condition?: RoomCondition;
    isActive?: boolean;
    needsPlotting?: boolean;
    notes?: string | null;
  };
  actor: SessionUser;
}): { ok: boolean; error?: string } {
  const room = queryOne<Record<string, unknown>>(`SELECT * FROM rooms WHERE id = ?`, [input.roomId]);
  if (!room) return { ok: false, error: "Ruangan tidak ditemukan." };

  const fields: string[] = [];
  const values: unknown[] = [];
  const map: Array<[keyof typeof input.patch, string, (v: never) => unknown]> = [
    ["name", "name", (v) => v],
    ["building", "building", (v) => v],
    ["floor", "floor", (v) => v],
    ["category", "category", (v) => v],
    ["capacity", "capacity", (v) => v],
    ["approvalClass", "approval_class", (v) => v],
    ["condition", "condition", (v) => v],
    ["isActive", "is_active", (v) => (v ? 1 : 0)],
    ["needsPlotting", "needs_plotting", (v) => (v ? 1 : 0)],
    ["notes", "notes", (v) => v],
  ];

  for (const [key, column, convert] of map) {
    if (input.patch[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(convert(input.patch[key] as never));
    }
  }
  if (fields.length === 0) return { ok: true };

  values.push(input.roomId);
  execute(`UPDATE rooms SET ${fields.join(", ")} WHERE id = ?`, values);

  recordAudit({
    actorId: input.actor.id,
    actorName: input.actor.name,
    action: "UPDATE_ROOM",
    entity: "room",
    entityId: input.roomId,
    before: room,
    after: input.patch,
  });
  return { ok: true };
}

export function createRoom(input: {
  code: string;
  name: string;
  building: string;
  floor: number;
  category: string;
  capacity: number;
  approvalClass: "A" | "B" | "C";
  condition: RoomCondition;
  needsPlotting: boolean;
  notes: string | null;
  actor: SessionUser;
}): { ok: boolean; error?: string; id?: string } {
  const exists = queryOne<{ id: string }>(`SELECT id FROM rooms WHERE upper(code) = upper(?)`, [
    input.code,
  ]);
  if (exists) return { ok: false, error: "Kode ruangan sudah dipakai." };

  const id = newId("room");
  execute(
    `INSERT INTO rooms (id, code, name, building, floor, category, capacity, approval_class, condition, needs_plotting, is_active, notes, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)`,
    [
      id,
      input.code.trim(),
      input.name.trim(),
      input.building.trim(),
      input.floor,
      input.category,
      input.capacity,
      input.approvalClass,
      input.condition,
      input.needsPlotting ? 1 : 0,
      input.notes,
      nowIso(),
    ],
  );

  recordAudit({
    actorId: input.actor.id,
    actorName: input.actor.name,
    action: "CREATE_ROOM",
    entity: "room",
    entityId: id,
    after: { code: input.code, name: input.name, class: input.approvalClass },
  });
  return { ok: true, id };
}

export function createBlock(input: {
  roomId: string;
  date: string;
  start: string;
  end: string;
  reason: string;
  actor: SessionUser;
}): { ok: boolean; error?: string; id?: string } {
  const room = queryOne<{ id: string; name: string }>(`SELECT id, name FROM rooms WHERE id = ?`, [
    input.roomId,
  ]);
  if (!room) return { ok: false, error: "Ruangan tidak ditemukan." };
  if (!input.reason.trim()) return { ok: false, error: "Alasan wajib diisi." };
  if (input.start >= input.end) return { ok: false, error: "Jam selesai harus setelah jam mulai." };
  if (input.date < todayWita()) return { ok: false, error: "Tanggal sudah lewat." };

  const id = newId("blk");
  withImmediateTransaction(() => {
    execute(
      `INSERT INTO room_blocks (id, room_id, date, start_time, end_time, reason, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, input.roomId, input.date, input.start, input.end, input.reason.trim(), input.actor.id, nowIso()],
    );

    const affected = queryAll<{
      booking_id: string;
      requester_id: string;
      activity_name: string;
      start_time: string;
      end_time: string;
    }>(
      `SELECT b.id AS booking_id, b.requester_id, b.activity_name, s.start_time, s.end_time
       FROM booking_sessions s
       JOIN bookings b ON b.id = s.booking_id
       WHERE s.room_id = ? AND s.date = ?
         AND b.status IN ('PENDING_ADMIN1', 'PENDING_ADMIN2', 'APPROVED')`,
      [input.roomId, input.date],
    ).filter((row) => input.start < row.end_time && row.start_time < input.end);

    for (const row of affected) {
      notify({
        userId: row.requester_id,
        title: "Ruangan ditandai ditolak",
        body: `${room.name} ditandai ditolak pada ${input.date} ${formatTimeRange(input.start, input.end)}: ${input.reason}. Pengajuan "${row.activity_name}" terdampak dan akan ditinjau admin.`,
        href: `/pengajuan/${row.booking_id}`,
      });
    }

    recordAudit({
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: "CREATE_BLOCK",
      entity: "room",
      entityId: input.roomId,
      after: { date: input.date, start: input.start, end: input.end, reason: input.reason },
    });
  });

  return { ok: true, id };
}

export function deleteBlock(id: string, actor: SessionUser): { ok: boolean; error?: string } {
  const block = queryOne<{ id: string; room_id: string; date: string; reason: string }>(
    `SELECT id, room_id, date, reason FROM room_blocks WHERE id = ?`,
    [id],
  );
  if (!block) return { ok: false, error: "Penandaan tidak ditemukan." };
  execute(`DELETE FROM room_blocks WHERE id = ?`, [id]);
  recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "DELETE_BLOCK",
    entity: "room",
    entityId: block.room_id,
    before: block,
  });
  return { ok: true };
}

export function setUserActive(
  userId: string,
  isActive: boolean,
  actor: SessionUser,
): { ok: boolean; error?: string } {
  const user = queryOne<{ id: string; name: string; role: string }>(
    `SELECT id, name, role FROM users WHERE id = ?`,
    [userId],
  );
  if (!user) return { ok: false, error: "Pengguna tidak ditemukan." };
  if (user.role === "ADMIN1" && !isActive) {
    return { ok: false, error: "Akun Bagian Akademik tidak dapat dinonaktifkan." };
  }
  execute(`UPDATE users SET is_active = ? WHERE id = ?`, [isActive ? 1 : 0, userId]);
  recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    entity: "user",
    entityId: userId,
    after: { isActive },
  });
  return { ok: true };
}

export function setOrganizationStatus(input: {
  organizationId: string;
  status: "VERIFIED" | "REJECTED" | "PENDING";
  actor: SessionUser;
}): { ok: boolean; error?: string } {
  const org = queryOne<{ id: string; name: string; status: string }>(
    `SELECT id, name, status FROM organizations WHERE id = ?`,
    [input.organizationId],
  );
  if (!org) return { ok: false, error: "Organisasi tidak ditemukan." };

  withImmediateTransaction(() => {
    execute(`UPDATE organizations SET status = ? WHERE id = ?`, [input.status, input.organizationId]);
    execute(
      `UPDATE users SET is_active = ? WHERE organization_id = ? AND role = 'ORGANIZATION'`,
      [input.status === "VERIFIED" ? 1 : 0, input.organizationId],
    );
    const leaders = queryAll<{ id: string }>(
      `SELECT id FROM users WHERE organization_id = ? AND role = 'ORGANIZATION'`,
      [input.organizationId],
    );
    for (const leader of leaders) {
      notify({
        userId: leader.id,
        title:
          input.status === "VERIFIED"
            ? "Akun organisasi diverifikasi"
            : input.status === "REJECTED"
              ? "Verifikasi organisasi ditolak"
              : "Verifikasi organisasi dibuka kembali",
        body:
          input.status === "VERIFIED"
            ? `${org.name} kini dapat mengajukan peminjaman.`
            : `${org.name}: verifikasi ${input.status.toLowerCase()}. Hubungi Kemahasiswaan.`,
        href: "/pengajuan",
      });
    }
    recordAudit({
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: "SET_ORG_STATUS",
      entity: "organization",
      entityId: input.organizationId,
      before: { status: org.status },
      after: { status: input.status },
    });
  });

  return { ok: true };
}

export function markNotificationsRead(userId: string): void {
  execute(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [userId]);
}

export function ensureWindow(from?: string): { from: string; to: string } {
  const today = todayWita();
  return { from: from && from >= today ? from : today, to: addDays(today, 13) };
}

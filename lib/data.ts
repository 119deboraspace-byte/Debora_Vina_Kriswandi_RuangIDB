import { queryAll, queryOne } from "./db";
import type { BookingStatus, Role, RoomCondition, RoomSituation } from "./rbac";
import { addDays, eachDay, minutesOf, nowIso, OPERATING_END, OPERATING_START, todayWita } from "./time";

export interface RoomView {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  category: string;
  capacity: number;
  approvalClass: "A" | "B" | "C";
  condition: RoomCondition;
  needsPlotting: boolean;
  isActive: boolean;
  notes: string | null;
}

export interface AvailabilitySession {
  id: string;
  bookingId: string;
  roomId: string;
  date: string;
  start: string;
  end: string;
  status: BookingStatus;
  activityName: string;
  requesterName: string;
  orgName: string | null;
  borrowerType: string;
  participants: number;
  documentNo: string | null;
  verificationCode: string | null;
}

export interface RoomBlock {
  id: string;
  roomId: string;
  date: string;
  start: string;
  end: string;
  reason: string;
}

export interface RoomOverride {
  roomId: string;
  date: string;
  condition: RoomCondition | null;
  situation: RoomSituation | null;
  note: string | null;
}

export interface AvailabilityPayload {
  from: string;
  to: string;
  today: string;
  rooms: RoomView[];
  sessions: AvailabilitySession[];
  blocks: RoomBlock[];
  overrides: RoomOverride[];
  viewer: { name: string | null; role: Role | null };
}

interface RoomRow {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  category: string;
  capacity: number;
  approval_class: "A" | "B" | "C";
  condition: RoomCondition;
  needs_plotting: number;
  is_active: number;
  notes: string | null;
}

const ROOM_SELECT = `
  SELECT id, code, name, building, floor, category, capacity, approval_class,
         condition, needs_plotting, is_active, notes
  FROM rooms
`;

export function listRooms(options: { includeInactive?: boolean } = {}): RoomView[] {
  const rows = queryAll<RoomRow>(
    `${ROOM_SELECT} ${options.includeInactive ? "" : "WHERE is_active = 1"} ORDER BY building, floor, code`,
  );
  return rows.map(mapRoom);
}

export function getRoom(id: string): RoomView | null {
  const row = queryOne<RoomRow>(`${ROOM_SELECT} WHERE id = ?`, [id]);
  return row ? mapRoom(row) : null;
}

function mapRoom(row: RoomRow): RoomView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    building: row.building,
    floor: row.floor,
    category: row.category,
    capacity: row.capacity,
    approvalClass: row.approval_class,
    condition: row.condition,
    needsPlotting: row.needs_plotting === 1,
    isActive: row.is_active === 1,
    notes: row.notes,
  };
}

interface SessionRow {
  id: string;
  booking_id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  activity_name: string;
  requester_name: string;
  org_name: string | null;
  borrower_type: string;
  participants: number;
  document_no: string | null;
  verification_code: string | null;
}

const OCCUPYING_STATUSES = `('PENDING_ADMIN1', 'PENDING_ADMIN2', 'APPROVED')`;

export function getAvailability(
  from: string,
  to: string,
  viewer: { name: string | null; role: Role | null } = { name: null, role: null },
): AvailabilityPayload {
  const today = todayWita();
  const sessions = queryAll<SessionRow>(
    `SELECT s.id, s.booking_id, s.room_id, s.date, s.start_time, s.end_time,
            b.status, b.activity_name, b.requester_name, b.org_name,
            b.borrower_type, b.participants, b.document_no, b.verification_code
     FROM booking_sessions s
     JOIN bookings b ON b.id = s.booking_id
     WHERE s.date BETWEEN ? AND ?
       AND b.status IN ${OCCUPYING_STATUSES}
     ORDER BY s.date, s.start_time, s.room_id`,
    [from, to],
  );

  const blocks = queryAll<{
    id: string;
    room_id: string;
    date: string;
    start_time: string;
    end_time: string;
    reason: string;
  }>(
    `SELECT id, room_id, date, start_time, end_time, reason
     FROM room_blocks WHERE date BETWEEN ? AND ? ORDER BY date, start_time`,
    [from, to],
  ).map((row) => ({
    id: row.id,
    roomId: row.room_id,
    date: row.date,
    start: row.start_time,
    end: row.end_time,
    reason: row.reason,
  }));

  const overrides = queryAll<{
    room_id: string;
    date: string;
    condition: RoomCondition | null;
    situation: RoomSituation | null;
    note: string | null;
  }>(
    `SELECT room_id, date, condition, situation, note
     FROM room_overrides WHERE date BETWEEN ? AND ?`,
    [from, to],
  ).map((row) => ({
    roomId: row.room_id,
    date: row.date,
    condition: row.condition,
    situation: row.situation,
    note: row.note,
  }));

  const isGuest = !viewer.role;

  return {
    from,
    to,
    today,
    rooms: listRooms(),
    sessions: sessions.map((row) => ({
      id: row.id,
      bookingId: row.booking_id,
      roomId: row.room_id,
      date: row.date,
      start: row.start_time,
      end: row.end_time,
      status: row.status,
      activityName: row.activity_name,
      requesterName: isGuest ? maskName(row.requester_name) : row.requester_name,
      orgName: row.org_name,
      borrowerType: row.borrower_type,
      participants: row.participants,
      documentNo: isGuest ? null : row.document_no,
      verificationCode: isGuest ? null : row.verification_code,
    })),
    blocks,
    overrides,
    viewer: { name: viewer.name, role: viewer.role },
  };
}

function maskName(name: string): string {
  return name
    .split(" ")
    .map((part) => (part.length <= 2 ? part : `${part[0]}${"•".repeat(Math.min(part.length - 1, 6))}`))
    .join(" ");
}

export interface BookingSummary {
  id: string;
  documentNo: string | null;
  verificationCode: string | null;
  status: BookingStatus;
  activityName: string;
  activityType: string;
  participants: number;
  requesterName: string;
  requesterContact: string;
  borrowerType: string;
  orgName: string | null;
  roomCode: string;
  roomName: string;
  building: string;
  approvalClass: "A" | "B" | "C";
  submittedAt: string | null;
  createdAt: string;
  approvedAt: string | null;
  firstDate: string | null;
  firstStart: string | null;
  firstEnd: string | null;
  sessionCount: number;
}

interface SummaryRow {
  id: string;
  document_no: string | null;
  verification_code: string | null;
  status: BookingStatus;
  activity_name: string;
  activity_type: string;
  participants: number;
  requester_name: string;
  requester_contact: string;
  borrower_type: string;
  org_name: string | null;
  room_code: string;
  room_name: string;
  building: string;
  approval_class: "A" | "B" | "C";
  submitted_at: string | null;
  created_at: string;
  approved_at: string | null;
  first_date: string | null;
  first_start: string | null;
  first_end: string | null;
  session_count: number;
}

const SUMMARY_SELECT = `
  SELECT b.id, b.document_no, b.verification_code, b.status, b.activity_name,
         b.activity_type, b.participants, b.requester_name, b.requester_contact,
         b.borrower_type, b.org_name, r.code AS room_code, r.name AS room_name,
         r.building, r.approval_class, b.submitted_at, b.created_at, b.approved_at,
         MIN(s.date) AS first_date,
         (SELECT start_time FROM booking_sessions WHERE booking_id = b.id ORDER BY date, start_time LIMIT 1) AS first_start,
         (SELECT end_time FROM booking_sessions WHERE booking_id = b.id ORDER BY date, start_time LIMIT 1) AS first_end,
         (SELECT COUNT(*) FROM booking_sessions WHERE booking_id = b.id) AS session_count
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  LEFT JOIN booking_sessions s ON s.booking_id = b.id
`;

function mapSummary(row: SummaryRow): BookingSummary {
  return {
    id: row.id,
    documentNo: row.document_no,
    verificationCode: row.verification_code,
    status: row.status,
    activityName: row.activity_name,
    activityType: row.activity_type,
    participants: row.participants,
    requesterName: row.requester_name,
    requesterContact: row.requester_contact,
    borrowerType: row.borrower_type,
    orgName: row.org_name,
    roomCode: row.room_code,
    roomName: row.room_name,
    building: row.building,
    approvalClass: row.approval_class,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    firstDate: row.first_date,
    firstStart: row.first_start,
    firstEnd: row.first_end,
    sessionCount: Number(row.session_count ?? 0),
  };
}

export function listMyBookings(userId: string): BookingSummary[] {
  return queryAll<SummaryRow>(
    `${SUMMARY_SELECT} WHERE b.requester_id = ? GROUP BY b.id ORDER BY b.created_at DESC`,
    [userId],
  ).map(mapSummary);
}

export function listApprovalQueue(role: "ADMIN1" | "ADMIN2"): BookingSummary[] {
  const status = role === "ADMIN1" ? "PENDING_ADMIN1" : "PENDING_ADMIN2";
  return queryAll<SummaryRow>(
    `${SUMMARY_SELECT} WHERE b.status = ? GROUP BY b.id ORDER BY b.submitted_at ASC`,
    [status],
  ).map(mapSummary);
}

export function listBookingsForReport(limit = 200): BookingSummary[] {
  return queryAll<SummaryRow>(
    `${SUMMARY_SELECT} GROUP BY b.id ORDER BY b.created_at DESC LIMIT ?`,
    [limit],
  ).map(mapSummary);
}

export interface BookingDetail extends BookingSummary {
  requesterId: string;
  requesterEmail: string;
  nim: string | null;
  jurusan: string | null;
  organizationId: string | null;
  ketuaName: string | null;
  ketuaNim: string | null;
  sekretarisName: string | null;
  sekretarisNim: string | null;
  activityDescription: string;
  academicActivity: boolean;
  securityRequested: boolean;
  plottingRequested: boolean;
  noteFromAdmin: string | null;
  decisionNote: string | null;
  cancelledAt: string | null;
  roomId: string;
  roomFloor: number;
  roomCapacity: number;
  roomCondition: RoomCondition;
  roomNeedsPlotting: boolean;
  sessions: Array<{ id: string; date: string; start: string; end: string }>;
  facilities: Array<{ id: string; name: string; section: string; qty: number; note: string | null }>;
  approvals: Array<{
    id: string;
    stage: string;
    actorName: string | null;
    decision: string;
    note: string | null;
    roomCheck: number | null;
    createdAt: string;
  }>;
  attachments: Array<{ id: string; filename: string; mime: string; size: number }>;
}

export function getBookingDetail(id: string): BookingDetail | null {
  const base = queryOne<SummaryRow & {
    requester_id: string;
    requester_email: string;
    nim: string | null;
    jurusan: string | null;
    organization_id: string | null;
    ketua_name: string | null;
    ketua_nim: string | null;
    sekretaris_name: string | null;
    sekretaris_nim: string | null;
    activity_description: string;
    academic_activity: number;
    security_requested: number;
    plotting_requested: number;
    note_from_admin: string | null;
    decision_note: string | null;
    cancelled_at: string | null;
    room_id: string;
    room_floor: number;
    room_capacity: number;
    room_condition: RoomCondition;
    room_needs_plotting: number;
  }>(
    `${SUMMARY_SELECT}
     WHERE b.id = ?
     GROUP BY b.id`,
    [id],
  );
  if (!base) return null;

  const extra = queryOne<{
    requester_id: string;
    requester_email: string;
    nim: string | null;
    jurusan: string | null;
    organization_id: string | null;
    ketua_name: string | null;
    ketua_nim: string | null;
    sekretaris_name: string | null;
    sekretaris_nim: string | null;
    activity_description: string;
    academic_activity: number;
    security_requested: number;
    plotting_requested: number;
    note_from_admin: string | null;
    decision_note: string | null;
    cancelled_at: string | null;
    room_id: string;
    room_floor: number;
    room_capacity: number;
    room_condition: RoomCondition;
    room_needs_plotting: number;
  }>(
    `SELECT b.requester_id, u.email AS requester_email, b.nim, b.jurusan, b.organization_id,
            b.ketua_name, b.ketua_nim, b.sekretaris_name, b.sekretaris_nim,
            b.activity_description, b.academic_activity, b.security_requested,
            b.plotting_requested, b.note_from_admin, b.decision_note, b.cancelled_at,
            b.room_id, r.floor AS room_floor, r.capacity AS room_capacity,
            r.condition AS room_condition, r.needs_plotting AS room_needs_plotting
     FROM bookings b
     JOIN users u ON u.id = b.requester_id
     JOIN rooms r ON r.id = b.room_id
     WHERE b.id = ?`,
    [id],
  );
  if (!extra) return null;

  const sessions = queryAll<{ id: string; date: string; start_time: string; end_time: string }>(
    `SELECT id, date, start_time, end_time FROM booking_sessions
     WHERE booking_id = ? ORDER BY date, start_time`,
    [id],
  ).map((row) => ({ id: row.id, date: row.date, start: row.start_time, end: row.end_time }));

  const facilities = queryAll<{
    id: string;
    name: string;
    section: string;
    qty: number;
    note: string | null;
  }>(`SELECT id, name, section, qty, note FROM booking_facilities WHERE booking_id = ?`, [id]);

  const approvals = queryAll<{
    id: string;
    stage: string;
    actor_name: string | null;
    decision: string;
    note: string | null;
    room_check: number | null;
    created_at: string;
  }>(
    `SELECT id, stage, actor_name, decision, note, room_check, created_at
     FROM approvals WHERE booking_id = ? ORDER BY created_at ASC`,
    [id],
  ).map((row) => ({
    id: row.id,
    stage: row.stage,
    actorName: row.actor_name,
    decision: row.decision,
    note: row.note,
    roomCheck: row.room_check,
    createdAt: row.created_at,
  }));

  const attachments = queryAll<{ id: string; filename: string; mime: string; size: number }>(
    `SELECT id, filename, mime, size FROM attachments WHERE booking_id = ?`,
    [id],
  );

  return {
    ...mapSummary(base),
    requesterId: extra.requester_id,
    requesterEmail: extra.requester_email,
    nim: extra.nim,
    jurusan: extra.jurusan,
    organizationId: extra.organization_id,
    ketuaName: extra.ketua_name,
    ketuaNim: extra.ketua_nim,
    sekretarisName: extra.sekretaris_name,
    sekretarisNim: extra.sekretaris_nim,
    activityDescription: extra.activity_description,
    academicActivity: extra.academic_activity === 1,
    securityRequested: extra.security_requested === 1,
    plottingRequested: extra.plotting_requested === 1,
    noteFromAdmin: extra.note_from_admin,
    decisionNote: extra.decision_note,
    cancelledAt: extra.cancelled_at,
    roomId: extra.room_id,
    roomFloor: extra.room_floor,
    roomCapacity: extra.room_capacity,
    roomCondition: extra.room_condition,
    roomNeedsPlotting: extra.room_needs_plotting === 1,
    sessions,
    facilities,
    approvals,
    attachments,
  };
}

export function findBookingByCode(code: string): BookingDetail | null {
  const row = queryOne<{ id: string }>(
    `SELECT id FROM bookings WHERE verification_code = ? AND status = 'APPROVED'`,
    [code.trim().toUpperCase()],
  );
  return row ? getBookingDetail(row.id) : null;
}

export function getOrganizationList(): Array<{
  id: string;
  name: string;
  kind: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  leaderName: string | null;
}> {
  return queryAll<{
    id: string;
    name: string;
    kind: string;
    status: "PENDING" | "VERIFIED" | "REJECTED";
    leader_name: string | null;
  }>(`SELECT id, name, kind, status, leader_name FROM organizations ORDER BY name`).map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    leaderName: row.leader_name,
  }));
}

export function listUsers(): Array<{
  id: string;
  name: string;
  email: string;
  role: Role;
  nimNidn: string | null;
  jurusan: string | null;
  phone: string | null;
  isActive: boolean;
  organizationName: string | null;
  organizationStatus: string | null;
  createdAt: string;
}> {
  return queryAll<{
    id: string;
    name: string;
    email: string;
    role: Role;
    nim_nidn: string | null;
    jurusan: string | null;
    phone: string | null;
    is_active: number;
    organization_name: string | null;
    organization_status: string | null;
    created_at: string;
  }>(
    `SELECT u.id, u.name, u.email, u.role, u.nim_nidn, u.jurusan, u.phone, u.is_active,
            o.name AS organization_name, o.status AS organization_status, u.created_at
     FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
     ORDER BY u.role, u.name`,
  ).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    nimNidn: row.nim_nidn,
    jurusan: row.jurusan,
    phone: row.phone,
    isActive: row.is_active === 1,
    organizationName: row.organization_name,
    organizationStatus: row.organization_status,
    createdAt: row.created_at,
  }));
}

export function getAuditLogs(limit = 120): Array<{
  id: string;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
}> {
  return queryAll<{
    id: string;
    actor_name: string | null;
    action: string;
    entity: string;
    entity_id: string;
    before_json: string | null;
    after_json: string | null;
    created_at: string;
  }>(
    `SELECT id, actor_name, action, entity, entity_id, before_json, after_json, created_at
     FROM audit_logs ORDER BY created_at DESC LIMIT ?`,
    [limit],
  ).map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    beforeJson: row.before_json,
    afterJson: row.after_json,
    createdAt: row.created_at,
  }));
}

export function getStats() {
  const today = todayWita();
  const to = addDays(today, 13);
  const days = eachDay(today, to).length;

  const counts = queryAll<{ status: BookingStatus; n: number }>(
    `SELECT status, COUNT(*) AS n FROM bookings GROUP BY status`,
  );
  const byStatus = Object.fromEntries(counts.map((row) => [row.status, Number(row.n)]));

  const totalRooms = queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM rooms WHERE is_active = 1`)?.n ?? 0;

  const approvedMinutes = queryOne<{ n: number | null }>(
    `SELECT SUM(
        (CAST(substr(s.end_time, 1, 2) AS INTEGER) * 60 + CAST(substr(s.end_time, 4, 2) AS INTEGER)) -
        (CAST(substr(s.start_time, 1, 2) AS INTEGER) * 60 + CAST(substr(s.start_time, 4, 2) AS INTEGER))
     ) AS n
     FROM booking_sessions s
     JOIN bookings b ON b.id = s.booking_id
     WHERE s.date BETWEEN ? AND ? AND b.status = 'APPROVED'`,
    [today, to],
  )?.n;

  const capacityMinutes = totalRooms * days * (minutesOf(OPERATING_END) - minutesOf(OPERATING_START));

  const topRooms = queryAll<{ code: string; name: string; n: number }>(
    `SELECT r.code, r.name, COUNT(*) AS n
     FROM booking_sessions s
     JOIN bookings b ON b.id = s.booking_id
     JOIN rooms r ON r.id = s.room_id
     WHERE b.status = 'APPROVED' AND s.date BETWEEN ? AND ?
     GROUP BY r.id ORDER BY n DESC LIMIT 5`,
    [today, to],
  ).map((row) => ({ code: row.code, name: row.name, count: Number(row.n) }));

  const pending = (byStatus.PENDING_ADMIN1 ?? 0) + (byStatus.PENDING_ADMIN2 ?? 0);
  const utilization =
    capacityMinutes > 0
      ? Math.round(((approvedMinutes ?? 0) / capacityMinutes) * 1000) / 10
      : 0;

  return {
    pending,
    approved: byStatus.APPROVED ?? 0,
    rejected: byStatus.REJECTED ?? 0,
    total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
    totalRooms,
    utilization,
    topRooms,
    byStatus,
    generatedAt: nowIso(),
  };
}

export function getNotifications(userId: string, limit = 30) {
  return queryAll<{
    id: string;
    title: string;
    body: string;
    href: string | null;
    is_read: number;
    created_at: string;
  }>(
    `SELECT id, title, body, href, is_read, created_at FROM notifications
     WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit],
  ).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    href: row.href,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
  }));
}

export function countUnread(userId: string): number {
  return (
    queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId],
    )?.n ?? 0
  );
}

export function getSettings(): Record<string, string> {
  return Object.fromEntries(
    queryAll<{ key: string; value: string }>(`SELECT key, value FROM settings`).map((row) => [
      row.key,
      row.value,
    ]),
  );
}

export function getAdminName(role: "ADMIN1" | "ADMIN2"): string | null {
  return (
    queryOne<{ name: string }>(`SELECT name FROM users WHERE role = ? ORDER BY created_at LIMIT 1`, [
      role,
    ])?.name ?? null
  );
}

/**
 * Skema relasional RuangIDB.
 *
 * Ditulis untuk SQLite (mode pengembangan/demo). Bentuk tabel, kunci asing, dan
 * constraint sengaja dibuat portabel ke PostgreSQL; lihat README untuk catatan
 * migrasi (EXCLUDE constraint + advisory lock untuk cek bentrok atomik).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS organizations (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  kind          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  leader_name   TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL
                  CHECK (role IN ('ADMIN1', 'ADMIN2', 'LECTURER', 'STUDENT', 'ORGANIZATION')),
  nim_nidn        TEXT,
  jurusan         TEXT,
  phone           TEXT,
  organization_id TEXT REFERENCES organizations(id),
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  building        TEXT NOT NULL,
  floor           INTEGER NOT NULL,
  category        TEXT NOT NULL,
  capacity        INTEGER NOT NULL,
  approval_class  TEXT NOT NULL CHECK (approval_class IN ('A', 'B', 'C')),
  condition       TEXT NOT NULL DEFAULT 'BAIK'
                  CHECK (condition IN ('BAIK', 'PERLU_PERAWATAN', 'RUSAK', 'DITUTUP')),
  needs_plotting  INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  notes           TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_facilities (
  id        TEXT PRIMARY KEY,
  room_id   TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  section   TEXT NOT NULL CHECK (section IN ('IT', 'OPERASIONAL', 'SECURITY', 'BAA')),
  qty       INTEGER NOT NULL DEFAULT 1,
  fixed     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bookings (
  id                   TEXT PRIMARY KEY,
  document_no          TEXT UNIQUE,
  verification_code    TEXT UNIQUE,
  requester_id         TEXT NOT NULL REFERENCES users(id),
  organization_id      TEXT REFERENCES organizations(id),
  borrower_type        TEXT NOT NULL
                       CHECK (borrower_type IN ('DOSEN', 'MAHASISWA', 'ORGANISASI')),
  requester_name       TEXT NOT NULL,
  requester_contact    TEXT NOT NULL,
  nim                  TEXT,
  jurusan              TEXT,
  org_name             TEXT,
  ketua_name           TEXT,
  ketua_nim            TEXT,
  sekretaris_name      TEXT,
  sekretaris_nim       TEXT,
  activity_name        TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  activity_type        TEXT NOT NULL,
  participants         INTEGER NOT NULL,
  room_id              TEXT NOT NULL REFERENCES rooms(id),
  status               TEXT NOT NULL
                       CHECK (status IN (
                         'DRAFT', 'PENDING_ADMIN1', 'PENDING_ADMIN2',
                         'APPROVED', 'REJECTED',
                         'REVISION', 'CANCELLED', 'COMPLETED'
                       )),
  academic_activity    INTEGER NOT NULL DEFAULT 0,
  security_requested   INTEGER NOT NULL DEFAULT 0,
  plotting_requested   INTEGER NOT NULL DEFAULT 0,
  note_from_admin      TEXT,
  decision_note        TEXT,
  submitted_at         TEXT,
  approved_at          TEXT,
  cancelled_at         TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_requester ON bookings(requester_id);

CREATE TABLE IF NOT EXISTS booking_sessions (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_id     TEXT NOT NULL REFERENCES rooms(id),
  date        TEXT NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_sessions_room_date ON booking_sessions(room_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_booking ON booking_sessions(booking_id);

CREATE TABLE IF NOT EXISTS booking_facilities (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  section     TEXT NOT NULL CHECK (section IN ('IT', 'OPERASIONAL', 'SECURITY', 'BAA')),
  qty         INTEGER NOT NULL DEFAULT 1,
  note        TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  filename    TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  path        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals (
  id             TEXT PRIMARY KEY,
  booking_id     TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  stage          TEXT NOT NULL CHECK (stage IN ('AUTO', 'ADMIN1', 'ADMIN2')),
  actor_id       TEXT REFERENCES users(id),
  actor_name     TEXT,
  decision       TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'REVISION', 'CANCELLED')),
  note           TEXT,
  room_check     INTEGER,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approvals_booking ON approvals(booking_id);

CREATE TABLE IF NOT EXISTS room_overrides (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  condition   TEXT CHECK (condition IN ('BAIK', 'PERLU_PERAWATAN', 'RUSAK', 'DITUTUP')),
  situation   TEXT CHECK (situation IN ('KOSONG', 'DITOLAK')),
  note        TEXT,
  updated_by  TEXT REFERENCES users(id),
  updated_at  TEXT NOT NULL,
  UNIQUE (room_id, date)
);

CREATE TABLE IF NOT EXISTS room_blocks (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  reason      TEXT NOT NULL,
  created_by  TEXT REFERENCES users(id),
  created_at  TEXT NOT NULL,
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_blocks_room_date ON room_blocks(room_id, date);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  href        TEXT,
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id),
  actor_name  TEXT,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  before_json TEXT,
  after_json  TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS email_outbox (
  id          TEXT PRIMARY KEY,
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  sent_at     TEXT
);

CREATE TABLE IF NOT EXISTS doc_counters (
  year         INTEGER PRIMARY KEY,
  last_number  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  ip          TEXT,
  success     INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS trg_bookings_capacity_insert
BEFORE INSERT ON bookings
FOR EACH ROW
WHEN NEW.status IN ('PENDING_ADMIN1', 'PENDING_ADMIN2', 'APPROVED')
  AND NEW.participants > (SELECT capacity FROM rooms WHERE id = NEW.room_id)
BEGIN
  SELECT RAISE(ABORT, 'CAPACITY_EXCEEDED');
END;

CREATE TRIGGER IF NOT EXISTS trg_bookings_capacity_update
BEFORE UPDATE OF participants, room_id ON bookings
FOR EACH ROW
WHEN NEW.status IN ('PENDING_ADMIN1', 'PENDING_ADMIN2', 'APPROVED')
  AND NEW.participants > (SELECT capacity FROM rooms WHERE id = NEW.room_id)
BEGIN
  SELECT RAISE(ABORT, 'CAPACITY_EXCEEDED');
END;
`;

import { execute, queryAll } from "./db";
import { newId } from "./ids";
import { nowIso } from "./time";

export function notify(input: {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
}): void {
  execute(
    `INSERT INTO notifications (id, user_id, title, body, href, is_read, created_at)
     VALUES (?,?,?,?,?,0,?)`,
    [newId("ntf"), input.userId, input.title, input.body, input.href ?? null, nowIso()],
  );
}

export function notifyRole(
  role: "ADMIN1" | "ADMIN2",
  input: { title: string; body: string; href?: string | null },
): void {
  const rows = queryAll<{ id: string }>(
    `SELECT id FROM users WHERE role = ? AND is_active = 1`,
    [role],
  );
  for (const row of rows) notify({ userId: row.id, ...input });
}

export function queueEmail(to: string, subject: string, body: string): void {
  execute(
    `INSERT INTO email_outbox (id, to_email, subject, body, created_at) VALUES (?,?,?,?,?)`,
    [newId("mail"), to, subject, body, nowIso()],
  );
}

export function sectionEmail(section: string): string | null {
  switch (section) {
    case "IT":
      return "it@idbbali.ac.id";
    case "OPERASIONAL":
      return "operasional@idbbali.ac.id";
    case "SECURITY":
      return "security@idbbali.ac.id";
    case "BAA":
      return "baa@idbbali.ac.id";
    default:
      return null;
  }
}

export function recordAudit(input: {
  actorId: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): void {
  execute(
    `INSERT INTO audit_logs (id, actor_id, actor_name, action, entity, entity_id, before_json, after_json, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      newId("log"),
      input.actorId,
      input.actorName,
      input.action,
      input.entity,
      input.entityId,
      input.before === undefined ? null : JSON.stringify(input.before),
      input.after === undefined ? null : JSON.stringify(input.after),
      nowIso(),
    ],
  );
}

import type { ZodType } from "zod";
import type { SessionUser } from "./auth";
import type { Role } from "./rbac";

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonFail(
  status: number,
  error: string,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ ok: false, error, ...extra }, { status });
}

export function can(role: Role | undefined, allowed: Role[]): boolean {
  return Boolean(role && allowed.includes(role));
}

export function forbidden(): Response {
  return jsonFail(403, "Anda tidak memiliki akses untuk aksi ini.");
}

export function unauthorized(): Response {
  return jsonFail(401, "Silakan masuk terlebih dahulu.");
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonFail(400, "Body JSON tidak valid.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      field: issue.path.map(String).join("."),
      message: issue.message,
    }));
    return {
      ok: false,
      response: jsonFail(422, issues[0]?.message ?? "Data tidak valid.", { issues }),
    };
  }
  return { ok: true, data: parsed.data };
}

export type ApiSession = SessionUser;

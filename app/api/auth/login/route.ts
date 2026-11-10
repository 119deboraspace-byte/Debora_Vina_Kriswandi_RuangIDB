import { z } from "zod";
import { clientIp, isSameOrigin, login, setSessionCookie } from "@/lib/auth";
import { jsonFail, jsonOk } from "@/lib/http";
import { ROLE_HOME } from "@/lib/rbac";

const schema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(422, parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }

  const result = login(parsed.data.email, parsed.data.password, clientIp(request));
  if (!result.ok || !result.user) {
    return jsonFail(401, result.error ?? "Gagal masuk.");
  }

  await setSessionCookie(result.user.id);
  return jsonOk({
    ok: true,
    user: { name: result.user.name, role: result.user.role },
    redirect: ROLE_HOME[result.user.role],
  });
}

import { isSameOrigin, setSessionCookie } from "@/lib/auth";
import { jsonFail, jsonOk } from "@/lib/http";
import { registerSchema, registerUser } from "@/lib/register";
import { ROLE_HOME } from "@/lib/rbac";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(422, parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }

  const result = registerUser(parsed.data);
  if (!result.ok) return jsonFail(409, result.error ?? "Pendaftaran gagal.");

  if (result.pending) {
    return jsonOk({
      ok: true,
      pending: true,
      message:
        "Pendaftaran diterima. Akun organisasi menunggu verifikasi Kemahasiswaan sebelum dapat masuk.",
    });
  }

  const { login } = await import("@/lib/auth");
  const session = login(parsed.data.email, parsed.data.password, null);
  if (session.ok && session.user) {
    await setSessionCookie(session.user.id);
    return jsonOk({ ok: true, redirect: ROLE_HOME[session.user.role] });
  }
  return jsonOk({ ok: true, redirect: "/login" });
}

import { markNotificationsRead } from "@/lib/admin";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { jsonFail, jsonOk, unauthorized } from "@/lib/http";

export async function PATCH(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  markNotificationsRead(user.id);
  return jsonOk({ ok: true });
}

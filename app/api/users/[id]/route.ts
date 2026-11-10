import { z } from "zod";
import { setUserActive } from "@/lib/admin";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { forbidden, jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN1") return forbidden();

  const { id } = await context.params;
  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const result = setUserActive(id, parsed.data.isActive, user);
  if (!result.ok) return jsonFail(422, result.error ?? "Gagal memperbarui pengguna.");
  return jsonOk({ ok: true });
}

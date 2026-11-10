import { deleteBlock } from "@/lib/admin";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { forbidden, jsonFail, jsonOk, unauthorized } from "@/lib/http";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN1") return forbidden();

  const { id } = await context.params;
  const result = deleteBlock(id, user);
  if (!result.ok) return jsonFail(422, result.error ?? "Gagal menghapus blokir.");
  return jsonOk({ ok: true });
}

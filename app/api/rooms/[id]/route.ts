import { z } from "zod";
import { updateRoomMaster } from "@/lib/admin";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { forbidden, jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  building: z.string().min(1).max(80).optional(),
  floor: z.coerce.number().int().min(0).max(20).optional(),
  category: z.string().min(1).max(60).optional(),
  capacity: z.coerce.number().int().min(1).max(1000).optional(),
  approvalClass: z.enum(["A", "B", "C"]).optional(),
  condition: z.enum(["BAIK", "PERLU_PERAWATAN", "RUSAK", "DITUTUP"]).optional(),
  isActive: z.boolean().optional(),
  needsPlotting: z.boolean().optional(),
  notes: z.string().max(300).nullable().optional(),
});

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

  const result = updateRoomMaster({ roomId: id, patch: parsed.data, actor: user });
  if (!result.ok) return jsonFail(422, result.error ?? "Gagal memperbarui ruangan.");
  return jsonOk({ ok: true });
}

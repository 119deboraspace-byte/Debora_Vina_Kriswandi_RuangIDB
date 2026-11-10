import { z } from "zod";
import { updateRoomState } from "@/lib/admin";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { forbidden, jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  condition: z.enum(["BAIK", "PERLU_PERAWATAN", "RUSAK", "DITUTUP"]).nullable().optional(),
  situation: z.enum(["KOSONG", "DITOLAK"]).nullable().optional(),
  note: z.string().max(200).nullable().optional(),
});

export async function PUT(
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

  const result = updateRoomState({
    roomId: id,
    date: parsed.data.date,
    condition: parsed.data.condition ?? null,
    situation: parsed.data.situation ?? null,
    note: parsed.data.note ?? null,
    actor: user,
  });
  if (!result.ok) return jsonFail(422, result.error ?? "Gagal memperbarui kondisi ruangan.");
  return jsonOk({ ok: true });
}

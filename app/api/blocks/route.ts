import { z } from "zod";
import { createBlock } from "@/lib/admin";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { forbidden, jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({
  roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().min(3, "Alasan wajib diisi.").max(200),
});

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN1") return forbidden();

  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const result = createBlock({ ...parsed.data, actor: user });
  if (!result.ok) return jsonFail(422, result.error ?? "Gagal menandai ruangan ditolak.");
  return jsonOk({ ok: true, id: result.id }, 201);
}

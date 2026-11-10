import { z } from "zod";
import { createRoom } from "@/lib/admin";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { forbidden, jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({
  code: z.string().min(1, "Kode ruangan wajib diisi.").max(30),
  name: z.string().min(2, "Nama ruangan wajib diisi.").max(120),
  building: z.string().min(1, "Gedung wajib diisi.").max(80),
  floor: z.coerce.number().int().min(0).max(20),
  category: z.string().min(1).max(60),
  capacity: z.coerce.number().int().min(1).max(1000),
  approvalClass: z.enum(["A", "B", "C"]),
  condition: z.enum(["BAIK", "PERLU_PERAWATAN", "RUSAK", "DITUTUP"]).default("BAIK"),
  needsPlotting: z.boolean().default(false),
  notes: z.string().max(300).nullable().optional(),
});

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN1") return forbidden();

  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const result = createRoom({
    ...parsed.data,
    notes: parsed.data.notes ?? null,
    actor: user,
  });
  if (!result.ok) return jsonFail(422, result.error ?? "Gagal menambah ruangan.");
  return jsonOk({ ok: true, id: result.id }, 201);
}

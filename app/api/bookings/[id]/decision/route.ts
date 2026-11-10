import { z } from "zod";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { decideBooking } from "@/lib/bookings";
import { forbidden, jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "REVISION"]),
  note: z.string().max(500).optional(),
  roomChecked: z.boolean().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN1" && user.role !== "ADMIN2") return forbidden();

  const { id } = await context.params;
  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const result = decideBooking({
    bookingId: id,
    actor: user,
    decision: parsed.data.decision,
    note: parsed.data.note,
    roomChecked: parsed.data.roomChecked,
  });
  if (!result.ok) return jsonFail(422, result.error ?? "Keputusan gagal disimpan.");
  return jsonOk({ ok: true, status: result.status });
}

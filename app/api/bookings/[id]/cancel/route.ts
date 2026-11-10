import { z } from "zod";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { cancelBooking } from "@/lib/bookings";
import { jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

const schema = z.object({
  reason: z.string().max(400).default(""),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const result = cancelBooking({ bookingId: id, actor: user, reason: parsed.data.reason });
  if (!result.ok) return jsonFail(422, result.error ?? "Pembatalan gagal.");
  return jsonOk({ ok: true, status: result.status });
}

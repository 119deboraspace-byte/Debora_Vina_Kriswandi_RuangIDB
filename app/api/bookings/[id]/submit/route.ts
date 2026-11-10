import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { submitBooking } from "@/lib/bookings";
import { jsonFail, jsonOk, unauthorized } from "@/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const result = submitBooking(id, user);
  if (!result.ok) {
    return jsonFail(422, result.error ?? "Pengajuan gagal dikirim.", { issues: result.issues ?? [] });
  }
  return jsonOk({ ok: true, bookingId: result.bookingId, status: result.status });
}

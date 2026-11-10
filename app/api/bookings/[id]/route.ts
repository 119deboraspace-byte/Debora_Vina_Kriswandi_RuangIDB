import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { bookingSchema, updateBooking } from "@/lib/bookings";
import { jsonFail, jsonOk, parseBody, unauthorized } from "@/lib/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const parsed = await parseBody(request, bookingSchema);
  if (!parsed.ok) return parsed.response;

  const result = updateBooking({ bookingId: id, payload: parsed.data, user });
  if (!result.ok) {
    return jsonFail(422, result.error ?? "Pengajuan gagal diperbarui.", {
      issues: result.issues ?? [],
    });
  }
  return jsonOk({
    ok: true,
    bookingId: result.bookingId,
    status: result.status,
    redirect: `/pengajuan/${result.bookingId}`,
  });
}

import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { bookingSchema, createBooking } from "@/lib/bookings";
import { jsonFail, jsonOk, parseBody } from "@/lib/http";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return jsonFail(401, "Silakan masuk terlebih dahulu.");

  const parsed = await parseBody(request, bookingSchema);
  if (!parsed.ok) return parsed.response;

  const result = createBooking(parsed.data, user);
  if (!result.ok) {
    return jsonFail(422, result.error ?? "Pengajuan gagal dibuat.", { issues: result.issues ?? [] });
  }
  return jsonOk(
    {
      ok: true,
      bookingId: result.bookingId,
      status: result.status,
      redirect: `/pengajuan/${result.bookingId}?baru=1`,
    },
    201,
  );
}

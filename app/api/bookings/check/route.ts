import { getSessionUser } from "@/lib/auth";
import { bookingSchema, checkSlots } from "@/lib/bookings";
import { jsonFail, jsonOk, parseBody } from "@/lib/http";

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return jsonFail(401, "Silakan masuk terlebih dahulu.");

  const parsed = await parseBody(request, bookingSchema);
  if (!parsed.ok) return parsed.response;

  const result = checkSlots(parsed.data, user, { skipAgreement: true });
  return jsonOk(result);
}

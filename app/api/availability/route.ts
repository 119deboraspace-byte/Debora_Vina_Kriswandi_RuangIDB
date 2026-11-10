import { getSessionUser } from "@/lib/auth";
import { getAvailability } from "@/lib/data";
import { jsonFail, jsonOk } from "@/lib/http";
import { addDays, todayWita } from "@/lib/time";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const today = todayWita();
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : today;
  const maxTo = addDays(from, 13);
  const to = toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam) && toParam <= maxTo ? toParam : maxTo;

  if (from > to) return jsonFail(422, "Rentang tanggal tidak valid.");

  const user = await getSessionUser();
  const payload = getAvailability(from, to, {
    name: user?.name ?? null,
    role: user?.role ?? null,
  });
  return jsonOk(payload);
}

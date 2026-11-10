import { queryOne } from "@/lib/db";
import { jsonOk } from "@/lib/http";
import { nowIso, todayWita } from "@/lib/time";

export async function GET(): Promise<Response> {
  const counts = queryOne<{ rooms: number; bookings: number }>(
    `SELECT (SELECT COUNT(*) FROM rooms) AS rooms, (SELECT COUNT(*) FROM bookings) AS bookings`,
  );
  return jsonOk({
    ok: true,
    service: "RuangIDB",
    timezone: "Asia/Makassar (WITA)",
    today: todayWita(),
    checkedAt: nowIso(),
    appUrl: process.env.APP_URL ?? null,
    database: { rooms: counts?.rooms ?? 0, bookings: counts?.bookings ?? 0 },
  });
}

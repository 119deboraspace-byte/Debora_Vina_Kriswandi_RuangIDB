import { clearSessionCookie, isSameOrigin } from "@/lib/auth";
import { jsonFail, jsonOk } from "@/lib/http";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  await clearSessionCookie();
  return jsonOk({ ok: true });
}

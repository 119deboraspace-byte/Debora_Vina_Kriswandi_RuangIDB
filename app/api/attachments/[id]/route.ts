import fs from "node:fs";
import path from "node:path";
import { getSessionUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { jsonFail } from "@/lib/http";
import { UPLOAD_DIR } from "@/lib/paths";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return jsonFail(401, "Silakan masuk terlebih dahulu.");

  const { id } = await context.params;
  const attachment = queryOne<{
    id: string;
    filename: string;
    mime: string;
    path: string;
    uploaded_by: string;
    booking_id: string | null;
  }>(`SELECT id, filename, mime, path, uploaded_by, booking_id FROM attachments WHERE id = ?`, [id]);
  if (!attachment) return jsonFail(404, "Lampiran tidak ditemukan.");

  const isAdmin = user.role === "ADMIN1" || user.role === "ADMIN2";
  if (!isAdmin && attachment.uploaded_by !== user.id) {
    return jsonFail(403, "Tidak berwenang membuka lampiran ini.");
  }

  const filePath = path.join(UPLOAD_DIR, attachment.path);
  if (!fs.existsSync(filePath)) return jsonFail(404, "File lampiran tidak ada di server.");

  const buffer = fs.readFileSync(filePath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mime,
      "Content-Disposition": `inline; filename="${attachment.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

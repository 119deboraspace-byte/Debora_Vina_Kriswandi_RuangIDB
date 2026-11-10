import fs from "node:fs";
import path from "node:path";
import { getSessionUser, isSameOrigin } from "@/lib/auth";
import { execute } from "@/lib/db";
import { newId } from "@/lib/ids";
import { UPLOAD_DIR } from "@/lib/paths";
import { jsonFail, jsonOk, unauthorized } from "@/lib/http";
import { nowIso } from "@/lib/time";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonFail(403, "Permintaan lintas-origin ditolak.");
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const form = await request.formData().catch(() => null);
  if (!form) return jsonFail(400, "Form upload tidak valid.");
  const file = form.get("file");
  if (!(file instanceof File)) return jsonFail(400, "File wajib diunggah.");
  if (file.size > MAX_SIZE) return jsonFail(413, "Ukuran file maksimal 5 MB.");
  if (!ALLOWED.has(file.type)) return jsonFail(415, "Format harus PDF, JPG, atau PNG.");

  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const stored = `${newId("upl")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), buffer);

  const id = newId("att");
  execute(
    `INSERT INTO attachments (id, booking_id, uploaded_by, filename, mime, size, path, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, null, user.id, file.name.slice(0, 160), file.type, file.size, stored, nowIso()],
  );

  return jsonOk({ ok: true, id, filename: file.name, size: file.size }, 201);
}

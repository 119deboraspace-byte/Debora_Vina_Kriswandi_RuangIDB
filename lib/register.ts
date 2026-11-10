import { z } from "zod";
import { execute, queryOne } from "./db";
import { newId } from "./ids";
import { hashPassword } from "./password";
import { notifyRole, recordAudit } from "./notify";
import { nowIso } from "./time";

export const registerSchema = z.object({
  name: z.string().min(2, "Nama lengkap wajib diisi.").max(120),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72),
  role: z.enum(["STUDENT", "LECTURER", "ORGANIZATION"], {
    message: "Pilih jenis akun.",
  }),
  nimNidn: z.string().max(30).optional().nullable(),
  jurusan: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  organizationId: z.string().max(60).optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export function registerUser(input: RegisterInput): { ok: boolean; error?: string; pending?: boolean } {
  const email = input.email.trim().toLowerCase();
  const existing = queryOne<{ id: string }>(`SELECT id FROM users WHERE lower(email) = ?`, [email]);
  if (existing) return { ok: false, error: "Email sudah terdaftar." };

  if (input.role === "STUDENT" && (!input.nimNidn || !input.jurusan)) {
    return { ok: false, error: "NIM dan jurusan wajib diisi untuk akun mahasiswa." };
  }

  let organizationId: string | null = null;
  let pending = false;
  if (input.role === "ORGANIZATION") {
    if (!input.organizationId) return { ok: false, error: "Pilih organisasi mahasiswa." };
    const org = queryOne<{ id: string; name: string; status: string }>(
      `SELECT id, name, status FROM organizations WHERE id = ?`,
      [input.organizationId],
    );
    if (!org) return { ok: false, error: "Organisasi tidak ditemukan." };
    organizationId = org.id;
    pending = true;
  }

  const userId = newId("user");
  execute(
    `INSERT INTO users (id, name, email, password_hash, role, nim_nidn, jurusan, phone, organization_id, is_active, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      userId,
      input.name.trim(),
      email,
      hashPassword(input.password),
      input.role,
      input.nimNidn?.trim() || null,
      input.jurusan?.trim() || null,
      input.phone?.trim() || null,
      organizationId,
      pending ? 0 : 1,
      nowIso(),
    ],
  );

  recordAudit({
    actorId: userId,
    actorName: input.name,
    action: "REGISTER",
    entity: "user",
    entityId: userId,
    after: { role: input.role, pending },
  });

  if (pending) {
    notifyRole("ADMIN2", {
      title: "Akun organisasi baru",
      body: `${input.name} mendaftar untuk organisasi. Verifikasi akun agar dapat mengajukan peminjaman.`,
      href: "/admin/pengguna",
    });
  }

  return { ok: true, pending };
}

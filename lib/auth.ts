import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { execute, queryAll, queryOne } from "./db";
import { verifyPassword } from "./password";
import { DATA_DIR } from "./paths";
import type { Role } from "./rbac";
import { nowIso } from "./time";

const COOKIE_NAME = "ruangidb_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 8;

let runtimeSecret: string | null = null;

/**
 * Vercel tidak menyediakan filesystem persisten. Untuk demo, bila AUTH_SECRET
 * belum diatur, buat secret acak di DATA_DIR (per instance) agar login tidak
 * 500. Produksi tetap wajib memakai AUTH_SECRET dari environment.
 */
function demoRuntimeSecret(): string {
  if (runtimeSecret) return runtimeSecret;
  const file = path.join(DATA_DIR, ".auth-secret");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing.length >= 32) {
      runtimeSecret = existing;
      return existing;
    }
  } catch {
    // belum ada; buat baru
  }
  const generated = randomBytes(48).toString("base64url");
  try {
    fs.writeFileSync(file, generated, { mode: 0o600 });
  } catch {
    // tetap pakai secret di memori bila file tidak dapat ditulis
  }
  runtimeSecret = generated;
  return generated;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    if (process.env.VERCEL === "1") {
      console.warn(
        "[RuangIDB] AUTH_SECRET belum diatur di Vercel; memakai secret demo sementara. Set AUTH_SECRET untuk produksi.",
      );
      return demoRuntimeSecret();
    }
    throw new Error("AUTH_SECRET wajib diatur di lingkungan produksi.");
  }
  return "ruangidb-dev-secret-change-me";
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  nim_nidn: string | null;
  jurusan: string | null;
  phone: string | null;
  organization_id: string | null;
  is_active: number;
  org_name: string | null;
  org_status: string | null;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  nimNidn: string | null;
  jurusan: string | null;
  phone: string | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationStatus: "PENDING" | "VERIFIED" | "REJECTED" | null;
  isActive: boolean;
}

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.nim_nidn, u.jurusan, u.phone,
         u.organization_id, u.is_active, o.name AS org_name, o.status AS org_status
  FROM users u
  LEFT JOIN organizations o ON o.id = u.organization_id
`;

function mapUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    nimNidn: row.nim_nidn,
    jurusan: row.jurusan,
    phone: row.phone,
    organizationId: row.organization_id,
    organizationName: row.org_name,
    organizationStatus: (row.org_status as SessionUser["organizationStatus"]) ?? null,
    isActive: row.is_active === 1,
  };
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.sub;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  const secure =
    process.env.COOKIE_SECURE === "false"
      ? false
      : process.env.COOKIE_SECURE === "true"
        ? true
        : process.env.NODE_ENV === "production";
  store.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  const row = queryOne<UserRow>(`${USER_SELECT} WHERE u.id = ?`, [userId]);
  if (!row || row.is_active !== 1) return null;
  return mapUser(row);
});

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireUser(["ADMIN1", "ADMIN2"]);
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  user?: SessionUser;
}

export function login(email: string, password: string, ip: string | null): LoginResult {
  const normalized = email.trim().toLowerCase();
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000).toISOString();
  const failures = queryAll<{ id: string }>(
    `SELECT id FROM login_attempts
     WHERE email = ? AND success = 0 AND created_at > ?`,
    [normalized, since],
  ).length;

  if (failures >= MAX_FAILED_ATTEMPTS) {
    return {
      ok: false,
      error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${LOGIN_WINDOW_MINUTES} menit.`,
    };
  }

  const row = queryOne<UserRow & { password_hash: string }>(
    `SELECT u.*, o.name AS org_name, o.status AS org_status
     FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE lower(u.email) = ?`,
    [normalized],
  );

  const success = Boolean(row && verifyPassword(password, row.password_hash));
  execute(
    `INSERT INTO login_attempts (id, email, ip, success, created_at) VALUES (?, ?, ?, ?, ?)`,
    [
      `att_${randomBytes(10).toString("hex")}`,
      normalized,
      ip,
      success ? 1 : 0,
      nowIso(),
    ],
  );

  if (!row || !success) {
    return { ok: false, error: "Email atau kata sandi tidak sesuai." };
  }
  if (row.is_active !== 1) {
    if (row.role === "ORGANIZATION") {
      return {
        ok: false,
        error: "Akun organisasi belum diverifikasi Kemahasiswaan.",
      };
    }
    return { ok: false, error: "Akun Anda tidak aktif. Hubungi Admin." };
  }
  if (row.role === "ORGANIZATION" && row.org_status !== "VERIFIED") {
    return {
      ok: false,
      error: "Akun organisasi belum diverifikasi Kemahasiswaan.",
    };
  }
  return { ok: true, user: mapUser(row) };
}

export function findUserByEmail(email: string): SessionUser | null {
  const row = queryOne<UserRow>(`${USER_SELECT} WHERE lower(u.email) = ?`, [
    email.trim().toLowerCase(),
  ]);
  return row ? mapUser(row) : null;
}

/** Tolak permintaan lintas-origin pada route mutasi (proteksi CSRF sederhana). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

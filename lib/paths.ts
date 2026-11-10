import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Satu direktori data untuk SQLite, WAL, dan lampiran.
 *
 * Di Vercel filesystem proyek bersifat read-only; satu-satunya lokasi yang
 * dapat ditulis adalah os.tmpdir() (/tmp). Data di sana bersifat sementara
 * dan hilang saat instance didaur ulang. Untuk produksi dengan data permanen,
 * gunakan PostgreSQL/Supabase atau host dengan volume persisten (lihat README).
 */
const isVercel = process.env.VERCEL === "1";

function writableDir(candidate: string): boolean {
  try {
    fs.mkdirSync(candidate, { recursive: true });
    fs.accessSync(candidate, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveDataDir(): string {
  const candidates = [
    process.env.DATA_DIR,
    isVercel ? path.join(os.tmpdir(), "ruangidb") : path.join(process.cwd(), "data"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (writableDir(candidate)) return candidate;
  }

  // Fallback terakhir: tmpdir sistem (bisa gagal juga bila environment benar-
  // benar read-only, tetapi Vercel selalu menyediakan /tmp).
  const fallback = path.join(os.tmpdir(), "ruangidb");
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

export const DATA_DIR = resolveDataDir();

function resolveDbPath(): string {
  const configured = process.env.DB_PATH;
  if (configured && writableDir(path.dirname(configured))) return configured;
  return path.join(DATA_DIR, "ruangidb.db");
}

function resolveUploadDir(): string {
  const configured = process.env.UPLOAD_DIR;
  if (configured && writableDir(configured)) return configured;
  return path.join(DATA_DIR, "uploads");
}

export const DB_PATH = resolveDbPath();
export const UPLOAD_DIR = resolveUploadDir();

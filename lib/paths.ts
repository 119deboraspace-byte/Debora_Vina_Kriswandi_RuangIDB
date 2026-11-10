import path from "node:path";

/**
 * Satu direktori data untuk SQLite, WAL, dan lampiran.
 * Di hosting container, mount volume persisten ke DATA_DIR (mis. /app/data).
 */
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
export const DB_PATH = process.env.DB_PATH ?? path.join(DATA_DIR, "ruangidb.db");
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(DATA_DIR, "uploads");

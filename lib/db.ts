import { DatabaseSync, type StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { DB_PATH } from "./paths";
import { SCHEMA_SQL } from "./schema";
import { seedInitialData } from "./seed";

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec(SCHEMA_SQL);
  seedInitialData(db);
  instance = db;
  return db;
}

export function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  const stmt: StatementSync = getDb().prepare(sql);
  return stmt.all(...(params as never[])) as T[];
}

export function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const stmt: StatementSync = getDb().prepare(sql);
  const row = stmt.get(...(params as never[]));
  return (row as T | undefined) ?? null;
}

export function execute(sql: string, params: unknown[] = []): void {
  const stmt: StatementSync = getDb().prepare(sql);
  stmt.run(...(params as never[]));
}

/**
 * Transaksi IMMEDIATE memegang write-lock SQLite sebelum membaca jadwal.
 * Inilah yang membuat cek bentrok + insert atomik: dua pengajuan serentak
 * tidak bisa sama-sama lolos. Di PostgreSQL padanannya adalah transaksi
 * SERIALIZABLE/advisory lock plus EXCLUDE constraint pada rentang waktu.
 */
export function withImmediateTransaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE;");
  try {
    const result = fn(db);
    db.exec("COMMIT;");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // rollback best-effort; error asli tetap dilempar
    }
    throw error;
  }
}

export function json<T>(value: T): string {
  return JSON.stringify(value);
}

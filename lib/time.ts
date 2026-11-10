/**
 * Semua tanggal dan jam di aplikasi ini adalah waktu kampus (WITA, UTC+8).
 * Tanggal disimpan sebagai `YYYY-MM-DD` dan jam sebagai `HH:MM` supaya
 * perbandingan jadwal tidak pernah bergantung pada zona waktu server.
 */

export const WITA_TZ = "Asia/Makassar";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const MONTHS_ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

export function todayWita(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WITA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function nowWitaTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: WITA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}

function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export function isSunday(date: string): boolean {
  return parseDate(date).getUTCDay() === 0;
}

export function formatDateId(date: string, style: "long" | "short" = "long"): string {
  const d = parseDate(date);
  const day = style === "long" ? DAYS[d.getUTCDay()] : DAYS_SHORT[d.getUTCDay()];
  const month = style === "long" ? MONTHS[d.getUTCMonth()] : MONTHS_SHORT[d.getUTCMonth()];
  return `${day}, ${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

export function formatDateShort(date: string): string {
  const d = parseDate(date);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function formatDateNumeric(date: string): string {
  const d = parseDate(date);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function monthRoman(date: string): string {
  return MONTHS_ROMAN[parseDate(date).getUTCMonth()];
}

export function formatTime(time: string): string {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}.${minuteRaw ?? "00"} ${period}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)} WITA`;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = new Intl.DateTimeFormat("id-ID", {
    timeZone: WITA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: WITA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${date}, ${time.replace(":", ".")} WITA`;
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function durationMinutes(start: string, end: string): number {
  return minutesOf(end) - minutesOf(start);
}

/** Dua rentang [start, end) beririsan bila start < otherEnd dan otherStart < end. */
export function overlaps(
  start: string,
  end: string,
  otherStart: string,
  otherEnd: string,
): boolean {
  return start < otherEnd && otherStart < end;
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** Jumlah hari kerja (Senin–Jumat) yang sudah berlalu sejak sebuah timestamp. */
export function workingDaysSince(iso: string): number {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return 0;
  const today = new Date();
  let count = 0;
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor < end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export function isOverduePending(createdIso: string): boolean {
  return workingDaysSince(createdIso) > 2;
}

export const OPERATING_START = "07:00";
export const OPERATING_END = "20:00";

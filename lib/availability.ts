import type {
  AvailabilityPayload,
  AvailabilitySession,
  RoomBlock,
  RoomOverride,
  RoomView,
} from "./data";
import type { RoomCondition, RoomSituation } from "./rbac";
import { isSunday } from "./time";

export interface DayCell {
  condition: RoomCondition;
  situation: RoomSituation;
  sessions: AvailabilitySession[];
  blocks: RoomBlock[];
  note: string | null;
}

export function effectiveCondition(room: RoomView, override?: RoomOverride): RoomCondition {
  return override?.condition ?? room.condition;
}

/**
 * Prioritas situasi satu sel (ruangan x tanggal):
 * 1. ruangan nonaktif / kondisi Rusak / Ditutup / override Ditolak -> DITOLAK
 * 2. ada sesi Disetujui -> TERPAKAI
 * 3. ada sesi menunggu -> MENUNGGU_APPROVE
 * 4. admin memaksa Kosong -> KOSONG
 * 5. slot ditutup admin (kuliah/ujian/perawatan) -> DITOLAK
 */
export function deriveSituation(
  room: RoomView,
  sessions: AvailabilitySession[],
  blocks: RoomBlock[],
  override: RoomOverride | undefined,
  date?: string,
): RoomSituation {
  if (!room.isActive) return "DITOLAK";
  const condition = effectiveCondition(room, override);
  if (condition === "RUSAK" || condition === "DITUTUP") return "DITOLAK";
  if (override?.situation === "DITOLAK") return "DITOLAK";
  if (date && (room.code === "AULA" || room.category.toLowerCase() === "aula") && isSunday(date)) {
    return "DITOLAK";
  }
  if (sessions.some((s) => s.status === "APPROVED")) return "TERPAKAI";
  if (sessions.some((s) => s.status === "PENDING_ADMIN1" || s.status === "PENDING_ADMIN2")) {
    return "MENUNGGU_APPROVE";
  }
  if (override?.situation === "KOSONG") return "KOSONG";
  if (blocks.length > 0) return "DITOLAK";
  return "KOSONG";
}

export function buildDayCells(payload: AvailabilityPayload): Map<string, Map<string, DayCell>> {
  const sessionsByRoomDate = new Map<string, AvailabilitySession[]>();
  for (const session of payload.sessions) {
    const key = `${session.roomId}|${session.date}`;
    const list = sessionsByRoomDate.get(key) ?? [];
    list.push(session);
    sessionsByRoomDate.set(key, list);
  }

  const blocksByRoomDate = new Map<string, RoomBlock[]>();
  for (const block of payload.blocks) {
    const key = `${block.roomId}|${block.date}`;
    const list = blocksByRoomDate.get(key) ?? [];
    list.push(block);
    blocksByRoomDate.set(key, list);
  }

  const overrides = new Map<string, RoomOverride>();
  for (const override of payload.overrides) {
    overrides.set(`${override.roomId}|${override.date}`, override);
  }

  const result = new Map<string, Map<string, DayCell>>();
  for (const room of payload.rooms) {
    const byDate = new Map<string, DayCell>();
    let cursor = payload.from;
    while (cursor <= payload.to) {
      const key = `${room.id}|${cursor}`;
      const sessions = (sessionsByRoomDate.get(key) ?? []).sort((a, b) => a.start.localeCompare(b.start));
      const blocks = blocksByRoomDate.get(key) ?? [];
      const override = overrides.get(key);
      byDate.set(cursor, {
        condition: effectiveCondition(room, override),
        situation: deriveSituation(room, sessions, blocks, override, cursor),
        sessions,
        blocks,
        note: override?.note ?? null,
      });
      cursor = nextDay(cursor);
    }
    result.set(room.id, byDate);
  }
  return result;
}

function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export const SITUATION_STYLE: Record<
  RoomSituation,
  { label: string; cell: string; dot: string; text: string }
> = {
  KOSONG: {
    label: "Kosong",
    cell: "bg-[var(--ok-soft)] border-[var(--ok-line)] hover:bg-[var(--ok-soft-2)]",
    dot: "bg-[var(--ok)]",
    text: "text-[var(--ok)]",
  },
  TERPAKAI: {
    label: "Terpakai",
    cell: "bg-[var(--busy-soft)] border-[var(--busy-line)] hover:bg-[var(--busy-soft-2)]",
    dot: "bg-[var(--busy)]",
    text: "text-[var(--busy)]",
  },
  MENUNGGU_APPROVE: {
    label: "Menunggu Approve",
    cell: "bg-[var(--hold-soft)] border-[var(--hold-line)] hover:bg-[var(--hold-soft-2)]",
    dot: "bg-[var(--hold)]",
    text: "text-[var(--hold)]",
  },
  DITOLAK: {
    label: "Ditolak",
    cell: "bg-[var(--blocked-soft)] border-[var(--blocked-line)] hover:bg-[var(--blocked-soft-2)]",
    dot: "bg-[var(--blocked)]",
    text: "text-[var(--blocked)]",
  },
};

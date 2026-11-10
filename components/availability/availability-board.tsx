"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  FilterX,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  ShieldBan,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { SituationBadge } from "@/components/situation-badge";
import { buildDayCells, SITUATION_STYLE } from "@/lib/availability";
import type {
  AvailabilityPayload,
  AvailabilitySession,
  RoomBlock,
  RoomOverride,
  RoomView,
} from "@/lib/data";
import {
  CONDITION_LABEL,
  SITUATION_LABEL,
  type RoomCondition,
  type RoomSituation,
} from "@/lib/rbac";
import {
  eachDay,
  formatDateId,
  formatDateShort,
  formatTime,
  formatTimeRange,
} from "@/lib/time";
import { TimePicker } from "@/components/ui/time-picker";

interface TableRow {
  key: string;
  room: RoomView;
  date: string;
  session?: AvailabilitySession;
  block?: RoomBlock;
  condition: RoomCondition;
  situation: RoomSituation;
  overrideCondition: RoomCondition | null;
  overrideSituation: RoomSituation | null;
  overrideNote: string | null;
}

const CONDITION_TONE: Record<RoomCondition, string> = {
  BAIK: "text-[var(--ok)]",
  PERLU_PERAWATAN: "text-[var(--hold)]",
  RUSAK: "text-[var(--busy)]",
  DITUTUP: "text-[var(--busy)]",
};

export function AvailabilityBoard({
  initial,
  canEdit,
  isAdmin,
  canBook,
  initialRoomId,
  initialDate,
  initialView = "list",
}: {
  initial: AvailabilityPayload;
  canEdit: boolean;
  isAdmin: boolean;
  canBook: boolean;
  initialRoomId?: string;
  initialDate?: string;
  initialView?: "list" | "grid";
}) {
  const [payload, setPayload] = useState(initial);
  const [view, setView] = useState<"list" | "grid">(initialView);
  const [day, setDay] = useState(initialDate ?? initial.today);
  const [allDates, setAllDates] = useState(false);
  const [roomFilter, setRoomFilter] = useState<string | undefined>(initialRoomId);
  const [q, setQ] = useState("");
  const [building, setBuilding] = useState("");
  const [approvalClass, setApprovalClass] = useState("");
  const [situationFilter, setSituationFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState<{ roomId: string; date: string } | null>(null);
  const [blockForm, setBlockForm] = useState({ start: "08:00", end: "10:00", reason: "" });
  const [deleting, setDeleting] = useState<{ block: RoomBlock; room: RoomView } | null>(null);
  const [refreshError, setRefreshError] = useState(false);

  const days = useMemo(() => eachDay(payload.from, payload.to), [payload.from, payload.to]);
  const cells = useMemo(() => buildDayCells(payload), [payload]);
  const today = payload.today;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/availability?from=${payload.from}&to=${payload.to}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setRefreshError(true);
        return;
      }
      setPayload((await response.json()) as AvailabilityPayload);
      setRefreshError(false);
    } catch {
      setRefreshError(true);
    }
  }, [payload.from, payload.to]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const buildings = useMemo(
    () => Array.from(new Set(payload.rooms.map((room) => room.building))),
    [payload.rooms],
  );

  const overrideMap = useMemo(() => {
    const map = new Map<string, RoomOverride>();
    for (const override of payload.overrides) map.set(`${override.roomId}|${override.date}`, override);
    return map;
  }, [payload.overrides]);

  const rooms = useMemo(
    () =>
      payload.rooms.filter((room) => {
        if (roomFilter && room.id !== roomFilter) return false;
        if (building && room.building !== building) return false;
        if (approvalClass && room.approvalClass !== approvalClass) return false;
        return true;
      }),
    [payload.rooms, roomFilter, building, approvalClass],
  );

  const rows = useMemo<TableRow[]>(() => {
    const dates = allDates ? days : [day];
    const out: TableRow[] = [];

    for (const room of rooms) {
      for (const date of dates) {
        const cell = cells.get(room.id)?.get(date);
        if (!cell) continue;
        const override = overrideMap.get(`${room.id}|${date}`);
        const base = {
          room,
          date,
          condition: cell.condition,
          overrideCondition: override?.condition ?? null,
          overrideSituation: override?.situation ?? null,
          overrideNote: override?.note ?? null,
        };

        if (cell.sessions.length > 0) {
          for (const session of cell.sessions) {
            out.push({
              ...base,
              key: `${room.id}|${date}|${session.id}`,
              session,
              situation:
                session.status === "APPROVED"
                  ? "TERPAKAI"
                  : "MENUNGGU_APPROVE",
            });
          }
        } else {
          out.push({
            ...base,
            key: `${room.id}|${date}|empty`,
            situation: cell.situation,
            block: cell.blocks[0],
          });
        }
      }
    }

    const needle = q.trim().toLowerCase();
    return out
      .filter((row) => {
        if (situationFilter && row.situation !== situationFilter) return false;
        if (conditionFilter && row.condition !== conditionFilter) return false;
        if (!needle) return true;
        return [
          row.room.code,
          row.room.name,
          row.room.building,
          row.session?.activityName,
          row.session?.requesterName,
          row.session?.orgName,
          row.block?.reason,
          row.overrideNote,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        const roomOrder = payload.rooms.findIndex((room) => room.id === a.room.id) - payload.rooms.findIndex((room) => room.id === b.room.id);
        if (roomOrder !== 0) return roomOrder;
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.session?.start ?? "99").localeCompare(b.session?.start ?? "99");
      });
  }, [
    allDates,
    approvalClass,
    building,
    cells,
    conditionFilter,
    day,
    days,
    overrideMap,
    payload.rooms,
    q,
    roomFilter,
    rooms,
    situationFilter,
  ]);

  const counts = useMemo(() => {
    const target = allDates ? payload.today : day;
    const result: Record<RoomSituation, number> = {
      KOSONG: 0,
      TERPAKAI: 0,
      MENUNGGU_APPROVE: 0,
      DITOLAK: 0,
    };
    for (const room of rooms) {
      const cell = cells.get(room.id)?.get(target);
      if (cell) result[cell.situation] += 1;
    }
    return result;
  }, [allDates, cells, day, payload.today, rooms]);

  const activeFilters =
    Boolean(q) || Boolean(building) || Boolean(approvalClass) || Boolean(situationFilter) || Boolean(conditionFilter) || Boolean(roomFilter);

  function resetFilters() {
    setQ("");
    setBuilding("");
    setApprovalClass("");
    setSituationFilter("");
    setConditionFilter("");
    setRoomFilter(undefined);
  }

  async function saveState(
    row: TableRow,
    patch: { condition?: RoomCondition | null; situation?: RoomSituation | null },
  ) {
    setSaving(row.key);
    try {
      const response = await fetch(`/api/rooms/${row.room.id}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: row.date,
          condition: patch.condition !== undefined ? patch.condition : row.overrideCondition,
          situation: patch.situation !== undefined ? patch.situation : row.overrideSituation,
          note: row.overrideNote,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setToast(data.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      setToast("Perubahan kondisi tersimpan.");
      await refresh();
    } catch {
      setToast("Tidak dapat menghubungi server.");
    } finally {
      setSaving(null);
    }
  }

  async function submitBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockTarget) return;
    const response = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...blockTarget, ...blockForm }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setToast(data.error ?? "Gagal menandai ruangan ditolak.");
      return;
    }
    setBlockOpen(false);
    setBlockForm({ start: "08:00", end: "10:00", reason: "" });
    setToast("Ruangan ditandai ditolak. Pengaju terdampak menerima notifikasi.");
    await refresh();
  }

  async function removeBlock() {
    if (!deleting) return;
    const response = await fetch(`/api/blocks/${deleting.block.id}`, { method: "DELETE" });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setToast(data.error ?? "Gagal membuka ruangan.");
      return;
    }
    setDeleting(null);
    setToast("Penandaan ditolak dibuka kembali.");
    await refresh();
  }

  function openBlock(target: { roomId: string; date: string }) {
    setBlockTarget(target);
    setBlockForm({
      start: "08:00",
      end: "10:00",
      reason: "",
    });
    setBlockOpen(true);
  }

  function selectCell(roomId: string, date: string) {
    setRoomFilter(roomId);
    setDay(date);
    setAllDates(false);
    setView("list");
  }

  return (
    <div>
      {/* Ringkasan */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[var(--line)] py-3">
        {(["KOSONG", "TERPAKAI", "MENUNGGU_APPROVE", "DITOLAK"] as RoomSituation[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSituationFilter(situationFilter === key ? "" : key)}
            className={`flex items-center gap-2 text-sm transition-opacity hover:opacity-80 ${
              situationFilter === key ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-2)]"
            }`}
            aria-pressed={situationFilter === key}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${SITUATION_STYLE[key].dot}`} aria-hidden="true" />
            {SITUATION_LABEL[key]}
            <span className="tabular-nums text-[var(--ink-3)]">{counts[key]}</span>
          </button>
        ))}
        <p className="ml-auto text-[0.8rem] text-[var(--ink-3)]">
          {refreshError ? "Gagal menyegarkan · " : "Diperbarui otomatis tiap 15 detik · "}
          {formatDateId(allDates ? today : day)}
        </p>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${
                view === "list" ? "bg-[var(--ink)] text-[var(--surface)]" : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <List className="h-4 w-4" /> Daftar
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${
                view === "grid" ? "bg-[var(--ink)] text-[var(--surface)]" : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" /> Grid
            </button>
          </div>

          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <input
              className="input pl-9"
              placeholder="Cari ruangan, kegiatan, pengaju…"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              aria-label="Cari ruangan, kegiatan, atau pengaju"
            />
          </div>

          {canEdit ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openBlock({ roomId: rooms[0]?.id ?? payload.rooms[0].id, date: day })}
            >
              <ShieldBan className="h-4 w-4" strokeWidth={1.8} /> Tandai ditolak
            </button>
          ) : null}

          {isAdmin ? (
            <a href="/api/export" className="btn btn-secondary">
              <Download className="h-4 w-4" strokeWidth={1.8} /> Ekspor CSV
            </a>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select max-w-[190px]"
            value={DayOptionValue(allDates, day)}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "all") {
                setAllDates(true);
                return;
              }
              setAllDates(false);
              setDay(value);
            }}
            aria-label="Pilih tanggal"
          >
            <option value="all">Semua tanggal (14 hari)</option>
            {days.map((date) => (
              <option key={date} value={date}>
                {formatDateId(date, "short")} {date === today ? "· hari ini" : ""}
              </option>
            ))}
          </select>

          <select
            className="select max-w-[160px]"
            value={building}
            onChange={(event) => setBuilding(event.target.value)}
            aria-label="Filter gedung"
          >
            <option value="">Semua gedung</option>
            {buildings.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="select max-w-[160px]"
            value={approvalClass}
            onChange={(event) => setApprovalClass(event.target.value)}
            aria-label="Filter kelas ruangan"
          >
            <option value="">Semua kelas</option>
            <option value="A">Kelas A</option>
            <option value="B">Kelas B</option>
            <option value="C">Kelas C</option>
          </select>

          <select
            className="select max-w-[170px]"
            value={conditionFilter}
            onChange={(event) => setConditionFilter(event.target.value)}
            aria-label="Filter kondisi ruangan"
          >
            <option value="">Semua kondisi</option>
            {Object.entries(CONDITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {roomFilter ? (
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRoomFilter(undefined)}>
              {payload.rooms.find((room) => room.id === roomFilter)?.code ?? "Ruangan"} ✕
            </button>
          ) : null}

          {activeFilters ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={resetFilters}>
              <FilterX className="h-4 w-4" strokeWidth={1.8} /> Reset filter
            </button>
          ) : null}

          <span className="ml-auto text-[0.8rem] text-[var(--ink-3)]">
            {rooms.length} ruangan · {rows.length} baris
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.8rem] text-[var(--ink-2)]">
        {(["KOSONG", "TERPAKAI", "MENUNGGU_APPROVE", "DITOLAK"] as RoomSituation[]).map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${SITUATION_STYLE[key].dot}`} aria-hidden="true" />
            {SITUATION_LABEL[key]}
          </span>
        ))}
        <span className="text-[var(--ink-3)]">· Klik sel grid untuk melihat detail ruangan pada tanggal itu.</span>
      </div>

      {/* LIST */}
      {view === "list" ? (
        <div className="mt-4 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
          <table className="data-table min-w-[1080px]">
            <caption className="sr-only">
              Jadwal, kondisi, dan situasi ruangan dalam jendela {payload.from} sampai {payload.to}
            </caption>
            <thead>
              <tr>
                <th scope="col">Ruangan</th>
                <th scope="col">Tanggal</th>
                <th scope="col">Waktu (WITA)</th>
                <th scope="col">Pihak Pengaju</th>
                <th scope="col">Deskripsi Kegiatan</th>
                <th scope="col">Kondisi</th>
                <th scope="col">Situasi</th>
                <th scope="col">Catatan</th>
                <th scope="col" className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSaving = saving === row.key;
                return (
                  <tr key={row.key} className={row.session ? "" : "bg-[var(--surface-2)]/40"}>
                    <td>
                      <p className="font-semibold text-[var(--ink)]">{row.room.code}</p>
                      <p className="mt-0.5 text-[0.8rem] text-[var(--ink-3)]">
                        {row.room.name} · Lt. {row.room.floor}
                      </p>
                      <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.08em] text-[var(--ink-3)]">
                        Kelas {row.room.approvalClass} · {row.room.capacity} orang
                      </p>
                    </td>
                    <td className="whitespace-nowrap">{formatDateId(row.date, "short")}</td>
                    <td className="whitespace-nowrap">
                      {row.session ? (
                        formatTimeRange(row.session.start, row.session.end)
                      ) : row.block ? (
                        formatTimeRange(row.block.start, row.block.end)
                      ) : (
                        <span className="text-[var(--ink-3)]">—</span>
                      )}
                    </td>
                    <td>
                      {row.session ? (
                        <>
                          <p>{row.session.requesterName}</p>
                          {row.session.orgName ? (
                            <p className="mt-0.5 text-[0.8rem] text-[var(--ink-3)]">{row.session.orgName}</p>
                          ) : null}
                        </>
                      ) : row.block ? (
                        <span className="text-[var(--ink-2)]">Admin</span>
                      ) : (
                        <span className="text-[var(--ink-3)]">—</span>
                      )}
                    </td>
                    <td>
                      {row.session ? (
                        <>
                          <p className="font-medium text-[var(--ink)]">{row.session.activityName}</p>
                          <p className="mt-0.5 text-[0.8rem] text-[var(--ink-3)]">
                            {row.session.participants} peserta
                          </p>
                        </>
                      ) : row.block ? (
                        <span className="text-[var(--ink-2)]">Ditandai admin</span>
                      ) : (
                        <span className="text-[var(--ink-3)]">Tidak ada kegiatan</span>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            className={`select h-8 min-h-0 max-w-[150px] py-0 text-[0.8rem] ${CONDITION_TONE[row.condition]}`}
                            value={row.condition}
                            onChange={(event) =>
                              void saveState(row, { condition: event.target.value as RoomCondition })
                            }
                            aria-label={`Kondisi ${row.room.name} pada ${formatDateId(row.date, "short")}`}
                            disabled={isSaving}
                          >
                            {Object.entries(CONDITION_LABEL).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        </div>
                      ) : (
                        <span className={`font-medium ${CONDITION_TONE[row.condition]}`}>
                          {CONDITION_LABEL[row.condition]}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="space-y-1">
                        <SituationBadge situation={row.situation} />
                        {canEdit ? (
                          <select
                            className="select h-8 min-h-0 max-w-[150px] py-0 text-[0.8rem]"
                            value={row.overrideSituation ?? "AUTO"}
                            onChange={(event) => {
                              const value = event.target.value;
                              void saveState(row, {
                                situation:
                                  value === "AUTO" ? null : (value as RoomSituation),
                              });
                            }}
                            aria-label={`Override situasi ${row.room.name} pada ${formatDateId(row.date, "short")}`}
                            disabled={isSaving}
                          >
                            <option value="AUTO">Otomatis</option>
                            <option value="KOSONG">Kosong</option>
                            <option value="DITOLAK">Ditolak</option>
                          </select>
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-[200px]">
                      {row.block ? (
                        <span className="text-[var(--busy)]">{row.block.reason}</span>
                      ) : row.overrideNote ? (
                        row.overrideNote
                      ) : (
                        <span className="text-[var(--ink-3)]">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canBook && !row.session && row.situation === "KOSONG" ? (
                          <Link
                            href={`/ajukan?room=${row.room.id}&date=${row.date}`}
                            className="btn btn-sm btn-secondary"
                          >
                            <Plus className="h-3.5 w-3.5" /> Ajukan
                          </Link>
                        ) : null}
                        {row.session && canBook ? (
                          <Link
                            href={`/ajukan?room=${row.room.id}&date=${row.session.date}&start=${row.session.start}&end=${row.session.end}`}
                            className="btn btn-sm btn-ghost"
                          >
                            Slot serupa
                          </Link>
                        ) : null}
                        {canEdit && row.block ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost text-[var(--busy)]"
                            onClick={() => setDeleting({ block: row.block!, room: row.room })}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Buka kembali
                          </button>
                        ) : null}
                        {canEdit && !row.block ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => openBlock({ roomId: row.room.id, date: row.date })}
                          >
                            Tolak
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <CalendarDays className="mx-auto h-6 w-6 text-[var(--ink-3)]" strokeWidth={1.6} />
              <p className="mt-3 font-display text-xl">Tidak ada baris yang cocok</p>
              <p className="mt-1 text-sm text-[var(--ink-3)]">Ubah filter atau pilih tanggal lain.</p>
              <button type="button" className="btn btn-secondary mt-4" onClick={resetFilters}>
                Reset filter
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        /* GRID */
        <div className="mt-4 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="min-w-[1180px]">
            <div className="grid" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div className="sticky left-0 top-0 z-30 border-b border-r border-[var(--line)] bg-[var(--base)] px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
                Ruangan / Tanggal
              </div>
              {days.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    setDay(date);
                    setAllDates(false);
                    setView("list");
                  }}
                  className={`border-b border-r border-[var(--line)] bg-[var(--base)] px-1 py-2 text-center transition-colors hover:bg-[var(--surface-3)] ${
                    date === today ? "shadow-[inset_0_-3px_0_0_var(--accent)]" : ""
                  }`}
                  aria-label={`Lihat ${formatDateId(date)}`}
                >
                  <span className="block text-[0.8rem] font-semibold">{formatDateShort(date)}</span>
                  <span className="block text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-3)]">
                    {formatDateId(date, "short").split(",")[0]}
                  </span>
                </button>
              ))}

              {rooms.map((room) => (
                <div key={room.id} className="contents">
                  <div className="sticky left-0 z-20 border-b border-r border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                    <p className="text-[0.8rem] font-semibold">{room.code}</p>
                    <p className="truncate text-[0.8rem] text-[var(--ink-3)]">{room.name}</p>
                    <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.08em] text-[var(--ink-3)]">
                      Kelas {room.approvalClass}
                    </p>
                  </div>
                  {days.map((date) => {
                    const cell = cells.get(room.id)?.get(date);
                    const situation = cell?.situation ?? "KOSONG";
                    const total = (cell?.sessions.length ?? 0) + (cell?.blocks.length ?? 0);
                    return (
                      <button
                        key={`${room.id}-${date}`}
                        type="button"
                        onClick={() => selectCell(room.id, date)}
                        className={`group relative h-[76px] border-b border-r border-[var(--line)] p-1.5 text-left transition-colors ${SITUATION_STYLE[situation].cell}`}
                        title={`${room.name} · ${formatDateId(date)} · ${SITUATION_LABEL[situation]}${
                          cell?.sessions[0] ? ` · ${cell.sessions[0].activityName}` : ""
                        }`}
                      >
                        <span className="flex items-start gap-1 text-[0.62rem] font-semibold uppercase leading-[1.15] tracking-[0.06em]">
                          <span className={`h-1.5 w-1.5 rounded-full ${SITUATION_STYLE[situation].dot}`} />
                          {SITUATION_LABEL[situation]}
                        </span>
                        {total > 0 ? (
                          <span className="mt-1 block truncate text-[0.7rem] leading-tight opacity-80">
                            {formatTime(cell?.sessions[0]?.start ?? cell?.blocks[0]?.start ?? "00:00")}
                            {cell?.sessions.length && cell.sessions.length > 1 ? ` +${cell.sessions.length - 1}` : ""}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[0.8rem] text-[var(--ink-3)]">
        Jendela {formatDateId(payload.from)} – {formatDateId(payload.to)} · Waktu kampus WITA (UTC+8).
        Aula IDB Bali tidak dapat digunakan pada hari Minggu.
        {!canBook ? " Masuk untuk mengajukan peminjaman." : ""}
      </p>

      {/* Tandai ditolak */}
      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="Tandai ruangan ditolak"
        description="Slot ini tidak dapat diajukan (mis. kuliah, ujian, perawatan). Pengaju terdampak menerima notifikasi."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setBlockOpen(false)}>
              Batal
            </button>
            <button type="submit" form="form-blokir" className="btn btn-danger">
              Tandai ditolak
            </button>
          </>
        }
      >
        <form id="form-blokir" className="space-y-3" onSubmit={submitBlock}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span className="label">Ruangan</span>
              <select
                className="select"
                value={blockTarget?.roomId ?? ""}
                onChange={(event) =>
                  setBlockTarget((current) => ({
                    roomId: event.target.value,
                    date: current?.date ?? day,
                  }))
                }
                required
              >
                {payload.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} — {room.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Tanggal</span>
              <input
                type="date"
                className="input"
                min={payload.from}
                max={payload.to}
                value={blockTarget?.date ?? day}
                onChange={(event) =>
                  setBlockTarget((current) => ({
                    roomId: current?.roomId ?? payload.rooms[0].id,
                    date: event.target.value,
                  }))
                }
                required
              />
            </label>
            <div className="field">
              <span className="label">Mulai</span>
              <TimePicker
                value={blockForm.start}
                onChange={(value) => setBlockForm((current) => ({ ...current, start: value }))}
                ariaLabel="Jam mulai penandaan"
              />
            </div>
            <div className="field">
              <span className="label">Selesai</span>
              <TimePicker
                value={blockForm.end}
                onChange={(value) => setBlockForm((current) => ({ ...current, end: value }))}
                ariaLabel="Jam selesai penandaan"
              />
            </div>
          </div>
          <label className="field">
            <span className="label">Alasan</span>
            <input
              className="input"
              value={blockForm.reason}
              onChange={(event) => setBlockForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Contoh: perawatan AC, kuliah reguler, ujian"
              required
              minLength={3}
            />
          </label>
        </form>
      </Modal>

      {/* Buka kembali */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Buka kembali ruangan?"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
              Batal
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void removeBlock()}>
              Buka kembali
            </button>
          </>
        }
      >
        <p className="text-sm text-[var(--ink-2)]">
          Penandaan ditolak pada <strong>{deleting?.room.name}</strong> tanggal{" "}
          <strong>{deleting ? formatDateId(deleting.block.date) : ""}</strong> akan dibuka dan
          slot kembali tersedia.
        </p>
      </Modal>

      {toast ? (
        <div
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-[10px] border border-[var(--ink)] bg-[var(--ink)] px-4 py-3 text-sm text-[var(--surface)] shadow-[var(--shadow-far)]"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function DayOptionValue(allDates: boolean, day: string): string {
  return allDates ? "all" : day;
}

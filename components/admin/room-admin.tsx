"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { RoomView } from "@/lib/data";
import { APPROVAL_CLASS_LABEL, CONDITION_LABEL, type RoomCondition } from "@/lib/rbac";

interface Draft {
  id?: string;
  code: string;
  name: string;
  building: string;
  floor: string;
  category: string;
  capacity: string;
  approvalClass: "A" | "B" | "C";
  condition: RoomCondition;
  needsPlotting: boolean;
  isActive: boolean;
  notes: string;
}

function emptyDraft(): Draft {
  return {
    code: "",
    name: "",
    building: "Gedung IDB",
    floor: "1",
    category: "Ruang Kelas",
    capacity: "30",
    approvalClass: "A",
    condition: "BAIK",
    needsPlotting: false,
    isActive: true,
    notes: "",
  };
}

function toDraft(room: RoomView): Draft {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    building: room.building,
    floor: String(room.floor),
    category: room.category,
    capacity: String(room.capacity),
    approvalClass: room.approvalClass,
    condition: room.condition,
    needsPlotting: room.needsPlotting,
    isActive: room.isActive,
    notes: room.notes ?? "",
  };
}

export function RoomAdmin({ rooms, canEdit }: { rooms: RoomView[]; canEdit: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setPending(true);
    setError(null);

    const body = {
      name: draft.name,
      building: draft.building,
      floor: Number(draft.floor),
      category: draft.category,
      capacity: Number(draft.capacity),
      approvalClass: draft.approvalClass,
      condition: draft.condition,
      needsPlotting: draft.needsPlotting,
      isActive: draft.isActive,
      notes: draft.notes || null,
    };

    try {
      const response = await fetch(draft.id ? `/api/rooms/${draft.id}` : "/api/rooms", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft.id ? body : { ...body, code: draft.code }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Gagal menyimpan ruangan.");
        return;
      }
      setDraft(null);
      setToast(draft.id ? "Data ruangan diperbarui." : "Ruangan baru ditambahkan.");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {toast ? (
        <p className="mb-3 rounded-[10px] border border-[var(--ok-line)] bg-[var(--ok-soft)] px-3 py-2 text-sm text-[var(--ok)]" role="status">
          {toast}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
        <table className="data-table min-w-[980px]">
          <caption className="sr-only">Data master 29 ruangan kampus</caption>
          <thead>
            <tr>
              <th scope="col">Kode</th>
              <th scope="col">Nama</th>
              <th scope="col">Gedung / Lt.</th>
              <th scope="col">Kategori</th>
              <th scope="col">Kapasitas</th>
              <th scope="col">Kelas</th>
              <th scope="col">Kondisi</th>
              <th scope="col">Plotting</th>
              <th scope="col">Aktif</th>
              {canEdit ? <th scope="col" className="text-right">Aksi</th> : null}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td className="whitespace-nowrap font-semibold">{room.code}</td>
                <td>{room.name}</td>
                <td>{room.building} · {room.floor}</td>
                <td>{room.category}</td>
                <td className="tabular-nums">{room.capacity}</td>
                <td>
                  <Badge tone={room.approvalClass === "A" ? "ok" : room.approvalClass === "B" ? "hold" : "brand"}>
                    {APPROVAL_CLASS_LABEL[room.approvalClass]}
                  </Badge>
                </td>
                <td>
                  <span
                    className={
                      room.condition === "BAIK"
                        ? "text-[var(--ok)]"
                        : room.condition === "PERLU_PERAWATAN"
                          ? "text-[var(--hold)]"
                          : "text-[var(--busy)]"
                    }
                  >
                    {CONDITION_LABEL[room.condition]}
                  </span>
                </td>
                <td>{room.needsPlotting ? "Ya" : "—"}</td>
                <td>{room.isActive ? "Aktif" : "Nonaktif"}</td>
                {canEdit ? (
                  <td className="text-right">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDraft(toDraft(room))}>
                      <Pencil className="h-3.5 w-3.5" /> Ubah
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <button type="button" className="btn btn-primary mt-4" onClick={() => setDraft(emptyDraft())}>
          <Plus className="h-4 w-4" /> Tambah ruangan
        </button>
      ) : null}

      <Modal
        open={Boolean(draft)}
        onClose={() => {
          setDraft(null);
          setError(null);
        }}
        title={draft?.id ? "Ubah ruangan" : "Tambah ruangan"}
        description="Perubahan kelas persetujuan memengaruhi jalur approval pengajuan berikutnya."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
              Batal
            </button>
            <button type="submit" form="form-ruangan" className="btn btn-primary" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simpan
            </button>
          </>
        }
      >
        {draft ? (
          <form id="form-ruangan" className="space-y-3" onSubmit={save}>
            {error ? <p className="error-text" role="alert">{error}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kode" htmlFor="room-code" required>
                <Input
                  id="room-code"
                  required
                  value={draft.code}
                  disabled={Boolean(draft.id)}
                  onChange={(event) => update("code", event.target.value)}
                />
              </Field>
              <Field label="Kategori" htmlFor="room-category" required>
                <Input
                  id="room-category"
                  required
                  value={draft.category}
                  onChange={(event) => update("category", event.target.value)}
                />
              </Field>
              <Field label="Nama ruangan" htmlFor="room-name" required className="sm:col-span-2">
                <Input
                  id="room-name"
                  required
                  value={draft.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </Field>
              <Field label="Gedung" htmlFor="room-building" required>
                <Select
                  id="room-building"
                  required
                  value={draft.building}
                  onChange={(event) => update("building", event.target.value)}
                >
                  {["Gedung IDB", "Gedung NMC", "Gedung Serbaguna"].map((building) => (
                    <option key={building} value={building}>
                      {building}
                    </option>
                  ))}
                  {!["Gedung IDB", "Gedung NMC", "Gedung Serbaguna"].includes(draft.building) ? (
                    <option value={draft.building}>{draft.building}</option>
                  ) : null}
                </Select>
              </Field>
              <Field label="Lantai" htmlFor="room-floor" required>
                <Input
                  id="room-floor"
                  type="number"
                  min={0}
                  max={20}
                  required
                  value={draft.floor}
                  onChange={(event) => update("floor", event.target.value)}
                />
              </Field>
              <Field label="Kapasitas" htmlFor="room-capacity" required>
                <Input
                  id="room-capacity"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  value={draft.capacity}
                  onChange={(event) => update("capacity", event.target.value)}
                />
              </Field>
              <Field label="Kelas persetujuan" htmlFor="room-class" required>
                <Select
                  id="room-class"
                  value={draft.approvalClass}
                  onChange={(event) => update("approvalClass", event.target.value as Draft["approvalClass"])}
                >
                  <option value="A">Kelas A</option>
                  <option value="B">Kelas B</option>
                  <option value="C">Kelas C</option>
                </Select>
              </Field>
              <Field label="Kondisi" htmlFor="room-condition" required>
                <Select
                  id="room-condition"
                  value={draft.condition}
                  onChange={(event) => update("condition", event.target.value as RoomCondition)}
                >
                  {Object.entries(CONDITION_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--brand)]"
                    checked={draft.needsPlotting}
                    onChange={(event) => update("needsPlotting", event.target.checked)}
                  />
                  Perlu plotting
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--brand)]"
                    checked={draft.isActive}
                    onChange={(event) => update("isActive", event.target.checked)}
                  />
                  Ruangan aktif
                </label>
              </div>
            </div>
            <Field label="Catatan" htmlFor="room-notes">
              <Textarea
                id="room-notes"
                rows={2}
                value={draft.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Catatan pemeliharaan, fasilitas khusus, dsb."
              />
            </Field>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

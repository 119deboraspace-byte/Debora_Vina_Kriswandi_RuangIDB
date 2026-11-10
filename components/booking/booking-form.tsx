"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TimePicker } from "@/components/ui/time-picker";
import type { RoomView } from "@/lib/data";
import type { SlotCheckResult } from "@/lib/bookings";
import {
  ACTIVITY_TYPES,
  APPROVAL_CLASS_LABEL,
  BORROWER_LABEL,
  borrowerTypeForRole,
  type BorrowerType,
} from "@/lib/rbac";
import { addDays, formatDateId, formatTime, isSunday, todayWita } from "@/lib/time";
import { cn } from "@/lib/utils";

const IT_FACILITIES = ["Proyektor", "LCD", "Podium", "Mic", "Sound", "AC", "Remote AC"];
const OPS_FACILITIES = ["Podium", "Dispenser", "Meja Kelas", "Kursi", "Sofa", "Meja Kecil"];

interface FormUser {
  name: string;
  email: string;
  role: "ADMIN1" | "ADMIN2" | "LECTURER" | "STUDENT" | "ORGANIZATION";
  phone: string | null;
  nimNidn: string | null;
  jurusan: string | null;
  organizationId: string | null;
  organizationName: string | null;
}

interface Props {
  user: FormUser;
  rooms: RoomView[];
  organizations: Array<{ id: string; name: string; status: string }>;
  leadA: number;
  leadBC: number;
  windowDays: number;
  prefill: { roomId?: string; date?: string; start?: string; end?: string };
  edit?: InitialBooking;
}

export interface InitialBooking {
  id: string;
  status: "DRAFT" | "REVISION";
  borrowerType: BorrowerType;
  requesterName: string;
  requesterContact: string;
  nim: string | null;
  jurusan: string | null;
  organizationId: string | null;
  ketuaName: string | null;
  ketuaNim: string | null;
  sekretarisName: string | null;
  sekretarisNim: string | null;
  activityName: string;
  activityDescription: string;
  activityType: string;
  participants: number;
  roomId: string;
  sessions: Array<{ date: string; start: string; end: string }>;
  facilities: Array<{ name: string; section: "IT" | "OPERASIONAL" | "SECURITY" | "BAA"; qty: number }>;
  securityRequested: boolean;
  academicActivity: boolean;
  attachment: { id: string; filename: string; size: number } | null;
}

interface SessionInput {
  id: string;
  date: string;
  start: string;
  end: string;
}

interface FacilityInput {
  name: string;
  section: "IT" | "OPERASIONAL" | "SECURITY" | "BAA";
  qty: number;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function BookingForm({ user, rooms, organizations, leadA, leadBC, windowDays, prefill, edit }: Props) {
  const today = todayWita();
  const accountBorrowerType = borrowerTypeForRole(user.role);
  const borrowerLocked = accountBorrowerType !== null;
  const [borrowerType, setBorrowerType] = useState<BorrowerType>(
    accountBorrowerType ?? edit?.borrowerType ?? "MAHASISWA",
  );
  const [form, setForm] = useState({
    requesterName: edit?.requesterName ?? user.name,
    requesterContact: edit?.requesterContact ?? user.phone ?? user.email,
    nim: user.nimNidn ?? edit?.nim ?? "",
    jurusan: user.jurusan ?? edit?.jurusan ?? "",
    organizationId: user.organizationId ?? (user.role === "ORGANIZATION" ? edit?.organizationId ?? "" : ""),
    ketuaName: edit?.ketuaName ?? "",
    ketuaNim: edit?.ketuaNim ?? "",
    sekretarisName: edit?.sekretarisName ?? "",
    sekretarisNim: edit?.sekretarisNim ?? "",
    activityName: edit?.activityName ?? "",
    activityDescription: edit?.activityDescription ?? "",
    activityType: edit?.activityType ?? "Akademik",
    participants: edit?.participants ? String(edit.participants) : "",
    roomId:
      edit?.roomId ??
      (prefill.roomId && rooms.some((room) => room.id === prefill.roomId)
        ? prefill.roomId
        : rooms[0]?.id ?? ""),
    agreement: false,
    academicActivity: edit?.academicActivity ?? user.role === "LECTURER",
  });
  const initialRoom = rooms.find((item) => item.id === form.roomId) ?? rooms[0];
  const initialLead = initialRoom?.approvalClass === "A" ? leadA : leadBC;
  const [sessions, setSessions] = useState<SessionInput[]>(() =>
    edit && edit.sessions.length > 0
      ? edit.sessions.map((session) => ({ id: uid(), ...session }))
      : [
          {
            id: uid(),
            date:
              prefill.date && prefill.date >= addDays(today, initialLead)
                ? prefill.date
                : addDays(today, initialLead),
            start: prefill.start ?? "08:00",
            end: prefill.end ?? "10:00",
          },
        ],
  );
  const [facilities, setFacilities] = useState<FacilityInput[]>(
    () =>
      edit?.facilities
        .filter((facility) => facility.section !== "SECURITY")
        .map((facility) => ({ name: facility.name, section: facility.section, qty: facility.qty })) ?? [],
  );
  const [security, setSecurity] = useState(edit?.securityRequested ?? false);
  const [attachment, setAttachment] = useState<{ id: string; filename: string; size: number } | null>(
    edit?.attachment ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<SlotCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"submit" | "draft" | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === form.roomId) ?? null, [rooms, form.roomId]);
  const lead = room?.approvalClass === "A" ? leadA : leadBC;
  const isAulaRoom = Boolean(room && (room.code === "AULA" || room.category.toLowerCase() === "aula"));
  const hasSundayAula = isAulaRoom && sessions.some((session) => isSunday(session.date));
  const participantsCount = Number(form.participants || 0);
  const overCapacity = Boolean(room && participantsCount > room.capacity);
  const lastDate = addDays(today, windowDays - 1);
  const earliest = addDays(today, lead);
  const selectedOrg = organizations.find((org) => org.id === form.organizationId);

  // Tanggal yang sudah dipilih bisa jadi tidak valid saat kelas ruangan berubah
  // (Kelas C minimal H-3). Geser otomatis ke tanggal paling awal yang sah.
  useEffect(() => {
    setSessions((current) => {
      let changed = false;
      const next = current.map((session) => {
        if (session.date < earliest) {
          changed = true;
          return { ...session, date: earliest };
        }
        if (session.date > lastDate) {
          changed = true;
          return { ...session, date: lastDate };
        }
        return session;
      });
      return changed ? next : current;
    });
  }, [earliest, lastDate]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSession(id: string, patch: Partial<SessionInput>) {
    setSessions((current) => current.map((session) => (session.id === id ? { ...session, ...patch } : session)));
  }

  function addSession() {
    const last = sessions[sessions.length - 1];
    setSessions((current) => [
      ...current,
      {
        id: uid(),
        date: last && last.date < lastDate ? addDays(last.date, 1) : last?.date ?? earliest,
        start: "13:00",
        end: "15:00",
      },
    ]);
  }

  function removeSession(id: string) {
    setSessions((current) => (current.length === 1 ? current : current.filter((session) => session.id !== id)));
  }

  function toggleIt(name: string) {
    setFacilities((current) => {
      const exists = current.find((item) => item.name === name && item.section === "IT");
      if (exists) return current.filter((item) => !(item.name === name && item.section === "IT"));
      return [...current, { name, section: "IT", qty: 1 }];
    });
  }

  function toggleOps(name: string) {
    setFacilities((current) => {
      const exists = current.find((item) => item.name === name && item.section === "OPERASIONAL");
      if (exists) return current.filter((item) => !(item.name === name && item.section === "OPERASIONAL"));
      return [...current, { name, section: "OPERASIONAL", qty: 1 }];
    });
  }

  function setOpsQty(name: string, qty: number) {
    setFacilities((current) =>
      current.map((item) =>
        item.name === name && item.section === "OPERASIONAL"
          ? { ...item, qty: Math.max(1, Math.min(500, qty || 1)) }
          : item,
      ),
    );
  }

  const payload = useMemo(
    () => ({
      borrowerType,
      requesterName: form.requesterName,
      requesterContact: form.requesterContact,
      nim: form.nim || null,
      jurusan: form.jurusan || null,
      organizationId: borrowerType === "ORGANISASI" ? form.organizationId || null : null,
      ketuaName: borrowerType === "ORGANISASI" ? form.ketuaName || null : null,
      ketuaNim: borrowerType === "ORGANISASI" ? form.ketuaNim || null : null,
      sekretarisName: borrowerType === "ORGANISASI" ? form.sekretarisName || null : null,
      sekretarisNim: borrowerType === "ORGANISASI" ? form.sekretarisNim || null : null,
      activityName: form.activityName,
      activityDescription: form.activityDescription,
      activityType: form.activityType,
      participants: Number(form.participants || 0),
      roomId: form.roomId,
      sessions: sessions.map(({ date, start, end }) => ({ date, start, end })),
      facilities: [...facilities, ...(security ? [{ name: "Penjagaan acara", section: "SECURITY" as const, qty: 1 }] : [])],
      securityRequested: security,
      academicActivity: form.academicActivity,
      attachmentId: attachment?.id ?? null,
      agreement: form.agreement,
    }),
    [attachment?.id, borrowerType, facilities, form, security, sessions],
  );

  const checkable =
    Boolean(form.roomId) &&
    sessions.every((session) => session.date && session.start && session.end) &&
    form.activityName.trim().length >= 3;

  useEffect(() => {
    if (!checkable) {
      setCheck(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setChecking(true);
      try {
        const response = await fetch("/api/bookings/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data = (await response.json()) as SlotCheckResult & { error?: string };
        if (response.ok) setCheck(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setCheck(null);
      } finally {
        setChecking(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [checkable, payload]);

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body });
      const data = (await response.json()) as { ok?: boolean; id?: string; filename?: string; size?: number; error?: string };
      if (!response.ok || !data.ok || !data.id) {
        setUploadError(data.error ?? "Gagal mengunggah file.");
        return;
      }
      setAttachment({ id: data.id, filename: data.filename ?? file.name, size: data.size ?? file.size });
    } catch {
      setUploadError("Tidak dapat mengunggah file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function submit(mode: "submit" | "draft") {
    if (mode === "submit" && hasSundayAula) {
      setError("Aula IDB Bali tidak dapat digunakan pada hari Minggu. Pilih tanggal lain.");
      return;
    }
    setSubmitting(mode);
    setError(null);
    try {
      const response = await fetch(edit ? `/api/bookings/${edit.id}` : "/api/bookings", {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, asDraft: mode === "draft" }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        redirect?: string;
        issues?: Array<{ message: string }>;
      };
      if (!response.ok || !data.ok) {
        setError(data.issues?.[0]?.message ?? data.error ?? "Pengajuan gagal dikirim.");
        return;
      }
      window.location.assign(data.redirect ?? "/pengajuan");
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.45fr_0.85fr] lg:items-start">
      <form
        className="space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          void submit("submit");
        }}
        noValidate
      >
        {error ? (
          <div className="rounded-[10px] border border-[var(--busy-line)] bg-[var(--busy-soft)] px-4 py-3 text-sm text-[var(--busy)]" role="alert">
            <p className="font-semibold">Pengajuan belum dapat dikirim</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        {edit ? (
          <div className="rounded-[10px] border border-[var(--brand-line)] bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand-strong)]">
            <p className="font-semibold">
              {edit.status === "REVISION" ? "Memperbaiki pengajuan revisi" : "Melanjutkan draft"}
            </p>
            <p className="mt-0.5">
              Perubahan akan memvalidasi ulang jadwal dan mengirim pengajuan ke antrean admin.
            </p>
          </div>
        ) : null}

        {/* 1. Atas nama */}
        <section className="card p-5 md:p-6">
          <SectionTitle index="01" title="Atas nama siapa?" hint="Menentukan dokumen dan jalur persetujuan." />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(Object.keys(BORROWER_LABEL) as BorrowerType[]).map((type) => {
              const locked = borrowerLocked && type !== accountBorrowerType;
              return (
                <label
                  key={type}
                  className={cn(
                    "flex flex-col rounded-[10px] border px-3 py-3 transition-colors",
                    borrowerType === type
                      ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                      : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]",
                    borrowerLocked ? "cursor-default" : "cursor-pointer",
                    locked && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="radio"
                    name="borrowerType"
                    className="sr-only"
                    checked={borrowerType === type}
                    disabled={borrowerLocked || locked}
                    onChange={() => setBorrowerType(type)}
                  />
                  <span className="text-sm font-semibold">{BORROWER_LABEL[type]}</span>
                  <span className="mt-0.5 text-[0.8rem] text-[var(--ink-3)]">
                    {type === "DOSEN" ? "Kode dosen & program studi" : type === "MAHASISWA" ? "NIM & jurusan" : "Organisasi + panitia"}
                  </span>
                </label>
              );
            })}
          </div>
          {borrowerLocked ? (
            <p className="mt-3 flex items-start gap-2 text-[0.8rem] text-[var(--ink-3)]">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span>Jenis peminjam mengikuti akun yang masuk dan tidak dapat diubah.</span>
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={borrowerType === "ORGANISASI" ? "Nama penanggung jawab" : "Nama peminjam"} htmlFor="requesterName" required>
              <Input
                id="requesterName"
                required
                value={form.requesterName}
                onChange={(event) => update("requesterName", event.target.value)}
              />
            </Field>
            <Field label="Kontak (WhatsApp / email)" htmlFor="requesterContact" required>
              <Input
                id="requesterContact"
                required
                value={form.requesterContact}
                onChange={(event) => update("requesterContact", event.target.value)}
                placeholder="08xx xxxx xxxx"
              />
            </Field>

            {borrowerType === "MAHASISWA" ? (
              <>
                <Field
                  label="NIM"
                  htmlFor="nim"
                  required
                  hint={form.nim ? "Terisi dari akun mahasiswa." : "Belum diatur di profil. Hubungi admin akademik."}
                >
                  <Input
                    id="nim"
                    required
                    value={form.nim}
                    readOnly
                    className="bg-[var(--surface-2)]"
                    placeholder="Belum diatur di profil"
                  />
                </Field>
                <Field
                  label="Jurusan"
                  htmlFor="jurusan"
                  required
                  hint={form.jurusan ? "Terisi dari akun mahasiswa." : "Belum diatur di profil. Hubungi admin akademik."}
                >
                  <Input
                    id="jurusan"
                    required
                    value={form.jurusan}
                    readOnly
                    className="bg-[var(--surface-2)]"
                    placeholder="Belum diatur di profil"
                  />
                </Field>
              </>
            ) : null}

            {borrowerType === "DOSEN" ? (
              <>
                <Field
                  label="Kode dosen"
                  htmlFor="nim"
                  hint={form.nim ? "Terisi dari akun dosen (NIDN)." : "Belum diatur di profil. Hubungi admin akademik."}
                >
                  <Input
                    id="nim"
                    value={form.nim}
                    readOnly
                    className="bg-[var(--surface-2)]"
                    placeholder="Belum diatur di profil"
                  />
                </Field>
                <Field
                  label="Program studi"
                  htmlFor="jurusan"
                  hint={form.jurusan ? "Terisi dari akun dosen." : "Belum diatur di profil."}
                >
                  <Input
                    id="jurusan"
                    value={form.jurusan}
                    readOnly
                    className="bg-[var(--surface-2)]"
                    placeholder="Belum diatur di profil"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--brand)]"
                    checked={form.academicActivity}
                    onChange={(event) => update("academicActivity", event.target.checked)}
                  />
                  Tandai sebagai kegiatan akademik
                </label>
              </>
            ) : null}

            {borrowerType === "ORGANISASI" ? (
              <>
                <Field label="Organisasi mahasiswa" htmlFor="organizationId" required className="sm:col-span-2">
                  <Select
                    id="organizationId"
                    required
                    value={form.organizationId}
                    onChange={(event) => update("organizationId", event.target.value)}
                    disabled={Boolean(user.organizationId)}
                  >
                    <option value="">Pilih organisasi…</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                        {org.status !== "VERIFIED" ? " (belum diverifikasi)" : ""}
                      </option>
                    ))}
                  </Select>
                  {selectedOrg && selectedOrg.status !== "VERIFIED" ? (
                    <p className="mt-1 text-[0.8rem] text-[var(--hold)]">
                      Organisasi ini belum diverifikasi Kemahasiswaan. Pengajuan organisasi akan ditolak sistem.
                    </p>
                  ) : null}
                </Field>
                <Field label="Ketua panitia" htmlFor="ketuaName" required>
                  <Input
                    id="ketuaName"
                    required
                    value={form.ketuaName}
                    onChange={(event) => update("ketuaName", event.target.value)}
                    placeholder="Nama lengkap"
                  />
                </Field>
                <Field label="NIM ketua" htmlFor="ketuaNim">
                  <Input
                    id="ketuaNim"
                    value={form.ketuaNim}
                    onChange={(event) => update("ketuaNim", event.target.value)}
                    placeholder="NIM"
                  />
                </Field>
                <Field label="Sekretaris panitia" htmlFor="sekretarisName" required>
                  <Input
                    id="sekretarisName"
                    required
                    value={form.sekretarisName}
                    onChange={(event) => update("sekretarisName", event.target.value)}
                    placeholder="Nama lengkap"
                  />
                </Field>
                <Field label="NIM sekretaris" htmlFor="sekretarisNim">
                  <Input
                    id="sekretarisNim"
                    value={form.sekretarisNim}
                    onChange={(event) => update("sekretarisNim", event.target.value)}
                    placeholder="NIM"
                  />
                </Field>
              </>
            ) : null}
          </div>
        </section>

        {/* 2. Kegiatan */}
        <section className="card p-5 md:p-6">
          <SectionTitle index="02" title="Kegiatan" hint="Akan muncul di memo dan papan jadwal." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nama kegiatan" htmlFor="activityName" required className="sm:col-span-2" hint="Maksimal 120 karakter.">
              <Input
                id="activityName"
                required
                maxLength={120}
                value={form.activityName}
                onChange={(event) => update("activityName", event.target.value)}
                placeholder="Contoh: Workshop Motion Graphics"
              />
            </Field>
            <Field label="Jenis kegiatan" htmlFor="activityType" required>
              <Select
                id="activityType"
                value={form.activityType}
                onChange={(event) => update("activityType", event.target.value)}
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Perkiraan jumlah peserta"
              htmlFor="participants"
              required
              hint={room ? `Kapasitas ${room.name}: ${room.capacity} orang.` : undefined}
              error={
                overCapacity && room
                  ? `Melebihi kapasitas ${room.name} (${room.capacity} orang). Pengajuan otomatis ditolak.`
                  : undefined
              }
            >
              <Input
                id="participants"
                type="number"
                min={1}
                max={room?.capacity ?? 1000}
                required
                value={form.participants}
                onChange={(event) => update("participants", event.target.value)}
                aria-invalid={overCapacity || undefined}
              />
            </Field>
            <Field label="Deskripsi kegiatan" htmlFor="activityDescription" required className="sm:col-span-2" hint="Maksimal 500 karakter.">
              <Textarea
                id="activityDescription"
                required
                maxLength={500}
                value={form.activityDescription}
                onChange={(event) => update("activityDescription", event.target.value)}
                placeholder="Ringkasan kegiatan, kebutuhan panggung, dan catatan penting."
              />
            </Field>
          </div>
        </section>

        {/* 3. Ruangan & waktu */}
        <section className="card p-5 md:p-6">
          <SectionTitle index="03" title="Ruangan & waktu" hint={`Jendela ${windowDays} hari · minimal H-${lead} · selesai maks. 08.00 PM.`} />
          <div className="mt-4">
            <Field label="Ruangan" htmlFor="roomId" required>
              <Select
                id="roomId"
                required
                value={form.roomId}
                onChange={(event) => update("roomId", event.target.value)}
              >
                {Array.from(new Set(rooms.map((item) => item.building))).map((building) => (
                  <optgroup key={building} label={building}>
                    {rooms
                      .filter((item) => item.building === building)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name} · Kelas {item.approvalClass} · {item.capacity} orang
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </div>

          {room ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] bg-[var(--surface-2)] px-3 py-2.5 text-sm">
              <Badge tone={room.approvalClass === "A" ? "ok" : room.approvalClass === "B" ? "hold" : "brand"}>
                {APPROVAL_CLASS_LABEL[room.approvalClass]}
              </Badge>
              <span className="text-[var(--ink-2)]">{room.building} · Lt. {room.floor} · {room.capacity} orang</span>
              {room.needsPlotting ? <Badge tone="accent">Perlu plotting</Badge> : null}
              {room.condition !== "BAIK" ? <Badge tone="busy">Kondisi: {room.condition.replaceAll("_", " ").toLowerCase()}</Badge> : null}
            </div>
          ) : null}

          {isAulaRoom ? (
            <p className="mt-2 flex items-start gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[0.8rem] text-[var(--ink-2)]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" strokeWidth={1.8} aria-hidden="true" />
              <span>Aula IDB Bali tidak dapat digunakan pada hari Minggu.</span>
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {sessions.map((session, index) => (
              <div key={session.id} className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr_0.8fr_auto] sm:items-end">
                <Field
                  label={index === 0 ? "Tanggal" : `Tanggal sesi ${index + 1}`}
                  htmlFor={`date-${session.id}`}
                  error={
                    isAulaRoom && isSunday(session.date)
                      ? "Aula tidak dapat digunakan pada hari Minggu."
                      : undefined
                  }
                >
                  <Input
                    id={`date-${session.id}`}
                    type="date"
                    min={earliest}
                    max={lastDate}
                    value={session.date}
                    onChange={(event) => updateSession(session.id, { date: event.target.value })}
                    required
                    aria-invalid={isAulaRoom && isSunday(session.date) ? true : undefined}
                  />
                </Field>
                <Field label="Mulai">
                  <TimePicker
                    value={session.start}
                    onChange={(value) => updateSession(session.id, { start: value })}
                    ariaLabel={`Jam mulai sesi ${index + 1}`}
                  />
                </Field>
                <Field label="Selesai">
                  <TimePicker
                    value={session.end}
                    onChange={(value) => updateSession(session.id, { end: value })}
                    ariaLabel={`Jam selesai sesi ${index + 1}`}
                  />
                </Field>
                <button
                  type="button"
                  className="icon-btn mb-0.5"
                  onClick={() => removeSession(session.id)}
                  disabled={sessions.length === 1}
                  aria-label={`Hapus sesi ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addSession} disabled={sessions.length >= 10}>
              <Plus className="h-4 w-4" /> Tambah sesi
            </button>
            <p className="text-[0.8rem] text-[var(--ink-3)]">
              Jam operasional 07.00 AM – 08.00 PM WITA. Setiap sesi harus selesai paling lambat 08.00 PM.
            </p>
          </div>

          {check ? (
            <div className="mt-4" aria-live="polite">
              {check.ok ? (
                <div className="flex items-start gap-2 rounded-[10px] border border-[var(--ok-line)] bg-[var(--ok-soft)] px-3 py-2.5 text-sm text-[var(--ok)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <p>
                    Slot tersedia.{" "}
                    {check.requiresKemahasiswaan
                      ? "Disetujui Bagian Akademik, lalu ditinjau dan disetujui Kemahasiswaan."
                      : "Pengajuan akan ditinjau dan disetujui Bagian Akademik."}
                  </p>
                </div>
              ) : (
                <div className="rounded-[10px] border border-[var(--hold-line)] bg-[var(--hold-soft)] px-3 py-2.5 text-sm text-[var(--hold)]">
                  <p className="flex items-start gap-2 font-semibold">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                    {check.issues.length} hal perlu diperbaiki
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-6">
                    {check.issues.slice(0, 4).map((issue, index) => (
                      <li key={`${issue.date}-${index}`}>
                        {issue.message}
                        {issue.suggestions && issue.suggestions.length > 0 ? (
                          <button
                            type="button"
                            className="ml-1 underline"
                            onClick={() =>
                              updateSession(sessions[0]?.id ?? "", {
                                start: issue.suggestions![0].start,
                                end: issue.suggestions![0].end,
                              })
                            }
                          >
                            Coba {formatTime(issue.suggestions[0].start)} – {formatTime(issue.suggestions[0].end)}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : checking ? (
            <p className="mt-3 flex items-center gap-1.5 text-[0.8rem] text-[var(--ink-3)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memeriksa bentrok…
            </p>
          ) : null}
        </section>

        {/* 4. Fasilitas */}
        <section className="card p-5 md:p-6">
          <SectionTitle index="04" title="Fasilitas" hint="Permintaan diteruskan ke IT, Operasional, dan Security pada memo." />
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="label">Permintaan IT</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {IT_FACILITIES.map((name) => {
                  const active = facilities.some((item) => item.name === name && item.section === "IT");
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleIt(name)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-[10px] border px-2.5 py-1.5 text-[0.8rem] transition-colors",
                        active
                          ? "border-[var(--brand)] bg-[var(--brand-soft)] font-semibold text-[var(--brand-strong)]"
                          : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--line-strong)]",
                      )}
                    >
                      {active ? <Check className="mr-1 inline h-3 w-3" /> : null}
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="label">Permintaan Operasional</p>
              <div className="mt-2 space-y-2">
                {OPS_FACILITIES.map((name) => {
                  const item = facilities.find((entry) => entry.name === name && entry.section === "OPERASIONAL");
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <label className="flex flex-1 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--brand)]"
                          checked={Boolean(item)}
                          onChange={() => toggleOps(name)}
                        />
                        {name}
                      </label>
                      {item ? (
                        <Input
                          type="number"
                          min={1}
                          max={500}
                          className="h-9 w-20"
                          value={item.qty}
                          onChange={(event) => setOpsQty(name, Number(event.target.value))}
                          aria-label={`Jumlah ${name}`}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand)]"
              checked={security}
              onChange={(event) => setSecurity(event.target.checked)}
            />
            Minta penjagaan Security selama acara
          </label>

          {room?.needsPlotting ? (
            <p className="mt-3 rounded-[10px] bg-[var(--surface-2)] px-3 py-2 text-[0.8rem] text-[var(--ink-2)]">
              Bagian Akademik akan melakukan plotting untuk {room.name}. Permintaan ini masuk otomatis ke memo.
            </p>
          ) : null}
        </section>

        {/* 5. Lampiran */}
        <section className="card p-5 md:p-6">
          <SectionTitle
            index="05"
            title="Lampiran"
            hint={borrowerType === "ORGANISASI" ? "Wajib untuk pengajuan organisasi: proposal, rundown, atau surat." : "Opsional: proposal atau rundown."}
          />
          <div className="mt-4">
            {attachment ? (
              <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-[var(--brand)]" strokeWidth={1.8} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{attachment.filename}</p>
                    <p className="text-[0.8rem] text-[var(--ink-3)]">{(attachment.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setAttachment(null)} aria-label="Hapus lampiran">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-5 text-sm text-[var(--ink-2)] transition-colors hover:border-[var(--brand)]">
                <Upload className="h-4 w-4 text-[var(--brand)]" strokeWidth={1.8} />
                {uploading ? "Mengunggah…" : "Pilih file PDF, JPG, atau PNG (maks. 5 MB)"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={onUpload} disabled={uploading} />
              </label>
            )}
            {uploadError ? <p className="error-text mt-2" role="alert">{uploadError}</p> : null}
          </div>
        </section>

        {/* 6. Pernyataan */}
        <section className="card p-5 md:p-6">
          <SectionTitle index="06" title="Pernyataan" hint="Wajib sebelum mengirim." />
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--brand)]"
              checked={form.agreement}
              onChange={(event) => update("agreement", event.target.checked)}
            />
            <span>
              Kami bertanggung jawab atas kebersihan, kerusakan, dan pengembalian ruangan
              serta fasilitas yang dipinjam sesuai ketentuan IDB Bali.
            </span>
          </label>
          <div className="mt-5 flex flex-wrap gap-2">
            {overCapacity && room ? (
              <p className="w-full rounded-[10px] border border-[var(--busy-line)] bg-[var(--busy-soft)] px-3 py-2 text-sm text-[var(--busy)]" role="alert">
                Jumlah peserta melebihi kapasitas {room.name} ({room.capacity} orang). Pengajuan tidak dapat dikirim.
              </p>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting !== null || overCapacity || hasSundayAula || (check !== null && !check.ok)}
              onClick={() => void submit("submit")}
            >
              {submitting === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {submitting === "submit"
                ? "Mengirim…"
                : edit
                  ? "Kirim ulang pengajuan"
                  : "Kirim pengajuan"}
            </button>
            <button type="button" className="btn btn-secondary" disabled={submitting !== null} onClick={() => void submit("draft")}>
              {submitting === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simpan sebagai draft
            </button>
            <Link href="/jadwal" className="btn btn-ghost">
              Kembali ke jadwal
            </Link>
          </div>
        </section>
      </form>

      {/* Ringkasan */}
      <aside className="lg:sticky lg:top-20">
        <div className="card p-5">
          <p className="kicker">Ringkasan</p>
          <h2 className="mt-2 text-2xl">{form.activityName || "Kegiatan baru"}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Atas nama" value={BORROWER_LABEL[borrowerType]} />
            <SummaryRow label="Peminjam" value={form.requesterName || "—"} />
            <SummaryRow label="Ruangan" value={room ? `${room.code} — ${room.name}` : "Belum dipilih"} />
            <SummaryRow
              label="Kelas"
              value={room ? APPROVAL_CLASS_LABEL[room.approvalClass] : "—"}
            />
            <SummaryRow
              label="Jadwal"
              value={
                sessions
                  .map(
                    (session) =>
                      `${formatDateId(session.date, "short")} · ${formatTime(session.start)} – ${formatTime(session.end)}`,
                  )
                  .join("; ") || "—"
              }
            />
            <SummaryRow label="Peserta" value={form.participants ? `${form.participants} orang` : "—"} />
            <SummaryRow
              label="Fasilitas"
              value={
                [...facilities.map((item) => (item.qty > 1 ? `${item.name} (${item.qty})` : item.name)), ...(security ? ["Security"] : [])].join(", ") || "Tidak ada"
              }
            />
          </dl>

          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
              Jalur persetujuan
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              {borrowerType !== "ORGANISASI" ? (
                <>
                  <Badge tone="hold" dot>Bagian Akademik</Badge>
                  <span className="text-[var(--ink-3)]">→</span>
                  <Badge tone="muted">Selesai</Badge>
                </>
              ) : (
                <>
                  <Badge tone="hold" dot>Bagian Akademik</Badge>
                  <span className="text-[var(--ink-3)]">→</span>
                  <Badge tone="hold" dot>Kemahasiswaan</Badge>
                  <span className="text-[var(--ink-3)]">→</span>
                  <Badge tone="ok">Selesai</Badge>
                </>
              )}
            </div>
            <p className="mt-2 text-[0.8rem] text-[var(--ink-3)]">
              {borrowerType === "ORGANISASI"
                ? "Pengajuan organisasi ditinjau dan disetujui Bagian Akademik, lalu Kemahasiswaan."
                : "Pengajuan mahasiswa/dosen hanya memerlukan persetujuan Bagian Akademik."}
            </p>
          </div>

          {check && !check.ok ? (
            <p className="mt-4 rounded-[10px] border border-[var(--hold-line)] bg-[var(--hold-soft)] px-3 py-2 text-[0.8rem] text-[var(--hold)]">
              {check.issues[0]?.message}
            </p>
          ) : null}
        </div>

        <p className="mt-3 px-1 text-[0.8rem] text-[var(--ink-3)]">
          Dengan mengirim, pengajuan masuk ke antrean admin dan slot berstatus{" "}
          <strong>Menunggu Approve</strong> sampai diputuskan.
        </p>
      </aside>
    </div>
  );
}

function SectionTitle({ index, title, hint }: { index: string; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 font-display text-lg text-[var(--accent-ink)]">{index}</span>
      <div>
        <h2 className="text-xl leading-tight">{title}</h2>
        <p className="mt-0.5 text-[0.8rem] text-[var(--ink-3)]">{hint}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-[var(--ink-3)]">{label}</dt>
      <dd className="text-[var(--ink)]">{value}</dd>
    </div>
  );
}

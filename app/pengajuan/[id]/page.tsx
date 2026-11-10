import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { CancelButton } from "@/components/booking/cancel-button";
import { DecisionPanel } from "@/components/booking/decision-panel";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { getBookingDetail } from "@/lib/data";
import {
  APPROVAL_CLASS_LABEL,
  BORROWER_LABEL,
  type BorrowerType,
} from "@/lib/rbac";
import { formatDateId, formatTimeRange, formatTimestamp } from "@/lib/time";

export const metadata = { title: "Detail pengajuan" };

const DECISION_LABEL: Record<string, string> = {
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  REVISION: "Perlu revisi",
  CANCELLED: "Dibatalkan",
};

const STAGE_LABEL: Record<string, string> = {
  AUTO: "Sistem (Kelas A)",
  ADMIN1: "Bagian Akademik",
  ADMIN2: "Kemahasiswaan",
};

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const booking = getBookingDetail(id);
  if (!booking) notFound();

  const isAdmin = user.role === "ADMIN1" || user.role === "ADMIN2";
  if (booking.requesterId !== user.id && !isAdmin) redirect("/pengajuan");

  const canDecide =
    (booking.status === "PENDING_ADMIN1" && user.role === "ADMIN1") ||
    (booking.status === "PENDING_ADMIN2" && user.role === "ADMIN2");
  const canSubmit = booking.requesterId === user.id && (booking.status === "DRAFT" || booking.status === "REVISION");
  const canCancel =
    (booking.requesterId === user.id || isAdmin) &&
    !["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status);
  const memoHref = booking.verificationCode ? `/memo/${booking.verificationCode}` : null;

  const facilitiesBySection = booking.facilities.reduce<Record<string, typeof booking.facilities>>(
    (acc, facility) => {
      acc[facility.section] = [...(acc[facility.section] ?? []), facility];
      return acc;
    },
    {},
  );

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-10 md:px-8 md:py-12">
      <Link href={isAdmin && booking.requesterId !== user.id ? "/admin/persetujuan" : "/pengajuan"} className="link inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">
            {booking.documentNo ?? "Pengajuan"} · {APPROVAL_CLASS_LABEL[booking.approvalClass]}
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl md:text-4xl">{booking.activityName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--ink-2)]">
            <StatusBadge status={booking.status} />
            <span>{booking.roomCode} — {booking.roomName}</span>
            <span aria-hidden="true">·</span>
            <span>{booking.activityType}</span>
            {booking.submittedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Diajukan {formatTimestamp(booking.submittedAt)}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {memoHref ? (
            <Link href={memoHref} className="btn btn-primary">
              <FileText className="h-4 w-4" strokeWidth={1.8} /> Internal Memo
            </Link>
          ) : null}
          {canSubmit ? (
            <Link href={`/ajukan?edit=${booking.id}`} className="btn btn-secondary">
              Ubah data
            </Link>
          ) : null}
          {canCancel ? <CancelButton bookingId={booking.id} isAdmin={isAdmin} /> : null}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-start">
        <div className="space-y-6">
          <section className="card p-5 md:p-6">
            <h2 className="text-xl">Kegiatan</h2>
            <p className="mt-3 text-[var(--ink-2)]">{booking.activityDescription}</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <InfoItem icon={Users} label="Peserta" value={`${booking.participants} orang`} />
              <InfoItem icon={CalendarDays} label="Jumlah sesi" value={`${booking.sessions.length} sesi`} />
              <InfoItem
                icon={Building2}
                label="Kelas persetujuan"
                value={APPROVAL_CLASS_LABEL[booking.approvalClass]}
              />
            </dl>
          </section>

          <section className="card p-5 md:p-6">
            <h2 className="text-xl">Ruangan &amp; jadwal</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="data-table min-w-[520px]">
                <thead>
                  <tr>
                    <th scope="col">No</th>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Waktu (WITA)</th>
                    <th scope="col">Tempat</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.sessions.map((session, index) => (
                    <tr key={session.id}>
                      <td>{index + 1}.</td>
                      <td>{formatDateId(session.date)}</td>
                      <td className="whitespace-nowrap">{formatTimeRange(session.start, session.end)}</td>
                      <td>{booking.roomCode} — {booking.roomName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[0.8rem] text-[var(--ink-3)]">
              <MapPin className="mt-0.5 h-3.5 w-3.5" strokeWidth={1.8} />
              {booking.building} · Lt. {booking.roomFloor} · kapasitas {booking.roomCapacity} orang
            </p>
          </section>

          <section className="card p-5 md:p-6">
            <h2 className="text-xl">Fasilitas diminta</h2>
            {booking.facilities.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--ink-3)]">Tidak ada permintaan fasilitas tambahan.</p>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {Object.entries(facilitiesBySection).map(([section, items]) => (
                  <div key={section}>
                    <p className="label">{section}</p>
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3 border-b border-[var(--line)] pb-1">
                          <span>{item.name}</span>
                          <span className="tabular-nums text-[var(--ink-3)]">{item.qty}×</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {booking.plottingRequested ? (
              <p className="mt-4 rounded-[10px] bg-[var(--accent-soft)] px-3 py-2 text-[0.8rem] text-[var(--accent-ink)]">
                Plotting ruangan oleh Bagian Akademik tercantum otomatis pada memo.
              </p>
            ) : null}
          </section>

          <section className="card p-5 md:p-6">
            <h2 className="text-xl">Peminjam &amp; panitia</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoItem
                icon={Users}
                label="Atas nama"
                value={BORROWER_LABEL[booking.borrowerType as BorrowerType] ?? booking.borrowerType}
              />
              <InfoItem icon={Users} label="Nama" value={booking.requesterName} />
              <InfoItem icon={Mail} label="Email" value={booking.requesterEmail} />
              <InfoItem icon={Phone} label="Kontak" value={booking.requesterContact} />
              {booking.nim ? <InfoItem icon={Users} label="NIM/NIDN" value={booking.nim} /> : null}
              {booking.jurusan ? <InfoItem icon={Users} label="Jurusan" value={booking.jurusan} /> : null}
              {booking.orgName ? <InfoItem icon={Users} label="Organisasi" value={booking.orgName} /> : null}
              {booking.ketuaName ? <InfoItem icon={Users} label="Ketua panitia" value={`${booking.ketuaName}${booking.ketuaNim ? ` (${booking.ketuaNim})` : ""}`} /> : null}
              {booking.sekretarisName ? <InfoItem icon={Users} label="Sekretaris" value={`${booking.sekretarisName}${booking.sekretarisNim ? ` (${booking.sekretarisNim})` : ""}`} /> : null}
            </dl>
          </section>

          {booking.attachments.length > 0 ? (
            <section className="card p-5 md:p-6">
              <h2 className="text-xl">Lampiran</h2>
              <ul className="mt-3 space-y-2">
                {booking.attachments.map((file) => (
                  <li key={file.id}>
                    <a href={`/api/attachments/${file.id}`} className="flex items-center gap-2 text-sm link">
                      <FileText className="h-4 w-4" /> {file.filename}
                      <span className="text-[var(--ink-3)]">({(file.size / 1024).toFixed(0)} KB)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card p-5 md:p-6">
            <h2 className="text-xl">Riwayat persetujuan</h2>
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)] text-[0.7rem] font-bold">
                  1
                </span>
                <div>
                  <p className="text-sm font-semibold">Pengajuan dibuat</p>
                  <p className="text-[0.8rem] text-[var(--ink-3)]">{formatTimestamp(booking.createdAt)} · {booking.requesterName}</p>
                </div>
              </li>
              {booking.approvals.map((approval, index) => (
                <li key={approval.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[0.7rem] font-bold text-[var(--brand-strong)]">
                    {index + 2}
                  </span>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {STAGE_LABEL[approval.stage] ?? approval.stage}
                      <Badge
                        tone={
                          approval.decision === "APPROVED"
                            ? "ok"
                            : approval.decision === "REJECTED"
                              ? "busy"
                              : approval.decision === "REVISION"
                                ? "hold"
                                : "muted"
                        }
                      >
                        {DECISION_LABEL[approval.decision] ?? approval.decision}
                      </Badge>
                    </p>
                    <p className="text-[0.8rem] text-[var(--ink-3)]">
                      {approval.actorName ?? "Sistem"} · {formatTimestamp(approval.createdAt)}
                      {approval.roomCheck === 1 ? " · ruangan dicek" : ""}
                    </p>
                    {approval.note ? <p className="mt-1 text-sm text-[var(--ink-2)]">“{approval.note}”</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="card p-5">
            <p className="kicker">Status</p>
            <div className="mt-2"><StatusBadge status={booking.status} /></div>
            <p className="mt-3 text-sm text-[var(--ink-2)]">{statusMessage(booking.status, booking.approvalClass)}</p>
            {booking.decisionNote ? (
              <p className="mt-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                Catatan admin: {booking.decisionNote}
              </p>
            ) : null}

            <dl className="mt-4 space-y-2 border-t border-[var(--line)] pt-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--ink-3)]">Nomor dokumen</dt>
                <dd>{booking.documentNo ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--ink-3)]">Kode verifikasi</dt>
                <dd>{booking.verificationCode ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--ink-3)]">Disetujui</dt>
                <dd>{booking.approvedAt ? formatTimestamp(booking.approvedAt) : "—"}</dd>
              </div>
            </dl>

            {memoHref ? (
              <Link href={memoHref} className="btn btn-primary mt-4 w-full">
                <Download className="h-4 w-4" strokeWidth={1.8} /> Buka memo siap cetak
              </Link>
            ) : null}
          </div>

          {canDecide ? (
            <div className="card p-5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--brand)]" strokeWidth={1.8} />
                <h2 className="text-lg">Keputusan Anda</h2>
              </div>
              <p className="mt-1 text-[0.8rem] text-[var(--ink-3)]">
                {user.role === "ADMIN1" ? "Tahap 1 · Bagian Akademik" : "Tahap 2 · Kemahasiswaan"}
              </p>
              <div className="mt-4">
                <DecisionPanel
                  bookingId={booking.id}
                  stage={user.role === "ADMIN1" ? "ADMIN1" : "ADMIN2"}
                  requiresRoomCheck={booking.borrowerType === "ORGANISASI" && user.role === "ADMIN1"}
                  compact
                />
              </div>
            </div>
          ) : null}

          {booking.status === "APPROVED" ? (
            <div className="rounded-[10px] border border-[var(--ok-line)] bg-[var(--ok-soft)] p-4 text-sm text-[var(--ok)]">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} /> Disetujui penuh
              </p>
              <p className="mt-1">
                Tunjukkan memo dan QR verifikasi kepada Security saat menggunakan ruangan.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function statusMessage(status: string, approvalClass: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft tersimpan. Kirim pengajuan untuk memulai validasi dan antrean persetujuan.";
    case "PENDING_ADMIN1":
      return approvalClass === "B"
        ? "Menunggu approve Bagian Akademik. Slot berstatus Menunggu Approve."
        : "Menunggu approve Bagian Akademik untuk pengecekan ruangan sebelum diteruskan ke Kemahasiswaan.";
    case "PENDING_ADMIN2":
      return "Sudah disetujui Bagian Akademik. Menunggu tinjauan dan persetujuan Kemahasiswaan.";
    case "APPROVED_AUTO":
      return "Lolos validasi Kelas A dan disetujui otomatis. Memo sudah tersedia.";
    case "APPROVED":
      return "Disetujui penuh. Memo Internal siap dicetak dan dipindai QR-nya.";
    case "REJECTED":
      return "Pengajuan ditolak. Baca catatan admin, lalu buat pengajuan baru bila perlu.";
    case "REVISION":
      return "Admin meminta perbaikan. Perbarui data melalui halaman pengajuan lalu kirim ulang.";
    case "CANCELLED":
      return "Pengajuan dibatalkan dan slot sudah dilepas.";
    case "COMPLETED":
      return "Kegiatan selesai.";
    default:
      return "";
  }
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" strokeWidth={1.8} />
      <div>
        <dt className="text-[0.8rem] uppercase tracking-[0.06em] text-[var(--ink-3)]">{label}</dt>
        <dd className="text-sm text-[var(--ink)]">{value}</dd>
      </div>
    </div>
  );
}

import Link from "next/link";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { DecisionPanel } from "@/components/booking/decision-panel";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { listApprovalQueue } from "@/lib/data";
import { APPROVAL_CLASS_LABEL, BORROWER_LABEL, type BorrowerType } from "@/lib/rbac";
import { formatDateId, formatTimeRange, formatTimestamp, isOverduePending } from "@/lib/time";

export const metadata = { title: "Antrean persetujuan" };

export default async function PersetujuanPage() {
  const user = await requireAdmin();
  const role = user.role === "ADMIN1" ? "ADMIN1" : "ADMIN2";
  const queue = listApprovalQueue(role);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Antrean persetujuan</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            {role === "ADMIN1"
              ? "Pengajuan mahasiswa/dosen dan tahap pertama pengajuan organisasi."
              : "Tahap kedua pengajuan organisasi setelah disetujui Bagian Akademik."}
          </p>
        </div>
        <Badge tone={queue.length > 0 ? "hold" : "ok"} dot>
          {queue.length} menunggu
        </Badge>
      </div>

      {queue.length === 0 ? (
        <div className="card mt-6 px-6 py-16 text-center">
          <ClipboardCheck className="mx-auto h-7 w-7 text-[var(--ink-3)]" strokeWidth={1.6} />
          <p className="mt-3 font-display text-2xl">Antrean bersih</p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Tidak ada pengajuan yang menunggu keputusan Anda.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {queue.map((booking) => (
            <article key={booking.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={booking.borrowerType === "ORGANISASI" ? "brand" : "hold"}>
                      {APPROVAL_CLASS_LABEL[booking.approvalClass]}
                    </Badge>
                    <StatusBadge status={booking.status} />
                    {isOverduePending(booking.submittedAt ?? booking.createdAt) ? (
                      <Badge tone="busy">
                        <AlertTriangle className="h-3 w-3" /> &gt; 2 hari kerja
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-xl">{booking.activityName}</h3>
                  <p className="mt-1 text-sm text-[var(--ink-2)]">
                    {booking.roomCode} — {booking.roomName} · {booking.participants} peserta
                  </p>
                  <p className="mt-0.5 text-[0.8rem] text-[var(--ink-3)]">
                    {BORROWER_LABEL[booking.borrowerType as BorrowerType] ?? booking.borrowerType} · {booking.requesterName}
                    {booking.orgName ? ` · ${booking.orgName}` : ""}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>{booking.firstDate ? formatDateId(booking.firstDate, "short") : "—"}</p>
                  <p className="text-[0.8rem] text-[var(--ink-3)]">
                    {booking.firstStart && booking.firstEnd
                      ? formatTimeRange(booking.firstStart, booking.firstEnd)
                      : ""}
                    {booking.sessionCount > 1 ? ` · +${booking.sessionCount - 1} sesi` : ""}
                  </p>
                  <p className="mt-1 text-[0.8rem] text-[var(--ink-3)]">
                    Masuk {booking.submittedAt ? formatTimestamp(booking.submittedAt) : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 lg:grid-cols-[1fr_1.1fr]">
                <div>
                  <p className="text-[0.8rem] uppercase tracking-[0.06em] text-[var(--ink-3)]">Deskripsi</p>
                  <p className="mt-1 text-sm text-[var(--ink-2)]">
                    {booking.activityType} · {booking.sessionCount} sesi
                  </p>
                  <Link href={`/pengajuan/${booking.id}`} className="link mt-2 inline-block text-sm">
                    Buka detail lengkap
                  </Link>
                </div>
                <DecisionPanel
                  bookingId={booking.id}
                  stage={role}
                  requiresRoomCheck={booking.borrowerType === "ORGANISASI" && role === "ADMIN1"}
                  compact
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

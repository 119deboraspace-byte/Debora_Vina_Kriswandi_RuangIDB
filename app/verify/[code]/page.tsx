import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { findBookingByCode, getAdminName } from "@/lib/data";
import { formatDateId, formatTimeRange, formatTimestamp } from "@/lib/time";

export const metadata = { title: "Verifikasi dokumen" };

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const booking = findBookingByCode(code);
  const admin1 = getAdminName("ADMIN1");
  const admin2 = getAdminName("ADMIN2");

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-12 md:px-8 md:py-16">
      <p className="kicker">Verifikasi dokumen</p>
      <h1 className="mt-3 text-4xl md:text-5xl">Keaslian Internal Memo</h1>
      <p className="mt-3 text-[var(--ink-2)]">
        Halaman ini dipindai dari kode QR pada dokumen. Data di bawah berasal langsung dari
        database RuangIDB, bukan dari isi kertas.
      </p>

      <div className="mt-8">
        {booking ? (
          <div className="card overflow-hidden">
            <div className="flex items-start gap-3 border-b border-[var(--ok-line)] bg-[var(--ok-soft)] px-5 py-4 text-[var(--ok)]">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" strokeWidth={1.8} />
              <div>
                <p className="font-semibold">Dokumen terverifikasi</p>
                <p className="text-sm">
                  Nomor {booking.documentNo} tercatat sebagai pengajuan yang disetujui.
                </p>
              </div>
            </div>

            <dl className="divide-y divide-[var(--line)] px-5 py-2">
              {[
                ["Nomor dokumen", booking.documentNo ?? "—"],
                ["Kode verifikasi", booking.verificationCode ?? "—"],
                ["Kegiatan", booking.activityName],
                ["Peminjam", booking.orgName ?? booking.requesterName],
                ["Ruangan", `${booking.roomCode} — ${booking.roomName}`],
                ["Gedung", `${booking.building}, lantai ${booking.roomFloor}`],
                [
                  "Jadwal",
                  booking.sessions
                    .map((session) => `${formatDateId(session.date, "short")} · ${formatTimeRange(session.start, session.end)}`)
                    .join("; "),
                ],
                ["Status", "DISETUJUI"],
                ["Disetujui pada", booking.approvedAt ? formatTimestamp(booking.approvedAt) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                  <dt className="text-[0.8rem] uppercase tracking-[0.06em] text-[var(--ink-3)]">{label}</dt>
                  <dd className="text-sm text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-4 text-sm text-[var(--ink-2)]">
              <p className="font-semibold text-[var(--ink)]">Jejak persetujuan</p>
              <ul className="mt-2 space-y-1">
                {booking.approvals.map((approval) => (
                  <li key={approval.id}>
                    {approval.stage === "AUTO"
                      ? "Sistem"
                      : approval.stage === "ADMIN1"
                        ? `Admin 1 (BAA) — ${approval.actorName ?? admin1 ?? "—"}`
                        : `Admin 2 (Kemahasiswaan) — ${approval.actorName ?? admin2 ?? "—"}`}
                    {" · "}
                    {formatTimestamp(approval.createdAt)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="card border-[var(--busy-line)] p-6">
            <div className="flex items-start gap-3 text-[var(--busy)]">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0" strokeWidth={1.8} />
              <div>
                <p className="font-semibold">Dokumen tidak ditemukan</p>
                <p className="mt-1 text-sm">
                  Kode <code className="font-semibold">{code}</code> tidak cocok dengan memo yang
                  disetujui. Dokumen mungkin palsu, sudah dibatalkan, atau kode salah ketik.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-[var(--ink-2)]">
        Butuh memeriksa jadwal?{" "}
        <Link href="/jadwal" className="link">
          Buka live table ketersediaan
        </Link>
        .
      </p>
    </div>
  );
}

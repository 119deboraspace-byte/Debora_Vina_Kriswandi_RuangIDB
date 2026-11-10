import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarPlus, ClipboardList } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { listMyBookings } from "@/lib/data";
import { APPROVAL_CLASS_LABEL } from "@/lib/rbac";
import { formatDateId, formatTimeRange } from "@/lib/time";

export const metadata = { title: "Pengajuan saya" };

export default async function PengajuanPage() {
  const user = await requireUser();
  if (user.role === "ADMIN1" || user.role === "ADMIN2") redirect("/admin/persetujuan");
  const bookings = listMyBookings(user.id);

  const counts = bookings.reduce<Record<string, number>>((acc, booking) => {
    acc[booking.status] = (acc[booking.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-10 md:px-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Riwayat</p>
          <h1 className="mt-3 text-4xl md:text-5xl">Pengajuan saya</h1>
          <p className="mt-3 text-[var(--ink-2)]">
            Lacak status, kirim ulang draft/revisi, batalkan, dan unduh Internal Memo.
          </p>
        </div>
        <Link href="/ajukan" className="btn btn-primary">
          <CalendarPlus className="h-4 w-4" strokeWidth={1.8} /> Pengajuan baru
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {[
          ["Menunggu", (counts.PENDING_ADMIN1 ?? 0) + (counts.PENDING_ADMIN2 ?? 0)],
          ["Disetujui", counts.APPROVED ?? 0],
          ["Perlu revisi", counts.REVISION ?? 0],
          ["Draft", counts.DRAFT ?? 0],
          ["Ditolak", counts.REJECTED ?? 0],
          ["Dibatalkan", counts.CANCELLED ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
            <p className="text-[0.8rem] text-[var(--ink-3)]">{label}</p>
            <p className="font-display text-xl leading-none">{value}</p>
          </div>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <ClipboardList className="mx-auto h-7 w-7 text-[var(--ink-3)]" strokeWidth={1.6} />
          <h2 className="mt-3 text-2xl">Belum ada pengajuan</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Mulai dari papan jadwal untuk melihat slot kosong, lalu ajukan peminjaman.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/jadwal" className="btn btn-primary">Lihat jadwal</Link>
            <Link href="/ajukan" className="btn btn-secondary">Ajukan peminjaman</Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
          <table className="data-table min-w-[900px]">
            <caption className="sr-only">Daftar pengajuan peminjaman ruangan milik Anda</caption>
            <thead>
              <tr>
                <th scope="col">Kegiatan</th>
                <th scope="col">Ruangan</th>
                <th scope="col">Jadwal</th>
                <th scope="col">Kelas</th>
                <th scope="col">Status</th>
                <th scope="col">Memo</th>
                <th scope="col" className="text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <p className="font-semibold text-[var(--ink)]">{booking.activityName}</p>
                    <p className="mt-0.5 text-[0.8rem] text-[var(--ink-3)]">{booking.activityType} · {booking.participants} peserta</p>
                  </td>
                  <td>
                    <p>{booking.roomCode}</p>
                    <p className="text-[0.8rem] text-[var(--ink-3)]">{booking.roomName}</p>
                  </td>
                  <td>
                    {booking.firstDate ? (
                      <>
                        <p>{formatDateId(booking.firstDate, "short")}</p>
                        <p className="text-[0.8rem] text-[var(--ink-3)]">
                          {booking.firstStart && booking.firstEnd
                            ? formatTimeRange(booking.firstStart, booking.firstEnd)
                            : ""}
                          {booking.sessionCount > 1 ? ` · +${booking.sessionCount - 1} sesi` : ""}
                        </p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{APPROVAL_CLASS_LABEL[booking.approvalClass]}</td>
                  <td><StatusBadge status={booking.status} /></td>
                  <td>
                    {booking.verificationCode ? (
                      <Link href={`/memo/${booking.verificationCode}`} className="link text-[0.8rem]">
                        {booking.documentNo}
                      </Link>
                    ) : (
                      <span className="text-[var(--ink-3)]">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link href={`/pengajuan/${booking.id}`} className="btn btn-sm btn-secondary">
                      Buka <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

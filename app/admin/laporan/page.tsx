import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getStats } from "@/lib/data";
import { STATUS_LABEL, type BookingStatus } from "@/lib/rbac";

export const metadata = { title: "Laporan" };

export default async function LaporanPage() {
  await requireAdmin();
  const stats = getStats();

  const pendingTotal = (stats.byStatus.PENDING_ADMIN1 ?? 0) + (stats.byStatus.PENDING_ADMIN2 ?? 0);
  const rows: Array<{ status: string; label: string; value: number }> = (
    Object.keys(STATUS_LABEL) as BookingStatus[]
  )
    .filter((status) => status !== "PENDING_ADMIN2")
    .map((status) => ({
      status,
      label: STATUS_LABEL[status],
      value: status === "PENDING_ADMIN1" ? pendingTotal : (stats.byStatus[status] ?? 0),
    }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Laporan &amp; pemakaian</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Jendela 14 hari ke depan. Utilisasi dihitung dari jam yang sudah disetujui dibagi
            kapasitas jam operasional seluruh ruangan aktif.
          </p>
        </div>
        <a href="/api/export" className="btn btn-secondary">
          <Download className="h-4 w-4" strokeWidth={1.8} /> Ekspor CSV
        </a>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Menunggu keputusan", value: stats.pending, tone: "text-[var(--hold)]" },
          { label: "Disetujui", value: stats.approved, tone: "text-[var(--ok)]" },
          { label: "Ditolak", value: stats.rejected, tone: "text-[var(--busy)]" },
          { label: "Total pengajuan", value: stats.total, tone: "text-[var(--ink)]" },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-[0.8rem] uppercase tracking-[0.06em] text-[var(--ink-3)]">{card.label}</p>
            <p className={`mt-1 font-display text-3xl leading-none ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="card p-5">
          <h3 className="text-xl">Utilisasi ruangan</h3>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            {stats.totalRooms} ruangan aktif · 14 hari · 07.00–20.00 WITA (08.00 PM)
          </p>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className="h-full bg-[var(--brand)]"
              style={{ width: `${Math.min(100, stats.utilization)}%` }}
              role="progressbar"
              aria-valuenow={stats.utilization}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Persentase utilisasi ruangan"
            />
          </div>
          <p className="mt-2 font-display text-3xl">{stats.utilization}%</p>
          <p className="text-[0.8rem] text-[var(--ink-3)]">
            Jam disetujui dibanding kapasitas jam operasional.
          </p>
        </section>

        <section className="card p-5">
          <h3 className="text-xl">Ruangan paling sering dipakai</h3>
          {stats.topRooms.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-3)]">Belum ada pemakaian disetujui.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {stats.topRooms.map((room, index) => (
                <li key={room.code} className="flex items-center gap-3">
                  <span className="w-5 font-display text-lg text-[var(--ink-3)]">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{room.code} — {room.name}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${Math.min(100, (room.count / Math.max(1, stats.topRooms[0].count)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm tabular-nums text-[var(--ink-2)]">{room.count} sesi</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl">Rekap status</h3>
          <Link href="/admin/persetujuan" className="link text-sm">Buka antrean</Link>
        </div>
        <table className="data-table mt-3">
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.status}>
                <td>{row.label}</td>
                <td className="text-right tabular-nums">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

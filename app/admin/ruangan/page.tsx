import { RoomAdmin } from "@/components/admin/room-admin";
import { requireAdmin } from "@/lib/auth";
import { listRooms } from "@/lib/data";

export const metadata = { title: "Kelola ruangan" };

export default async function RuanganPage() {
  const user = await requireAdmin();
  const rooms = listRooms({ includeInactive: true });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Data master ruangan</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            29 ruangan, kapasitas, kelas persetujuan, dan status aktif. Perubahan kondisi harian
            dilakukan langsung di live table.
          </p>
        </div>
        {user.role === "ADMIN2" ? (
          <p className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[0.8rem] text-[var(--ink-2)]">
            Baca-saja untuk Kemahasiswaan.
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <RoomAdmin rooms={rooms} canEdit={user.role === "ADMIN1"} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { Info, LogIn } from "lucide-react";
import { AvailabilityBoard } from "@/components/availability/availability-board";
import { getSessionUser } from "@/lib/auth";
import { getAvailability } from "@/lib/data";
import { addDays, todayWita } from "@/lib/time";

export const metadata = { title: "Live table ketersediaan" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JadwalPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getSessionUser();
  const today = todayWita();
  const requestedFrom = first(params.from);
  const from = requestedFrom && /^\d{4}-\d{2}-\d{2}$/.test(requestedFrom) && requestedFrom >= today ? requestedFrom : today;
  const to = addDays(from, 13);

  const payload = getAvailability(from, to, {
    name: user?.name ?? null,
    role: user?.role ?? null,
  });

  const roomParam = first(params.room);
  const dateParam = first(params.date);
  const viewParam = first(params.view) === "grid" ? "grid" : "list";

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-10 md:px-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="kicker">Live table · 14 hari</p>
          <h1 className="mt-3 text-4xl md:text-5xl">Ketersediaan ruangan</h1>
          <p className="mt-3 max-w-2xl text-[var(--ink-2)]">
            Jadwal, kondisi, dan situasi 29 ruangan kampus. Warna menunjukkan apakah
            ruangan kosong, terpakai, menunggu approve, atau ditolak.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Link href="/ajukan" className="btn btn-primary">
              Ajukan peminjaman
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary">
              <LogIn className="h-4 w-4" strokeWidth={1.8} /> Masuk untuk mengajukan
            </Link>
          )}
          <Link href="/#alur" className="btn btn-secondary">
            Panduan kelas ruangan
          </Link>
        </div>
      </div>

      {!user ? (
        <div className="mt-6 flex items-start gap-2 rounded-[10px] border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3 py-2.5 text-sm text-[var(--brand-strong)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <p>
            Anda melihat mode tamu: nama pengaju disamarkan. Masuk untuk melihat detail
            pengaju, mengajukan, dan mengunduh memo.
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        <AvailabilityBoard
          initial={payload}
          canEdit={user?.role === "ADMIN1"}
          isAdmin={user?.role === "ADMIN1" || user?.role === "ADMIN2"}
          canBook={Boolean(user)}
          initialRoomId={roomParam}
          initialDate={dateParam}
          initialView={viewParam}
        />
      </div>
    </div>
  );
}

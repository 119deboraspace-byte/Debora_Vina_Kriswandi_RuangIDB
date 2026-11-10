import { requireAdmin } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/rbac";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-10 md:px-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Panel admin</p>
          <h1 className="mt-2 text-3xl md:text-4xl">
            {user.role === "ADMIN1" ? "Akademik & ruangan" : "Kemahasiswaan"}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">{ROLE_LABEL[user.role]} · {user.name}</p>
        </div>
        {user.role === "ADMIN2" ? (
          <p className="max-w-sm text-[0.8rem] text-[var(--ink-3)]">
            Kemahasiswaan memverifikasi organisasi dan memberi persetujuan tahap kedua untuk
            pengajuan organisasi. Data master ruangan bersifat baca-saja.
          </p>
        ) : (
          <p className="max-w-sm text-[0.8rem] text-[var(--ink-3)]">
            Admin (Bagian Akademik) mengelola data ruangan, live table, antrean persetujuan, pengguna, dan log audit.
          </p>
        )}
      </div>

      <AdminNav role={user.role === "ADMIN2" ? "ADMIN2" : "ADMIN1"} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

import { UserAdmin } from "@/components/admin/user-admin";
import { requireAdmin } from "@/lib/auth";
import { getOrganizationList, listUsers } from "@/lib/data";

export const metadata = { title: "Kelola pengguna" };

export default async function PenggunaPage() {
  const user = await requireAdmin();
  const users = listUsers();
  const organizations = getOrganizationList();

  return (
    <div>
      <div>
        <h2 className="text-2xl">Pengguna &amp; organisasi</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--ink-2)]">
          Verifikasi organisasi mahasiswa sebelum dapat mengajukan peminjaman (BR-07). Akun
          mahasiswa dan dosen aktif otomatis setelah pendaftaran.
        </p>
      </div>

      <div className="mt-6">
        <UserAdmin
          users={users}
          organizations={organizations}
          role={user.role === "ADMIN1" ? "ADMIN1" : "ADMIN2"}
        />
      </div>
    </div>
  );
}

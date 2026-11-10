import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrganizationList } from "@/lib/data";
import { ROLE_HOME } from "@/lib/rbac";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Daftar" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);
  const organizations = getOrganizationList().map((org) => ({ id: org.id, name: org.name }));

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-12 md:px-8 md:py-16">
      <p className="kicker">Pendaftaran akun</p>
      <h1 className="mt-3 text-4xl md:text-5xl">Buat akun RuangIDB</h1>
      <p className="mt-3 max-w-xl text-[var(--ink-2)]">
        Mahasiswa dan dosen dapat langsung mengajukan. Akun organisasi mahasiswa
        diverifikasi Kemahasiswaan sebelum dapat mengajukan peminjaman.
      </p>

      <div className="card mt-8 p-6 md:p-8">
        <RegisterForm organizations={organizations} />
      </div>

      <p className="mt-4 text-sm text-[var(--ink-2)]">
        Sudah punya akun?{" "}
        <Link href="/login" className="link">
          Masuk
        </Link>
        .
      </p>
    </div>
  );
}

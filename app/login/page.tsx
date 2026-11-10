import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/rbac";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 py-12 md:grid-cols-[1fr_0.9fr] md:gap-16 md:px-8 md:py-16">
      <div>
        <p className="kicker">Masuk ke RuangIDB</p>
        <h1 className="mt-3 text-4xl md:text-5xl">
          Papan jadwal kampus
          <br />
          menunggu Anda.
        </h1>
        <p className="mt-4 max-w-md text-[var(--ink-2)]">
          Gunakan akun kampus untuk mengajukan peminjaman, melacak persetujuan, dan
          mengunduh Internal Memo. Organisasi mahasiswa harus diverifikasi Kemahasiswaan.
        </p>

        <div className="mt-8 overflow-hidden rounded-[10px] border border-[var(--line)]">
          <Image
            src="/campus/gedung-idb.jpg"
            alt="Gedung kampus Institut Desain & Bisnis Bali"
            width={800}
            height={600}
            className="h-[240px] w-full object-cover md:h-[300px]"
          />
          <div className="border-t border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--ink-2)]">
            Institut Desain &amp; Bisnis Bali · Jl. Tukad Batanghari No. 29, Denpasar
          </div>
        </div>
      </div>

      <div className="md:pt-10">
        <div className="card p-6 md:p-8">
          <h2 className="text-2xl">Masuk</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Belum punya akun?{" "}
            <Link href="/daftar" className="link">
              Daftar di sini
            </Link>
            .
          </p>
          <LoginForm />
        </div>

        <div className="card-flat mt-4 p-4">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
            Akun demo
          </p>
          <p className="mt-1 text-[0.8rem] text-[var(--ink-2)]">
            Kata sandi sama untuk semua: <code className="font-semibold">RuangIDB#2026</code>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { label: "Admin · Bagian Akademik", email: "admin1@idbbali.ac.id" },
              { label: "Kemahasiswaan", email: "admin2@idbbali.ac.id" },
              { label: "Mahasiswa", email: "mahasiswa@idbbali.ac.id" },
              { label: "Dosen", email: "dosen@idbbali.ac.id" },
              { label: "BEM (ormawa)", email: "bem@idbbali.ac.id" },
            ].map((account) => (
              <button
                key={account.email}
                type="button"
                data-demo-email={account.email}
                className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[0.8rem] text-[var(--ink-2)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand-strong)]"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

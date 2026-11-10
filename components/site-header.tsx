import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { countUnread } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/rbac";
import { initials } from "@/lib/utils";
import { LogoutButton } from "./logout-button";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader() {
  const user = await getSessionUser();
  const unread = user ? countUnread(user.id) : 0;
  const isAdmin = user?.role === "ADMIN1" || user?.role === "ADMIN2";

  const links = isAdmin
    ? [
        { href: "/jadwal", label: "Jadwal" },
        { href: "/admin/persetujuan", label: "Dashboard" },
      ]
    : [
        { href: "/jadwal", label: "Jadwal" },
        ...(user ? [{ href: "/ajukan", label: "Ajukan" }] : []),
        ...(user ? [{ href: "/pengajuan", label: "Pengajuan Saya" }] : []),
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--base)]">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-4 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="RuangIDB — beranda">
          <Image
            src="/brand/idb-mark.png"
            alt=""
            width={34}
            height={34}
            priority
            className="h-[34px] w-[34px]"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[1.35rem] tracking-tight text-[var(--ink)]">
              Ruang<span className="text-[var(--brand)]">IDB</span>
            </span>
            <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">
              IDB Bali
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[10px] px-3 py-2 text-sm font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/notifikasi"
                className="icon-btn relative"
                aria-label={unread > 0 ? `${unread} notifikasi belum dibaca` : "Notifikasi"}
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[0.62rem] font-bold leading-none text-[var(--ink)]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>

              <details className="group relative hidden md:block">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 transition-colors hover:border-[var(--line-strong)] [&::-webkit-details-marker]:hidden">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[0.7rem] font-bold text-[var(--brand-strong)]">
                    {initials(user.name)}
                  </span>
                  <span className="flex max-w-[10rem] flex-col leading-tight">
                    <span className="truncate text-[0.8rem] font-semibold text-[var(--ink)]">
                      {user.name.split(",")[0]}
                    </span>
                    <span className="truncate text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-3)]">
                      {ROLE_LABEL[user.role]}
                    </span>
                  </span>
                </summary>
                <div className="card absolute right-0 z-50 mt-2 w-64 p-2 shadow-[var(--shadow-far)]">
                  <div className="px-2 py-2">
                    <p className="text-sm font-semibold text-[var(--ink)]">{user.name}</p>
                    <p className="text-sm text-[var(--ink-3)]">{user.email}</p>
                    {user.organizationName ? (
                      <p className="mt-1 text-[0.8rem] text-[var(--ink-2)]">{user.organizationName}</p>
                    ) : null}
                  </div>
                  <hr className="rule my-1" />
                  {isAdmin ? (
                    <Link href="/admin/persetujuan" className="block rounded-[10px] px-2 py-2 text-sm hover:bg-[var(--surface-2)]">
                      Dashboard
                    </Link>
                  ) : (
                    <Link href="/pengajuan" className="block rounded-[10px] px-2 py-2 text-sm hover:bg-[var(--surface-2)]">
                      Pengajuan Saya
                    </Link>
                  )}
                  <Link href="/notifikasi" className="block rounded-[10px] px-2 py-2 text-sm hover:bg-[var(--surface-2)]">
                    Notifikasi
                  </Link>
                  <hr className="rule my-1" />
                  <LogoutButton className="w-full justify-start" />
                </div>
              </details>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="btn btn-ghost">
                Masuk
              </Link>
              <Link href="/daftar" className="btn btn-primary">
                Daftar
              </Link>
            </div>
          )}

          <MobileNav links={links} user={user ? { name: user.name, role: ROLE_LABEL[user.role] } : null} />
        </div>
      </div>
    </header>
  );
}

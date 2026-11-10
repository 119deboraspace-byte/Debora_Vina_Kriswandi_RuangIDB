"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./logout-button";

export function MobileNav({
  links,
  user,
}: {
  links: Array<{ href: string; label: string }>;
  user: { name: string; role: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-controls="menu-mobile"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="menu-mobile"
          className="absolute left-0 right-0 top-16 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-far)]"
        >
          <nav aria-label="Navigasi seluler" className="flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-[10px] px-2 py-3 text-base font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link
                href="/notifikasi"
                onClick={() => setOpen(false)}
                className="rounded-[10px] px-2 py-3 text-base font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                Notifikasi
              </Link>
            ) : null}
          </nav>
          <hr className="rule my-2" />
          {user ? (
            <div className="flex items-center justify-between gap-2 px-2 pt-1">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="text-[0.8rem] text-[var(--ink-3)]">{user.role}</p>
              </div>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <Link href="/login" className="btn btn-secondary flex-1" onClick={() => setOpen(false)}>
                Masuk
              </Link>
              <Link href="/daftar" className="btn btn-primary flex-1" onClick={() => setOpen(false)}>
                Daftar
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

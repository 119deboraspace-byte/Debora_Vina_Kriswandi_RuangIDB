"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, DoorOpen, ScrollText, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/persetujuan", label: "Persetujuan", icon: ClipboardCheck, admin1Only: false },
  { href: "/admin/ruangan", label: "Ruangan", icon: DoorOpen, admin1Only: false },
  { href: "/admin/pengguna", label: "Pengguna", icon: Users, admin1Only: false },
  { href: "/admin/audit", label: "Audit", icon: ScrollText, admin1Only: true },
  { href: "/admin/laporan", label: "Laporan", icon: TrendingUp, admin1Only: false },
];

export function AdminNav({ role }: { role: "ADMIN1" | "ADMIN2" }) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => !tab.admin1Only || role === "ADMIN1");

  return (
    <nav aria-label="Navigasi admin" className="mt-6 border-b border-[var(--line)]">
      <ul className="-mb-px flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-[var(--ink)] text-[var(--ink)]"
                    : "border-transparent text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]",
                )}
              >
                <tab.icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

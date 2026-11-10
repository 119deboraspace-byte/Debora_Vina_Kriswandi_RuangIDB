import Link from "next/link";
import { BellOff } from "lucide-react";
import { MarkReadButton } from "@/components/notifications/mark-read-button";
import { requireUser } from "@/lib/auth";
import { countUnread, getNotifications } from "@/lib/data";
import { formatTimestamp } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifikasi" };

export default async function NotifikasiPage() {
  const user = await requireUser();
  const notifications = getNotifications(user.id);
  const unread = countUnread(user.id);

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-10 md:px-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Kotak masuk</p>
          <h1 className="mt-3 text-4xl">Notifikasi</h1>
          <p className="mt-2 text-sm text-[var(--ink-2)]">
            {unread > 0 ? `${unread} notifikasi belum dibaca.` : "Semua notifikasi sudah dibaca."}
          </p>
        </div>
        <MarkReadButton disabled={unread === 0} />
      </div>

      {notifications.length === 0 ? (
        <div className="card mt-8 px-6 py-16 text-center">
          <BellOff className="mx-auto h-7 w-7 text-[var(--ink-3)]" strokeWidth={1.6} />
          <p className="mt-3 font-display text-2xl">Belum ada notifikasi</p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Perubahan status pengajuan akan muncul di sini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--line)] rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
          {notifications.map((item) => (
            <li key={item.id} className={cn("px-4 py-4", !item.isRead && "bg-[var(--brand-soft)]/35")}>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    item.isRead ? "bg-[var(--line-strong)]" : "bg-[var(--accent)]",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {item.href ? (
                      <Link href={item.href} className="hover:underline">
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                    {!item.isRead ? <span className="sr-only">(belum dibaca)</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-2)]">{item.body}</p>
                  <p className="mt-1 text-[0.8rem] text-[var(--ink-3)]">{formatTimestamp(item.createdAt)}</p>
                </div>
                {item.href ? (
                  <Link href={item.href} className="btn btn-sm btn-ghost shrink-0">
                    Buka
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "ok" | "busy" | "hold" | "blocked" | "brand" | "muted" | "accent";

const toneClass: Record<BadgeTone, string> = {
  ok: "badge-ok",
  busy: "badge-busy",
  hold: "badge-hold",
  blocked: "badge-blocked",
  brand: "badge-brand",
  muted: "badge-muted",
  accent: "badge-accent",
};

export function Badge({
  tone = "muted",
  dot = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span className={cn("badge", toneClass[tone], className)} {...props}>
      {dot ? <span className="badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

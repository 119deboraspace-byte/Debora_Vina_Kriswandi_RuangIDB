"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";

export function MarkReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markRead() {
    setPending(true);
    await fetch("/api/notifications", { method: "PATCH" });
    router.refresh();
    setPending(false);
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={() => void markRead()} disabled={disabled || pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" strokeWidth={1.8} />}
      Tandai semua dibaca
    </button>
  );
}

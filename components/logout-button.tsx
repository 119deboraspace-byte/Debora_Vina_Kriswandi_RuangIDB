"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className={cn("btn btn-ghost", className)}
    >
      <LogOut className="h-4 w-4" strokeWidth={1.8} />
      {loading ? "Keluar…" : "Keluar"}
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Field, Input } from "@/components/ui/field";

const DEMO_PASSWORD = "RuangIDB#2026";

export function LoginForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const demo = target.closest<HTMLButtonElement>("[data-demo-email]");
      if (!demo) return;
      setEmail(demo.dataset.demoEmail ?? "");
      setPassword(DEMO_PASSWORD);
      setError(null);
      formRef.current?.querySelector<HTMLInputElement>("#password")?.focus();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; redirect?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Gagal masuk.");
        return;
      }
      window.location.assign(data.redirect ?? "/");
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      {error ? (
        <div className="rounded-[10px] border border-[var(--busy-line)] bg-[var(--busy-soft)] px-3 py-2 text-sm text-[var(--busy)]" role="alert">
          {error}
        </div>
      ) : null}

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@idbbali.ac.id"
        />
      </Field>

      <Field label="Kata sandi" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </Field>

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Memeriksa…" : "Masuk"}
      </button>

      <p className="text-center text-[0.8rem] text-[var(--ink-3)]">
        Dengan masuk, Anda menyetujui penggunaan data untuk keperluan peminjaman ruangan.{" "}
        <Link href="/jadwal" className="link">
          Lihat jadwal tanpa masuk
        </Link>
        .
      </p>
    </form>
  );
}

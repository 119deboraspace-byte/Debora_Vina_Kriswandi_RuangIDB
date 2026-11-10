"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/field";
import { JURUSAN } from "@/lib/rbac";

type Role = "STUDENT" | "LECTURER" | "ORGANIZATION";

export function RegisterForm({
  organizations,
}: {
  organizations: Array<{ id: string; name: string }>;
}) {
  const [role, setRole] = useState<Role>("STUDENT");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    nimNidn: "",
    jurusan: "",
    phone: "",
    organizationId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          role,
          organizationId: role === "ORGANIZATION" ? form.organizationId : null,
          jurusan: role === "ORGANIZATION" ? form.jurusan || null : form.jurusan,
          nimNidn: role === "ORGANIZATION" ? form.nimNidn || null : form.nimNidn,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        redirect?: string;
        pending?: boolean;
      };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Pendaftaran gagal.");
        return;
      }
      if (data.pending) {
        setInfo(data.message ?? "Akun menunggu verifikasi Kemahasiswaan.");
        return;
      }
      window.location.assign(data.redirect ?? "/login");
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? (
        <div className="rounded-[10px] border border-[var(--busy-line)] bg-[var(--busy-soft)] px-3 py-2 text-sm text-[var(--busy)]" role="alert">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-[10px] border border-[var(--hold-line)] bg-[var(--hold-soft)] px-3 py-2 text-sm text-[var(--hold)]" role="status">
          {info}
        </div>
      ) : null}

      <fieldset>
        <legend className="label mb-2">Jenis akun</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "STUDENT", label: "Mahasiswa", hint: "NIM & jurusan" },
            { value: "LECTURER", label: "Dosen", hint: "Kode dosen & prodi" },
            { value: "ORGANIZATION", label: "Organisasi", hint: "Verifikasi Kemahasiswaan" },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col rounded-[10px] border px-3 py-3 transition-colors ${
                role === option.value
                  ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value as Role)}
                className="sr-only"
              />
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 text-[0.8rem] text-[var(--ink-3)]">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama lengkap" htmlFor="name" required className="sm:col-span-2">
          <Input
            id="name"
            required
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Nama sesuai data kampus"
          />
        </Field>

        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="nama@idbbali.ac.id"
          />
        </Field>

        <Field label="Nomor WhatsApp" htmlFor="phone">
          <Input
            id="phone"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="08xx xxxx xxxx"
          />
        </Field>

        {role === "ORGANIZATION" ? (
          <>
            <Field label="Organisasi" htmlFor="organizationId" required className="sm:col-span-2">
              <Select
                id="organizationId"
                required
                value={form.organizationId}
                onChange={(event) => update("organizationId", event.target.value)}
              >
                <option value="">Pilih organisasi…</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="NIM penanggung jawab" htmlFor="nim" required>
              <Input
                id="nim"
                required
                value={form.nimNidn}
                onChange={(event) => update("nimNidn", event.target.value)}
                placeholder="NIM ketua/pengurus"
              />
            </Field>
            <Field label="Jurusan penanggung jawab" htmlFor="jurusan" required>
              <Select
                id="jurusan"
                required
                value={form.jurusan}
                onChange={(event) => update("jurusan", event.target.value)}
              >
                <option value="">Pilih jurusan…</option>
                {JURUSAN.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <>
            <Field label={role === "STUDENT" ? "NIM" : "Kode dosen"} htmlFor="nim" required>
              <Input
                id="nim"
                required
                value={form.nimNidn}
                onChange={(event) => update("nimNidn", event.target.value)}
                placeholder={role === "STUDENT" ? "NIM" : "NIDN / kode dosen"}
              />
            </Field>
            <Field label="Jurusan / Program studi" htmlFor="jurusan" required>
              <Select
                id="jurusan"
                required
                value={form.jurusan}
                onChange={(event) => update("jurusan", event.target.value)}
              >
                <option value="">Pilih jurusan…</option>
                {JURUSAN.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        <Field
          label="Kata sandi"
          htmlFor="password"
          required
          hint="Minimal 8 karakter."
          className="sm:col-span-2"
        >
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="••••••••"
          />
        </Field>
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Mendaftar…" : "Buat akun"}
      </button>
    </form>
  );
}

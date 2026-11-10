"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Loader2, ShieldQuestion, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL } from "@/lib/rbac";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN1" | "ADMIN2" | "LECTURER" | "STUDENT" | "ORGANIZATION";
  nimNidn: string | null;
  jurusan: string | null;
  isActive: boolean;
  organizationName: string | null;
  organizationStatus: string | null;
}

interface AdminOrg {
  id: string;
  name: string;
  kind: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  leaderName: string | null;
}

export function UserAdmin({
  users,
  organizations,
  role,
}: {
  users: AdminUser[];
  organizations: AdminOrg[];
  role: "ADMIN1" | "ADMIN2";
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function patch(url: string, body: unknown, key: string, message: string) {
    setPending(key);
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setToast(data.error ?? "Perubahan gagal disimpan.");
        return;
      }
      setToast(message);
      router.refresh();
    } catch {
      setToast("Tidak dapat menghubungi server.");
    } finally {
      setPending(null);
    }
  }

  const pendingOrgs = organizations.filter((org) => org.status !== "VERIFIED");

  return (
    <div className="space-y-10">
      {toast ? (
        <p className="rounded-[10px] border border-[var(--ok-line)] bg-[var(--ok-soft)] px-3 py-2 text-sm text-[var(--ok)]" role="status">
          {toast}
        </p>
      ) : null}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl">Organisasi mahasiswa</h3>
          <p className="text-[0.8rem] text-[var(--ink-3)]">
            {pendingOrgs.length} belum terverifikasi dari {organizations.length} organisasi
          </p>
        </div>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
          <table className="data-table min-w-[820px]">
            <caption className="sr-only">Status verifikasi 22 organisasi mahasiswa</caption>
            <thead>
              <tr>
                <th scope="col">Organisasi</th>
                <th scope="col">Jenis</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td className="font-medium">{org.name}</td>
                  <td>{org.kind}</td>
                  <td>
                    <Badge
                      tone={org.status === "VERIFIED" ? "ok" : org.status === "PENDING" ? "hold" : "busy"}
                      dot
                    >
                      {org.status === "VERIFIED" ? "Terverifikasi" : org.status === "PENDING" ? "Menunggu" : "Ditolak"}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {org.status !== "VERIFIED" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={pending === `org-${org.id}`}
                          onClick={() =>
                            void patch(
                              `/api/organizations/${org.id}`,
                              { status: "VERIFIED" },
                              `org-${org.id}`,
                              `${org.name} diverifikasi.`,
                            )
                          }
                        >
                          {pending === `org-${org.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                          Verifikasi
                        </button>
                      ) : null}
                      {org.status !== "REJECTED" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost text-[var(--busy)]"
                          disabled={pending === `org-${org.id}`}
                          onClick={() =>
                            void patch(
                              `/api/organizations/${org.id}`,
                              { status: "REJECTED" },
                              `org-${org.id}`,
                              `${org.name} ditolak.`,
                            )
                          }
                        >
                          Tolak
                        </button>
                      ) : null}
                      {org.status === "REJECTED" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          disabled={pending === `org-${org.id}`}
                          onClick={() =>
                            void patch(
                              `/api/organizations/${org.id}`,
                              { status: "PENDING" },
                              `org-${org.id}`,
                              `${org.name} dikembalikan ke antrean.`,
                            )
                          }
                        >
                          <ShieldQuestion className="h-3.5 w-3.5" /> Buka lagi
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-xl">Akun pengguna</h3>
        <p className="mt-1 text-[0.8rem] text-[var(--ink-3)]">
          {role === "ADMIN1"
            ? "Admin (Bagian Akademik) dapat menonaktifkan akun selain miliknya."
            : "Kemahasiswaan melihat daftar akun; verifikasi organisasi di atas."}
        </p>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
          <table className="data-table min-w-[880px]">
            <caption className="sr-only">Akun pengguna RuangIDB</caption>
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">Email</th>
                <th scope="col">Peran</th>
                <th scope="col">Organisasi</th>
                <th scope="col">Status</th>
                {role === "ADMIN1" ? <th scope="col" className="text-right">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td>
                    <p className="font-medium">{account.name}</p>
                    {account.nimNidn ? (
                      <p className="text-[0.8rem] text-[var(--ink-3)]">{account.nimNidn}</p>
                    ) : null}
                  </td>
                  <td>{account.email}</td>
                  <td>{ROLE_LABEL[account.role]}</td>
                  <td>
                    {account.organizationName ?? "—"}
                    {account.organizationStatus ? (
                      <span className="ml-1 text-[0.8rem] text-[var(--ink-3)]">
                        ({account.organizationStatus.toLowerCase()})
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <Badge tone={account.isActive ? "ok" : "muted"} dot>
                      {account.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                  {role === "ADMIN1" ? (
                    <td className="text-right">
                      {account.role === "ADMIN1" ? (
                        <span className="text-[0.8rem] text-[var(--ink-3)]">—</span>
                      ) : (
                        <button
                          type="button"
                          className={`btn btn-sm ${account.isActive ? "btn-danger" : "btn-secondary"}`}
                          disabled={pending === `user-${account.id}`}
                          onClick={() =>
                            void patch(
                              `/api/users/${account.id}`,
                              { isActive: !account.isActive },
                              `user-${account.id}`,
                              account.isActive ? "Akun dinonaktifkan." : "Akun diaktifkan.",
                            )
                          }
                        >
                          {pending === `user-${account.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : account.isActive ? (
                            <UserX className="h-3.5 w-3.5" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          {account.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

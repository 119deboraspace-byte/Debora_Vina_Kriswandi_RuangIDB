import { requireAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data";
import { formatTimestamp } from "@/lib/time";

export const metadata = { title: "Log audit" };

function summarize(value: string | null): string {
  if (!value) return "—";
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, entry]) => `${key}: ${typeof entry === "object" ? JSON.stringify(entry) : String(entry)}`)
      .join(" · ")
      .slice(0, 140);
  } catch {
    return value.slice(0, 140);
  }
}

export default async function AuditPage() {
  const user = await requireAdmin();

  if (user.role !== "ADMIN1") {
    return (
      <div className="card px-6 py-16 text-center">
        <p className="font-display text-2xl">Log audit khusus Admin (Bagian Akademik)</p>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          Kemahasiswaan dapat melihat laporan penggunaan, tetapi tidak log audit penuh (FR-17).
        </p>
      </div>
    );
  }

  const logs = getAuditLogs(150);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Log audit</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Setiap perubahan status, kondisi ruangan, dan keputusan admin tercatat permanen.
          </p>
        </div>
        <p className="text-[0.8rem] text-[var(--ink-3)]">{logs.length} entri terakhir</p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
        <table className="data-table min-w-[980px]">
          <caption className="sr-only">Log audit RuangIDB</caption>
          <thead>
            <tr>
              <th scope="col">Waktu</th>
              <th scope="col">Aktor</th>
              <th scope="col">Aksi</th>
              <th scope="col">Entitas</th>
              <th scope="col">Sebelum</th>
              <th scope="col">Sesudah</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap">{formatTimestamp(log.createdAt)}</td>
                <td>{log.actorName ?? "Sistem"}</td>
                <td><code className="text-[0.8rem]">{log.action}</code></td>
                <td>
                  <p>{log.entity}</p>
                  <p className="text-[0.8rem] text-[var(--ink-3)]">{log.entityId}</p>
                </td>
                <td className="max-w-[240px] text-[0.8rem] text-[var(--ink-3)]">{summarize(log.beforeJson)}</td>
                <td className="max-w-[240px] text-[0.8rem] text-[var(--ink-2)]">{summarize(log.afterJson)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

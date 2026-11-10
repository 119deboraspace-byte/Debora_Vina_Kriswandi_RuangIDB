import { getSessionUser } from "@/lib/auth";
import { listBookingsForReport } from "@/lib/data";
import { jsonFail } from "@/lib/http";
import { STATUS_LABEL } from "@/lib/rbac";
import { formatDateNumeric, formatTime } from "@/lib/time";

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return jsonFail(401, "Silakan masuk terlebih dahulu.");
  if (user.role !== "ADMIN1" && user.role !== "ADMIN2") {
    return jsonFail(403, "Ekspor hanya untuk admin.");
  }

  const rows = listBookingsForReport(1000);
  const header = [
    "Nomor Dokumen",
    "Status",
    "Kegiatan",
    "Jenis",
    "Peminjam",
    "Organisasi",
    "Ruangan",
    "Gedung",
    "Kelas",
    "Peserta",
    "Tanggal",
    "Mulai",
    "Selesai",
    "Jumlah Sesi",
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.documentNo ?? "",
        STATUS_LABEL[row.status],
        row.activityName,
        row.activityType,
        row.requesterName,
        row.orgName ?? "",
        `${row.roomCode} — ${row.roomName}`,
        row.building,
        row.approvalClass,
        row.participants,
        row.firstDate ? formatDateNumeric(row.firstDate) : "",
        row.firstStart ? formatTime(row.firstStart) : "",
        row.firstEnd ? formatTime(row.firstEnd) : "",
        row.sessionCount,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const body = `\uFEFF${lines.join("\r\n")}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ruangidb-peminjaman.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

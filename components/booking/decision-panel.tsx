"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/field";

type Decision = "APPROVED" | "REJECTED" | "REVISION";

export function DecisionPanel({
  bookingId,
  className,
  stage,
  requiresRoomCheck,
  compact = false,
}: {
  bookingId: string;
  className?: string;
  stage: "ADMIN1" | "ADMIN2";
  requiresRoomCheck: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [roomChecked, setRoomChecked] = useState(false);
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: Decision) {
    setPending(decision);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note, roomChecked }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Keputusan gagal disimpan.");
        return;
      }
      router.refresh();
      if (!compact) router.push("/admin/persetujuan");
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      {error ? (
        <p className="mb-3 rounded-[10px] border border-[var(--busy-line)] bg-[var(--busy-soft)] px-3 py-2 text-sm text-[var(--busy)]" role="alert">
          {error}
        </p>
      ) : null}

      {requiresRoomCheck ? (
        <label className="mb-3 flex items-start gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--brand)]"
            checked={roomChecked}
            onChange={(event) => setRoomChecked(event.target.checked)}
          />
          <span>
            Saya sudah mengecek kondisi dan kesiapan ruangan (wajib untuk pengajuan organisasi).
          </span>
        </label>
      ) : null}

      <label className="field">
        <span className="label">Catatan {stage === "ADMIN1" ? "Bagian Akademik" : "Kemahasiswaan"}</span>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Wajib untuk penolakan atau permintaan revisi."
          rows={compact ? 2 : 3}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void decide("APPROVED")}
          disabled={pending !== null || (requiresRoomCheck && !roomChecked)}
        >
          {pending === "APPROVED" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {stage === "ADMIN1" ? "Setujui" : "Setujui final"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void decide("REVISION")}
          disabled={pending !== null}
        >
          {pending === "REVISION" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Minta revisi
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => void decide("REJECTED")}
          disabled={pending !== null}
        >
          {pending === "REJECTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Tolak
        </button>
      </div>
    </div>
  );
}

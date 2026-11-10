"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export function CancelButton({
  bookingId,
  isAdmin,
}: {
  bookingId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function cancel() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Pembatalan gagal.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
        <XCircle className="h-4 w-4" strokeWidth={1.8} /> Batalkan
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Batalkan pengajuan?"
        description="Slot akan dilepas dan pihak terkait menerima notifikasi."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Kembali
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void cancel()}
              disabled={pending || (!isAdmin && reason.trim().length === 0)}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Batalkan pengajuan
            </button>
          </>
        }
      >
        {error ? <p className="error-text mb-2" role="alert">{error}</p> : null}
        <label className="field">
          <span className="label">Alasan {isAdmin ? "" : "(wajib)"}</span>
          <textarea
            className="textarea"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Contoh: kegiatan batal, jadwal bentrok dengan ujian."
          />
        </label>
      </Modal>
    </>
  );
}

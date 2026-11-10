import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--line)] bg-[var(--surface-2)]">
      <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/brand/idb-mark.png" alt="" width={40} height={40} className="h-10 w-10" />
            <div>
              <p className="font-display text-xl leading-none">RuangIDB</p>
              <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">
                Institut Desain &amp; Bisnis Bali
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm text-[var(--ink-2)]">
            Sistem peminjaman ruangan kampus: jadwal 14 hari, persetujuan berjenjang,
            dan Internal Memo siap cetak dengan verifikasi QR.
          </p>
        </div>

        <div className="text-sm text-[var(--ink-2)]">
          <p className="kicker mb-3 text-[var(--ink-3)]">Kampus</p>
          <p className="flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" strokeWidth={1.8} />
            <span>
              Jl. Tukad Batanghari No. 29, Panjer
              <br />
              Denpasar, Bali 80225
            </span>
          </p>
          <p className="mt-2 flex gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" strokeWidth={1.8} />
            <span>0361-8955649 · 0361-246342</span>
          </p>
        </div>

        <div className="text-sm">
          <p className="kicker mb-3 text-[var(--ink-3)]">Tautan</p>
          <ul className="space-y-2">
            <li>
              <Link className="link" href="/jadwal">Live table ketersediaan</Link>
            </li>
            <li>
              <Link className="link" href="/ajukan">Form pengajuan</Link>
            </li>
            <li>
              <Link className="link" href="/login">Masuk</Link>
            </li>
            <li>
              <a className="link" href="https://www.idbbali.ac.id" target="_blank" rel="noreferrer">
                idbbali.ac.id
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--line)]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-1 px-4 py-4 text-[0.8rem] text-[var(--ink-3)] md:flex-row md:items-center md:justify-between md:px-8">
          <p>© 2026 Institut Desain &amp; Bisnis Bali. RuangIDB v1.0.</p>
          <p>Semua waktu dalam WITA (UTC+8).</p>
        </div>
      </div>
    </footer>
  );
}

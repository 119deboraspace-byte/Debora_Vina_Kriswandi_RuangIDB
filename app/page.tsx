import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardCheck, DoorOpen, QrCode, ShieldCheck } from "lucide-react";
import { buildDayCells, SITUATION_STYLE } from "@/lib/availability";
import { getAvailability } from "@/lib/data";
import { APPROVAL_CLASS_LABEL, SITUATION_LABEL, type RoomSituation } from "@/lib/rbac";
import { addDays, eachDay, formatDateId, formatDateShort, todayWita } from "@/lib/time";

const PREVIEW_ROOMS = 6;

export default async function HomePage() {
  const today = todayWita();
  const payload = getAvailability(today, addDays(today, 6));
  const cells = buildDayCells(payload);
  const days = eachDay(payload.from, payload.to);

  const todayCounts: Record<RoomSituation, number> = {
    KOSONG: 0,
    TERPAKAI: 0,
    MENUNGGU_APPROVE: 0,
    DITOLAK: 0,
  };
  for (const room of payload.rooms) {
    const cell = cells.get(room.id)?.get(today);
    if (cell) todayCounts[cell.situation] += 1;
  }

  const previewRooms = payload.rooms.slice(0, PREVIEW_ROOMS);

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] w-full flex-col justify-between overflow-hidden bg-[var(--hero)] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "84px 84px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full border-[40px] border-[var(--accent)] opacity-80 md:-right-24 md:h-[620px] md:w-[620px]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 left-1/3 h-[420px] w-[420px] rounded-full bg-[var(--brand)] opacity-40 blur-[110px]"
        />

        <div className="relative mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-12 px-4 py-14 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-16">
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Sistem Peminjaman Ruangan · IDB Bali
            </p>
            <h1 className="mt-5 max-w-[13ch] text-[2.75rem] leading-[0.98] text-white md:text-[4.1rem]">
              Semua ruang kampus, dalam satu papan.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/75">
              Cek ketersediaan 14 hari ke depan, ajukan peminjaman, dan unduh Internal
              Memo bertanda QR — tanpa bolak-balik membawa kertas ke Bagian Akademik dan Kemahasiswaan.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/jadwal" className="btn btn-accent btn-lg">
                Cek ketersediaan
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link
                href="/ajukan"
                className="btn btn-light btn-lg"
              >
                Ajukan peminjaman
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/20 pt-5">
              {[
                ["29", "ruangan"],
                ["14", "hari ke depan"],
                ["2", "jalur pengajuan"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-3xl text-white">{value}</dd>
                  <p className="mt-1 text-[0.8rem] uppercase tracking-[0.12em] text-white/60">
                    {label}
                  </p>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto flex w-full max-w-[460px] items-center justify-center">
            <div className="relative aspect-square w-full max-w-[430px]">
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-full border border-dashed border-[var(--accent)] opacity-60"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-white/20"
              />
              <div className="absolute inset-5 overflow-hidden rounded-full bg-white shadow-[0_35px_90px_-25px_rgba(0,0,0,0.65)]">
                <Image
                  src="/brand/idb-mark-hires.png"
                  alt="Logo Institut Desain & Bisnis Bali"
                  fill
                  priority
                  sizes="(max-width: 768px) 80vw, 430px"
                  className="object-contain p-10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/15 bg-[var(--hero-2)]">
          <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 text-[0.8rem] text-white/60 md:px-8">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold uppercase tracking-[0.1em] text-white/80">Hari ini</span>
              {(["KOSONG", "TERPAKAI", "MENUNGGU_APPROVE", "DITOLAK"] as RoomSituation[]).map((key) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${SITUATION_STYLE[key].dot}`} aria-hidden="true" />
                  {SITUATION_LABEL[key]}
                  <strong className="font-semibold text-white">{todayCounts[key]}</strong>
                </span>
              ))}
            </p>
            <p>
              {formatDateId(today)} · WITA
            </p>
          </div>
        </div>
      </section>

      {/* Mini board */}
      <section className="mx-auto w-full max-w-[1240px] px-4 py-14 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">Pratinjau 7 hari</p>
            <h2 className="mt-3 text-3xl md:text-4xl">Papan jadwal minggu ini</h2>
          </div>
          <p className="max-w-sm text-sm text-[var(--ink-2)]">
            Hijau kosong, merah terpakai, kuning menunggu approve, abu-abu ditolak. Klik papan
            penuh untuk melihat 29 ruangan × 14 hari.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto">
          <div
            className="grid min-w-[640px] gap-px overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--line)]"
            style={{ gridTemplateColumns: `minmax(150px, 1.4fr) repeat(7, minmax(0, 1fr))` }}
          >
            <div className="bg-[var(--surface-2)] px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
              Ruangan
            </div>
            {days.map((day) => (
              <div
                key={day}
                className={`bg-[var(--surface-2)] px-2 py-2 text-center ${day === today ? "shadow-[inset_0_-3px_0_0_var(--accent)]" : ""}`}
              >
                <p className="text-[0.8rem] font-semibold">{formatDateShort(day)}</p>
                <p className="text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-3)]">
                  {formatDateId(day, "short").split(",")[0]}
                </p>
              </div>
            ))}

            {previewRooms.map((room) => (
              <div key={room.id} className="contents">
                <div className="bg-[var(--surface)] px-3 py-2">
                  <p className="text-[0.8rem] font-semibold">{room.code}</p>
                  <p className="truncate text-[0.8rem] text-[var(--ink-3)]">{room.name}</p>
                </div>
                {days.map((day) => {
                  const cell = cells.get(room.id)?.get(day);
                  const situation = cell?.situation ?? "KOSONG";
                  return (
                    <div
                      key={`${room.id}-${day}`}
                      className={`flex items-center justify-center bg-[var(--surface)] p-1.5`}
                      title={`${room.name} · ${formatDateId(day)} · ${SITUATION_LABEL[situation]}`}
                    >
                      <span
                        className={`h-6 w-full rounded-[4px] border ${SITUATION_STYLE[situation].cell}`}
                        aria-label={SITUATION_LABEL[situation]}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[0.8rem] text-[var(--ink-3)]">
          Menampilkan {PREVIEW_ROOMS} ruangan pertama.{" "}
          <Link href="/jadwal" className="link">
            Lihat semua 29 ruangan
          </Link>
          .
        </p>
      </section>

      {/* Fasilitas kampus */}
      <section className="border-y border-[var(--line)] bg-[var(--surface-2)]">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-14 md:px-8 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">Fasilitas kampus</p>
              <h2 className="mt-3 text-3xl md:text-4xl">Ruang yang dirancang untuk berkarya.</h2>
            </div>
            <p className="max-w-sm text-sm text-[var(--ink-2)]">
              Laboratorium, studio, galeri, dan aula yang dipakai sehari-hari di IDB Bali.
              Foto dari{" "}
              <a
                href="https://www.idbbali.ac.id/fasilitas-kampus/"
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                idbbali.ac.id
              </a>
              .
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <figure className="relative overflow-hidden rounded-[10px] border border-[var(--line)] sm:col-span-2 sm:row-span-2">
              <Image
                src="/campus/gedung-idb.jpg"
                alt="Gedung kampus Institut Desain & Bisnis Bali"
                width={800}
                height={600}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 620px"
                className="h-64 w-full object-cover sm:h-full sm:min-h-[22rem]"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--ink)]/90 via-[var(--ink)]/35 to-transparent px-4 pb-4 pt-12 text-sm text-white">
                <span className="font-semibold">Gedung IDB</span>
                <span className="text-white/70"> · Jl. Tukad Batanghari No. 29</span>
              </figcaption>
            </figure>

            {[
              { src: "/campus/lab-imac.jpg", title: "Lab IMAC", meta: "Gedung IDB" },
              { src: "/campus/lab-fashion.jpg", title: "Lab Fashion", meta: "Gedung IDB" },
              { src: "/campus/creative-gallery.jpg", title: "Creative Gallery", meta: "Gedung IDB" },
              { src: "/campus/lobby.jpg", title: "Lobby & Layanan", meta: "Gedung IDB" },
            ].map((image) => (
              <figure
                key={image.src}
                className="relative overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--surface)]"
              >
                <Image
                  src={image.src}
                  alt={`${image.title} IDB Bali`}
                  width={800}
                  height={600}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                  className="h-40 w-full object-cover sm:h-44"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--ink)]/85 to-transparent px-3 pb-3 pt-9 text-[0.8rem] text-white">
                  <span className="font-semibold">{image.title}</span>
                  <span className="text-white/70"> · {image.meta}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Alur persetujuan */}
      <section id="alur" className="border-y border-[var(--line)] bg-[var(--surface-2)]">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-16 md:px-8">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <div>
              <p className="kicker">Alur persetujuan</p>
              <h2 className="mt-3 text-3xl md:text-4xl">
                Dua jalur pengajuan,
                <br />
                tanpa approve otomatis.
              </h2>
              <p className="mt-4 text-[var(--ink-2)]">
                Jalur ditentukan oleh jenis peminjam. Setiap pengajuan ditinjau Bagian
                Akademik — tidak ada persetujuan otomatis oleh sistem.
              </p>
              <Link href="/jadwal" className="btn btn-secondary mt-6">
                Lihat jadwal ruangan
              </Link>
            </div>

            <dl className="divide-y divide-[var(--line)] border-y border-[var(--line-strong)]">
              {[
                {
                  code: "01",
                  title: "Mahasiswa & Dosen",
                  body: "Pengajuan ditinjau dan disetujui Bagian Akademik. Satu tahap, tanpa approve otomatis.",
                  meta: "Satu tahap",
                  icon: ClipboardCheck,
                },
                {
                  code: "02",
                  title: "Organisasi Mahasiswa",
                  body: "Disetujui Bagian Akademik, lalu ditinjau dan disetujui Kemahasiswaan sebelum memo diterbitkan.",
                  meta: "Dua tahap",
                  icon: ShieldCheck,
                },
              ].map((item) => (
                <div key={item.code} className="grid grid-cols-[auto_1fr] gap-5 py-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface)] font-display text-lg">
                    {item.code}
                  </span>
                  <div>
                    <dt className="flex items-center gap-2 text-lg font-semibold text-[var(--ink)]">
                      <item.icon className="h-4 w-4 text-[var(--brand)]" strokeWidth={1.8} aria-hidden="true" />
                      {item.title}
                    </dt>
                    <dd className="mt-1 text-sm text-[var(--ink-2)]">{item.body}</dd>
                    <dd className="mt-2 text-[0.8rem] uppercase tracking-[0.1em] text-[var(--ink-3)]">
                      {item.meta}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section className="mx-auto w-full max-w-[1240px] px-4 py-16 md:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            {
              icon: CalendarDays,
              title: "Live table 14 hari",
              body: "Dua mode tampilan: daftar per entri dan grid ruangan × tanggal. Admin (Bagian Akademik) dapat mengubah kondisi dan situasi langsung dari baris tabel.",
            },
            {
              icon: DoorOpen,
              title: "Cek bentrok atomik",
              body: "Setiap pengajuan divalidasi di dalam transaksi database. Slot yang menunggu persetujuan ditandai Menunggu Approve agar tidak diajukan ganda.",
            },
            {
              icon: QrCode,
              title: "Memo + verifikasi QR",
              body: "Setelah disetujui, Internal Memo A4 dibuat otomatis dengan nomor unik. Security dapat memindai QR untuk memeriksa keaslian di lokasi.",
            },
          ].map((feature) => (
            <article key={feature.title} className="border-t-2 border-[var(--ink)] pt-4">
              <feature.icon className="h-5 w-5 text-[var(--brand)]" strokeWidth={1.8} aria-hidden="true" />
              <h3 className="mt-3 text-xl">{feature.title}</h3>
              <p className="mt-2 text-sm text-[var(--ink-2)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-[1240px] px-4 pb-4 md:px-8">
        <div className="relative overflow-hidden rounded-[10px] bg-[var(--ink)] px-6 py-10 text-[var(--surface)] md:px-10 md:py-12">
          <div className="absolute -right-10 -top-10 hidden h-48 w-48 rounded-full border-[18px] border-[var(--accent)] opacity-90 md:block" />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_0.6fr] md:items-center">
            <div>
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Mulai dari papan
              </p>
              <h2 className="mt-3 text-3xl text-[var(--surface)] md:text-4xl">
                Temukan slot kosong, ajukan dalam satu menit.
              </h2>
              <p className="mt-3 max-w-xl text-[var(--surface)]/75">
                Masuk dengan akun kampus untuk mengajukan dan melacak status. Tamu tetap
                dapat melihat ketersediaan dengan nama pengaju disamarkan.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <Link href="/ajukan" className="btn btn-accent btn-lg w-full md:w-auto">
                Ajukan sekarang
              </Link>
              <Link
                href="/login"
                className="btn btn-light btn-lg w-full md:w-auto"
              >
                Masuk ke akun
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

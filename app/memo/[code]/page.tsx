import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PrintButton } from "@/components/memo/print-button";
import { findBookingByCode, getAdminName } from "@/lib/data";
import { formatDateId, formatTimeRange } from "@/lib/time";

export const metadata = { title: "Internal Memo" };

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function MemoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const booking = findBookingByCode(code);
  if (!booking) notFound();

  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const forwardedProto =
    headerStore.get("x-forwarded-proto") ??
    (forwardedHost?.startsWith("localhost") ? "http" : "https");
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : "http://localhost:3000";
  const baseUrl = process.env.APP_URL ?? origin;
  const verifyUrl = `${baseUrl}/verify/${booking.verificationCode}`;
  const qrSvg = await QRCode.toString(verifyUrl, {
    type: "svg",
    margin: 1,
    width: 108,
    color: { dark: "#0b1f33", light: "#ffffff" },
  });

  const admin2 = getAdminName("ADMIN2");
  const admin1 = getAdminName("ADMIN1");
  const admin1Approval = booking.approvals.find((approval) => approval.stage === "ADMIN1");
  const admin2Approval = booking.approvals.find((approval) => approval.stage === "ADMIN2");
  const isOrganisasi = booking.borrowerType === "ORGANISASI";
  const academicDate = admin1Approval
    ? longDate(admin1Approval.createdAt)
    : longDate(booking.approvedAt ?? booking.createdAt);
  const kemahasiswaanDate = admin2Approval
    ? longDate(admin2Approval.createdAt)
    : academicDate;

  const sections = new Set<string>(["BAA"]);
  if (isOrganisasi) sections.add("KEMAHASISWAAN");
  for (const facility of booking.facilities) sections.add(facility.section);
  if (booking.securityRequested) sections.add("SECURITY");
  if (booking.roomNeedsPlotting) sections.add("BAA");

  const recipients: string[] = [];
  if (sections.has("KEMAHASISWAAN")) recipients.push("Kepala Bagian Kemahasiswaan");
  if (sections.has("BAA")) recipients.push("Kepala Bagian Administrasi Akademik (BAA)");
  if (sections.has("IT")) recipients.push("Kepala Bagian IT");
  if (sections.has("OPERASIONAL")) recipients.push("Kepala Bagian Operasional");
  if (sections.has("SECURITY")) recipients.push("Koordinator Security");

  const facilityLines: Array<{ section: string; text: string }> = [];
  if (booking.roomNeedsPlotting) {
    facilityLines.push({ section: "BAA", text: `Plotting ${booking.roomName}` });
  }
  const itItems = booking.facilities.filter((item) => item.section === "IT");
  if (itItems.length > 0) {
    facilityLines.push({ section: "IT", text: itItems.map((item) => item.name).join(", ") });
  }
  const opsItems = booking.facilities.filter((item) => item.section === "OPERASIONAL");
  if (opsItems.length > 0) {
    facilityLines.push({
      section: "Operasional",
      text: opsItems.map((item) => `${item.name} (${item.qty})`).join(", "),
    });
  }
  if (booking.securityRequested) {
    facilityLines.push({ section: "Security", text: "Menjaga keamanan selama acara berlangsung" });
  }

  return (
    <div className="min-h-screen bg-[var(--surface-3)] py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4">
        <Link href={`/pengajuan/${booking.id}`} className="link inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" /> Kembali ke pengajuan
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/verify/${booking.verificationCode}`} className="btn btn-secondary btn-sm">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} /> Halaman verifikasi
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="overflow-x-auto px-2 pb-8 print:overflow-visible print:px-0 print:pb-0">
        <p className="no-print mx-auto mb-3 w-full max-w-[210mm] px-2 text-[0.8rem] text-[var(--ink-2)] md:hidden">
          Lembar A4 — geser ke samping untuk melihat seluruh halaman.
        </p>
        <article className="memo-sheet">
          {/* Kop surat */}
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image
                src="/brand/idb-logo.png"
                alt="Logo Institut Desain & Bisnis Bali"
                width={150}
                height={98}
                className="h-[80px] w-auto"
                priority
              />
            </div>
            <div className="text-right text-[8.5pt] leading-snug text-[#3d5266]" style={{ fontFamily: "var(--font-jakarta)" }}>
              <p className="text-[10pt] font-bold text-[#0b1f33]">INSTITUT DESAIN &amp; BISNIS BALI</p>
              <p>Jl. Tukad Batanghari No. 29, Panjer</p>
              <p>Denpasar, Bali 80225</p>
              <p>Telp. 0361-8955649 · 0361-246342</p>
              <p>www.idbbali.ac.id · info@idbbali.ac.id</p>
            </div>
          </header>

          <div className="mt-4 border-t-[3px] border-[#0b1f33]" />
          <div className="mt-[2px] border-t border-[#0b1f33]" />

          <h1 className="mt-6 text-center text-[18pt] font-normal tracking-[0.18em]">
            INTERNAL MEMO
          </h1>
          <p className="mt-1 text-center text-[10pt]">
            No. {booking.documentNo ?? "—"}
          </p>

          <div className="mt-6 border-t border-[#adbfd2]" />

          <table className="memo-meta mt-4 w-full text-[9.5pt]" style={{ border: "0" }}>
            <tbody style={{ fontFamily: "var(--font-jakarta)" }}>
              <tr>
                <td className="w-[22%] border-0 py-1 pr-2 align-top font-semibold">Tanggal</td>
                <td className="border-0 py-1 align-top">
                  {longDate(booking.approvedAt ?? booking.createdAt)}
                </td>
              </tr>
              <tr>
                <td className="border-0 py-1 pr-2 align-top font-semibold">Kepada</td>
                <td className="border-0 py-1 align-top">
                  <ol className="list-decimal space-y-0.5 pl-4">
                    {recipients.map((recipient) => (
                      <li key={recipient}>{recipient}</li>
                    ))}
                  </ol>
                </td>
              </tr>
              <tr>
                <td className="border-0 py-1 pr-2 align-top font-semibold">Dari</td>
                <td className="border-0 py-1 align-top">
                  {booking.orgName ?? booking.requesterName}
                </td>
              </tr>
              <tr>
                <td className="border-0 py-1 pr-2 align-top font-semibold">Perihal</td>
                <td className="border-0 py-1 align-top">
                  Peminjaman {booking.roomName}
                  <br />
                  <span className="text-[#3d5266]">({booking.activityName})</span>
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-5 text-[10pt] leading-relaxed">
            Dengan hormat,
          </p>
          <p className="mt-2 text-justify text-[10pt] leading-relaxed">
            Sehubungan dengan adanya kegiatan <strong>{booking.activityName}</strong>, dengan ini
            kami sampaikan kepada {recipients.join(", ")} untuk meminjam fasilitas kampus berupa:
          </p>

          <ol className="mt-3 space-y-1 pl-6 text-[10pt]" style={{ fontFamily: "var(--font-jakarta)" }}>
            {facilityLines.map((line) => (
              <li key={line.section} className="list-decimal">
                <strong>{line.section}:</strong> {line.text}
              </li>
            ))}
            {facilityLines.length === 0 ? (
              <li className="list-decimal">Penggunaan ruangan sesuai jadwal di bawah ini.</li>
            ) : null}
          </ol>

          <p className="mt-3 text-[10pt]">yang akan digunakan pada:</p>

          <table className="mt-2">
            <thead>
              <tr>
                <th className="w-[6%]">No</th>
                <th className="w-[24%]">Tanggal</th>
                <th className="w-[24%]">Kegiatan</th>
                <th className="w-[22%]">Tempat</th>
                <th className="w-[24%]">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {booking.sessions.map((session, index) => (
                <tr key={session.id}>
                  <td>{index + 1}.</td>
                  <td>{formatDateId(session.date)}</td>
                  <td>{booking.activityName}</td>
                  <td>{booking.roomName}</td>
                  <td className="whitespace-nowrap">{formatTimeRange(session.start, session.end)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 text-justify text-[10pt] leading-relaxed">
            Demikian permohonan ini kami sampaikan, atas perhatian dan kerja samanya kami
            ucapkan terima kasih.
          </p>

          {isOrganisasi ? (
            <div className="mt-5 flex justify-between gap-8 text-[10pt]">
              <div>
                <p>Denpasar, {longDate(booking.approvedAt ?? booking.createdAt)}</p>
                <p className="mt-1">Hormat Kami,</p>
                <div className="mt-10 flex gap-10">
                  <div>
                    <p className="border-t border-[#0b1f33] pt-1">Ketua Panitia</p>
                    <p className="mt-1 font-semibold">{booking.ketuaName ?? booking.requesterName}</p>
                    {booking.ketuaNim ? <p className="text-[8.5pt]">NIM {booking.ketuaNim}</p> : null}
                  </div>
                  <div>
                    <p className="border-t border-[#0b1f33] pt-1">Sekretaris Panitia</p>
                    <p className="mt-1 font-semibold">{booking.sekretarisName ?? "—"}</p>
                    {booking.sekretarisNim ? <p className="text-[8.5pt]">NIM {booking.sekretarisNim}</p> : null}
                  </div>
                </div>
              </div>

              <div className="w-[42%]">
                <p>Mengetahui,</p>
                <p>Kepala Bagian Kemahasiswaan IDB Bali</p>
                <div className="mt-1 flex h-[74px] items-center justify-center">
                  <DocStamp
                    className="doc-stamp-kemahasiswaan doc-stamp-sm"
                    title="Disetujui"
                    subtitle="Bagian Kemahasiswaan"
                    date={kemahasiswaanDate}
                  />
                </div>
                <p className="font-semibold">{admin2 ?? "—"}</p>
                <p className="text-[8.5pt] text-[#3d5266]">NIP/NIDN —</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-end justify-between gap-8 text-[10pt]">
              <div className="w-[54%]">
                <p>Denpasar, {longDate(booking.approvedAt ?? booking.createdAt)}</p>
                <p className="mt-1">Hormat Kami,</p>
                <div className="mt-12">
                  <p className="border-t border-[#0b1f33] pt-1">
                    {booking.borrowerType === "DOSEN" ? "Dosen Pemohon" : "Mahasiswa Pemohon"}
                  </p>
                  <p className="mt-1 font-semibold">{booking.requesterName}</p>
                  {booking.nim ? (
                    <p className="text-[8.5pt] text-[#3d5266]">
                      {booking.borrowerType === "DOSEN" ? "NIDN" : "NIM"} {booking.nim}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex w-[40%] justify-end pb-2">
                <DocStamp
                  className="doc-stamp-academic"
                  title="Disetujui"
                  subtitle="Bagian Akademik"
                  date={academicDate}
                />
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-[#adbfd2] pt-3">
            <div className="flex items-start justify-between gap-6">
              <div className="text-[8pt] leading-relaxed text-[#3d5266]" style={{ fontFamily: "var(--font-jakarta)" }}>
                <p>
                  Status: <strong className="text-[#0b1f33]">DISETUJUI</strong>
                </p>
                <p>
                  Telah disetujui Bagian Akademik — {admin1Approval?.actorName ?? admin1 ?? "—"}
                  {admin1Approval ? `, ${longDate(admin1Approval.createdAt)}` : ""}.
                </p>
                {isOrganisasi ? (
                  <p>
                    Telah disetujui Bagian Kemahasiswaan — {admin2Approval?.actorName ?? admin2 ?? "—"}
                    {admin2Approval ? `, ${longDate(admin2Approval.createdAt)}` : ""}.
                  </p>
                ) : null}
                <p className="mt-1">
                  Dokumen dibuat otomatis oleh Sistem Peminjaman Ruangan IDB Bali. Pindai kode QR
                  untuk verifikasi keaslian.
                </p>
                <p className="mt-1">Kode verifikasi: {booking.verificationCode}</p>
              </div>
              <div className="shrink-0 text-center">
                <div
                  className="mx-auto h-[92px] w-[92px] [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <p className="mt-1 text-[7.5pt] uppercase tracking-[0.08em] text-[#3d5266]">
                  Pindai untuk verifikasi
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function DocStamp({
  className,
  title,
  subtitle,
  date,
}: {
  className?: string;
  title: string;
  subtitle: string;
  date: string;
}) {
  return (
    <div className={`doc-stamp ${className ?? ""}`} aria-label={`${title} ${subtitle}`}>
      <span className="doc-stamp-top">Institut Desain &amp; Bisnis Bali</span>
      <span className="doc-stamp-main">{title}</span>
      <span className="doc-stamp-sub">{subtitle}</span>
      <span className="doc-stamp-date">{date}</span>
    </div>
  );
}

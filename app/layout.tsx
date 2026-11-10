import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "RuangIDB — Peminjaman Ruangan Kampus IDB Bali",
    template: "%s · RuangIDB",
  },
  description:
    "Satu sumber kebenaran untuk ketersediaan, pengajuan, persetujuan, dan memo peminjaman ruangan Institut Desain & Bisnis Bali.",
  applicationName: "RuangIDB",
  icons: { icon: "/brand/idb-mark.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${instrument.variable} ${jakarta.variable}`}>
      <body>
        <a href="#konten" className="skip-link">
          Lewati ke konten
        </a>
        <SiteHeader />
        <main id="konten">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

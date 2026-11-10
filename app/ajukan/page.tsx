import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { BookingForm, type InitialBooking } from "@/components/booking/booking-form";
import { requireUser } from "@/lib/auth";
import { getBookingDetail, getOrganizationList, getSettings, listRooms } from "@/lib/data";
import type { BorrowerType } from "@/lib/rbac";

export const metadata = { title: "Ajukan peminjaman" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AjukanPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  if (user.role === "ADMIN1" || user.role === "ADMIN2") redirect("/admin/persetujuan");
  const params = await searchParams;
  const rooms = listRooms();
  const organizations = getOrganizationList();
  const settings = getSettings();

  const orgPending = user.role === "ORGANIZATION" && user.organizationStatus !== "VERIFIED";

  const editId = first(params.edit);
  let edit: InitialBooking | undefined;
  if (editId) {
    const detail = getBookingDetail(editId);
    if (!detail || detail.requesterId !== user.id) redirect("/pengajuan");
    if (detail.status !== "DRAFT" && detail.status !== "REVISION") {
      redirect(`/pengajuan/${editId}`);
    }
    edit = {
      id: detail.id,
      status: detail.status,
      borrowerType: detail.borrowerType as BorrowerType,
      requesterName: detail.requesterName,
      requesterContact: detail.requesterContact,
      nim: detail.nim,
      jurusan: detail.jurusan,
      organizationId: detail.organizationId,
      ketuaName: detail.ketuaName,
      ketuaNim: detail.ketuaNim,
      sekretarisName: detail.sekretarisName,
      sekretarisNim: detail.sekretarisNim,
      activityName: detail.activityName,
      activityDescription: detail.activityDescription,
      activityType: detail.activityType,
      participants: detail.participants,
      roomId: detail.roomId,
      sessions: detail.sessions.map((session) => ({
        date: session.date,
        start: session.start,
        end: session.end,
      })),
      facilities: detail.facilities.map((facility) => ({
        name: facility.name,
        section: facility.section as InitialBooking["facilities"][number]["section"],
        qty: facility.qty,
      })),
      securityRequested: detail.securityRequested,
      academicActivity: detail.academicActivity,
      attachment: detail.attachments[0] ?? null,
    };
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-10 md:px-8 md:py-12">
      <div className="max-w-3xl">
        <p className="kicker">Form pengajuan</p>
        <h1 className="mt-3 text-4xl md:text-5xl">Ajukan peminjaman ruangan</h1>
        <p className="mt-3 text-[var(--ink-2)]">
          Isi identitas peminjam, kegiatan, ruangan, dan jadwal. Sistem akan memeriksa
          bentrok dan menentukan jalur persetujuan secara otomatis.
        </p>
      </div>

      {orgPending ? (
        <div className="mt-6 flex items-start gap-2 rounded-[10px] border border-[var(--hold-line)] bg-[var(--hold-soft)] px-3 py-2.5 text-sm text-[var(--hold)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <p>
            Organisasi Anda belum diverifikasi Kemahasiswaan. Anda tetap dapat menyimpan draft,
            tetapi pengajuan organisasi belum dapat dikirim.{" "}
            <Link href="/pengajuan" className="underline">
              Lihat status akun
            </Link>
            .
          </p>
        </div>
      ) : null}

      <BookingForm
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          nimNidn: user.nimNidn,
          jurusan: user.jurusan,
          organizationId: user.organizationId,
          organizationName: user.organizationName,
        }}
        rooms={rooms}
        organizations={organizations}
        leadA={Number(settings.min_lead_a ?? 1)}
        leadBC={Number(settings.min_lead_bc ?? 3)}
        windowDays={Number(settings.window_days ?? 14)}
        prefill={{
          roomId: first(params.room),
          date: first(params.date),
          start: first(params.start),
          end: first(params.end),
        }}
        edit={edit}
      />
    </div>
  );
}

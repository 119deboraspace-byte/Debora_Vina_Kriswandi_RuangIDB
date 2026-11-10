export const ROLE_LABEL = {
  ADMIN1: "Admin · Bagian Akademik",
  ADMIN2: "Kemahasiswaan",
  LECTURER: "Tenaga Pendidik",
  STUDENT: "Mahasiswa",
  ORGANIZATION: "Organisasi Mahasiswa",
} as const;

export type Role = keyof typeof ROLE_LABEL;

export const ROLE_HOME: Record<Role, string> = {
  ADMIN1: "/admin/persetujuan",
  ADMIN2: "/admin/persetujuan",
  LECTURER: "/pengajuan",
  STUDENT: "/pengajuan",
  ORGANIZATION: "/pengajuan",
};

export const BORROWER_LABEL = {
  DOSEN: "Tenaga Pendidik (Dosen)",
  MAHASISWA: "Mahasiswa",
  ORGANISASI: "Organisasi Mahasiswa IDB Bali",
} as const;

export type BorrowerType = keyof typeof BORROWER_LABEL;

/**
 * Jenis peminjam ditentukan oleh akun yang masuk. Akun admin tidak memiliki
 * jenis peminjam, sehingga form hanya dapat dipakai oleh mahasiswa/dosen/ormawa.
 */
export function borrowerTypeForRole(role: Role): BorrowerType | null {
  if (role === "STUDENT") return "MAHASISWA";
  if (role === "LECTURER") return "DOSEN";
  if (role === "ORGANIZATION") return "ORGANISASI";
  return null;
}

export const STATUS_LABEL = {
  DRAFT: "Draft",
  PENDING_ADMIN1: "Menunggu approve",
  PENDING_ADMIN2: "Menunggu approve",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  REVISION: "Perlu Revisi",
  CANCELLED: "Dibatalkan",
  COMPLETED: "Selesai",
} as const;

export type BookingStatus = keyof typeof STATUS_LABEL;

export const STATUS_TONE: Record<BookingStatus, "ok" | "wait" | "bad" | "muted" | "info"> = {
  DRAFT: "muted",
  PENDING_ADMIN1: "wait",
  PENDING_ADMIN2: "wait",
  APPROVED: "ok",
  REJECTED: "bad",
  REVISION: "info",
  CANCELLED: "muted",
  COMPLETED: "muted",
};

export const CONDITION_LABEL = {
  BAIK: "Baik",
  PERLU_PERAWATAN: "Perlu Perawatan",
  RUSAK: "Rusak",
  DITUTUP: "Ditutup",
} as const;

export type RoomCondition = keyof typeof CONDITION_LABEL;

export const SITUATION_LABEL = {
  KOSONG: "Kosong",
  TERPAKAI: "Terpakai",
  MENUNGGU_APPROVE: "Menunggu Approve",
  DITOLAK: "Ditolak",
} as const;

export type RoomSituation = keyof typeof SITUATION_LABEL;

export const APPROVAL_CLASS_LABEL = {
  A: "Kelas A",
  B: "Kelas B",
  C: "Kelas C",
} as const;

export const ACTIVITY_TYPES = [
  "Akademik",
  "Organisasi",
  "Seminar",
  "Rapat",
  "Lomba",
  "Lainnya",
] as const;

export const JURUSAN = [
  "Arsitektur",
  "Desain Komunikasi Visual",
  "Desain Interior",
  "Desain Mode",
  "Bisnis Digital",
  "Manajemen Bisnis",
  "Sistem & Teknologi Informasi Bisnis",
  "Magister Desain",
  "Magister Bisnis Digital",
] as const;

export function isPendingStatus(status: BookingStatus): boolean {
  return status === "PENDING_ADMIN1" || status === "PENDING_ADMIN2";
}

export function isApprovedStatus(status: BookingStatus): boolean {
  return status === "APPROVED";
}

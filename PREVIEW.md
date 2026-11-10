# Preview RuangIDB

Diperbarui: 5 November 2026, 22.15 WITA

## Pembaruan terakhir

- **Aula tutup hari Minggu:** Aula IDB Bali tidak dapat diajukan pada hari Minggu;
  form menampilkan error dan tombol Kirim nonaktif, sel live table berstatus Ditolak.
- **Jenis peminjam otomatis mengikuti akun** dan terkunci: mahasiswa (NIM + jurusan),
  dosen (kode dosen + program studi), ormawa (organisasi + panitia). Identitas inti
  terisi dari akun dan tidak dapat diubah di form.
- Pemilih jam **12 jam** (mis. `01.30 PM`) di form pengajuan dan penandaan admin.
- Batas selesai kegiatan **08.00 PM (20.00 WITA)**; sesi yang melewati batas ditolak
  oleh validasi server dan tombol Kirim dinonaktifkan.
- Galeri fasilitas kampus di beranda (Gedung IDB, Lab IMAC, Lab Fashion, Creative
  Gallery, Lobby) dan foto kampus di halaman masuk; sumber `idbbali.ac.id`.

## Link

| Akses | URL | Catatan |
|---|---|---|
| **Publik (HTTPS)** | https://eos-batman-fill-accuracy.trycloudflare.com | bisa dibuka dari jaringan mana pun selama PC ini menyala |
| **LAN (satu Wi-Fi)** | http://192.168.1.20:3000 | hanya perangkat di Wi-Fi yang sama |

Akun demo (kata sandi `RuangIDB#2026`):

- Admin 1: `admin1@idbbali.ac.id`
- Admin 2: `admin2@idbbali.ac.id`
- Mahasiswa: `mahasiswa@idbbali.ac.id`
- Dosen: `dosen@idbbali.ac.id`
- Organisasi: `bem@idbbali.ac.id`

QR pada halaman memo memakai `APP_URL` publik di atas, jadi bisa dipindai dari HP.

## Cara menjalankan ulang

```powershell
# 1. Build
npm run build

# 2. Tunnel (terminal terpisah) — URL baru akan muncul
& "$env:LOCALAPPDATA\Programs\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000

# 3. Aplikasi dengan URL tunnel tersebut
$env:APP_URL = "https://<url-tunnel-baru>.trycloudflare.com"
$env:COOKIE_SECURE = "false"     # agar login juga jalan lewat HTTP LAN
npm run start
```

`COOKIE_SECURE=false` hanya untuk preview. Di produksi (HTTPS murni) biarkan
default `true`.

## Menghentikan

```powershell
# hentikan server aplikasi di port 3000
Get-NetTCPConnection -LocalPort 3000 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# hentikan tunnel
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process
```

## Catatan

- Quick Tunnel Cloudflare bersifat **sementara**: URL berubah setiap kali tunnel
  dijalankan ulang, dan link mati bila PC sleep/mati atau proses dihentikan.
- Link publik dapat diakses siapa pun yang memilikinya. Database ini berisi data
  demo; hentikan tunnel setelah presentasi/review.
- Untuk URL permanen: gunakan Named Tunnel Cloudflare atau deploy ke Vercel +
  PostgreSQL/Supabase (lihat `README.md` bagian migrasi).

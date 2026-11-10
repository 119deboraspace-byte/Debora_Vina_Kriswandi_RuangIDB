# Deploy permanen RuangIDB

Tujuan: URL publik yang tetap hidup **tanpa PC dan tanpa proses tunnel**.

Aplikasi ini memakai SQLite (`node:sqlite`) dan menyimpan lampiran di disk, jadi
hosting produksinya idealnya:

1. menjalankan container/Node terus-menerus, dan
2. punya **volume persisten** yang di-mount ke `DATA_DIR` (default `/app/data`).

**Vercel:** sejak perbaikan kompatibilitas, demo dapat berjalan di Vercel karena
`DATA_DIR` otomatis dialihkan ke `/tmp/ruangidb` (satu-satunya filesystem yang
dapat ditulis). Konsekuensinya data **ephemeral**: database di-seed ulang saat
instance baru dibuat dan pengajuan dapat hilang saat cold start. Untuk data
permanen, migrasikan database ke PostgreSQL/Supabase (lihat `README.md` bagian 15)
dan lampiran ke Supabase Storage/Vercel Blob.

## Environment yang wajib

| Variabel | Nilai |
|---|---|
| `AUTH_SECRET` | string acak panjang (wajib di produksi) |
| `DATA_DIR` | `/app/data` (lokasi volume) |
| `APP_URL` | domain final, mis. `https://ruangidb.up.railway.app` |
| `COOKIE_SECURE` | `true` untuk HTTPS |
| `PORT` | diisi otomatis oleh sebagian host |

Database dan lampiran akan dibuat otomatis di volume saat request pertama
(seed demo ikut berjalan bila database kosong).

---

## Opsi A — Railway (paling cepat, arsitektur tidak berubah)

1. Buat akun di <https://railway.app>.
2. New Project → **Deploy from repo** (setelah kode di-push ke GitHub) **atau**
   deploy via CLI dari folder ini:
   ```bash
   npx @railway/cli login
   npx @railway/cli init
   npx @railway/cli up
   ```
3. Tambahkan **Volume** dan mount ke `/app/data`.
4. Set variables: `AUTH_SECRET`, `APP_URL`, `COOKIE_SECURE=true`, `DATA_DIR=/app/data`.
5. Settings → **Generate Domain**.
6. Buka domain tersebut, login dengan akun demo.

Catatan: Railway menyediakan trial credit lalu berbayar sesuai pemakaian. Satu
instance + volume kecil sudah cukup untuk demo kampus.

---

## Opsi B — Render

Repo ini sudah menyertakan `render.yaml` (Docker + disk 1 GB).

1. Buat akun <https://render.com>.
2. New → **Blueprint** → hubungkan repo.
3. Render membaca `render.yaml`; **disk hanya tersedia pada plan Starter** (berbayar).
4. Isi `APP_URL` setelah domain `.onrender.com` dibuat.
5. Deploy.

Plan Free tidak punya disk persisten dan service-nya sleep saat idle — tidak cocok
untuk “selalu menyala”.

---

## Opsi C — Fly.io

```bash
fly auth login
fly launch --no-deploy --copy-config
fly volumes create ruangidb_data --size 1 --region sin
fly secrets set AUTH_SECRET="$(openssl rand -hex 32)"
fly secrets set APP_URL="https://ruangidb-idb.fly.dev"
fly deploy
```

`fly.toml` sudah menyetel `min_machines_running = 1`, mount `/app/data`, dan HTTPS.
Fly membutuhkan kartu kredit untuk akun baru.

---

## Opsi D — VPS / server kampus (paling murah jangka panjang)

Prasyarat: Docker + Docker Compose di server.

```bash
git clone <repo> && cd ruangidb
cp .env.example .env
# isi AUTH_SECRET, APP_URL, COOKIE_SECURE=true
docker compose up -d --build
```

Letakkan reverse proxy (Caddy/Nginx) di depan port 3000 untuk HTTPS, mis. Caddy:

```
ruangidb.kampus.ac.id {
  reverse_proxy 127.0.0.1:3000
}
```

Volume `ruangidb_data` menyimpan database dan lampiran.

---

## Opsi E — Vercel + Supabase/Neon (serverless)

**Demo tanpa migrasi:** aplikasi sekarang memakai `/tmp/ruangidb` saat mendeteksi
`VERCEL=1`, sehingga tidak lagi 500 karena filesystem read-only. Set environment
variable berikut di Vercel → Project Settings → Environment Variables:

| Variabel | Nilai |
|---|---|
| `AUTH_SECRET` | string acak panjang (disarankan; tanpa ini dipakai secret demo sementara) |
| `APP_URL` | `https://tugasweb0034.vercel.app` |
| `COOKIE_SECURE` | `true` |

Data demo tetap **ephemeral** (hilang saat cold start/instance baru). Untuk data
permanen, lanjutkan migrasi berikut:

Perlu migrasi:

- ganti `lib/db.ts` + seluruh query ke `pg`/Supabase (fungsi menjadi async),
- buat skema PostgreSQL + `EXCLUDE` constraint untuk bentrok,
- pindahkan lampiran ke Supabase Storage / Vercel Blob,
- deploy dengan Vercel CLI/ Git integration.

Bisa dikerjakan, tetapi bukan sekadar “deploy”: ini refactor data layer. Beri tahu
jika opsi ini yang diinginkan.

---

## Yang saya butuhkan untuk mengeksekusi deploy

Pilih satu:

| Host | Yang dikirim |
|---|---|
| **Railway** | `RAILWAY_TOKEN` (Account → Tokens) + izin membuat service & volume |
| **Render** | `RENDER_API_KEY` |
| **Fly.io** | `FLY_API_TOKEN` |
| **VPS** | IP/host, user SSH, private key (atau password), dan domain (opsional) |
| **Vercel + Supabase** | `VERCEL_TOKEN`, `DATABASE_URL` Supabase, dan konfirmasi migrasi |

Gunakan token yang scope-nya terbatas dan **cabut setelah deploy**. Jangan kirim
kata sandi akun utama.

Setelah token tersedia, langkah saya: set secret, buat volume, deploy, tunggu
health check `/api/health` hijau, set `APP_URL`, lalu kirim URL final dan uji login
dari perangkat lain.

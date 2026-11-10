# Design brief — RuangIDB

```
Purpose:    Sistem peminjaman ruangan kampus untuk mahasiswa, dosen, ormawa, dan admin IDB Bali
Audience:   Mahasiswa dan dosen di ponsel saat berada di kampus; admin BAA di desktop lebar
Tone:       Campus Modern Editorial - energi brand IDB (biru/jingga) dengan disiplin institusional
Reference:  Katalog universitas Swiss + papan jadwal kampus kontemporer
Palette:    Cool paper base, deep blue ink, satu aksen oranye sinyal, abu netral untuk status
Type:       Instrument Serif display / Plus Jakarta Sans text — otoritas editorial + keterbacaan UI
Memorable:  Matriks ketersediaan 29 ruangan x 14 hari yang terbaca seperti papan jadwal kampus
Restraint:  Tanpa gradien ungu, tanpa glassmorphism, tanpa sudut membulat berlebihan, tanpa shadow di kartu
```

## Arah estetika

**Campus Broadsheet.** Judul besar ber-serif, label kecil huruf kapital, garis tebal sebagai pemisah, dan ruang kosong yang lapang. Warna brand dipakai sebagai sinyal, bukan dekorasi: biru untuk aksi dan identitas, oranye hanya untuk penanda "hari ini" dan satu ajakan utama per layar.

## Token

Lihat `app/globals.css` blok `:root`. Skala tipe 1.250 (major third), skala ruang kelipatan 4px dengan nama semantik, satu radius 10px, dua bayangan (hanya untuk lapisan mengambang), tiga durasi dan dua easing.

## Batasan yang disengaja

- Tidak ada kartu berbayang di halaman daftar; pengelompokan memakai garis dan jarak.
- Tidak ada ikon pengganti teks untuk aksi penting; ikon selalu berpasangan dengan label atau `aria-label`.
- Oranye tidak pernah menjadi warna teks di atas putih (kontras tidak cukup); oranye hanya isian, garis, atau penanda.

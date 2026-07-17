# Checklist Go-Live Nusa Food v2

Panduan operasional untuk transisi dari **v1** (GAS + Google Sheets) ke **v2** (Vercel + PostgreSQL) secara **soft launch** — v1 dan v2 jalan parallel sampai v2 terbukti stabil.

**Production v2:** https://nusafood-v2.vercel.app  
**Dokumen terkait:** [SPRINT7_CUTOVER.md](./SPRINT7_CUTOVER.md) (go/no-go teknis) · [V2_ROLLBACK_PLAN.md](./V2_ROLLBACK_PLAN.md) (rollback) · [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) (env Vercel)

---

## Cara pakai dokumen ini

1. **Admin/IT** — kerjakan Fase 0 dan Fase 1 (H-1) dulu.
2. **Leader** — ikuti Fase 2 pada hari H; uji end-to-end dengan 1 staff pilot.
3. **Staff/PIC** — ikuti Fase 3; terima link dari leader (bukan login dashboard).
4. **Admin** — pantau Fase 4 (H+1 s/d minggu pertama).
5. Simpan salinan checklist ini; centang kolom **Hasil** saat setiap item selesai.

---

## Fase 0 — Sebelum siapa pun pakai (Admin / IT)

### A. Environment Vercel

| # | Item | Hasil |
|---|------|-------|
| 1 | `DATABASE_URL` + `DIRECT_URL` Supabase benar (password `@` → `%40`) | ⬜ |
| 2 | `SESSION_SECRET` sudah di-set (random, panjang) | ⬜ |
| 3 | `AUTH_REQUIRED=true` di production | ⬜ |
| 4 | `GAS_WEB_APP_URL` → GAS v1 aktif | ⬜ |
| 5 | `ADMIN_API_KEY` = `admin_secret` GAS (bukan `api_key`) | ⬜ |
| 6 | `DUAL_WRITE_ENABLED=true` jika mau WA + tulis balik ke v1 | ⬜ |
| 7 | `GAS_FALLBACK_ENABLED=true` | ⬜ |
| 8 | Supabase Storage: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET` | ⬜ |
| 9 | `NEXT_PUBLIC_APP_URL=https://nusafood-v2.vercel.app` | ⬜ |
| 10 | `V1_APP_URL` = URL v1 (untuk emergency rollback) | ⬜ |
| 11 | Deploy Vercel terbaru status **Ready** (bukan deployment lama) | ⬜ |

### B. Database & data awal

| # | Item | Hasil |
|---|------|-------|
| 1 | Migration DB sudah jalan (`pnpm db:migrate:deploy`) | ⬜ |
| 2 | Seed sudah jalan (outlet, area, kategori dasar) | ⬜ |
| 3 | **Sync Semua dari v1** sudah dijalankan sekali (UI atau CLI) | ⬜ |
| 4 | Sync logs — tidak ada error fatal | ⬜ |
| 5 | User login leader sudah dibuat manual (tidak auto-sync dari v1) | ⬜ |

**CLI sync (opsional, setara tombol UI):**

```bash
pnpm sync:all-from-v1 -- --gas
```

### C. Health check

| # | Item | Hasil |
|---|------|-------|
| 1 | `GET /api/health` → status OK | ⬜ |
| 2 | DB: connected | ⬜ |
| 3 | Storage: connected (atau fallback lokal OK) | ⬜ |
| 4 | GAS: connected (jika pakai dual-write) | ⬜ |

### D. Akun uji

| Role | Username | Password default | Catatan |
|------|----------|------------------|---------|
| Admin | `admin` | `admin123` | **Ganti sebelum go-live** |
| Leader | `leader.kbu` | `leader123` | Buat akun per outlet jika perlu |

| # | Item | Hasil |
|---|------|-------|
| 1 | Password default sudah diganti | ⬜ |
| 2 | Setiap leader punya akun sendiri (tidak share) | ⬜ |

---

## Fase 1 — Admin (H-1 / persiapan)

### Master data

| # | Item | Hasil |
|---|------|-------|
| 1 | Staff — jumlah ≈ v1 (referensi sync: ~35) | ⬜ |
| 2 | Area — lengkap per outlet | ⬜ |
| 3 | Kategori — lengkap (referensi sync: ~17) | ⬜ |
| 4 | User Login — akun untuk setiap leader | ⬜ |
| 5 | Staff nonaktif sudah di-nonaktifkan | ⬜ |

### Recurring & checklist

| # | Item | Hasil |
|---|------|-------|
| 1 | Template recurring sudah sync (~13) | ⬜ |
| 2 | Item checklist per template sudah sync (~83) | ⬜ |
| 3 | Buka 1–2 template di editor — item tampil benar | ⬜ |
| 4 | Template yang tidak dipakai sudah di-toggle off | ⬜ |

### Sync & monitoring

| # | Item | Hasil |
|---|------|-------|
| 1 | Jalankan **Sync Semua dari v1** dari Pengaturan | ⬜ |
| 2 | Buka Sync Logs — waktu tampil **WIB** | ⬜ |
| 3 | Catat waktu sync terakhir | ⬜ |

### Dual-write (jika aktif)

| # | Item | Hasil |
|---|------|-------|
| 1 | Buat 1 tugas uji di v2 → muncul di v1 Sheets/GAS | ⬜ |
| 2 | Staff submit uji → update di v1 | ⬜ |
| 3 | Leader approve uji → status benar di v1 | ⬜ |

---

## Fase 2 — Leader (Hari H)

### Login & dashboard

| # | Item | Hasil |
|---|------|-------|
| 1 | Buka `/login` dan masuk dengan akun sendiri | ⬜ |
| 2 | Dashboard terbuka — tab **Tugas** dan **Checklist** ada | ⬜ |
| 3 | Summary cards menampilkan angka | ⬜ |
| 4 | Default filter = **Bulan Ini** (bisa ganti) | ⬜ |

### Navigasi & filter

| # | Item | Hasil |
|---|------|-------|
| 1 | Klik angka summary card → list ter-filter + scroll ke list | ⬜ |
| 2 | Filter outlet berfungsi | ⬜ |
| 3 | Filter status berfungsi | ⬜ |
| 4 | Pencarian judul/PIC berfungsi | ⬜ |
| 5 | Tombol refresh memuat ulang data | ⬜ |

### Tugas manual

| # | Item | Hasil |
|---|------|-------|
| 1 | Buat tugas baru (FAB / Buat Tugas) | ⬜ |
| 2 | Isi judul, outlet, area, PIC, deadline, prioritas | ⬜ |
| 3 | Tugas muncul di dashboard setelah simpan | ⬜ |
| 4 | Deadline tampil **WIB** (bukan UTC/UTC+8) | ⬜ |
| 5 | Detail tugas — metadata lengkap | ⬜ |
| 6 | Copy link laporan staff → kirim ke PIC uji | ⬜ |

### Checklist

| # | Item | Hasil |
|---|------|-------|
| 1 | Tab Checklist menampilkan task checklist | ⬜ |
| 2 | Generate checklist dari template recurring | ⬜ |
| 3 | Copy link checklist staff | ⬜ |
| 4 | **Catatan:** kirim checklist belum otomatis WA — share link manual dulu | ⬜ |

### Leader actions (setelah staff submit)

| # | Item | Hasil |
|---|------|-------|
| 1 | Buka detail tugas status **Terkirim** | ⬜ |
| 2 | **Approve** → status Selesai | ⬜ |
| 3 | **Minta Revisi** → staff bisa submit ulang | ⬜ |
| 4 | **Kirim Ulang WA** — hanya jika GAS dikonfigurasi | ⬜ |

### Pengaturan & logout

| # | Item | Hasil |
|---|------|-------|
| 1 | Menu Pengaturan dari header mobile | ⬜ |
| 2 | Akses modul sesuai role (User hanya ADMIN) | ⬜ |
| 3 | Logout berfungsi | ⬜ |

---

## Fase 3 — Staff / PIC (Hari H)

### Laporan tugas manual

| # | Item | Hasil |
|---|------|-------|
| 1 | Terima link `/report/TASK-ID?token=...` dari leader | ⬜ |
| 2 | Buka di HP (Chrome/Safari) — **tanpa login** | ⬜ |
| 3 | Halaman tampil: judul, deadline WIB, outlet, PIC | ⬜ |
| 4 | Upload foto (kamera/galeri) | ⬜ |
| 5 | Submit → pesan sukses | ⬜ |

### Checklist

| # | Item | Hasil |
|---|------|-------|
| 1 | Terima link `/checklist/TASK-ID?token=...` | ⬜ |
| 2 | Buka di HP — tanpa login | ⬜ |
| 3 | Centang item checklist | ⬜ |
| 4 | Upload foto per item (jika wajib) | ⬜ |
| 5 | Submit checklist → sukses | ⬜ |

### Troubleshooting staff

| Masalah | Solusi |
|---------|--------|
| Link invalid / expired | Leader buat ulang atau resend dari dashboard |
| Foto gagal upload | Cek koneksi; foto jangan terlalu besar (>4 MB) |
| Halaman blank | Hard refresh; coba browser lain |
| Deadline jam salah | Hard refresh setelah deploy timezone WIB |

---

## Fase 4 — Admin (H+1 / stabilisasi)

### Monitoring harian (minggu pertama)

| # | Item | Hasil |
|---|------|-------|
| 1 | Dashboard pagi — filter **Hari Ini** menampilkan tugas benar | ⬜ |
| 2 | Sync logs — tidak ada error berulang | ⬜ |
| 3 | Tugas **Terlambat** — follow up ke leader | ⬜ |
| 4 | Foto upload tampil di detail tugas | ⬜ |

### Data & sync

| # | Item | Hasil |
|---|------|-------|
| 1 | Perubahan master di v1 → jalankan Sync Semua dari v1 lagi | ⬜ |
| 2 | Perubahan master di v2 **tidak otomatis ke v1** — catat manual jika perlu | ⬜ |

### Keamanan

| # | Item | Hasil |
|---|------|-------|
| 1 | Semua password default sudah diganti | ⬜ |
| 2 | Staff/PIC tidak punya akses login dashboard | ⬜ |
| 3 | `ADMIN_PASSWORD` env (owner login) sudah kuat | ⬜ |

### Known gaps — jangan diharapkan dulu

| Fitur | Status |
|-------|--------|
| Auto-generate tugas recurring pagi (cron) | ❌ Belum |
| WA otomatis saat generate checklist | ❌ Belum |
| Hapus tugas dari UI | ❌ Belum |
| Sync user login dari v1 | ❌ Buat manual |
| Edit master data v2 → sync balik ke v1 | ❌ Belum |

---

## Fase 5 — Rollback darurat

### Level 1 — Sementara pakai v1

| # | Item | Hasil |
|---|------|-------|
| 1 | Leader/staff kembali pakai link v1 seperti biasa | ⬜ |
| 2 | v1 **tidak diubah** — tetap jalan parallel | ⬜ |
| 3 | Catat issue v2 (screenshot + waktu WIB) | ⬜ |

### Level 2 — Emergency redirect (Admin IT)

| # | Item | Hasil |
|---|------|-------|
| 1 | Set `EMERGENCY_FALLBACK_V1=true` di Vercel | ⬜ |
| 2 | Redeploy | ⬜ |
| 3 | Staff report/checklist redirect ke v1 otomatis | ⬜ |
| 4 | Setelah v2 fix → set kembali `false` | ⬜ |

Detail teknis: [V2_ROLLBACK_PLAN.md](./V2_ROLLBACK_PLAN.md)

---

## Kriteria “siap go-live soft”

Centang minimal ini sebelum leader wajib pindah ke v2:

| # | Kriteria | Hasil |
|---|----------|-------|
| 1 | Login leader stabil | ⬜ |
| 2 | Dashboard menampilkan data sync v1 | ⬜ |
| 3 | 1 tugas uji end-to-end: buat → staff submit → leader approve | ⬜ |
| 4 | 1 checklist uji end-to-end | ⬜ |
| 5 | Waktu WIB benar di UI | ⬜ |
| 6 | Foto upload jalan di HP staff | ⬜ |
| 7 | Rollback plan (kembali v1) sudah dipahami leader | ⬜ |

**Keputusan soft launch:** ⬜ GO · ⬜ NO-GO · Tanggal: ____ · Owner: ____

---

## Ringkasan per role (1 halaman)

| Role | Wajib hari H | Optional / nanti |
|------|--------------|------------------|
| **Admin** | Env, sync, user, health check | Cutover penuh, cron recurring |
| **Leader** | Dashboard, buat tugas, share link, approve | Resend WA, edit metadata recurring |
| **Staff** | Buka link, foto, submit | — |

**Alur singkat:**

```
Admin: env OK → sync v1 → buat user leader → health check
   ↓
Leader: login → monitor dashboard → buat/generate tugas → share link
   ↓
Staff: buka link di HP → upload foto → submit
   ↓
Leader: approve / minta revisi
```

---

## Template pesan WA — Leader ke Staff

### Tugas manual baru

```
Halo [NAMA PIC],

Ada tugas baru: *[JUDUL TUGAS]*
Deadline: [TGL JAM WIB]
Outlet: [OUTLET]

Silakan buka link ini dan upload foto bukti:
[LINK /report/...?token=...]

Jangan share link ke orang lain.
Terima kasih.
```

### Checklist harian

```
Halo [NAMA PIC],

Checklist [NAMA CHECKLIST] sudah siap.
Deadline: [TGL JAM WIB]

Silakan buka link ini, centang semua item, dan upload foto jika diminta:
[LINK /checklist/...?token=...]

Jangan share link ke orang lain.
Terima kasih.
```

### Minta revisi

```
Halo [NAMA PIC],

Laporan tugas *[JUDUL]* perlu diperbaiki.
Catatan leader: [CATATAN REVISI]

Silakan buka link yang sama dan submit ulang:
[LINK]

Terima kasih.
```

---

## Template pesan WA — Admin ke Leader (migrasi v2)

```
Halo tim Leader,

Kami mulai pakai dashboard Nusa Food v2 (soft launch).
v1 masih jalan sebagai cadangan.

Login: https://nusafood-v2.vercel.app/login
Username: [USERNAME]
Password: [PASSWORD SEMENTARA — ganti setelah login pertama]

Yang berubah:
- Dashboard baru (tampilan mirip v1)
- Waktu deadline sekarang WIB
- Link staff tetap sama format (/report dan /checklist)

Yang belum otomatis:
- Generate checklist belum kirim WA otomatis — share link manual dulu
- Tugas recurring belum auto-generate pagi

Kalau ada masalah, lapor ke [KONTAK ADMIN].
Rollback ke v1 masih bisa kapan saja.

Terima kasih.
```

---

## Lampiran — URL penting

| URL | Fungsi |
|-----|--------|
| https://nusafood-v2.vercel.app | Landing v2 |
| https://nusafood-v2.vercel.app/login | Login leader/admin |
| https://nusafood-v2.vercel.app/dashboard | Dashboard operasional |
| https://nusafood-v2.vercel.app/settings | Pengaturan + Sync Semua dari v1 |
| https://nusafood-v2.vercel.app/api/health | Health check teknis |

---

*Terakhir diperbarui: Juli 2026 — sesuai status repo setelah PR #5 (timezone WIB).*

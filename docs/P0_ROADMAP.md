# P0 Roadmap — Keamanan, Konsistensi, Cutover

Dokumen ini merangkum penilaian kondisi v2, prioritas perbaikan, dan urutan coding resmi sebelum cutover penuh.

**Terkait:** [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) · [SPRINT7_CUTOVER.md](./SPRINT7_CUTOVER.md)

---

## Penilaian kondisi (baseline)

| Area | Skor | Catatan |
|------|------|---------|
| Fitur inti | ~80% | Alur utama buat → lapor → approve sudah jalan |
| Kesiapan pilot | ~90% | Soft launch KBU feasible dengan v1 fallback |
| Kesiapan cutover penuh | ~65–70% | Gap WA recurring, monitoring, RBAC outlet |
| Keamanan & kontrol akses | ~60% | Outlet RBAC + rate limit belum lengkap |
| Otomatisasi | ~45% | Cron recurring belum ada |

**Yang sudah kuat:** Admin/leader buat tugas → staff buka link → kirim laporan/foto → leader approve/revisi → dashboard memantau.

---

## Prioritas P0 — wajib dulu

### 1. Kunci akses leader berdasarkan outlet ✅ (implementasi awal)

**Masalah:** LEADER belum difilter ketat di API; risiko akses data outlet lain via endpoint langsung.

**Aturan:**
- ADMIN → semua outlet
- LEADER → hanya staff, tugas, checklist, template, dashboard outlet sendiri
- Outlet dari request **tidak dipercaya** — diambil dari session JWT

**Implementasi:** `apps/web/lib/outlet-scope.ts` + populate `userOutlet` / `userOutletId` saat login dari `staff.outlet`.

### 2. Perbaiki alur verifikasi checklist ✅ (implementasi awal)

**Masalah:** UI memanggil `/api/tasks/:id/verify` sehingga `checklist_reports` tidak ikut update.

**Solusi:**
- `verifyChecklistReport()` / `requestChecklistRevision()` — transaksi DB (`tasks` + `checklist_reports`)
- `verifyTask()` / `requestRevision()` — delegasi otomatis jika `checklist_mode` atau ada linked report

---

## Prioritas P1 — sebelum cutover penuh

| # | Item | Status |
|---|------|--------|
| 3 | Ganti password default + rate limit login | ✅ |
| 4 | WA checklist + resend via GAS + log | ✅ |
| 5 | Endpoint generate recurring idempotent | ✅ |
| 6 | Vercel Cron | ✅ |
| 7 | Monitoring & error log terstruktur | ✅ (metadata di sync_logs v2_response) |

### Cron tugas berulang (target)

```
Vercel Cron
→ POST /api/internal/recurring/generate
→ template aktif + jadwal hari ini
→ cek duplikat (recurring_template_id + scheduled_date + outlet_id)
→ generate task/checklist
→ kirim WA
→ log sukses/gagal
```

### WhatsApp checklist (target)

1. Generate → kirim WA via GAS
2. Log request/response/waktu/nomor/error
3. Tombol resend
4. Native Fonnte → setelah pilot stabil

### Monitoring minimum

Catat kegagalan: buat tugas, upload foto, dual-write, WA, generate recurring, sync — plus actor, outlet, task id.

---

## Tidak menghambat pilot

- Hapus tugas (prefer `archived_at` soft archive)
- CRUD outlet
- Migrasi langsung Sheets
- Edit metadata recurring
- Sync balik master data ke v1
- SSR dashboard
- WA native Fonnte
- Edit nama template checklist

---

## Rencana pilot KBU (7 hari)

| Hari | Fokus |
|------|-------|
| 1–2 | Tugas manual, laporan, foto, approve/revisi, 1 checklist harian |
| 3–4 | Multi-leader, kategori, checklist foto per item, terlambat, resend WA |
| 5–7 | Edge cases: revisi, upload gagal, GAS gagal, duplikat, link lama, cross-outlet 403, offline submit |

**Prinsip:** v2 alat kerja utama untuk sampel tugas; v1 tetap fallback.

---

## Tes end-to-end wajib

### Skenario tugas manual
Admin login → buat tugas → WA → staff buka → opened → upload → submit → revisi → resubmit → approve → summary benar

### Skenario checklist
Generate → link/WA → staff centang + foto → submit → revisi → perbaiki → approve → **tasks dan checklist_reports status sama**

### Skenario pembatasan leader (syarat mutlak)
Leader KBU lihat task KBU ✅ · Leader KBU akses task Kisamen via URL/API → **403 Forbidden**

---

## Urutan coding resmi

1. ✅ Outlet-level authorization pada seluruh API
2. ✅ Transaksi status tasks + checklist_reports
3. ✅ Ganti akun/password default + rate limit login
4. ✅ WA checklist + resend via GAS
5. ✅ Endpoint generate recurring idempotent
6. ✅ Vercel Cron
7. ✅ Monitoring & error log
8. ⬜ Pilot KBU 7 hari
9. ⬜ Isi checklist go/no-go dari hasil nyata
10. ⬜ Putuskan cutover

**Jangan menambah modul baru** sampai empat lubang utama tertutup: otorisasi outlet, checklist consistency, WhatsApp, recurring cron.

---

*Terakhir diperbarui: Juli 2026*

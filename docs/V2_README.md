# Nusa Food Task System — Dokumentasi Versi 2

Dokumentasi perencanaan migrasi dari **v1** (Next.js + Google Apps Script + Google Sheets) ke **v2** (Next.js + API proper + PostgreSQL), dengan **v1 tetap berjalan** selama transisi.

## Konteks Sistem Saat Ini (v1)

| Komponen | Teknologi |
|----------|-----------|
| Frontend | Next.js 16, React 19, Tailwind, shadcn/ui |
| Backend | Google Apps Script (GAS) Web App |
| Database | Google Sheets |
| Notifikasi | WhatsApp via GAS |
| Auth | JWT session cookie (`nusa_session`) |
| Deploy | Vercel (terhubung ke v0) |

**Brand/outlet:** Kopi Buri Umah (KBU), Kisamen, Samtaro Express

**Alur bisnis inti:**
1. Leader buat tugas di dashboard
2. Sistem kirim WhatsApp ke staff dengan link unik
3. Staff buka link tanpa login, upload foto bukti
4. Leader verifikasi (setujui / minta revisi)

## Daftar Dokumen

| Dokumen | Isi |
|---------|-----|
| [V2_MIGRATION_STRATEGY.md](./V2_MIGRATION_STRATEGY.md) | Strategi migrasi bertahap, fase 0–5, risiko, checklist |
| [V2_DATABASE_SCHEMA.md](./V2_DATABASE_SCHEMA.md) | Desain schema PostgreSQL dari Google Sheets v1 |
| [V2_API_SPEC.md](./V2_API_SPEC.md) | Spesifikasi REST API v2, kompatibilitas dengan v1 |
| [V2_REPO_STRUCTURE.md](./V2_REPO_STRUCTURE.md) | Blueprint struktur repo, tech stack, env vars |
| [V2_ROLLBACK_PLAN.md](./V2_ROLLBACK_PLAN.md) | Prosedur rollback jika cutover gagal |
| [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) | Checklist go-live per role (Admin / Leader / Staff) + template WA |
| [P0_ROADMAP.md](./P0_ROADMAP.md) | Prioritas P0/P1, urutan coding, penilaian kesiapan cutover |

## Prinsip Migrasi

1. **v1 tidak boleh mati** sampai v2 terbukti stabil di produksi
2. **Link WhatsApp lama harus tetap jalan** (`/report/[taskId]?token=...`, `/checklist/[taskId]?token=...`)
3. **Migrasi bertahap** (Strangler Fig), bukan big-bang rewrite
4. **Dual-write** ke GAS + DB v2 sebelum cutover penuh
5. **Rollback dalam hitungan menit** jika ada insiden

## Urutan Baca

```
V2_README.md (Anda di sini)
    ↓
V2_MIGRATION_STRATEGY.md  ← mulai dari sini untuk overview
    ↓
V2_DATABASE_SCHEMA.md       ← desain data
    ↓
V2_API_SPEC.md              ← kontrak API
    ↓
V2_REPO_STRUCTURE.md        ← implementasi teknis
    ↓
V2_ROLLBACK_PLAN.md         ← safety net sebelum cutover
```

## Status

| Item | Status |
|------|--------|
| Dokumentasi perencanaan | ✅ Draft (disalin ke `nusafood-v2/docs`) |
| Repo v2 | ✅ Scaffold monorepo (Sprint 1) |
| Schema DB | ✅ Prisma schema + migration `init` (teruji lokal; staging Supabase ⬜) |
| Read API + sync fixture | ✅ Sprint 2 |
| Staging deploy | ⬜ Belum setup (butuh Vercel + Supabase project) |
| Dual-write | ✅ Sprint 3 (env-gated; lokal default DB-only) |
| Staff report + upload foto | ✅ Sprint 4 |
| Checklist + recurring | ✅ Sprint 5 |
| Cutover produksi | ⬜ Belum dilakukan |

## Referensi Kode v1

| File | Relevansi |
|------|-----------|
| `lib/types.ts` | Semua tipe data domain |
| `lib/api.ts` | 27+ action GAS yang harus di-cover v2 |
| `app/api/gas/route.ts` | Proxy GAS, admin vs public actions |
| `middleware.ts` | Route protection |
| `CHECKLIST_SHEET_SETUP.md` | Struktur sheet checklist |
| `GAS_ALIGNMENT_AUDIT.md` | Gap antara frontend dan GAS |
| `TASK_WORKFLOW.md` | Alur bisnis lengkap |

## Kontak & Keputusan yang Perlu Dibuat

Sebelum mulai implementasi, tim perlu memutuskan:

- [ ] **Domain staging v2** — contoh: `v2.nusafood.app` atau `staging.nusafood.app`
- [ ] **Provider database** — Supabase (disarankan) vs self-hosted PostgreSQL
- [ ] **Provider foto** — Cloudinary vs AWS S3 vs Supabase Storage
- [ ] **Provider WhatsApp** — tetap via GAS sementara vs Fonnte/WABA API
- [ ] **Outlet pilot** — mulai uji dari KBU saja atau semua outlet
- [ ] **Owner dokumentasi** — siapa yang maintain dokumen ini

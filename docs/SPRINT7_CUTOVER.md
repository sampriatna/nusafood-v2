# Sprint 7 — Cutover Prep

## Selesai di repo

- Emergency Level-2 fallback: `EMERGENCY_FALLBACK_V1=true` + `V1_APP_URL` → middleware redirect `/report` & `/checklist` (dan API staff terkait) ke v1
- `GET /api/internal/cutover-readiness` (ADMIN) — cek DB, auth, users, V1 URL, GAS, dual-write
- Scripts:
  - `pnpm smoke:cutover` — jalur kritis (health, login, create task, staff report, auth gate)
  - `pnpm load:test` — concurrent baseline (`/api/health`, `/login`, auth gate)
  - `pnpm rollback:drill` — cek kesehatan target rollback v1 + env
- Unit test helper emergency fallback
- Checklist go/no-go + catatan training leader (di bawah)

## Perintah

```bash
# pastikan app jalan (contoh port 3002)
export CUTOVER_BASE_URL=http://localhost:3002
export V1_APP_URL=https://v1.example.com   # wajib untuk drill / readiness penuh

pnpm db:seed
pnpm smoke:cutover
pnpm load:test
pnpm rollback:drill
```

## Go / No-Go Decision

Owner mengisi kolom **Hasil** lalu putuskan.

| # | Kriteria | Target | Hasil |
|---|----------|--------|-------|
| 1 | Smoke cutover hijau di staging | `pnpm smoke:cutover` exit 0 | ⬜ |
| 2 | Load baseline | error rate health < 1%, p95 < 1.5s | ⬜ |
| 3 | Rollback drill | `pnpm rollback:drill` exit 0; redirect drill < 5 menit | ⬜ |
| 4 | Staff link WA (pilot outlet) | 100% buka + submit di HP nyata | ⬜ |
| 5 | Dual-write / sync_logs | tidak ada gagal kritis 48 jam | ⬜ |
| 6 | Auth multi-user | leader pilot bisa login + buat tugas | ⬜ |
| 7 | Snapshot DB + export Sheets | backup < 24 jam | ⬜ |
| 8 | DNS TTL diturunkan | 60s, ≥ 24 jam sebelum cutover | ⬜ |
| 9 | On-call 48 jam | nama + channel WA diisi | ⬜ |
| 10 | Training leader selesai | lihat bagian Training | ⬜ |

**Keputusan:** ⬜ GO · ⬜ NO-GO · Tanggal: ____ · Owner: ____

### No-Go jika salah satu terjadi
- Staff tidak bisa buka/submit `/report` atau `/checklist`
- Error rate create/submit > 1% di staging pilot
- v1 tidak sehat sebagai rollback target
- `V1_APP_URL` / emergency fallback belum teruji

## Training Leader (15–20 menit)

### Yang sama seperti v1
- Buat tugas → WA link ke staff
- Staff buka `/report/...?token=...`, upload foto, submit
- Leader verifikasi / minta revisi

### Yang baru di v2
1. Login pakai **username + password** (bukan hanya password owner)
2. Dashboard membaca PostgreSQL (bukan Sheets langsung)
3. Menu **Users** (ADMIN) untuk aktif/nonaktif akun
4. **Sync logs** untuk pantau dual-write
5. Checklist & recurring punya halaman terpisah

### Demo singkat
1. Login `leader.kbu`
2. Buat tugas outlet pilot
3. Buka link report di HP
4. Submit foto → verifikasi di dashboard
5. Tunjukkan cara hubungi on-call jika gagal

### Jika sistem bermasalah
- Jangan panik — link WA lama tetap diprioritaskan
- Tech set `EMERGENCY_FALLBACK_V1=true` atau redirect domain ke v1
- Pakai template WA di `V2_ROLLBACK_PLAN.md`

## Env cutover

```bash
V1_APP_URL="https://<v1-production>"
EMERGENCY_FALLBACK_V1="false"   # true hanya saat insiden Level 2
AUTH_REQUIRED="true"
SESSION_SECRET="<production-secret>"
DUAL_WRITE_ENABLED="true"       # sesuai fase migrasi
DUAL_WRITE_PRIMARY="gas"
GAS_FALLBACK_ENABLED="true"
```

## Catatan
- Staging Supabase/Vercel credentials masih di luar repo — isi readiness check setelah env staging tersedia
- `v0-field-task-app` tidak diubah dari pekerjaan v2

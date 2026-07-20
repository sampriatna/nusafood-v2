# Staff Static Report Link — Daily Activity SOP (v2)

Fitur pelengkap daily report di **nusafood-v2**. **Bukan laporan teks bebas.** Staff mengikuti standar kerja: checklist + foto + status kondisi.

> Port dari [v0-field-task-app PR #19](https://github.com/sampriatna/v0-field-task-app/pull/19) ke arsitektur PostgreSQL/Prisma.

## Dua lapisan (wajib dipisah)

| Lapisan | Untuk apa | Cara kerja |
|---------|-----------|------------|
| **Task lama** | Pekerjaan yang diberikan admin/leader | Deadline, revisi, approval, foto before-after, WA |
| **Daily Activity SOP** | Kegiatan standar harian per SDM | Link pribadi `/r/[token]`, checklist, foto, submit — tanpa WA tiap hari |

Fitur baru **bukan pengganti** task lama / checklist task.

## Halaman

| Route | Fungsi |
|-------|--------|
| `/r/[token]` | Daftar kegiatan → form checklist SOP |
| `/dashboard/daily-reports` | Audit: % checklist, kondisi, warna status |
| `/settings/daily-activity` | Hub super admin |
| `/settings/report-templates` | CRUD kegiatan + checklist |
| `/settings/report-links` | Generate / revoke link |

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/staff-reports/by-token/:token` | Public |
| POST | `/api/staff-reports/submit` | Public (token) |
| GET/POST | `/api/staff-reports/templates` | Admin/Leader (POST Admin) |
| PATCH | `/api/staff-reports/templates/:id` | Admin |
| GET/POST | `/api/staff-reports/links` | Admin/Leader (POST Admin) |
| DELETE | `/api/staff-reports/links/:id` | Admin (revoke) |
| GET | `/api/staff-reports/dashboard` | Admin/Leader |

## Seed

```bash
pnpm db:migrate:deploy   # atau db:migrate di lokal
pnpm db:seed
pnpm seed:daily-activity
```

Demo short links setelah seed:

| Staff | Posisi | Link |
|-------|--------|------|
| Rina | Waiters | `/r/rina` |
| Ani | Bar | `/r/ani` |
| Budi | Dapur | `/r/budi` |
| Dedi | PA (KBU) | `/r/dedi` |

## Position groups

| Group | Mapping jabatan |
|-------|-----------------|
| Waiters | waiter, server, floor, kasir |
| Bar | barista, bar, bartender |
| Dapur | cook, chef, dapur, kitchen |
| PA | pa, ob, public area, office boy, cleaning |

## Warna dashboard

- **Hijau** — selesai lengkap (Aman)
- **Kuning** — selesai ada kendala
- **Oranye** — perlu perbaikan (leader validasi revisi / tidak valid)
- **Merah** — belum submit (wajib)
- **Abu** — tidak wajib

## Leader Monitoring (lapisan di atas Daily Activity)

| Route | Fungsi |
|-------|--------|
| `/dashboard/leader-monitoring` | Checklist keliling leader + validasi laporan staff |
| `/api/leader-monitoring/*` | Templates, submit, validate, follow-up |

Leader monitoring **tidak mengganti** submit staff di `/r/[token]`. Validasi leader (`leader_validation` di `daily_report_submissions`) disimpan di PostgreSQL; template/submission leader masih in-memory v1 (Prisma schema siap untuk migrasi berikutnya).

Lihat juga [LEADER_MONITORING.md](./LEADER_MONITORING.md).

# Sprint 2 — Read API + Sync

## Selesai di repo

- `GET /api/tasks` (+ filter outlet/status/pic/date/checklist_mode/page/limit)
- `GET /api/tasks/:taskId`
- `GET /api/tasks/:taskId/public?token=`
- `GET /api/staff`, `/api/areas`, `/api/categories`, `/api/outlets`
- `GET /api/dashboard/summary`
- Dashboard UI membaca PostgreSQL (bukan mock)
- Sync read-only: `pnpm sync:from-gas` (fixture JSON atau GAS)
- `POST /api/internal/sync`, `GET /api/internal/sync-logs`
- Normalizer v1→v2 + unit test
- Fixture contoh: `scripts/fixtures/sample-sync.json`

## Cara uji lokal

```bash
# Pastikan Postgres jalan + .env berisi DATABASE_URL
pnpm db:migrate:deploy
pnpm db:seed
pnpm sync:from-gas -- --file scripts/fixtures/sample-sync.json
pnpm --filter @nusafood/web dev
```

Buka `/dashboard`, `/api/tasks`, `/api/health`.

## Supabase staging

Belum di-wire otomatis di environment cloud ini (butuh project + `DATABASE_URL` staging). Setelah punya:

1. Set `DATABASE_URL` Supabase di Vercel / `.env`
2. `pnpm db:migrate:deploy && pnpm db:seed`
3. `pnpm sync:from-gas -- --gas` (atau upload export Sheets sebagai JSON)

## Auth

`AUTH_REQUIRED` default off agar staging Sprint 2 bisa diuji tanpa login. Set `AUTH_REQUIRED=true` mulai Sprint 6.

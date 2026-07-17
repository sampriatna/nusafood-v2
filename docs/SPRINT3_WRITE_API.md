# Sprint 3 — Write API + Dual-Write

## Selesai

- `gas-adapter.service.ts` — `callGasAction`, health, `isGasEnabled`
- `POST /api/tasks` dengan dual-write:
  - `DUAL_WRITE_ENABLED=true` + `DUAL_WRITE_PRIMARY=gas` → GAS dulu, lalu DB
  - selain itu → DB-only (generate `TASK-YYYYMMDD-XXX` + token)
- Write endpoints: `open`, `verify`, `revision`, `resend-wa`
- `sync_logs` + `audit_logs` pada create/verify/revision
- Halaman `/tasks/new` + aksi leader di detail tugas
- Monitoring UI `/settings/sync-logs`

## Env

```bash
DUAL_WRITE_ENABLED=false          # lokal default
DUAL_WRITE_PRIMARY=gas            # saat dual-write on
GAS_FALLBACK_ENABLED=true
GAS_WEB_APP_URL=https://script.google.com/...
ADMIN_API_KEY=...
```

## Uji lokal (DB-only)

```bash
pnpm --filter @nusafood/web dev
# POST /api/tasks atau UI /tasks/new
# Cek /settings/sync-logs
```

## Catatan

- WhatsApp masih via GAS (`resend-wa` butuh GAS).
- Submit laporan staff + upload foto → Sprint 4.
- Repo `v0-field-task-app` tidak diubah.

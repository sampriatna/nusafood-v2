# Sprint 6 — Auth multi-user + RBAC

## Selesai

- JWT session cookie `nusa_session` (jose + `SESSION_SECRET`)
- `POST /api/auth/login` — username/password dari `user_accounts`, plus kompatibilitas v1 (username kosong + `ADMIN_PASSWORD`)
- `POST /api/auth/logout`, `GET /api/auth/me`
- Users API: `GET/POST /api/users`, `GET/PATCH /api/users/:id`
- `requireAuth` + role guard pada API admin (tasks write, verify, dashboard, templates, sync, users)
- Middleware verifikasi JWT; proteksi UI admin + API saat `AUTH_REQUIRED` ≠ `false`
- UI `/login` dan `/settings/users`
- Seed demo: `admin` / `admin123`, `leader.kbu` / `leader123`

## Env

```bash
SESSION_SECRET="..."          # wajib, string acak panjang
AUTH_REQUIRED="true"          # default on di kode; set false hanya untuk uji terbuka
ADMIN_PASSWORD="..."          # opsional — login owner tanpa username
```

## Uji cepat

```bash
pnpm db:seed
# pastikan SESSION_SECRET terisi di .env + apps/web/.env
# AUTH_REQUIRED=true

curl -c /tmp/nf.ck -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"leader.kbu","password":"leader123"}'

curl -b /tmp/nf.ck localhost:3000/api/auth/me
curl -b /tmp/nf.ck localhost:3000/api/users
```

Login UI: [/login](http://localhost:3000/login)

## Catatan
- Staff public routes (`/report`, `/checklist`, submit/public/open) tetap tanpa login
- `v0-field-task-app` tidak diubah

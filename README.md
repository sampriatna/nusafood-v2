# Nusa Food Task System v2

Monorepo untuk **TaskNF3 v2** (Next.js + REST API + PostgreSQL/Prisma).  
Repo v1 (`v0-field-task-app`) tetap berjalan di produksi selama migrasi — **jangan diubah dari repo ini**.

## Docs

Mulai dari [`docs/V2_README.md`](./docs/V2_README.md), lalu:

1. [Strategi migrasi](./docs/V2_MIGRATION_STRATEGY.md)
2. [Schema database](./docs/V2_DATABASE_SCHEMA.md)
3. [API spec](./docs/V2_API_SPEC.md)
4. [Struktur repo](./docs/V2_REPO_STRUCTURE.md)
5. [Rollback plan](./docs/V2_ROLLBACK_PLAN.md)

## Struktur

```
apps/web                 Next.js 16 app (UI + API routes)
packages/database        Prisma schema, migrations, seed
packages/types           Shared TypeScript domain types
packages/api-client      Typed fetch client
scripts/                 migrate-from-sheets, sync-from-gas (stubs)
docs/                    Dokumentasi perencanaan v2
```

## Setup lokal

```bash
pnpm install
cp .env.example .env
# isi DATABASE_URL (PostgreSQL / Supabase)

pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Sprint status

| Item | Status |
|------|--------|
| Monorepo Turborepo | ✅ |
| Docs v2 di repo | ✅ |
| Prisma schema + migration init | ✅ |
| Seed outlets / areas / categories | ✅ |
| `GET /api/health` | ✅ |
| Read API (tasks/staff/areas/categories/dashboard) | ✅ Sprint 2 |
| Sync fixture / GAS script | ✅ Sprint 2 |
| Dashboard UI (data DB) | ✅ Sprint 2 |
| Write API + dual-write + buat tugas | ✅ Sprint 3 |
| Sync logs monitoring | ✅ Sprint 3 |
| Staging Supabase + Vercel | ⬜ butuh credentials |
| Staff submit + photo upload | ⬜ Sprint 4 |

## Catatan

- URL staff tetap: `/report/[taskId]?token=...` dan `/checklist/[taskId]?token=...`
- Dual-write & GAS fallback dikontrol via env (`DUAL_WRITE_*`, `GAS_FALLBACK_ENABLED`)
- Jangan push perubahan ke `v0-field-task-app` dari pekerjaan v2

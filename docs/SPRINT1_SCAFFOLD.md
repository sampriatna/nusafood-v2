# Sprint 1 — Scaffold awal (selesai di repo)

Ringkasan apa yang sudah ada di `nusafood-v2` setelah fondasi:

## Selesai

- Turborepo + pnpm workspaces (`apps/*`, `packages/*`)
- Docs v2 disalin dari perencanaan (sumber asli tetap di v1 `docs/`)
- `@nusafood/database`: Prisma schema penuh sesuai `V2_DATABASE_SCHEMA.md`, migration `20260717120000_init`, seed outlets/areas/categories
- `@nusafood/types`: domain types bersama
- `@nusafood/api-client`: client typed (health + tasks stubs)
- `@nusafood/web`: Next.js 16, route tree sesuai blueprint, `GET /api/health`
- UI subset (shadcn) + `status-badge`, `mobile-header` di-copy dari v1 (fetch-only; repo v1 tidak diubah)
- Script stub: `scripts/migrate-from-sheets.ts`, `scripts/sync-from-gas.ts`
- `.env.example` sesuai `V2_REPO_STRUCTURE.md`

## Belum (Sprint berikutnya)

- Apply migrate + seed ke Supabase staging
- Deploy Vercel `nusafood-v2-staging`
- Read API (`GET /api/tasks`, staff, areas, categories)
- Sync dari Sheets/GAS
- Dual-write & halaman staff penuh

## Batas aman

- **Jangan** commit ke / mengubah `v0-field-task-app` dari pekerjaan v2
- v1 tetap source of truth produksi sampai cutover

# Blueprint Struktur Repo v2

Panduan struktur project, tech stack, dan environment untuk Nusa Food Task System v2.

---

## Opsi Struktur Repo

### Opsi A — Repo Terpisah (Disarankan)

```
nusafood-v2/                    ← repo baru
├── apps/
│   └── web/                    ← Next.js frontend
├── packages/
│   ├── database/               ← Prisma schema + migrations
│   ├── api-client/             ← Typed API client (shared)
│   └── types/                  ← Shared TypeScript types
├── scripts/
│   ├── migrate-from-sheets.ts  ← One-time data migration
│   └── sync-from-gas.ts        ← Hourly sync (fase 1-2)
├── docs/                       ← Copy dari repo v1
└── turbo.json                  ← Turborepo config
```

**Kelebihan:** v1 dan v2 benar-benar terisolasi, deploy independen.  
**Kekurangan:** Duplikasi component UI sementara.

### Opsi B — Monorepo dalam Repo yang Sama

```
v0-field-task-app/
├── apps/
│   ├── v1/                     ← app sekarang (freeze)
│   └── v2/                     ← app baru
├── packages/
│   ├── database/
│   └── ui/                     ← shared shadcn components
└── docs/
```

**Kelebihan:** Reuse component shadcn langsung.  
**Kekurangan:** Risky jika ada perubahan accidental di v1.

**Rekomendasi:** Opsi A untuk safety, import component dari v1 via copy seperlunya.

---

## Struktur Detail: `apps/web`

```
apps/web/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    ← Landing (reuse dari v1)
│   │   ├── login/page.tsx
│   │   ├── report/[taskId]/page.tsx    ← Staff report (KRITIS)
│   │   └── checklist/[taskId]/page.tsx ← Staff checklist (KRITIS)
│   ├── (admin)/
│   │   ├── dashboard/page.tsx
│   │   ├── tasks/
│   │   │   ├── new/page.tsx
│   │   │   └── [taskId]/page.tsx
│   │   ├── recurring/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── staff/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── areas/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   └── recurring-tasks/page.tsx
│   │   └── checklist-template/[templateId]/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── tasks/
│   │   │   ├── route.ts                ← GET list, POST create
│   │   │   └── [taskId]/
│   │   │       ├── route.ts            ← GET detail
│   │   │       ├── public/route.ts     ← GET by token
│   │   │       ├── open/route.ts
│   │   │       ├── submit/route.ts
│   │   │       ├── verify/route.ts
│   │   │       ├── revision/route.ts
│   │   │       └── resend-wa/route.ts
│   │   ├── checklist-reports/...
│   │   ├── checklist-templates/...
│   │   ├── recurring-templates/...
│   │   ├── staff/...
│   │   ├── areas/...
│   │   ├── categories/...
│   │   ├── users/...
│   │   ├── dashboard/summary/route.ts
│   │   ├── uploads/photo/route.ts
│   │   ├── health/route.ts
│   │   └── internal/
│   │       ├── sync/route.ts
│   │       └── sync-logs/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/                         ← Copy & refactor dari v1
│   ├── ui/                             ← shadcn (copy langsung)
│   ├── task-card.tsx
│   ├── photo-uploader.tsx            ← Update: upload ke storage
│   ├── dashboard-summary.tsx
│   └── ...
├── lib/
│   ├── api/                            ← Pecah dari api.ts v1
│   │   ├── tasks.ts
│   │   ├── checklists.ts
│   │   ├── staff.ts
│   │   ├── recurring.ts
│   │   └── uploads.ts
│   ├── services/
│   │   ├── task.service.ts             ← Business logic
│   │   ├── checklist.service.ts
│   │   ├── whatsapp.service.ts
│   │   ├── storage.service.ts
│   │   └── gas-adapter.service.ts      ← Fallback ke v1
│   ├── db.ts                           ← Prisma client
│   ├── auth.ts
│   └── image-utils.ts                  ← Reuse dari v1
├── middleware.ts
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

## Struktur Detail: `packages/database`

```
packages/database/
├── prisma/
│   ├── schema.prisma           ← Lihat V2_DATABASE_SCHEMA.md
│   └── migrations/
│       ├── 20260101000000_init/
│       └── ...
├── src/
│   ├── client.ts               ← Export PrismaClient singleton
│   └── seed.ts                 ← Seed outlets, areas, categories
├── package.json
└── tsconfig.json
```

**`schema.prisma` (ringkasan):**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Task {
  id           String   @id @default(uuid())
  taskId       String   @unique @map("task_id")
  token        String
  status       TaskStatus @default(CREATED)
  // ... lihat V2_DATABASE_SCHEMA.md
  @@map("tasks")
}
```

---

## Tech Stack v2

| Layer | v1 | v2 | Alasan |
|-------|----|----|--------|
| Framework | Next.js 16 | Next.js 16 | Reuse skill & component |
| UI | shadcn/ui + Tailwind 4 | Sama | Reuse langsung |
| Database | Google Sheets | PostgreSQL (Supabase) | Reliability, query, index |
| ORM | - | Prisma | Type-safe, migrations |
| Auth | JWT manual | Supabase Auth atau JWT + bcrypt | Multi-user proper |
| File storage | Base64 → GAS → Drive | Supabase Storage / Cloudinary | No size limit |
| WhatsApp | GAS | GAS (fase 2-3) → Fonnte/WABA (fase 4+) | Migrasi bertahap |
| API | GAS action string | REST JSON | Predictable contract |
| Deploy | Vercel | Vercel (web) + Supabase (DB) | Same deploy flow |
| Monorepo | - | Turborepo | Shared packages |
| Monitoring | - | Sentry + Vercel Analytics | Error tracking |

---

## Environment Variables

### `apps/web/.env.local` (Development)

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/nusafood_v2"

# Auth
SESSION_SECRET="generate-random-64-char-string"
JWT_EXPIRES_IN="7d"

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
STORAGE_BUCKET="nusafood-photos"

# WhatsApp (fase awal: tetap GAS)
GAS_WEB_APP_URL="https://script.google.com/macros/s/.../exec"
ADMIN_API_KEY="your-gas-admin-key"

# WhatsApp (fase 4+: ganti ke provider baru)
# FONNTE_API_KEY="..."
# WA_SENDER_NUMBER="628..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_VERSION="2.0.0"

# GAS Fallback (fase 1-3)
GAS_FALLBACK_ENABLED="true"

# Dual-write (fase 2-4)
DUAL_WRITE_ENABLED="true"
DUAL_WRITE_PRIMARY="gas"   # 'gas' atau 'db' — mana yang jadi source of truth

# Monitoring
SENTRY_DSN="https://..."
```

### `apps/web/.env.production` (Staging)

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://v2.nusafood.app"
GAS_FALLBACK_ENABLED="true"
DUAL_WRITE_ENABLED="true"
DUAL_WRITE_PRIMARY="gas"
```

### `apps/web/.env.production` (Produksi — fase 4+)

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://[domain-produksi]"
GAS_FALLBACK_ENABLED="true"    # tetap true sampai fase 5
DUAL_WRITE_ENABLED="false"     # matikan setelah yakin
DUAL_WRITE_PRIMARY="db"
```

---

## Scripts Penting

### `package.json` (root)

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "db:migrate": "pnpm --filter database prisma migrate dev",
    "db:seed": "pnpm --filter database prisma db seed",
    "db:studio": "pnpm --filter database prisma studio",
    "sync:from-gas": "tsx scripts/sync-from-gas.ts",
    "migrate:from-sheets": "tsx scripts/migrate-from-sheets.ts",
    "test:api": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

---

## File yang Bisa Di-Reuse dari v1

| File v1 | Reuse | Modifikasi |
|---------|-------|------------|
| `components/ui/*` | ✅ Copy langsung | Tidak |
| `components/task-card.tsx` | ✅ | Minimal |
| `components/status-badge.tsx` | ✅ | Tidak |
| `components/dashboard-summary.tsx` | ✅ | Tidak |
| `components/photo-uploader.tsx` | ⚠️ | Upload ke storage, bukan base64 |
| `components/mobile-header.tsx` | ✅ | Tidak |
| `lib/types.ts` | ⚠️ | Pindah ke `packages/types`, bersihkan |
| `lib/image-utils.ts` | ✅ | Tidak |
| `lib/utils.ts` | ✅ | Tidak |
| `lib/mock-data.ts` | ❌ | Hapus — tidak ada mock di v2 |
| `lib/api.ts` | ❌ | Pecah ke `lib/api/*.ts` + services |
| `app/api/gas/route.ts` | ⚠️ | Hanya untuk `gas-adapter.service.ts` |
| `middleware.ts` | ✅ | Tambah route v2 |
| `app/globals.css` | ✅ | Tidak |

---

## Deploy Strategy

### Staging (`v2.nusafood.app`)

```
Branch: main (repo nusafood-v2)
Vercel Project: nusafood-v2-staging
Auto-deploy: setiap push ke main
Database: Supabase staging project
```

### Produksi (fase 4+)

```
Branch: release
Vercel Project: nusafood-v2-production
Deploy: manual approval
Database: Supabase production project
```

### v1 (tetap jalan)

```
Branch: main (repo v0-field-task-app)
Vercel Project: existing v0 project
Deploy: hanya bugfix, freeze fitur
```

---

## Urutan Implementasi (Sprint Plan)

### Sprint 1 — Fondasi
- [ ] Setup monorepo + Turborepo
- [ ] Prisma schema + migrate + seed
- [ ] Copy UI components dari v1
- [ ] `GET /api/health`
- [ ] Deploy staging

### Sprint 2 — Read API
- [ ] `GET /api/tasks` + dashboard
- [ ] `GET /api/staff`, `/api/areas`, `/api/categories`
- [ ] Sync script dari Google Sheets
- [ ] Dashboard v2 staging dengan data nyata

### Sprint 3 — Write API + Dual-Write
- [ ] `POST /api/tasks` (dual-write)
- [ ] `gas-adapter.service.ts`
- [ ] `sync_logs` monitoring
- [ ] Halaman buat tugas v2

### Sprint 4 — Staff Pages
- [ ] `POST /api/uploads/photo`
- [ ] `/report/[taskId]` dengan adapter
- [ ] `POST /api/tasks/:id/submit` (dual-write)
- [ ] Uji di HP staff nyata

### Sprint 5 — Checklist + Recurring
- [ ] Checklist templates + reports API
- [ ] `/checklist/[taskId]` dengan adapter
- [ ] Recurring templates API
- [ ] Settings pages

### Sprint 6 — Auth + Users
- [x] Login multi-user proper
- [x] User management
- [x] Role-based access

### Sprint 7 — Cutover Prep
- [x] Load testing (`pnpm load:test`)
- [x] Rollback drill (`pnpm rollback:drill` + emergency fallback env)
- [x] Training leader (catatan di `SPRINT7_CUTOVER.md`)
- [x] Go/no-go decision (checklist di `SPRINT7_CUTOVER.md`)

---

## Testing Strategy

| Level | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | Services, utils, normalizers |
| API | Vitest + supertest | Semua REST endpoints |
| E2E | Playwright | Flow buat tugas → submit → verify |
| Manual | Checklist | HP staff nyata, WA link lama |

**Test kritis yang wajib ada sebelum cutover:**

```typescript
// tests/e2e/staff-report.spec.ts
test('link WA lama (v1 task) tetap bisa dibuka di v2', async () => {
  // task yang hanya ada di GAS, belum di DB v2
});

test('tugas baru dual-write bisa disubmit dari v2', async () => {
  // task yang ada di GAS dan DB v2
});

test('foto upload ke storage dan muncul di dashboard', async () => {
  // end-to-end photo flow
});
```

---

## Keputusan Arsitektur

| Keputusan | Pilihan | Status |
|-----------|---------|--------|
| Repo terpisah vs monorepo | Repo terpisah | ✅ Disarankan |
| Database provider | Supabase | ⬜ TBD |
| Photo storage | Supabase Storage | ⬜ TBD |
| WA provider fase awal | Tetap GAS | ✅ |
| WA provider fase akhir | Fonnte / WABA | ⬜ TBD |
| Auth | JWT + bcrypt (migrate dari v1) | ✅ Sprint 6 |

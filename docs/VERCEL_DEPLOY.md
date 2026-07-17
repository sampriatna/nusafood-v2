# Deploy Vercel — panduan singkat

## 1. Git di Vercel

- Repo: `sampriatna/nusafood-v2`
- Branch deploy: **`cursor/v2-scaffold-awal-2250`** (bukan `main` dulu)
- Root Directory: **`apps/web`**
- Include files outside root: **ON**

File `apps/web/vercel.json` sudah mengatur install + build monorepo.

## 2. Environment Variables (Preview + Production)

Ganti `PASSWORD_SUPABASE` dengan password database Supabase.

| Key | Value |
|-----|--------|
| `DATABASE_URL` | `postgresql://postgres.atbqkcunviocghfwseag:PASSWORD_SUPABASE@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | `postgresql://postgres.atbqkcunviocghfwseag:PASSWORD_SUPABASE@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` |
| `SESSION_SECRET` | string acak panjang (40+ karakter) |
| `AUTH_REQUIRED` | `true` |
| `NEXT_PUBLIC_APP_URL` | URL deployment **Ready** (contoh `https://nusafood-v2-xxx.vercel.app`) |
| `NEXT_PUBLIC_APP_VERSION` | `2.0.0` |
| `DUAL_WRITE_ENABLED` | `false` |
| `GAS_FALLBACK_ENABLED` | `false` |
| `EMERGENCY_FALLBACK_V1` | `false` |
| `V1_APP_URL` | sama dengan `NEXT_PUBLIC_APP_URL` dulu |

Opsional foto: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`.

## 3. Deploy

1. Save env → **Redeploy** deployment **Ready** (hijau)
2. Jangan buka URL deployment **Error** (merah) — itu halaman "Deployment has failed"

## 4. Cek sukses

Buka: `https://<url-ready>/api/health`

Harus JSON:
```json
{"success":true,"data":{"version":"2.0.0","database":"ok",...}}
```

## 5. Migrate database (sekali)

Setelah health OK, jalankan dari lokal/cloud dengan `.env` yang sama:

```bash
pnpm db:migrate:deploy
pnpm db:seed
```

Login demo: `leader.kbu` / `leader123`

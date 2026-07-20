# LAPORAN RBAC / HAK AKSES — Task V2 / Nusafood V2

## 1. Ringkasan

Role DB tetap: `STAFF` | `LEADER` | `ADMIN` (enum Prisma, **tidak diubah**).

Kolom tambahan `user_accounts`:
- `is_owner` — Owner app-level
- `can_approve_sp` — permission eksplisit Admin/HR untuk approve SP

Role efektif aplikasi (session):

| App role | Cara ditentukan | Bedanya |
|----------|-----------------|---------|
| **OWNER** | `env-admin`, `UserAccount.is_owner`, atau `OWNER_USER_IDS` / `OWNER_USERNAMES` | Full akses semua outlet + approve SP + user management + settings sensitif |
| **ADMIN** | `UserAccount.role = ADMIN` tanpa `is_owner` | Operasional global; approve SP hanya jika `can_approve_sp=true` (atau env fallback) |
| **LEADER** | `UserAccount.role = LEADER` + staff.outlet | Hanya outlet sendiri; draft ST/SP; **tidak** approve/generate PDF SP / cancel / user mgmt |
| **STAFF** | Role STAFF (jika login nanti) | Tidak masuk dashboard admin |
| **PUBLIC** | Token `/report`, `/checklist`, `/r` | Submit saja, token wajib valid |

OWNER **tidak** disamakan mentah dengan semua ADMIN: Owner punya `session.isOwner = true`.

**Default approve SP:** Owner-only (Admin butuh `can_approve_sp` di DB, atau `ADMIN_CAN_APPROVE_SP=true`).

## 2. File yang Diubah

| File | Perubahan | Risiko |
|------|-----------|--------|
| `apps/web/lib/owner.ts` | Deteksi owner tanpa enum | Rendah |
| `apps/web/lib/permissions.ts` | Helper RBAC terpusat | Rendah |
| `apps/web/lib/auth.ts` | Claim `isOwner` di JWT | Sedang (session lama tanpa claim di-resolve ulang) |
| `apps/web/lib/require-auth.ts` | `requireOwner`, `requireAdminOrOwner`, `requireUserManagement` | Rendah |
| `apps/web/lib/outlet-scope.ts` | Owner = global; pesan 403 manusiawi | Rendah |
| `apps/web/lib/rbac-audit.ts` | Audit log aksi sensitif | Rendah |
| `apps/web/middleware.ts` | Blok STAFF dari UI admin; blok `/settings/users` untuk leader | Sedang |
| `apps/web/app/(admin)/layout.tsx` | Server guard dashboard role | Rendah |
| `apps/web/app/api/auth/login\|me` | `is_owner`, `capabilities` | Rendah |
| `apps/web/app/api/disciplinary/*` | Outlet scope + action RBAC | Sedang |
| `apps/web/app/api/users/*` | Owner/Admin only (+ audit) | Sedang (leader tidak lagi list users) |
| `apps/web/app/api/staff-reports/dashboard` | Force outlet leader | Sedang |
| `apps/web/app/api/leader-monitoring/*` | Force outlet leader | Sedang |
| `apps/web/app/(admin)/settings/*` | Menu per role | Rendah |
| `apps/web/app/(admin)/teguran/[id]` | Sembunyikan approve/PDF/cancel SP untuk leader | Rendah |
| `.env.example` | Env OWNER_* / ADMIN_CAN_* | Rendah |

## 3. Matrix Hak Akses Final

| Modul / Fitur | OWNER | ADMIN/HR | LEADER | STAFF LOGIN | PUBLIC TOKEN |
|---------------|-------|----------|--------|-------------|--------------|
| Dashboard utama | Full | Full | Outlet sendiri | Tidak | Tidak |
| Daily Reports | Full | Full | Outlet sendiri | — | Submit via token |
| Leader Monitoring | Full | Full | Outlet sendiri | Tidak | Tidak |
| Tugas Berulang | Full | Full | Outlet sendiri | Tidak | Tidak |
| Daily Activity | Full | Kelola | Hasil outlet | — | Isi via `/r` |
| Teguran Center | Full | Full* | Draft ST/SP outlet | Tidak | Tidak |
| Approve SP | Ya | Jika diizinkan | **Tidak** | Tidak | Tidak |
| Generate PDF SP | Ya | Jika diizinkan + approved | **Tidak** | Tidak | Tidak |
| Tugas Baru / Approve task | Full | Ya | Outlet sendiri | Tidak | Tidak |
| Checklist | Full | Ya | Outlet sendiri | — | Submit via token |
| Staff Master | Full | Ya | Lihat outlet sendiri | Tidak | Tidak |
| User Management | Full | Ya | **Tidak** | Tidak | Tidak |
| Settings sistem | Full | Ya | Terbatas | Tidak | Tidak |
| Audit log (aksi) | Dicatat | Dicatat | Dicatat outlet | — | — |
| Export global | Full | Ya | Tidak (belum ada API export khusus) | Tidak | Tidak |

\*Admin approve SP: flag DB `can_approve_sp`, atau env `ADMIN_CAN_APPROVE_SP=true` (default OFF).

## 4. Route yang Dilindungi

| Route | Role yang Boleh | Catatan |
|-------|-----------------|---------|
| `/dashboard/*` | OWNER, ADMIN, LEADER | Middleware + `(admin)/layout` |
| `/tasks/*` | OWNER, ADMIN, LEADER | Outlet scope di API |
| `/teguran/*` | OWNER, ADMIN, LEADER | Action SP dibatasi backend |
| `/settings` | OWNER, ADMIN, LEADER | Menu disaring |
| `/settings/users` | OWNER, ADMIN | Middleware redirect leader |
| `/recurring`, `/checklist-template/*` | OWNER, ADMIN, LEADER | |

## 5. API yang Dilindungi

| API | Role | Outlet Scope? |
|-----|------|---------------|
| `/api/tasks*` | ADMIN, LEADER (+ owner) | Ya |
| `/api/checklist-*` | ADMIN, LEADER | Ya |
| `/api/staff` | ADMIN, LEADER | Ya (list) |
| `/api/users*` | OWNER/ADMIN only | N/A |
| `/api/disciplinary*` | ADMIN, LEADER | **Ya (baru)** |
| `/api/disciplinary/:id/actions` approve/generate_pdf/cancel | Permission matrix | Ya |
| `/api/staff-reports/dashboard` | ADMIN, LEADER | **Ya (baru)** |
| `/api/leader-monitoring/*` | ADMIN, LEADER | **Ya (baru)** |
| Settings/master write | ADMIN (+ owner) | — |

## 6. Public Route yang Tetap Terbuka

| Route | Validasi |
|-------|----------|
| `/report/[taskId]?token=...` | Token task di API public/submit |
| `/checklist/[taskId]?token=...` | Token checklist report |
| `/r/[token]` / short code | `StaffReportLink` aktif |
| `/login` | — |
| `/api/tasks/:id/public\|open\|submit` | Token |
| `/api/checklist-reports/:id/public\|submit` | Token |
| `/api/staff-reports/by-token/*`, `/submit` | Token |

## 7. Hasil Testing

| Tes | Hasil |
|-----|-------|
| Unit `permissions.test.ts` | Dijalankan di CI lokal agent |
| Unit `outlet-scope.test.ts` | Owner global + pesan outlet |
| Manual OWNER login UI | Bergantung env `ADMIN_PASSWORD` di environment |
| Manual LEADER outlet A vs B via API | Dilindungi `resolveListOutletFilter` + `assert*OutletAccess` |
| Public path tidak diubah matcher | Middleware `PUBLIC_PATHS` tetap |

## 8. Risiko yang Masih Ada

1. **Session JWT lama** tanpa `canApproveSp`: login ulang agar claim DB terbaru masuk cookie.
2. **Migrasi wajib:** `pnpm db:migrate:deploy` untuk kolom `is_owner` / `can_approve_sp`.
3. Admin lama tanpa flag = **tidak** bisa approve SP sampai Owner menandai `can_approve_sp` (breaking sengaja / lebih aman).
4. **Upload `/api/uploads/photo`** masih public (pre-existing).
5. **`AUTH_REQUIRED=false`** tetap bypass semua gate — jangan dipakai production.
6. Leader-monitoring still in-memory store — outlet assert sudah ada di API.

## 9. Next Step

| Prioritas | Item |
|-----------|------|
| **P0** | Deploy migrasi `is_owner` / `can_approve_sp` + tandai Owner di Settings Users |
| **P0** | Verifikasi manual login Owner + Leader multi-outlet di staging |
| **P1** ~~Kolom DB isOwner/canApproveSp~~ **DONE** |
| **P1** ~~Filter staff report links leader~~ **DONE** (API layer) |
| **P2** | Enum `OWNER` di Prisma jika product butuh role selectable |
| **P2** | Portal STAFF login + acknowledge surat sendiri |
| **P2** | UI audit log viewer untuk Owner |
| **P2** | Persist leader-monitoring ke DB (bukan in-memory) |

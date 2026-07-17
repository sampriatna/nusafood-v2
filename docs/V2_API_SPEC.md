# API Specification v2

Spesifikasi REST API untuk Nusa Food Task System v2. Dirancang **kompatibel dengan frontend v1** agar migrasi UI minimal.

**Base URL staging:** `https://v2.nusafood.app/api`  
**Base URL produksi:** `https://[domain-produksi]/api`

**Format response standar:**

```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 120
  }
}
```

```json
{
  "success": false,
  "data": null,
  "error": "Pesan error dalam Bahasa Indonesia",
  "code": "TASK_NOT_FOUND"
}
```

---

## Autentikasi

### Leader/Admin Routes

```
Authorization: Bearer <jwt_token>
```

atau session cookie `nusa_session` (kompatibilitas v1).

### Staff Routes (Publik)

Tidak perlu login. Akses via `token` di query string atau body.

```
GET /api/tasks/:taskId?token=xxxxxxxx
```

---

## 1. Auth

### `POST /api/auth/login`

Login leader/admin.

**Request:**
```json
{
  "username": "leader.kbu",
  "password": "********"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "USR-20260101-001",
    "staff_id": "STF-20260101-001",
    "name": "Budi Leader",
    "role": "LEADER",
    "outlet": "KBU"
  }
}
```

**Kompatibilitas v1:** Menggantikan GAS action `loginUser`.

---

### `POST /api/auth/logout`

Hapus session.

---

### `GET /api/auth/me`

Cek session aktif.

---

## 2. Tasks (Manual)

### `GET /api/tasks`

List tugas dengan filter. Menggantikan GAS `getTasks`.

**Query params:**
| Param | Type | Contoh |
|-------|------|--------|
| `outlet` | string | `KBU` |
| `status` | string | `OPEN`, `SUBMITTED`, `DONE`, `LATE`, `REVISI` |
| `pic` | string | nomor WA |
| `date_from` | date | `2026-06-01` |
| `date_to` | date | `2026-06-30` |
| `checklist_mode` | boolean | `false` untuk tugas manual saja |
| `page` | number | default 1 |
| `limit` | number | default 50, max 200 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "task_id": "TASK-20260616-0003",
      "token": "abc123...",
      "outlet": "KBU",
      "area": "Bar",
      "category": "Cleaning",
      "task_title": "DAILY CLOSING BAR",
      "task_description": "• buang sampah\n• clear area bar",
      "priority": "Medium",
      "pic_name": "Andi",
      "pic_wa": "628123456789",
      "deadline": "2026-06-16T23:00:00+07:00",
      "status": "OPEN",
      "is_late": false,
      "checklist_mode": false,
      "before_photo_url": "https://...",
      "after_photo_url": null,
      "created_at": "2026-06-16T12:40:00+07:00",
      "updated_at": "2026-06-16T12:40:00+07:00"
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 23 }
}
```

---

### `GET /api/tasks/:taskId`

Detail tugas (admin). Menggantikan GAS `getTaskDetail`.

**Auth:** Required (admin)

---

### `GET /api/tasks/:taskId/public`

Detail tugas untuk halaman staff. Menggantikan GAS `getTaskByToken`.

**Query:** `?token=xxxxxxxx`

**Auth:** Tidak (token di URL)

**Adapter behavior (fase 3):**
1. Cari di PostgreSQL v2
2. Jika tidak ada → fallback ke GAS v1
3. Jika tidak ada di keduanya → 404

---

### `POST /api/tasks`

Buat tugas baru. Menggantikan GAS `createTask`.

**Auth:** Required (admin)

**Request:**
```json
{
  "outlet": "KBU",
  "area": "Bar",
  "category": "Cleaning",
  "task_title": "DAILY CLOSING BAR",
  "task_description": "• buang sampah\n• clear area bar",
  "priority": "Medium",
  "pic_name": "Andi",
  "pic_wa": "628123456789",
  "deadline": "2026-06-16T23:00:00+07:00",
  "before_photo_url": "https://storage.../before.jpg"
}
```

**Fase 2 (dual-write):** API menulis ke GAS + PostgreSQL paralel.

**Side effects:**
- Generate `task_id` dan `token`
- Kirim WhatsApp ke `pic_wa`
- Buat entry di `audit_logs`

---

### `POST /api/tasks/:taskId/open`

Tandai tugas sudah dibuka staff. Menggantikan GAS `markOpened`.

**Auth:** Token di body (publik)

**Request:**
```json
{
  "token": "abc123..."
}
```

---

### `POST /api/tasks/:taskId/submit`

Staff submit laporan. Menggantikan GAS `submitTaskReport`.

**Auth:** Token di body (publik)

**Request:**
```json
{
  "token": "abc123...",
  "after_photo_url": "https://storage.../after.jpg",
  "staff_note": "Sudah selesai, lantai sudah dipel"
}
```

**Catatan v2:** Foto di-upload terpisah ke `POST /api/uploads/photo` dulu, lalu URL dikirim di sini (bukan base64).

**Fase 3 (dual-write):** Tulis ke GAS + PostgreSQL.

---

### `POST /api/tasks/:taskId/verify`

Leader setujui tugas. Menggantikan GAS `verifyTask`.

**Auth:** Required (admin)

**Request:**
```json
{
  "note": "Bagus, sudah bersih"
}
```

**Side effects:** Status → `DONE`, notifikasi WA ke staff.

---

### `POST /api/tasks/:taskId/revision`

Leader minta revisi. Menggantikan GAS `requestRevision`.

**Auth:** Required (admin)

**Request:**
```json
{
  "revision_note": "Area belakang bar belum disapu"
}
```

---

### `POST /api/tasks/:taskId/resend-wa`

Kirim ulang notifikasi WhatsApp. Menggantikan GAS `resendWhatsApp`.

**Auth:** Required (admin)

---

### `DELETE /api/tasks/:taskId`

Hapus tugas (soft delete). Menggantikan GAS `deleteTask`.

**Auth:** Required (admin, role ADMIN only)

---

## 3. Dashboard

### `GET /api/dashboard/summary`

Ringkasan statistik. Menggantikan GAS `getDashboardSummary`.

**Query:** `?outlet=KBU&date_from=...&date_to=...`

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": {
      "total": 45,
      "open": 12,
      "submitted": 8,
      "done": 20,
      "late": 3,
      "revisi": 2
    },
    "checklists": {
      "total": 10,
      "open": 3,
      "submitted": 2,
      "done": 4,
      "late": 1,
      "revisi": 0
    }
  }
}
```

---

## 4. Checklist

### `GET /api/checklist-templates`

List template checklist.

### `GET /api/checklist-templates/:templateId`

Detail template + items.

### `POST /api/checklist-templates`

Buat template baru.

### `PUT /api/checklist-templates/:templateId`

Update template.

### `PUT /api/checklist-templates/:templateId/items`

Simpan items checklist. Menggantikan GAS `saveChecklistItems`.

---

### `GET /api/checklist-reports`

List laporan checklist. Menggantikan GAS `getChecklistReports`.

### `GET /api/checklist-reports/:taskId`

Detail laporan. Menggantikan GAS `getChecklistDetail`.

### `GET /api/checklist-reports/:taskId/public`

Halaman staff. Menggantikan GAS `getChecklistByToken`.

**Query:** `?token=xxxxxxxx`

### `POST /api/checklist-reports/:taskId/submit`

Staff submit checklist. Menggantikan GAS `submitChecklistReport`.

**Request:**
```json
{
  "token": "abc123...",
  "checked_items": [
    { "checklist_item_id": "CHKI-001", "is_checked": true, "photo_url": null },
    { "checklist_item_id": "CHKI-002", "is_checked": true, "photo_url": "https://..." }
  ],
  "staff_note": "Semua sudah dicek"
}
```

### `POST /api/checklist-reports/:taskId/verify`

Leader approve. Menggantikan GAS `approveChecklist`.

### `POST /api/checklist-reports/:taskId/revision`

Leader minta revisi. Menggantikan GAS `requestChecklistRevision`.

### `POST /api/checklist-reports/generate`

Generate laporan checklist dari template. Menggantikan GAS `generateChecklistReport`.

---

## 5. Recurring Tasks

### `GET /api/recurring-templates`

List template berulang. Menggantikan GAS `getRecurringTemplates`.

### `GET /api/recurring-templates/:templateId`

Detail template.

### `POST /api/recurring-templates`

Buat template.

### `PUT /api/recurring-templates/:templateId`

Update template.

### `PATCH /api/recurring-templates/:templateId/toggle`

Aktifkan/nonaktifkan. Menggantikan GAS `toggleRecurringTemplateStatus`.

### `POST /api/recurring-templates/generate`

Trigger generate tugas dari template. Menggantikan GAS `generateRecurringTasks`.

---

## 6. Master Data

### Staff

| Method | Endpoint | GAS Action |
|--------|----------|------------|
| GET | `/api/staff` | `getStaff` |
| POST | `/api/staff` | `createStaff` |
| PUT | `/api/staff/:staffId` | `updateStaff` |
| PATCH | `/api/staff/:staffId/activate` | `activateStaff` |
| PATCH | `/api/staff/:staffId/deactivate` | `deactivateStaff` |

### Areas

| Method | Endpoint | GAS Action |
|--------|----------|------------|
| GET | `/api/areas` | `getAreas` |
| POST | `/api/areas` | `createArea` |
| DELETE | `/api/areas/:name` | `deleteArea` |

### Categories

| Method | Endpoint | GAS Action |
|--------|----------|------------|
| GET | `/api/categories` | `getCategories` |
| POST | `/api/categories` | `createCategory` |
| DELETE | `/api/categories/:name` | `deleteCategory` |

### Users (Login Accounts)

| Method | Endpoint | GAS Action |
|--------|----------|------------|
| GET | `/api/users` | `getUsers` |
| POST | `/api/users` | `createUser` |
| PUT | `/api/users/:userId` | `updateUser` |
| DELETE | `/api/users/:userId` | `deleteUser` |

### Outlets

| Method | Endpoint | GAS Action |
|--------|----------|------------|
| GET | `/api/outlets` | `getOutlets` |
| POST | `/api/outlets` | `createOutlet` |
| PUT | `/api/outlets/:id` | `updateOutlet` |
| DELETE | `/api/outlets/:id` | `deleteOutlet` |

---

## 7. Upload (Baru di v2)

### `POST /api/uploads/photo`

Upload foto ke cloud storage. **Menggantikan** pengiriman base64 di body request.

**Auth:** Token tugas (staff) atau session (admin)

**Request:** `multipart/form-data`
```
file: <binary>
context: "before" | "after" | "checklist_item"
task_id: "TASK-20260616-0003"
token: "abc123..."  (untuk staff)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://storage.nusafood.app/photos/TASK-20260616-0003/after-1234.jpg",
    "size_bytes": 245000,
    "width": 1280,
    "height": 960
  }
}
```

**Validasi:**
- Max input: 10MB
- Format: JPEG, PNG, WebP
- Auto-resize: max 1280px (sama seperti v1 `lib/image-utils.ts`)
- Auto-compress: quality 0.7

---

## 8. Health & Sync (Internal)

### `GET /api/health`

Health check untuk monitoring.

```json
{
  "success": true,
  "data": {
    "version": "2.0.0",
    "database": "ok",
    "storage": "ok",
    "gas_fallback": "ok"
  }
}
```

### `POST /api/internal/sync` (Protected)

Trigger manual sync dari Google Sheets. Hanya untuk admin tech.

### `GET /api/internal/sync-logs` (Protected)

Lihat log dual-write failures.

---

## Mapping Lengkap: GAS Action → REST Endpoint v2

| # | GAS Action (v1) | REST v2 | Auth |
|---|-----------------|---------|------|
| 1 | `createTask` | `POST /api/tasks` | Admin |
| 2 | `getTasks` | `GET /api/tasks` | Admin |
| 3 | `getTaskDetail` | `GET /api/tasks/:id` | Admin |
| 4 | `getTaskByToken` | `GET /api/tasks/:id/public?token=` | Public |
| 5 | `markOpened` | `POST /api/tasks/:id/open` | Token |
| 6 | `submitTaskReport` | `POST /api/tasks/:id/submit` | Token |
| 7 | `verifyTask` | `POST /api/tasks/:id/verify` | Admin |
| 8 | `requestRevision` | `POST /api/tasks/:id/revision` | Admin |
| 9 | `resendWhatsApp` | `POST /api/tasks/:id/resend-wa` | Admin |
| 10 | `deleteTask` | `DELETE /api/tasks/:id` | Admin |
| 11 | `getDashboardSummary` | `GET /api/dashboard/summary` | Admin |
| 12 | `getRecurringTemplates` | `GET /api/recurring-templates` | Admin |
| 13 | `createRecurringTemplate` | `POST /api/recurring-templates` | Admin |
| 14 | `updateRecurringTemplate` | `PUT /api/recurring-templates/:id` | Admin |
| 15 | `toggleRecurringTemplateStatus` | `PATCH /api/recurring-templates/:id/toggle` | Admin |
| 16 | `generateRecurringTasks` | `POST /api/recurring-templates/generate` | Admin |
| 17 | `getChecklistTemplates` | `GET /api/checklist-templates` | Admin |
| 18 | `saveChecklistItems` | `PUT /api/checklist-templates/:id/items` | Admin |
| 19 | `generateChecklistReport` | `POST /api/checklist-reports/generate` | Admin |
| 20 | `getChecklistReports` | `GET /api/checklist-reports` | Admin |
| 21 | `getChecklistDetail` | `GET /api/checklist-reports/:id` | Admin |
| 22 | `getChecklistByToken` | `GET /api/checklist-reports/:id/public?token=` | Public |
| 23 | `submitChecklistReport` | `POST /api/checklist-reports/:id/submit` | Token |
| 24 | `approveChecklist` | `POST /api/checklist-reports/:id/verify` | Admin |
| 25 | `requestChecklistRevision` | `POST /api/checklist-reports/:id/revision` | Admin |
| 26 | `resendChecklistWhatsApp` | `POST /api/checklist-reports/:id/resend-wa` | Admin |
| 27 | `getStaff` | `GET /api/staff` | Admin |
| 28 | `createStaff` | `POST /api/staff` | Admin |
| 29 | `updateStaff` | `PUT /api/staff/:id` | Admin |
| 30 | `getAreas` | `GET /api/areas` | Admin |
| 31 | `createArea` | `POST /api/areas` | Admin |
| 32 | `getCategories` | `GET /api/categories` | Admin |
| 33 | `createCategory` | `POST /api/categories` | Admin |
| 34 | `loginUser` | `POST /api/auth/login` | Public |
| 35 | `getUsers` | `GET /api/users` | Admin |
| 36 | `createUser` | `POST /api/users` | Admin |
| 37 | `healthCheck` | `GET /api/health` | Public |

---

## Error Codes

| Code | HTTP | Pesan |
|------|------|-------|
| `UNAUTHORIZED` | 401 | Sesi tidak valid, silakan login ulang |
| `FORBIDDEN` | 403 | Anda tidak memiliki akses |
| `TASK_NOT_FOUND` | 404 | Tugas tidak ditemukan |
| `INVALID_TOKEN` | 403 | Token tidak valid |
| `TASK_EXPIRED` | 410 | Tugas sudah tidak aktif |
| `PHOTO_REQUIRED` | 422 | Foto bukti wajib diupload |
| `PHOTO_TOO_LARGE` | 413 | Ukuran foto melebihi batas |
| `DEADLINE_PASSED` | 422 | Deadline sudah lewat (warning, bukan block) |
| `GAS_FALLBACK_FAILED` | 502 | Gagal mengambil data dari sistem lama |
| `DUAL_WRITE_FAILED` | 500 | Gagal menyimpan ke salah satu sistem |
| `VALIDATION_ERROR` | 422 | Data tidak valid |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/login` | 5 req/menit per IP |
| `POST /api/tasks/:id/submit` | 10 req/menit per token |
| `POST /api/uploads/photo` | 20 req/menit per token |
| Admin endpoints | 100 req/menit per user |
| Public read | 60 req/menit per IP |

---

## Versioning

Header opsional: `X-API-Version: 2`

Saat fase migrasi, API v2 juga expose proxy legacy:

```
POST /api/gas  →  forward ke GAS v1 (deprecated, hapus di fase 5)
```

Frontend v2 tidak boleh memakai `/api/gas` — hanya REST endpoints di atas.

# Migrasi Checklist & Recurring dari v1

Script one-way untuk mengimpor template checklist dan tugas berulang dari Google Apps Script (v1) ke PostgreSQL v2.

**Tidak menulis ke v1.** Repo `v0-field-task-app` hanya dibaca via GAS API atau export JSON.

---

## Prasyarat

- `DATABASE_URL` + `DIRECT_URL` mengarah ke Supabase v2
- Outlet seed sudah ada (`pnpm db:seed`) — script akan auto-create area/kategori jika belum ada
- Untuk sumber GAS: `GAS_WEB_APP_URL` + `ADMIN_API_KEY` (sama dengan v1)

---

## Cara pakai

### 1. Dari GAS v1 (production)

```bash
GAS_WEB_APP_URL="https://script.google.com/macros/s/.../exec" \
ADMIN_API_KEY="..." \
pnpm migrate:checklist-from-v1 -- --gas
```

Script memanggil:

| GAS action | v2 tabel |
|------------|----------|
| `getChecklistTemplates` | `checklist_templates` |
| `getChecklistItems` (per template) | `checklist_items` |
| `getRecurringTemplates` | `recurring_templates` |

### 2. Dari export JSON (manual / dev)

Export sheet `CHECKLIST_TEMPLATE`, `CHECKLIST_ITEM`, `RECURRING_TEMPLATE` ke JSON, atau gunakan fixture contoh:

```bash
pnpm migrate:checklist-from-v1 -- --file scripts/fixtures/sample-checklist-sync.json
```

Format JSON:

```json
{
  "checklist_templates": [ { "template_id": "CHKM-...", ... } ],
  "checklist_items": [ { "checklist_item_id": "CHKI-...", "template_id": "...", ... } ],
  "recurring_templates": [ { "template_id": "REC-...", ... } ]
}
```

Template yang menyertakan `items[]` inline juga didukung (auto-flatten).

### 3. Dry run (hanya hitung baris)

```bash
pnpm migrate:checklist-from-v1 -- --dry-run --file path/to/export.json
```

---

## Verifikasi

Setelah migrasi:

1. Buka `/settings` — daftar **Checklist templates** dan **Recurring templates**
2. Buka `/recurring` — daftar tugas berulang
3. Buka `/checklist-template/[templateId]` — detail item checklist
4. Cek `sync_logs` di `/settings/sync-logs` — operasi `checklist_batch`

---

## Mapping field v1 → v2

| v1 (Sheets/GAS) | v2 (PostgreSQL) |
|-----------------|-----------------|
| `template_id` CHKM-* | `checklist_templates.template_id` |
| `checklist_item_id` CHKI-* | `checklist_items.checklist_item_id` |
| `outlet` (KBU/Kisamen/…) | `outlets.code` via normalizer |
| `area` | `areas.name` (auto upsert per outlet) |
| `requires_photo` TRUE/FALSE | boolean |
| `repeat_type` daily/weekly/… | enum `repeat_type` |
| `repeat_time` HH:mm | `TIME` (UTC epoch date) |

---

## Idempotensi

Upsert by primary key (`template_id`, `checklist_item_id`). Aman dijalankan ulang; baris yang sudah ada akan di-update.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `GAS_WEB_APP_URL belum dikonfigurasi` | Set env atau pakai `--file` |
| Item skipped: template tidak ada | Jalankan template dulu, atau pastikan `template_id` item cocok |
| `/settings` masih kosong | Pastikan migrasi ke DB production yang sama dengan Vercel `DATABASE_URL` |
| `getRecurringTemplates` gagal | Opsional — checklist tetap ter-import |

# Sprint 5 — Checklist + Recurring

## Selesai

### Checklist
- Templates: `GET/POST /api/checklist-templates`, `GET :id`, `PUT :id/items`
- Reports: list, detail, public-by-token, generate, submit, verify, revision
- Staff page `/checklist/[taskId]?token=...` (upload foto per item via storage API)
- Settings menampilkan daftar template + generate button
- Seed helper: `pnpm seed:checklist`

### Recurring
- `GET/POST /api/recurring-templates`
- `GET /api/recurring-templates/:id`
- `PATCH /api/recurring-templates/:id/toggle`
- Halaman `/recurring`

## Uji cepat

```bash
pnpm db:seed
pnpm seed:checklist
# generate
curl -X POST localhost:3000/api/checklist-reports/generate \
  -H 'content-type: application/json' \
  -d '{"template_id":"CHKM-20260717-001","pic_name":"Andi","pic_wa":"6281"}'
# buka report_link /checklist/...?token=...
```

## Catatan
- `v0-field-task-app` tidak diubah
- Generate create Task (`checklist_mode=true`) + ChecklistReport berpasangan

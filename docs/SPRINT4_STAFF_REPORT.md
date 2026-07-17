# Sprint 4 — Staff report + photo upload

## Selesai

- `POST /api/uploads/photo` — multipart upload (Supabase Storage atau `public/uploads` lokal)
- `POST /api/tasks/:taskId/submit` — dual-write / DB-only + audit + sync_logs
- Adapter `getTaskByToken` — DB dulu, fallback GAS jika enabled
- Halaman staff `/report/[taskId]?token=...` (URL kompatibel v1)
- `PhotoUploader` compress → upload URL (bukan base64 di body submit)
- Detail admin menampilkan foto bukti

## Alur staff

1. Buka `/report/TASK-...?...token=...`
2. Load task via `/api/tasks/:id/public`
3. Mark opened
4. Ambil foto → upload ke `/api/uploads/photo`
5. Submit URL via `/api/tasks/:id/submit`

## Uji lokal

```bash
# buat tugas
curl -X POST localhost:3000/api/tasks -H 'content-type: application/json' -d '{...}'
# buka link report_link di browser (HP / desktop)
```

## Catatan

- Tanpa Supabase: foto tersimpan di `apps/web/public/uploads/`
- Checklist staff page → Sprint 5
- `v0-field-task-app` tidak diubah

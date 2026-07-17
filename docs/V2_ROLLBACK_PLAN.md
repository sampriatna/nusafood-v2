# Rollback Plan — Nusa Food v2

Prosedur darurat jika migrasi v2 mengalami masalah. **Target: kembali ke v1 dalam < 15 menit.**

---

## Kapan Rollback Diperlukan

| Situasi | Severity | Aksi |
|---------|----------|------|
| Staff tidak bisa buka link WA | 🔴 Kritis | Rollback segera |
| Staff tidak bisa submit foto | 🔴 Kritis | Rollback segera |
| Leader tidak bisa buat tugas | 🟠 Tinggi | Rollback atau dual-write fallback |
| Dashboard v2 lambat/error | 🟡 Sedang | Monitor, rollback jika > 30 menit |
| Data tidak sinkron v1↔v2 | 🟡 Sedang | Pause dual-write, investigasi |
| Fitur settings error | 🟢 Rendah | Fix forward, tidak perlu rollback |

---

## Level Rollback

### Level 1 — Redirect Traffic (5 menit)

**Situasi:** v2 deployed di domain produksi tapi ada masalah.

**Langkah:**

1. Buka Vercel dashboard → project v2 production
2. Set domain utama kembali ke project v1:
   ```
   Vercel → v1 project → Settings → Domains → set as primary
   ```
3. Atau via DNS (jika pakai CNAME):
   ```
   CNAME [domain] → cname.vercel-dns.com (v1 project)
   TTL: 60 detik (pastikan TTL rendah sebelum cutover)
   ```
4. Verifikasi: buka domain → harus tampil v1
5. Notify leader via WA group: "Sistem kembali ke versi stabil, operasional normal"

**Dampak:** Leader kembali ke v1 UI. Staff dengan link WA ke domain v2 perlu diperhatikan (lihat Level 2).

---

### Level 2 — URL Staff Fallback (10 menit)

**Situasi:** Link WA sudah mengarah ke v2 (`https://v2.domain/report/...`) tapi halaman staff error.

**Opsi A — Proxy di v2 (jika v2 masih up tapi logic error):**

Tambahkan emergency redirect di `middleware.ts` v2:

```typescript
// EMERGENCY: redirect semua /report dan /checklist ke v1
if (process.env.EMERGENCY_FALLBACK_V1 === 'true') {
  if (pathname.startsWith('/report/') || pathname.startsWith('/checklist/')) {
    const v1Url = new URL(pathname + request.nextUrl.search, process.env.V1_APP_URL);
    return NextResponse.redirect(v1Url);
  }
}
```

Set env `EMERGENCY_FALLBACK_V1=true` di Vercel → redeploy (2 menit).

**Opsi B — DNS redirect (jika v2 completely down):**

```
v2.domain → redirect 301 → v1.domain (same path + query)
```

**Verifikasi:**
```bash
# Test link staff
curl -I "https://[domain]/report/TASK-20260616-0003?token=xxxxx"
# Harus return 200, bukan 500/404
```

---

### Level 3 — Matikan Dual-Write (5 menit)

**Situasi:** Data korup karena dual-write gagal sebagian.

**Langkah:**

1. Set environment variable di v2:
   ```bash
   DUAL_WRITE_ENABLED=false
   DUAL_WRITE_PRIMARY=gas
   ```
2. Redeploy v2 (atau cukup restart jika env hot-reload)
3. Semua operasi write hanya ke GAS v1
4. v2 menjadi read-only mirror
5. Investigasi `sync_logs` table:
   ```sql
   SELECT * FROM sync_logs
   WHERE v1_status = 'failed' OR v2_status = 'failed'
   ORDER BY created_at DESC
   LIMIT 50;
   ```

**Dampak:** Tugas baru hanya di GAS. v2 dashboard mungkin stale sampai sync manual.

---

### Level 4 — Restore Database v2 (30 menit)

**Situasi:** Data v2 korup, perlu restore dari backup.

**Langkah:**

1. Stop semua write ke v2:
   ```bash
   DUAL_WRITE_ENABLED=false
   ```
2. Restore Supabase dari snapshot:
   ```
   Supabase Dashboard → Database → Backups → Restore
   Pilih snapshot terakhir sebelum insiden
   ```
3. Re-run sync dari GAS untuk data yang terlewat:
   ```bash
   pnpm sync:from-gas --since="2026-06-16T00:00:00"
   ```
4. Verifikasi count:
   ```sql
   SELECT status, COUNT(*) FROM tasks GROUP BY status;
   -- Bandingkan dengan dashboard v1
   ```

---

## Pre-Cutover Checklist (Wajib Sebelum Fase 4)

Lakukan **rollback drill** minimal 1x sebelum cutover produksi:

- [ ] TTL DNS domain utama sudah diturunkan ke 60 detik (24 jam sebelum cutover)
- [ ] Snapshot Supabase production dibuat
- [ ] Export Google Sheets terbaru disimpan
- [ ] Env `EMERGENCY_FALLBACK_V1` sudah disiapkan di v2 (default: `false`)
- [ ] Env `V1_APP_URL` sudah diset di v2 (URL v1 production)
- [ ] Rollback drill dilakukan di staging:
  - [ ] Redirect domain staging v2 → v1: **berhasil < 5 menit**
  - [ ] Link `/report/` staff tetap jalan setelah redirect
  - [ ] Leader bisa buat tugas di v1 setelah rollback
- [ ] Channel komunikasi darurat disiapkan (WA group tech + leader)
- [ ] On-call person ditentukan untuk 48 jam pertama setelah cutover

---

## Rollback Drill Script

```bash
#!/bin/bash
# scripts/rollback-drill.sh
# Jalankan di staging untuk latihan

echo "=== Rollback Drill ==="
echo "1. Simulating v2 failure..."

# Test v1 health
V1_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$V1_APP_URL/api/health" 2>/dev/null || echo "000")
echo "v1 health: $V1_STATUS"

# Test staff link on v1
REPORT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$V1_APP_URL/report/TEST-TASK?token=test" 2>/dev/null || echo "000")
echo "v1 report page: $REPORT_STATUS"

# Test GAS
GAS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GAS_WEB_APP_URL?action=healthCheck" 2>/dev/null || echo "000")
echo "GAS health: $GAS_STATUS"

if [ "$V1_STATUS" = "200" ] || [ "$REPORT_STATUS" = "200" ]; then
  echo "✅ Rollback target (v1) is healthy"
else
  echo "❌ WARNING: v1 is not healthy — fix before cutover!"
fi
```

---

## Komunikasi Saat Insiden

### Template Pesan ke Leader (WA Group)

```
⚠️ PERHATIAN TIM

Sistem task management sedang dalam perbaikan.
Operasional TETAP JALAN — silakan gunakan link WA seperti biasa.

Jika ada kendala submit laporan, hubungi [nama tech lead].

Estimasi normal: [waktu]
Update berikutnya: [waktu + 30 menit]
```

### Template Pesan Setelah Rollback

```
✅ SISTEM KEMBALI NORMAL

Task management sudah kembali ke versi stabil.
Semua link WA tetap bisa digunakan.

Mohon laporkan jika masih ada kendala.
Terima kasih atas kesabarannya.
```

---

## Data Integrity Setelah Rollback

Jika rollback terjadi setelah dual-write aktif, periksa data yang mungkin hanya ada di satu sistem:

```sql
-- Tugas yang ada di v2 tapi mungkin tidak di GAS
SELECT task_id, created_at, source_version
FROM tasks
WHERE source_version = 'v2'
  AND gas_synced_at IS NULL
ORDER BY created_at DESC;

-- Tugas submit yang mungkin hanya di v2
SELECT task_id, submitted_at
FROM tasks
WHERE submitted_at IS NOT NULL
  AND gas_synced_at < submitted_at
ORDER BY submitted_at DESC;
```

**Reconcile manual:** Export data dari v2 → import ke Google Sheets via script jika diperlukan.

---

## Timeline Rollback Decision

```
Insiden terdeteksi
    │
    ├─ 0-5 menit: Assess severity
    │     ├─ Staff affected? → Level 1 rollback
    │     └─ Leader only? → Level 3 (pause dual-write)
    │
    ├─ 5-15 menit: Execute rollback
    │     └─ Level 1 + Level 2 if needed
    │
    ├─ 15-30 menit: Verify
    │     ├─ Test staff link
    │     ├─ Test leader create task
    │     └─ Notify team
    │
    └─ 30+ menit: Post-mortem
          ├─ Root cause analysis
          ├─ Update sync_logs review
          └─ Plan fix before retry
```

---

## Post-Mortem Template

Setelah setiap insiden yang memicu rollback, dokumentasikan:

```markdown
## Post-Mortem: [Tanggal]

### Apa yang terjadi?
[Deskripsi insiden]

### Timeline
- HH:MM — Insiden terdeteksi
- HH:MM — Rollback dimulai
- HH:MM — Sistem kembali normal

### Root Cause
[Penyebab teknis]

### Dampak
- Jumlah staff terdampak: X
- Jumlah tugas gagal submit: X
- Durasi downtime: X menit

### Yang Sudah Benar
- [Hal yang berjalan sesuai rencana]

### Yang Perlu Diperbaiki
- [ ] Action item 1
- [ ] Action item 2

### Kapan Retry Cutover?
[Keputusan setelah fix]
```

---

## Kontak Darurat

| Role | Tanggung Jawab | Kontak |
|------|----------------|--------|
| Tech Lead | Eksekusi rollback, investigasi | [isi] |
| Ops Lead | Komunikasi ke leader & staff | [isi] |
| Owner | Keputusan go/no-go cutover | [isi] |

> **Isi tabel kontak sebelum cutover fase 4.**

# AUDIT PROGRES TASK V2 / NUSAFOOD V2

> **Jenis audit:** read-only (tidak ada perubahan kode saat audit).  
> **Repo:** monorepo Turborepo `nusafood-v2` — Next.js + Prisma/PostgreSQL.  
> **Acuan sprint:** README Sprint 1–8 + modul Teguran (migration `20260720220000_disciplinary_letters`).  
> **Tanggal audit:** 20 Juli 2026.

Dokumen ini untuk owner non-programmer (bisa dipaste ke ChatGPT) dan tetap memuat route/file/API agar developer bisa lanjut.

---

## 1. Ringkasan Kondisi Saat Ini

### Sudah siap dipakai untuk

- Buat tugas → kirim WA (via GAS) → staff lapor foto → leader setujui/revisi
- Checklist operasional + recurring (dengan cron)
- Daily Activity SOP (link statis `/r/...`) + dashboard audit
- Leader Monitoring (UI ada; sebagian data masih in-memory)
- Login multi-user + RBAC dasar Admin/Leader + filter outlet di modul task

### Belum siap untuk

- Teguran/SP produksi (arsip HR, PDF stabil, kirim formal, acknowledgement staff)
- Absensi / attendance (hanya opsi sumber kasus di form, bukan modul)
- Cutover penuh mengganti v1 (pilot KBU masih open di docs)
- Role “Owner” terpisah (owner = login env `ADMIN_PASSWORD` / role ADMIN)

### Masalah terbesar sekarang

1. **Alur “teguran dari task terlambat” rawan gagal / data karyawan salah** — task baru **tidak menyimpan `staff_id`**, prefill memakai nomor WA sebagai ID karyawan.
2. **Tombol “kirim” teguran ambigu** — UI bisa terasa seperti kirim langsung, padahal sering hanya draft / gagal karena bukti kosong.
3. **PDF “Generate PDF” = file HTML lokal**, di Vercel serverless **tidak andal** sebagai arsip permanen.

### Prioritas perbaikan paling dekat

1. Pastikan migration Teguran sudah jalan di DB staging/prod.
2. Perbaiki relasi task ↔ karyawan (`staff_id`) + prefill dari task.
3. Ubah UX jadi **“Buat Teguran Draft”** dulu, bukan kirim langsung.
4. Baru lanjut approval SP + PDF storage yang benar.

---

## 2. Peta Halaman / UI

Status: `DONE` | `PARTIAL` | `ERROR` | `NOT FOUND` | `UNKNOWN`

| Halaman/Menu | Route | Status | Fungsi Utama | Tombol yang Ada | Tombol Bermasalah | Catatan |
|---|---|---|---|---|---|---|
| Login | `/login` | DONE | Auth JWT cookie | Login | — | Owner via username kosong + `ADMIN_PASSWORD` |
| Home | `/` | DONE | Landing / redirect | — | — | Public |
| Dashboard task | `/dashboard` | DONE | List task + checklist + filter | Refresh, filter status/outlet, buat tugas, link modul | Export: **NOT FOUND** | Filter terlambat ada |
| Daily reports | `/dashboard/daily-reports` | DONE | Audit Daily Activity | Filter, refresh | — | Lapisan terpisah dari task |
| Leader monitoring | `/dashboard/leader-monitoring` | PARTIAL | Cek fisik + validasi staff | Kirim checklist leader, validasi | Data template/submission **in-memory** | Schema Prisma sudah ada, store runtime belum DB penuh |
| Buat task | `/tasks/new` | DONE | Buat tugas + WA | Buat Tugas & Kirim WA, upload before | `staff_id` **tidak dikirim** ke API | RISK untuk teguran |
| Detail task | `/tasks/[taskId]` | DONE | Detail + aksi leader | Setujui, Minta Revisi, Kirim Ulang WA, **Buat Teguran** | Prefill teguran rawan error/data salah | Label tombol = **Buat Teguran** (bukan “Kirim Teguran”) |
| Report staff | `/report/[taskId]?token=` | DONE | Laporan foto after | Upload foto, Submit | — | Public, tanpa login |
| Checklist staff | `/checklist/[taskId]?token=` | DONE | Checklist + foto item | Submit checklist | — | Public |
| Daily Activity staff | `/r/[token]` atau `/r/nama` | DONE | SOP harian link pribadi | Kirim Kegiatan | — | Bukan pengganti task |
| Recurring list | `/recurring` | DONE | Lihat template berulang | — | — | Settings lebih lengkap di `/settings/recurring-tasks` |
| Checklist template editor | `/checklist-template/[templateId]` | DONE | Edit item + generate | Kirim Checklist | — | |
| Settings hub | `/settings` | DONE | Master + link modul | Sync v1, logout, link Teguran | Sync butuh GAS/env | |
| Staff | `/settings/staff` | DONE | Master karyawan | Aktif/nonaktif, edit | — | |
| Users | `/settings/users` | DONE | Akun login | CRUD user | Role hanya ADMIN/LEADER/STAFF | Owner ≠ role DB |
| Areas / Categories | `/settings/areas`, `/settings/categories` | DONE | Master data | CRUD | — | |
| Report links | `/settings/report-links` | DONE | Link statis `/r/` | Generate, copy, revoke | QR generator native: **UNKNOWN/NOT FOUND** di UI | Copy link ada |
| Report templates | `/settings/report-templates` | DONE | Template SOP | CRUD | — | |
| Daily activity settings | `/settings/daily-activity` | DONE | Hub SOP | Link ke templates/links | — | |
| Sync logs | `/settings/sync-logs` | DONE | Monitoring sync | Refresh | — | Bukan audit teguran |
| **Teguran Center** | `/teguran` | PARTIAL | List ST/SP + summary | Buat, filter, refresh, detail, edit draft | Filter outlet manual text (bukan dropdown) | Outlet scope leader **belum** di API |
| Buat Teguran/SP | `/teguran/new` | PARTIAL | Form draft | Simpan Draft, Simpan & Siap Kirim / Ajukan Approval, Tambah bukti | Prefill `?task_id=` rawan gagal; “Siap Kirim” **tidak benar-benar kirim** untuk ST | |
| Detail Teguran | `/teguran/[id]` | PARTIAL | Detail + workflow | Edit, Ajukan Approval, Approve, Generate PDF, **Kirim Surat**, Tandai Dibaca, Selesaikan, Batalkan | Kirim butuh bukti; PDF lokal; kirim ≠ WA | |
| Attendance | — | NOT FOUND | Absensi | — | — | Hanya enum source `ATTENDANCE` |
| Audit log UI global | — | NOT FOUND | Lihat `audit_logs` | — | — | Model DB ada; UI Teguran pakai `DisciplinaryEvent` |
| Halaman staff lihat surat sendiri | — | NOT FOUND | Acknowledgement staff | — | — | Status ACKNOWLEDGED di-set leader dari admin UI |

---

## 3. Peta Tombol dan Action

| Tombol | Lokasi UI | Expected Action | Function/API | Status | Error/Gap |
|---|---|---|---|---|---|
| Buat Task / Buat Tugas & Kirim WA | `/tasks/new`, dashboard | Buat task + WA | `POST /api/tasks` → `createTask` | Ada dan jalan | **Tidak kirim `staff_id`** meski staff dipilih |
| Upload Foto Before | Create task | Simpan foto before | `POST /api/uploads/photo` | Ada dan jalan | Butuh Supabase storage env |
| Upload Foto After | `/report/...` | Simpan bukti | `POST /api/uploads/photo` + submit | Ada dan jalan | — |
| Submit Report | Staff report | Kirim laporan | `POST /api/tasks/:id/submit` | Ada dan jalan | — |
| Setujui | Task detail | Approve | `POST /api/tasks/:id/verify` | Ada dan jalan | Checklist auto-delegate ke checklist verify |
| Minta Revisi | Task detail | Revisi | `POST /api/tasks/:id/revision` | Ada dan jalan | — |
| Kirim Ulang WA | Task detail | Resend WA | `/api/tasks/.../resend-wa` atau checklist resend | Ada, tergantung GAS | Gagal jika GAS/env mati |
| **Buat Teguran** | Task detail (status open/late) | Prefill form teguran | Link → `/teguran/new?task_id=` lalu `GET /api/disciplinary/from-task/:taskId` | **PARTIAL / ERROR** | Relasi karyawan lemah; error toast: “Cek relasi task dan karyawan” |
| Simpan Draft | `/teguran/new` | Buat draft | `POST /api/disciplinary` | Ada | — |
| Simpan & Siap Kirim | `/teguran/new` (ST) | Terasa “kirim” | `POST /api/disciplinary` dengan `submit_for_approval` | **Misleading** | Untuk ST tetap **DRAFT**; tidak kirim |
| Ajukan Approval | Form SP / detail | Status waiting | create/update + `actions: submit_approval` | Ada | Butuh evidence untuk submit_approval |
| Approve ST/SP | Detail | Approve | `actions: approve` | PARTIAL | Hanya ADMIN / env-admin; leader akan 403 |
| Generate PDF | Detail | Arsip PDF | `actions: generate_pdf` | PARTIAL / ERROR di prod | Tulis HTML ke `public/uploads/disciplinary` (ephemeral di Vercel) |
| **Kirim Surat** | Detail | Tandai terkirim | `actions: send` | PARTIAL / ERROR jika bukti kosong | Tidak kirim WA/email; SP butuh approve + PDF |
| Tandai Dibaca / Selesaikan / Batalkan | Detail | Update status | acknowledge / resolve / cancel | Ada di UI+API | Bukan staff yang acknowledge |
| Filter dashboard | `/dashboard` | Filter list | Client-side + `fetchTasks` | Ada dan jalan | — |
| Export | — | Export data | — | **NOT FOUND** | — |
| Login / Logout | Login + settings | Session | `/api/auth/login`, `/logout` | Ada dan jalan | Rate limit login ada |
| Kirim Checklist | Template editor | Generate checklist task | `POST /api/checklist-reports/generate` | Ada | — |
| Sync Semua dari v1 | Settings | Full sync | `/api/sync/from-v1` | Ada | RISK jika disalahgunakan di prod |

### Catatan label tombol

Tidak ditemukan tombol berteks persis **“Kirim Teguran”**. Yang ada:

- **“Buat Teguran”** (dari detail task)
- **“Kirim Surat”** (dari detail teguran)

Kemungkinan error yang dialami merujuk ke salah satu dari keduanya.

---

## 4. Peta API / Route / Function

| API/Function | Lokasi File | Dipakai UI | Input/Payload | Output | Status | Catatan |
|---|---|---|---|---|---|---|
| `GET/POST /api/tasks` | `app/api/tasks/route.ts` + `task.service` / `task-write.service` | Dashboard, create | Filter / CreateTaskPayload | List / Task | Ada dan jalan | Create tanpa `staff_id` |
| `GET /api/tasks/:id` | `app/api/tasks/[taskId]/route.ts` | Detail | taskId | Task | Ada | Outlet scope ada |
| `POST .../verify`, `/revision`, `/resend-wa`, `/submit`, `/open`, `/public` | `app/api/tasks/[taskId]/*` | Detail + staff | Sesuai aksi | Task | Ada dan jalan | Inti flow v2 |
| `POST /api/uploads/photo` | `api/uploads/photo` + `storage.service` | Create/report | multipart | URL | Ada | Env Supabase |
| Checklist APIs | `api/checklist-*` | Checklist UI | generate/submit/verify | Report | Ada dan jalan | — |
| Recurring APIs + cron | `api/recurring-*`, `api/internal/recurring/generate` | Settings + cron | template | tasks | Ada | Butuh `CRON_SECRET` |
| Staff / users / areas / categories / outlets | `api/staff`, `users`, dll | Settings | CRUD | Master | Ada | — |
| Staff reports (Daily SOP) | `api/staff-reports/*` | `/r/`, settings, dashboard | token/submit | submissions | Ada dan jalan | — |
| Leader monitoring | `api/leader-monitoring/*` + `leader-monitoring-store.ts` | Leader page | submit/validate | dashboard | PARTIAL | Store in-memory; validasi staff ke DB |
| `GET /api/disciplinary` | `api/disciplinary/route.ts` | Teguran list | filters | summary+letters | Ada | **Permission outlet belum jelas** (leader bisa lihat semua) |
| `POST /api/disciplinary` | sama | Form buat | CreateDisciplinaryLetterPayload | letter | Ada | — |
| `GET/PATCH /api/disciplinary/:id` | `api/disciplinary/[id]` | Detail/edit | id / update | letter | Ada | — |
| `POST /api/disciplinary/:id/actions` | `.../actions` | Detail buttons | action enum | letter | Ada | approve/send/pdf/dll |
| `GET /api/disciplinary/from-task/:taskId` | `from-task/[taskId]` | Prefill form | taskId | DisciplinaryTaskPrefill | **Dipakai UI, rawan error** | Fallback `employee_id = picWa` |
| `buildPrefillFromTask` | `lib/services/disciplinary.service.ts` | via from-task | taskId | prefill | Ada tapi gap data | — |
| `generateDisciplinaryPdfArchive` | `disciplinary-pdf.service.ts` | generate_pdf | letter | HTML URL | Ada tapi tidak production-safe | Bukan PDF biner |
| `auditLog.create` | `dual-write.service.ts` | Task dual-write | entity actions | row | Ada tapi tidak dipakai UI | Modul teguran pakai `DisciplinaryEvent` |
| Attendance API | — | — | — | — | **Tidak ditemukan** | — |

---

## 5. Peta Database / Data Model

| Tabel/Model | Fungsi | Field Penting | Dipakai Modul | Gap/Kekurangan |
|---|---|---|---|---|
| `tasks` | Task operasional | `task_id`, `staff_id?`, `pic_name`, `pic_wa`, `deadline`, `is_late`, `status`, foto before/after | Task, dashboard, teguran prefill | **`staff_id` sering kosong** saat create v2 |
| `staff` | Karyawan | `staff_id`, outlet, WA, role, status | Master, assign PIC | Relasi ke task lemah |
| `outlets`, `areas`, `categories` | Master | code/name | Hampir semua | CRUD outlet terbatas |
| `checklist_*` | Checklist template/report | items, status, foto | Checklist | — |
| `recurring_templates` | Jadwal berulang | repeat_*, pic | Recurring | — |
| `staff_report_links`, `report_templates`, `daily_report_submissions` | Daily Activity SOP | token/short_code, photo, validation | `/r/`, daily dashboard | — |
| `leader_monitor_*` | Leader monitoring | templates, submissions | Schema ada | Runtime UI masih in-memory (**gap**) |
| `disciplinary_letters` | ST/SP | type, level, status, employee_*, related_task_id, pdf_url | Teguran Center | Tidak FK ketat ke `staff`/`tasks` |
| `disciplinary_evidence` | Bukti | type, file_url, note | Teguran | Upload bukti khusus belum; URL manual |
| `disciplinary_events` | Audit trail surat | action, actor, status change | Detail teguran | Bukan `audit_logs` global |
| `audit_logs` | Audit sistem | entity, action, old/new | Dual-write task | **Tidak ada UI**; teguran tidak menulis ke sini |
| `sync_logs` | Monitoring sync/WA | operation, v1/v2 status | Settings sync logs | — |
| `user_accounts` | Login | username, role ADMIN/LEADER/STAFF | Auth | Tidak ada role OWNER |
| Attendance | — | — | — | **Tidak ada model** |

Sumber enum teguran sudah mendukung: `TASK_LATE`, `ATTENDANCE`, `FAKE_REPORT`, dll — tapi attendance belum punya data sumber.

---

## 6. Data Flow Antar Fitur

Alur yang diinginkan:

```
Task dibuat
  → Staff menerima / report
  → Foto masuk
  → Status task berubah
  → Dashboard update
  → Jika terlambat bisa dibuat Teguran
  → Teguran masuk arsip
  → Jika berat naik ke SP
  → SP generate PDF
```

| Segmen | Status |
|---|---|
| Task dibuat → WA → staff buka/report → foto → approve/revisi → dashboard | **Sudah nyambung** |
| Task terlambat tampil di dashboard (filter LATE / `is_late`) | **Sudah nyambung** (sebagian hitung client-side) |
| Task terlambat → tombol Buat Teguran → prefill | **Error / belum nyambung bersih** (relasi karyawan) |
| Prefill → Simpan Draft ST | **Sebagian nyambung** jika prefill sukses |
| Draft → Kirim Surat | **Belum nyambung andal** (bukti wajib; tidak ada notifikasi) |
| ST berulang → naik SP otomatis | **Masih asumsi** (hanya saran level dari `previous_letter_count`) |
| SP → approval owner → PDF → kirim | **Partial** (aturan ada; PDF & kirim lemah) |
| Daily Activity / Leader Monitoring → Teguran | **Belum nyambung** |
| Attendance → Teguran | **Belum ada** (hanya opsi form) |
| Teguran → Audit log HR / arsip permanen | **Partial** (events di surat; PDF storage risk) |

---

## 7. Audit Khusus: Kirim Teguran dari Task Terlambat

### Tombol ada di mana?

- **Detail task** `/tasks/[taskId]`: tombol **“Buat Teguran”** (muncul jika status masih “open-like”: CREATED / SENT / OPEN / OPENED / WA_FAILED / **LATE**).
- Tidak ada di kartu dashboard langsung; harus masuk detail dulu.
- Di Teguran Center: buat manual, atau dari URL `/teguran/new?task_id=...`.

### Memanggil function/API apa?

1. Navigasi ke `/teguran/new?task_id=TASK-...`
2. Frontend `new-teguran-form.tsx` → `GET /api/disciplinary/from-task/:taskId`
3. Backend `buildPrefillFromTask()` di `disciplinary.service.ts`
4. User simpan → `POST /api/disciplinary`
5. (Opsional) di detail → `POST .../actions` dengan `send` / `generate_pdf` / `approve`

### Payload yang dikirim (prefill → create)?

Prefill menghasilkan antara lain:

- `related_task_id`, `employee_id`, `employee_name`, `outlet_*`
- `source_type`: `TASK_LATE` atau `TASK_INCOMPLETE`
- `chronology`, `violation_detail`, `correction_instruction`
- `evidence[]` dari foto before/after / link laporan / catatan staff (jika ada)
- `suggested_level` dari jumlah surat sebelumnya

### Data yang kurang?

1. **`tasks.staff_id` hampir selalu kosong** pada task yang dibuat dari UI v2 (`create-task-form` tidak mengirim `staff_id`; `insertTaskToDb` tidak menulis `staffId`).
2. Prefill fallback: `employeeId = task.staffId || task.picWa || "UNKNOWN"` → sering **nomor WA**, bukan `staff_id`.
3. Dropdown karyawan di form tidak cocok dengan nomor WA → user bingung / data riwayat karyawan pecah.
4. Task terlambat yang belum lapor sering **tanpa foto after** → evidence tipis → **Kirim Surat** gagal (“Bukti belum lengkap”).
5. **UNKNOWN:** apakah migration `disciplinary_letters` sudah di-deploy di environment yang dipakai (jika belum → error 500 tabel tidak ada).

### Error kemungkinan dari mana?

| Lapisan | Kemungkinan |
|---|---|
| Frontend | Toast gagal prefill; tombol “Siap Kirim” menyesatkan |
| Backend | `TASK_NOT_FOUND` / `PREFILL_FAILED`; create gagal validasi; send gagal evidence |
| Permission | Leader OK untuk buat; Approve SP hanya ADMIN |
| Database | Relasi staff kosong; migration belum jalan (**UNKNOWN** di env live) |
| Relasi data | Task ↔ Staff putus; employee_id jadi WA |

### Lebih aman “Buat Teguran Draft”?

**Ya.** Kode sebenarnya sudah arah draft-first, tapi label tombol (`Simpan & Siap Kirim`, `Kirim Surat`) membuat terasa direct-send.

Rekomendasi produk: samakan bahasa UI dengan perilaku draft.

### Risiko kalau tetap direct send?

- Surat formal keluar tanpa review owner
- Bukti kurang / karyawan salah (WA vs staff_id)
- Tidak ada channel kirim nyata (WA/email) — status “SENT” hanya di sistem
- SP tanpa approval = risiko hukum/HR
- PDF hilang di serverless

---

## 8. Rencana Modul Teguran Center

Bukan coding — rancangan koneksi saja.

| Fitur Teguran Center | Sudah Ada? | Perlu Dibuat? | Tergantung Data Apa? | Risiko |
|---|---|---|---|---|
| Halaman `/teguran` | Ya | Polish filter/UX | disciplinary_letters | Leader lintas outlet |
| Form buat ST/SP | Ya | Perbaiki prefill + staff bind | staff, task | Data karyawan salah |
| Detail ST/SP | Ya | Samakan label status ID | letter + events | — |
| Bukti/evidence | Partial | Upload bukti khusus + wajib aturan | foto task / storage | Bukti palsu |
| Riwayat teguran karyawan | Partial (count + list filter) | Halaman profil disiplin | employee_id konsisten | Pecah jika ID = WA |
| Approval SP | Ya (status + action) | Notifikasi ke owner | role ADMIN | Leader masih lihat tombol Approve |
| Generate PDF SP | Partial (HTML archive) | PDF asli + storage cloud | storage bucket | File hilang di Vercel |
| Audit log | Partial (`DisciplinaryEvent`) | Opsional tulis ke `audit_logs` + UI | events | — |
| Role permission | Partial | Outlet scope + bedakan Owner/HR | session outlet | RISK akses silang |
| Kirim ke staff (WA/ack) | Tidak | Keputusan produk dulu | WA GAS / portal staff | Menyentuh GAS = RISK |
| Attendance → ST | Enum only | Modul absensi atau integrasi | attendance data | Scope meledak |
| Auto naik ST1→ST2→SP | Saran level saja | Rules engine + approval | riwayat surat | Salah naik level |

---

## 9. Blank Area / Area yang Belum Kepikiran

- Nomor surat otomatis sudah ada (`ST/OUTLET/YYYY/MM/###`) — race condition concurrent create: **UNKNOWN**
- Format PDF resmi / kop surat legal: masih HTML sederhana
- Storage PDF permanen (Supabase) belum
- Deteksi foto palsu: hanya flag sumber `FAKE_REPORT`, bukan deteksi
- Approval owner: role Owner tidak ada; pakai ADMIN
- Staff acknowledgement: tidak ada portal staff untuk surat
- Relasi task→karyawan: **bolong** di create task
- Relasi task→outlet: ada
- Riwayat pelanggaran berulang: tergantung `employee_id` konsisten
- Permission leader per outlet untuk teguran: **belum** di API disciplinary
- Audit log global vs per-surat: dual track, UI global belum
- Notifikasi WhatsApp/email untuk ST/SP: belum
- Arsip HR export: belum
- Tombol Approve/Kirim bisa disalahgunakan leader (Approve SP seharusnya admin-only — backend menolak, UI belum menyembunyikan)
- Data hilang: PDF lokal; leader monitoring in-memory hilang saat restart
- Error message sudah cukup manusiawi di beberapa path, tapi root cause relasi staff belum dijelasin ke user
- QR code untuk report link: link copy ada; generator QR di app: **NOT FOUND / UNKNOWN**
- Dual-write & v1 sync: salah konfigurasi bisa ganggu produksi v1 (**RISK**)

### Env yang dibutuhkan (dari `.env.example`)

- `DATABASE_URL`, `DIRECT_URL`
- `SESSION_SECRET`
- Supabase storage (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`)
- `GAS_WEB_APP_URL`, `ADMIN_API_KEY`
- `AUTH_REQUIRED`
- `DUAL_WRITE_*`
- `CRON_SECRET`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_APP_URL`

---

## 10. Prioritas Pengerjaan Aman

### P0 — Wajib dulu

1. **Verifikasi migration disciplinary sudah deploy** — tanpa ini semua UI teguran error.
2. **Perbaiki bind `staff_id` saat buat task + prefill teguran** — pondasi data; tanpa ini riwayat/ST salah orang.
3. **UX draft-only dari task terlambat** (“Buat Draft Teguran”) + blokir kirim jika bukti/karyawan belum valid — cegah surat salah keluar.
4. **Jangan sentuh dual-write/GAS/task submit paths** saat kerja teguran — jaga fitur lama.

### P1 — Penting untuk flow utama

1. Outlet scope di API disciplinary (selaras `outlet-scope.ts`).
2. Sembunyikan/disable tombol Approve SP untuk non-admin di UI.
3. Aturan evidence minimum yang jelas di UI sebelum Kirim.
4. Ganti PDF lokal → storage cloud (atau tunda “Generate PDF” di production).

### P2 — Bagus belakangan

1. Halaman riwayat disiplin per karyawan.
2. Notifikasi WA “ada teguran” (tanpa mengirim PDF dulu).
3. Integrasi dari Daily Activity / fake report validation → draft teguran.
4. Persist leader monitoring ke Prisma (schema sudah ada).

### P3 — Nice to have

1. Auto-escalation rules ST→SP.
2. Portal acknowledgement staff.
3. Export arsip HR / QR surat.
4. Modul absensi penuh.

**Alasan urutan:** perbaiki data + cegah surat salah dulu (aman), baru permission/arsip, baru otomasi. Otomasi di atas data jelek = surat massal salah.

---

## 11. Bagian yang Tidak Boleh Disentuh Sembarangan

| Area | Kenapa berisiko | Cara aman mengubah |
|---|---|---|
| `task-write.service.ts` (submit/verify/revision/WA) | Flow produksi harian leader/staff | Tambah field `staff_id` secara additive; test create+submit |
| `dual-write.service.ts` + env `DUAL_WRITE_*` | Bisa rusak sync v1 Sheets/GAS | Jangan ubah default; feature-flag |
| `middleware.ts` public paths `/report`, `/checklist`, `/r` | Link WA lama harus hidup | Jangan ketatkan auth di path public |
| GAS adapter / `GAS_WEB_APP_URL` | WA & fallback v1 | Isolasi teguran dari GAS dulu |
| `leader-monitoring-store.ts` in-memory | Gampang hilang; jangan “fix” sambil migrasi | Migrasi bertahap ke Prisma |
| Repo v1 `v0-field-task-app` | Produksi lama | **Dilarang diubah dari pekerjaan v2** (README) |
| Schema task status enum | Banyak UI filter tergantung status | Jangan rename status tanpa migrasi data |
| Auth cookie / `SESSION_SECRET` | Semua admin UI | Perubahan hati-hati + logout massal |

---

## 12. Pertanyaan yang Harus Ditanyakan ke Owner / Sam

1. ST dari task terlambat: leader boleh **langsung kirim** atau wajib **draft → review** dulu?
2. Siapa yang boleh buat ST? Leader outlet saja, atau admin pusat juga?
3. SP approval: cukup Admin login, atau harus Owner pribadi / HR?
4. Bukti minimal untuk ST vs SP apa? (foto task saja cukup? perlu screenshot deadline?)
5. ST perlu PDF juga, atau cukup arsip di sistem + preview teks?
6. “Kirim surat” artinya apa: ubah status di app saja, WA ke karyawan, print fisik, atau email?
7. Apakah staff harus bisa melihat/mengakui suratnya sendiri di HP?
8. Naik level otomatis (ST1→ST2→ST3→SP) atau selalu keputusan manual?
9. Laporan palsu (`FAKE_REPORT`) langsung rekomendasi SP?
10. Task tanpa `staff_id` (hanya nama+WA): boleh diganjar teguran formal?
11. Apakah Teguran Center masuk pilot KBU sekarang, atau ditunda sampai task core stabil?
12. PDF/arsip disimpan di mana jangka panjang (Supabase Storage / Drive / print saja)?
13. Absensi: digabung ke Teguran Center atau sistem terpisah?
14. Apakah nomor surat format `ST/KBU/2026/07/001` sudah final untuk HR?

---

## 13. Kesimpulan

**Kondisi project:** Inti Task V2 (buat → lapor → verifikasi → checklist → daily SOP) sudah cukup matang untuk pilot operasional. **Teguran Center sudah di-scaffold** (halaman + API + tabel), tapi **belum production-ready**.

**Masalah paling besar:** koneksi **task terlambat → karyawan → draft teguran → kirim** masih putus/rapuh, terutama karena **task tidak menyimpan `staff_id`**, ditambah PDF/kirim yang belum layak dipakai formal.

**Rekomendasi langkah berikutnya:**

1. Klarifikasi aturan bisnis (pertanyaan bagian 12).
2. Baru coding P0: migration check + bind staff + UX draft-only.
3. Jangan langsung bangun otomatisasi kirim/escalation.

**Apakah aman lanjut coding sekarang?**

**Belum aman untuk coding fitur kirim/otomatis.**  
Aman hanya untuk **klarifikasi produk + perbaikan data-binding draft** setelah jawaban owner/Sam.  
Untuk eksperimen UI copy “Buat Draft” tanpa mengubah flow task lama: relatif aman jika dibatasi di folder `teguran` + `disciplinary.service` saja.

---

## Lampiran: File kunci developer

| Area | File |
|---|---|
| Schema DB | `packages/database/prisma/schema.prisma` |
| Migration teguran | `packages/database/prisma/migrations/20260720220000_disciplinary_letters/` |
| Service teguran | `apps/web/lib/services/disciplinary.service.ts` |
| PDF teguran | `apps/web/lib/services/disciplinary-pdf.service.ts` |
| UI Teguran Center | `apps/web/app/(admin)/teguran/` |
| Prefill dari task | `apps/web/app/api/disciplinary/from-task/[taskId]/route.ts` |
| Tombol Buat Teguran | `apps/web/app/(admin)/tasks/[taskId]/task-detail-client.tsx` |
| Create task (tanpa staff_id) | `apps/web/app/(admin)/tasks/new/create-task-form.tsx` |
| Insert task DB | `apps/web/lib/services/task-write.service.ts` |
| Outlet RBAC | `apps/web/lib/outlet-scope.ts` |
| Types teguran | `packages/types/src/index.ts` |
| Roadmap P0 | `docs/P0_ROADMAP.md` |
| Go-live checklist | `docs/GO_LIVE_CHECKLIST.md` |

---

*Audit berdasarkan kode di workspace. Status runtime (DB prod sudah migrate atau belum, error spesifik di layar) ditandai **UNKNOWN** jika tidak bisa diverifikasi tanpa menjalankan app/DB.*

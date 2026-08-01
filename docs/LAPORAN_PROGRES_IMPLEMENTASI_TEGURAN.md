# LAPORAN PROGRES IMPLEMENTASI

> **Cakupan:** perubahan terakhir di PR #18 — *Teguran Center (ST/SP) + fix late-task teguran flow* (`c68dd5f`, merge `0f23fba`).  
> **Bukan cakupan:** fitur baru setelah itu; branch audit docs terpisah.  
> **Status pengujian agen:** **belum dites** end-to-end di browser/staging (laporan dari review kode + diff commit).  
> **Tanggal:** 20 Juli 2026.

---

## 1. Ringkasan Singkat

- **Selesai (kode ada):** modul Teguran Center — halaman list `/teguran`, form `/teguran/new`, detail `/teguran/[id]`.
- **Selesai (kode ada):** API disciplinary — list/create, get/patch, actions (approve/send/pdf/dll), prefill dari task.
- **Selesai (kode ada):** schema + migration `disciplinary_letters`, `disciplinary_evidence`, `disciplinary_events`.
- **Selesai (perbaikan UX):** tombol **"Kirim Teguran"** di detail task diganti **"Buat Teguran"** (tidak lagi memanggil `resend-wa` / GAS).
- **Selesai (navigasi):** kartu link Teguran Center di Dashboard + Settings; middleware proteksi `/teguran`.
- **Partial:** alur draft ST dari task — UI + API connect, tapi relasi karyawan (`staff_id` di task) masih lemah.
- **Partial:** Generate PDF = arsip HTML lokal, bukan PDF cloud production-safe.
- **Partial:** Kirim Surat = ubah status di DB saja; **tidak** kirim WA/email.
- **Error yang diganti (alasan PR):** `"Kirim Teguran"` lama error GAS `ADMIN_SECRET_INVALID` karena salah pakai endpoint resend WA.
- **Error/gap yang masih ada (dari kode, belum dites live):** prefill karyawan bisa jadi nomor WA; Kirim Surat gagal jika bukti kosong; Approve SP 403 untuk leader.
- **Risiko terbesar:** surat formal dipakai operasional sebelum migration deploy + data karyawan akurat + PDF/arsip aman.

---

## 2. Perubahan File

| File | Perubahan | Alasan | Risiko |
|---|---|---|---|
| `apps/web/app/(admin)/tasks/[taskId]/task-detail-client.tsx` | Hapus `handleSendReminder` (resend-wa); tombol jadi Link ke `/teguran/new?task_id=...`; label **Buat Teguran**; pesan error WA lebih jelas | Menghindari “teguran” lewat GAS yang error | Tombol tidak lagi mengirim reminder WA (sengaja); user yang mengharapkan WA reminder perlu pakai **Kirim Ulang WA** |
| `apps/web/app/(admin)/teguran/page.tsx` | Halaman list + summary + filter | Teguran Center | Belum dites; filter outlet text bebas |
| `apps/web/app/(admin)/teguran/new/page.tsx` + `new-teguran-form.tsx` | Form buat/edit draft ST/SP + prefill task | Buat surat modular | Prefill gagal/data salah jika task tanpa `staff_id` |
| `apps/web/app/(admin)/teguran/[id]/page.tsx` | Detail + tombol aksi workflow | Approve/send/pdf/ack/resolve/cancel | Tombol Approve tampil untuk leader (backend tolak SP) |
| `apps/web/app/api/disciplinary/route.ts` | GET list+summary, POST create | Backend Center | Outlet scope leader belum diterapkan |
| `apps/web/app/api/disciplinary/[id]/route.ts` | GET/PATCH detail | Edit draft | — |
| `apps/web/app/api/disciplinary/[id]/actions/route.ts` | POST action workflow | Status machine surat | Send tanpa notifikasi eksternal |
| `apps/web/app/api/disciplinary/from-task/[taskId]/route.ts` | GET prefill | Isi form dari task terlambat | Fallback `employee_id = picWa` |
| `apps/web/lib/services/disciplinary.service.ts` | Business logic ST/SP | Inti modul | Belum ada unit test |
| `apps/web/lib/services/disciplinary-pdf.service.ts` | Generate HTML archive ke `public/uploads/disciplinary` | “PDF” adapter | Di Vercel file bisa hilang / gagal tulis |
| `apps/web/lib/services/disciplinary-preview.ts` | Preview teks surat | Tampil di detail | — |
| `apps/web/app/(admin)/dashboard/dashboard-client.tsx` | Kartu link ke `/teguran` | Akses cepat | — |
| `apps/web/app/(admin)/settings/page.tsx` | SettingsLinkCard Teguran | Navigasi settings | — |
| `apps/web/middleware.ts` | Proteksi `/teguran` + `/disciplinary` | Wajib login | Path `/disciplinary` UI tidak dipakai (API di `/api/disciplinary`) |
| `packages/database/prisma/schema.prisma` | Model + enum disciplinary | Persistensi | Perlu migrate di tiap environment |
| `packages/database/prisma/migrations/20260720220000_disciplinary_letters/migration.sql` | Migration SQL | Deploy schema | Belum diverifikasi di staging/prod oleh agen |
| `packages/types/src/index.ts` | Types payload/letter/filters | Shared types | — |

**Tidak diubah (sengaja):** `task-write.service` submit/verify/WA resend, dual-write, GAS adapter, create-task payload `staff_id` (masih tidak tersimpan).

---

## 3. Perubahan UI

| Halaman | Tombol/Komponen | Sebelum | Sekarang | Status |
|---|---|---|---|---|
| Detail task `/tasks/[id]` | Tombol teguran | **Kirim Teguran** → `POST .../resend-wa` (error GAS sering) | **Buat Teguran** → buka `/teguran/new?task_id=` | **UI + route connect**; prefill **belum dites** live |
| Detail task | Kirim Ulang WA | Ada (resend-wa) | Tetap ada; pesan error GAS lebih jelas | Connect ke API lama; **belum dites** ulang |
| Detail task | Setujui / Minta Revisi | Ada | Tidak diubah | Asumsi tetap jalan (di luar PR) |
| Dashboard | Kartu “Teguran Center” | Tidak ada | Link ke `/teguran` | UI navigasi; **belum dites** |
| Settings | Link “Teguran Center” | Tidak ada | Link ke `/teguran` | UI navigasi; **belum dites** |
| `/teguran` | List, filter, Buat, Detail, Edit Draft | Tidak ada | Halaman baru + `GET /api/disciplinary` | **UI connect API**; **belum dites** |
| `/teguran/new` | Form ST/SP, Simpan Draft, Siap Kirim / Ajukan Approval, Tambah bukti | Tidak ada | Form + `from-task` + `POST /api/disciplinary` | **UI connect API**; label “Siap Kirim” **menyesatkan** (ST tetap DRAFT) |
| `/teguran/[id]` | Approve, Generate PDF, Kirim Surat, Ack, Resolve, Cancel | Tidak ada | Tombol → `POST .../actions` | **UI connect API**; PDF/kirim **belum aman operasional** |

---

## 4. Perubahan Function/API

| Function/API | Dipakai Oleh | Input | Output | Status |
|---|---|---|---|---|
| `GET /api/disciplinary` | `/teguran` | Query filter (outlet, employee, type, status, tanggal) | `{ summary, letters }` | Backend + UI connect; **belum dites** |
| `POST /api/disciplinary` | Form buat | `CreateDisciplinaryLetterPayload` | Letter | Backend + UI connect; **belum dites** |
| `GET /api/disciplinary/:id` | Detail + edit form | id | Letter (+ evidence, events) | Connect; **belum dites** |
| `PATCH /api/disciplinary/:id` | Edit draft | Update payload | Letter | Connect; **belum dites** |
| `POST /api/disciplinary/:id/actions` | Detail buttons | `{ action, note? }` | Letter | Connect; aturan approve/send di service; **belum dites** |
| `GET /api/disciplinary/from-task/:taskId` | Form saat `?task_id=` | taskId | Prefill | Connect; **gap data staff**; **belum dites** |
| `buildPrefillFromTask` | from-task route | taskId | Prefill + evidence dari foto/link | Ada; fallback WA sebagai employee_id |
| `createDisciplinaryLetter` / `updateDisciplinaryLetter` | POST/PATCH | payload + session | Letter + event CREATED/UPDATED | Ada |
| `submitForApproval` / `approveLetter` / `sendLetter` / `generatePdf` / `acknowledgeLetter` / `resolveLetter` / `cancelLetter` | actions route | id + session | Letter | Ada; PDF lokal; send tanpa WA |
| `POST /api/tasks/:id/resend-wa` (via tombol Kirim Teguran lama) | ~~Tombol Kirim Teguran~~ | — | — | **Tidak lagi dipanggil** oleh tombol teguran (tetap dipakai **Kirim Ulang WA**) |

Auth API: `requireAuth(["ADMIN", "LEADER"])`.  
Approve SP: role ADMIN / env-admin saja (di service).

---

## 5. Perubahan Database

| Tabel/Model | Field Baru | Migration Ada? | Risiko Data Lama |
|---|---|---|---|
| `disciplinary_letters` | Tabel baru (nomor, type ST/SP, level 1–3, status, employee snapshot, outlet, related_task_id, kronologi, PDF url, dll.) | Ya — `20260720220000_disciplinary_letters` | Tidak menyentuh tabel lama; **kosong sampai dipakai**. Deploy migrate wajib sebelum UI dipakai. |
| `disciplinary_evidence` | Tabel baru (bukti foto/link/note) | Ya (sama) | Cascade delete dengan letter |
| `disciplinary_events` | Tabel baru (audit aksi surat) | Ya (sama) | — |
| Enums: `DisciplinaryLetterType`, `Status`, `SourceType`, `EvidenceType` | Baru | Ya | — |
| `tasks` / `staff` / dll. | **Tidak diubah** | — | Task lama tetap; `staff_id` task tetap sering kosong (gap prefill) |

Migration file ada di repo. **Apakah sudah dijalankan di staging/production: UNKNOWN / belum dicek agen.**

---

## 6. Flow yang Sudah Bisa Dites

> Lakukan di environment yang **sudah migrate** + login admin/leader. Semua langkah di bawah = **manual; belum dijalankan agen**.

### A. Navigasi & list

1. Login sebagai owner/admin.
2. Dari Dashboard, klik kartu **Teguran Center** → harus buka `/teguran`.
3. Dari Settings, klik **Teguran Center** → sama.
4. Pastikan summary cards tampil (boleh 0) dan list kosong/berisi tanpa error merah.

### B. Buat teguran dari task terlambat (inti perbaikan)

1. Di Dashboard filter status **Terlambat** (atau buka task status LATE / lewat deadline yang masih open).
2. Buka detail task.
3. Pastikan ada tombol **Buat Teguran** (bukan “Kirim Teguran”).
4. Klik → form `/teguran/new?task_id=...` terbuka.
5. Cek apakah karyawan, outlet, kronologi, sumber `TASK_LATE` terisi otomatis.
6. Klik **Simpan Draft**.
7. Harus masuk detail surat, lalu muncul di list Teguran Center.

### C. Workflow draft (hati-hati, non-operasional)

1. Di detail surat, coba **Generate PDF** → cek link arsip terbuka.
2. Jika ada bukti, coba **Kirim Surat** → status jadi SENT (tanpa WA).
3. Untuk SP: buat type Peringatan → harus menunggu approval; login admin coba **Approve**.

### D. Regresi yang wajib dicek (fitur lama)

1. **Kirim Ulang WA** di detail task masih jalan (atau error GAS yang jelas, bukan dianggap “teguran”).
2. Setujui / Minta Revisi task masih normal.
3. Buat task baru + staff report masih normal.

---

## 7. Flow yang Belum Aman

| Flow | Masalah | Dampak | Saran |
|---|---|---|---|
| Kirim Surat formal ke karyawan | Hanya update status DB; tidak ada WA/email/print wajib | Karyawan mungkin tidak tahu ada surat | Jangan pakai operasional; sebut “tandai terkirim di sistem” |
| Generate PDF di production | HTML ke filesystem lokal | Arsip hilang di serverless | Tunda atau pindah ke Supabase Storage |
| Prefill dari task tanpa `staff_id` | `employee_id` bisa = nomor WA | Riwayat disiplin pecah / salah orang | Perbaiki bind `staff_id` dulu; atau wajib pilih karyawan di form |
| Approve SP oleh leader | UI tombol ada; API 403 | Bingung / error | Sembunyikan tombol untuk non-admin |
| Leader lihat semua outlet di Teguran Center | API belum pakai outlet-scope | Bocor data antar outlet | Terapkan `outlet-scope` seperti modul task |
| Auto naik ST→SP | Hanya saran level | Salah eskalasi jika dianggap otomatis | Tetap manual + approval |
| Pakai sebelum migrate DB | Tabel belum ada | Semua API teguran 500 | Jalankan migrate dulu |

---

## 8. Error / Bug yang Masih Ada

| Error / gejala | Lokasi | Kemungkinan penyebab | Blocking? |
|---|---|---|---|
| *(Sudah diperbaiki di kode)* Toast gagal teguran / `ADMIN_SECRET_INVALID` saat “Kirim Teguran” | Detail task → resend-wa | Tombol lama salah panggil GAS WA | **Sudah diganti** jadi Buat Teguran — regresi WA reminder terpisah |
| Toast “Gagal prefill dari task / Cek relasi task dan karyawan” | `/teguran/new?task_id=` | Task tidak ketemu / error server / migrate belum | **Blocking** untuk flow dari task jika muncul |
| Dropdown karyawan kosong/tidak match setelah prefill | Form baru | Prefill isi `employee_id` = `pic_wa`, bukan `staff_id` | **Blocking data** (draft bisa tersimpan dengan ID salah) |
| “Bukti belum lengkap, surat belum layak dikirim” | Detail → Kirim Surat / submit approval | Evidence kosong (task terlambat sering tanpa foto after) | Blocking kirim; draft tetap boleh |
| “Hanya Owner/Admin yang boleh approve SP” (403) | Detail → Approve | Leader bukan ADMIN | Blocking untuk leader; by design |
| “PDF belum dibuat” | Kirim SP | Belum generate_pdf | Blocking kirim SP |
| PDF/arsip 404 setelah deploy ulang | Link `pdf_url` | File lokal tidak persisten | Blocking arsip |
| Tabel/relation missing (500) | Semua `/api/disciplinary*` | Migration belum deploy | **Blocking total** modul |

Semua baris di atas kecuali yang “sudah diganti”: **belum direproduksi agen di browser live**.

---

## 9. Blank Area Baru

Yang baru terlihat setelah implementasi ini:

1. Create task UI punya staff picker, tapi **payload masih tidak menyimpan `staff_id`** → teguran dari task tetap goyah.
2. Perbedaan makna **reminder WA** vs **surat teguran formal** belum dijelaskan di UI (hanya ganti label).
3. “Simpan & Siap Kirim” untuk ST **tidak mengubah status ke SENT**.
4. Tidak ada test otomatis untuk disciplinary.
5. Tidak ada halaman acknowledgement untuk staff.
6. Tidak ada notifikasi ke owner saat SP waiting approval.
7. Nomor surat race condition concurrent: belum diuji.
8. Evidence upload khusus (bukan paste URL) belum ada.
9. Integrasi dari Daily Activity / fake report → draft teguran belum ada.
10. Apakah migrate sudah jalan di Vercel/Supabase production: belum dikonfirmasi.

---

## 10. Rekomendasi Next Step

### P0 — harus sebelum dipakai operasional

1. Pastikan **migration disciplinary** sudah jalan di staging/prod; cek `/teguran` tidak 500.
2. Tes manual flow bagian 6A–6B; catat hasil prefill karyawan.
3. Perbaiki **penyimpanan `staff_id` saat create task** + prefill teguran (tanpa ubah flow WA submit).
4. Samakan copy UI: **Buat / Simpan Draft** — jangan bilang “kirim” jika belum kirim.

### P1 — penting

1. Outlet scope di API disciplinary.
2. Sembunyikan Approve SP untuk non-admin.
3. Aturan bukti minimum yang jelas di UI.
4. Putuskan: PDF ditunda atau storage cloud.

### P2 — nanti

1. Notifikasi WA “ada draft/surat” (terpisah dari surat formal).
2. Riwayat disiplin per karyawan.
3. Unit/integration test disciplinary.
4. Persist leader monitoring (modul lain).

### Jangan dilakukan dulu

1. Auto-kirim ST/SP ke karyawan.
2. Auto-eskalasi ST→SP tanpa approval.
3. Menyentuh dual-write / GAS / path public `/report` `/checklist` untuk “fix teguran”.
4. Modul absensi digabung ke Teguran sebelum draft ST stabil.
5. Klaim “sudah production-ready” sebelum tes manual + migrate terverifikasi.

---

## Lampiran cepat

| Item | Nilai |
|---|---|
| Commit inti | `c68dd5f` |
| Merge | PR #18 → `0f23fba` |
| Routes UI baru | `/teguran`, `/teguran/new`, `/teguran/[id]` |
| Prefix API baru | `/api/disciplinary/*` |
| Tes otomatis | Tidak ada |
| Tes manual agen | Belum |

---

*Dokumen ini melaporkan apa yang **benar-benar diubah di kode**. Klaim “jalan di production” memerlukan tes browser + konfirmasi migrate — saat ini ditulis sebagai **belum dites**.*

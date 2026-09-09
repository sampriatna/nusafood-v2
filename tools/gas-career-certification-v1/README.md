# NF3 Career & Certification GAS V1

Internal Web App untuk mengelola career level, certification, assessment, PT grade, dan relevel setelah audit tanpa meminta leader bekerja langsung di banyak tab Google Sheet.

## Sumber data

Spreadsheet master:
`NF3 Career & Certification V1`

Spreadsheet ID sudah dikunci di `Code.gs`:
`1HCDoE80ZKtn2PgdPrnwa24463eK2XJZU3svmW_4xiVE`

Payroll **tidak** menjadi bagian dari Web App ini. Career/certification adalah upstream; payroll hanya boleh memakai effective/certified level setelah proses ini stabil.

## Konsep data level

Web App membedakan:

- `legacy_level`: mapping awal sebelum sistem certification.
- `certified_level`: level yang sudah benar-benar PASS assessment.
- `effective_level`: level yang saat ini berlaku secara operasional.
- `current_level`: mirror level efektif untuk kompatibilitas data lama.

Karena itu audit tidak menimpa sejarah.

Contoh:

1. Staff legacy S3.
2. Audit S3 gagal.
3. Sistem menyarankan audit S2; gagal S3 **tidak otomatis membuktikan S2**.
4. Staff mengikuti assessment S2.
5. S2 PASS → `certified_level = S2`.
6. Management klik approve relevel → `effective_level = S2`.
7. Perubahan dicatat di `LEVEL_HISTORY` dan `APP_AUDIT_LOG`.

Mapping correction tetap tersedia untuk memperbaiki data awal yang memang salah, tetapi action tersebut tercatat sebagai `MAPPING_CORRECTION`, bukan certification.

## PT Grade

PT memiliki dua dimensi terpisah:

- role certification: S/B/C/K sesuai pekerjaan yang dikuasai;
- PT grade: PT0–PT4 berdasarkan kemandirian, reliability, multi-skill dan scope operasional.

`PTX` dipakai untuk project/specialist dan bukan crew grade.

## Instalasi

Buat Apps Script project untuk Web App, lalu buat file:

- `Code.gs`
- `SelfTest.gs`
- `Index.html`
- `appsscript.json` (aktifkan Show appsscript.json manifest file di Project Settings bila perlu)

Copy isi file dari folder ini.

Sebelum deploy jalankan:

`runCareerCertificationSelfTestsNoUi()`

Target:

`Career Certification Self Tests: 6 passed, 0 failed`

## Deploy V1 internal

Manifest disiapkan sebagai `USER_ACCESSING`, sehingga setiap pengguna berjalan memakai otorisasi Google miliknya. Berikan akses spreadsheet hanya kepada pengguna internal yang memang akan memakai aplikasi.

Deployment:

1. Deploy → New deployment.
2. Type: Web app.
3. Execute as: User accessing the web app.
4. Access: akun Google yang diizinkan sesuai opsi yang tersedia pada akun deployment.
5. Authorize.
6. Gunakan URL Web App sebagai pintu masuk operasional; leader tidak perlu bekerja dari tab Sheet sehari-hari.

Sebelum dipakai secara lebih luas, tambahkan allowlist/role authorization bila Web App akan dibuka di luar kelompok internal yang sudah dipercaya.

## Workflow harian

### Leader / Assessor

1. Cari staff.
2. Klik `Mulai Audit <level>`.
3. Isi score 0–100 per item, critical failure YES/NO, evidence dan catatan.
4. Simpan draft bila belum selesai.
5. Finalize setelah semua item dinilai.

### Management / Gigin

- Review hasil dan evidence.
- Bila level lama gagal, audit level bawah sampai baseline terbukti.
- Bila certification PASS dan level efektif berbeda, approve relevel.
- Jangan memakai mapping correction untuk menggantikan assessment normal.

### Owner

Fokus pada dashboard, siapa yang belum diaudit, certification PASS, serta perubahan level yang memerlukan keputusan.

## Safeguards V1

- Gagal level tinggi tidak otomatis memberi level di bawahnya.
- Relevel mode `CERTIFICATION` ditolak bila target belum punya certification PASS.
- Mapping correction wajib reason + approver dan selalu masuk history.
- Certification PASS tidak otomatis mengubah effective level; masih perlu approval.
- Critical failure mengalahkan total score.
- Semua perubahan level/PT grade dicatat di `LEVEL_HISTORY`.
- Semua write utama dari Web App dicatat di `APP_AUDIT_LOG`.

## Scope tes saat ini

Tes detail aktif:

- Service: S1, S2, S3
- Kitchen: K1, K2, K3, K4, K5
- PT: PT1, PT2, PT3, PT4

Level master sudah memuat Service S4, Bar B1–B4, Cashier C1–C4, Kitchen K6–KH sebagai framework. TEST_MASTER detail untuk level-level tersebut menjadi fase berikutnya.

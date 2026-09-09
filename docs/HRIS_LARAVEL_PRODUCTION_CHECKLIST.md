# Checklist Validasi Modul Laravel vs HRIS Production

**PENTING:** Repo `sabsensi6/presensigpsv2` di GitHub **tidak otomatis identik** dengan server production Anda (`squadnfi_hris`). Modul di `integrations/hris-laravel/` hanya referensi — **wajib divalidasi** terhadap salinan/staging project production sebelum deploy.

## Jangan uji di live

- PHPUnit integration **hanya** di staging atau salinan filesystem + database production (anonim/de-identified).
- Jangan menjalankan migration, seeder, atau `migrate:fresh` di database live.
- Jangan mengaktifkan `TASK_DASHBOARD_INTEGRATION_ENABLED` di production sebelum checklist ini selesai.

## Checklist versi & environment

| Item | Harus diverifikasi | Cara cek |
|------|-------------------|----------|
| Laravel major version | 10.x (atau catat perbedaan) | `php artisan --version` di staging |
| PHP version | ≥ 8.1 | `php -v` |
| MySQL version | Kompatibel dengan migration existing | `SELECT VERSION()` |
| Database name | Apakah benar `squadnfi_hris`? | `.env` staging |
| Sanctum terpasang | Ya/_tidak_ | `composer show laravel/sanctum` |
| Spatie Permission | Versi & role names production | `composer show spatie/laravel-permission` |

## Checklist tabel & kolom (wajib cocok)

### Tabel `karyawan`

| Kolom | Tipe di repo audit | Verifikasi production |
|-------|-------------------|----------------------|
| `nik` | char(9) PK | ☐ |
| `nama_karyawan` | string | ☐ |
| `no_hp` | string nullable | ☐ |
| `kode_cabang` | char(3) | ☐ |
| `kode_dept` | char(3) | ☐ |
| `kode_jabatan` | char(3) | ☐ |
| `status_aktif_karyawan` | char(1) — `'1'` = aktif | ☐ |
| `password` | string — **jangan expose API** | ☐ |
| `updated_at` | timestamp — untuk `updated_since` | ☐ |

### Tabel master

| Tabel | PK | Verifikasi |
|-------|-----|------------|
| `cabang` | `kode_cabang` | ☐ |
| `departemen` | `kode_dept` | ☐ |
| `jabatan` | `kode_jabatan` | ☐ |

### Tabel presensi (read-only fase 1)

| Tabel | Verifikasi |
|-------|------------|
| `presensi` | ☐ kolom `nik`, `tanggal`, `jam_in`, `status` |
| `presensi_izinabsen` | ☐ |
| `presensi_izinsakit` | ☐ |
| `hari_libur` / `hari_libur_detail` | ☐ |

## Checklist model & relasi

| Model | File | Verifikasi |
|-------|------|------------|
| `Karyawan` | `app/Models/Karyawan.php` | ☐ `$primaryKey = 'nik'`, `$incrementing = false` |
| `Cabang` | `app/Models/Cabang.php` | ☐ |
| `Departemen` | `app/Models/Departemen.php` | ☐ |
| `Jabatan` | `app/Models/Jabatan.php` | ☐ |
| `Presensi` | `app/Models/Presensi.php` | ☐ |

Catat perbedaan custom di production (kolom tambahan, rename, trigger).

## Checklist API existing production

| Route | Auth saat ini | Risiko |
|-------|---------------|--------|
| `POST /api/presensi` | Terbuka | Mesin fingerprint |
| `GET /karyawan/getkaryawan` | Session web | Bocor password jika dipakai |

Pastikan modul integration **tidak** mengubah route mesin existing.

## Checklist modul integration sebelum deploy

| Item | ☐ |
|------|---|
| Salin file dari `integrations/hris-laravel/` ke staging |
| Register middleware `integration.token` di `Kernel.php` |
| `require routes/integration-v1.php` di `api.php` |
| Set `TASK_DASHBOARD_API_TOKEN` (min 16 char) |
| `php artisan test --filter=IntegrationApiTest` di staging |
| Uji manual `GET /api/integration/v1/staff` dengan Bearer token |
| Konfirmasi response **tidak** memuat `password`, `no_ktp`, gaji |
| Rate limit aktif |

## Mapping outlet production → Task Dashboard

Isi manual setelah konfirmasi admin:

| kode_cabang HRIS | nama_cabang | outlet Task Dashboard | hris_outlet_code |
|------------------|-------------|----------------------|------------------|
| | | KBU | |
| | | KISAMEN | |
| | | SAMTARO | |

## Role mapping (fase berikutnya — manual)

Task Dashboard **tidak** overwrite role dari jabatan HRIS pada fase 1. Desain fase 2:

| Sumber | Target Task Dashboard | Metode |
|--------|----------------------|--------|
| Spatie role HRIS | ADMIN / LEADER / STAFF | Mapping table manual |
| `jabatan.nama_jabatan` | Bukan auto-map | Review admin |

## Jika production berbeda dari repo audit

1. Jangan deploy modul apa pun dulu.
2. Dokumentasikan diff (SQL `SHOW CREATE TABLE`, export schema).
3. Sesuaikan controller integration ke schema production.
4. Ulangi PHPUnit di staging.

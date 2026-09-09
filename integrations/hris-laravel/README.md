# Modul Integration API untuk presensigpsv2 (Laravel 10)

Salin file-file ini ke project Laravel HRIS produksi.

## Instalasi

1. Copy middleware & controllers:
   ```bash
   cp app/Http/Middleware/VerifyTaskDashboardIntegrationToken.php /path/to/presensigpsv2/app/Http/Middleware/
   cp -r app/Http/Controllers/Integration /path/to/presensigpsv2/app/Http/Controllers/
   cp config/integration.php /path/to/presensigpsv2/config/
   ```

2. Register middleware di `app/Http/Kernel.php`:
   ```php
   'integration.token' => \App\Http\Middleware\VerifyTaskDashboardIntegrationToken::class,
   ```

3. Tambahkan di `routes/api.php` (sebelum route presensi mesin):
   ```php
   require __DIR__.'/integration-v1.php';
   ```
   Copy `routes/integration-v1.php` ke `routes/`.

4. Environment (`.env`):
   ```env
   TASK_DASHBOARD_INTEGRATION_ENABLED=true
   TASK_DASHBOARD_API_TOKEN=your-long-random-secret
   ```

5. Test:
   ```bash
   php artisan test --filter=IntegrationApiTest
   ```

## Keamanan

- Token hanya via header `Authorization: Bearer ...`
- Field sensitif (password, gaji, no_ktp, foto, lokasi GPS) **tidak** dikirim
- Rate limit: 120 req/menit per IP
- **Task Dashboard fase 1 mengabaikan field `role` dari response** — role lokal tidak di-overwrite
- Validasi production: lihat [`docs/HRIS_LARAVEL_PRODUCTION_CHECKLIST.md`](../../docs/HRIS_LARAVEL_PRODUCTION_CHECKLIST.md)
- **Jangan anggap repo GitHub identik dengan server production**

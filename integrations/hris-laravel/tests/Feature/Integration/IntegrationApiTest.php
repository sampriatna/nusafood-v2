<?php

namespace Tests\Feature\Integration;

use App\Models\Cabang;
use App\Models\Departemen;
use App\Models\Jabatan;
use App\Models\Karyawan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class IntegrationApiTest extends TestCase
{
    use RefreshDatabase;

    private string $token = 'test-integration-token-secret';

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('integration.enabled', true);
        Config::set('integration.api_token', $this->token);
    }

    public function test_staff_endpoint_rejects_missing_token(): void
    {
        $response = $this->getJson('/api/integration/v1/staff');

        $response->assertStatus(401);
    }

    public function test_staff_endpoint_accepts_valid_token(): void
    {
        $this->seedMinimalMaster();

        $response = $this->withToken($this->token)->getJson('/api/integration/v1/staff');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    ['id', 'employee_code', 'name', 'phone', 'outlet', 'division', 'position', 'role', 'status'],
                ],
                'meta' => ['current_page', 'last_page', 'total'],
            ]);
    }

    public function test_staff_pagination_and_updated_since_filter(): void
    {
        $this->seedMinimalMaster();

        Karyawan::query()->create([
            'nik' => '111111111',
            'no_ktp' => '1111111111111111',
            'nama_karyawan' => 'Staff A',
            'jenis_kelamin' => 'L',
            'kode_cabang' => '001',
            'kode_dept' => '001',
            'kode_jabatan' => '001',
            'tanggal_masuk' => now()->toDateString(),
            'status_karyawan' => 'T',
            'lock_location' => '0',
            'status_aktif_karyawan' => '1',
            'password' => Hash::make('secret'),
            'updated_at' => now()->subDays(2),
        ]);

        $recent = Karyawan::query()->create([
            'nik' => '222222222',
            'no_ktp' => '2222222222222222',
            'nama_karyawan' => 'Staff B',
            'jenis_kelamin' => 'P',
            'kode_cabang' => '001',
            'kode_dept' => '001',
            'kode_jabatan' => '001',
            'tanggal_masuk' => now()->toDateString(),
            'status_karyawan' => 'T',
            'lock_location' => '0',
            'status_aktif_karyawan' => '1',
            'password' => Hash::make('secret'),
            'updated_at' => now(),
        ]);

        $response = $this->withToken($this->token)->getJson(
            '/api/integration/v1/staff?updated_since='.urlencode(now()->subDay()->toIso8601String()).'&per_page=1&page=1'
        );

        $response->assertOk();
        $this->assertSame(1, count($response->json('data')));
        $this->assertSame(trim($recent->nik), $response->json('data.0.id'));
    }

    public function test_staff_response_excludes_sensitive_fields(): void
    {
        $this->seedMinimalMaster();

        $response = $this->withToken($this->token)->getJson('/api/integration/v1/staff/111111111');

        $response->assertOk();
        $json = json_encode($response->json());
        $this->assertStringNotContainsString('password', strtolower($json));
        $this->assertStringNotContainsString('no_ktp', strtolower($json));
    }

    public function test_outlets_divisions_positions_endpoints(): void
    {
        $this->seedMinimalMaster();

        $this->withToken($this->token)->getJson('/api/integration/v1/outlets')->assertOk();
        $this->withToken($this->token)->getJson('/api/integration/v1/divisions')->assertOk();
        $this->withToken($this->token)->getJson('/api/integration/v1/positions')->assertOk();
    }

    private function seedMinimalMaster(): void
    {
        Cabang::query()->create([
            'kode_cabang' => '001',
            'nama_cabang' => 'Cabang Test',
            'alamat_cabang' => 'Alamat',
            'telepon_cabang' => '08123456789',
            'lokasi_cabang' => '-6.2,106.8',
            'radius_cabang' => 100,
        ]);

        Departemen::query()->create([
            'kode_dept' => '001',
            'nama_dept' => 'Operasional',
        ]);

        Jabatan::query()->create([
            'kode_jabatan' => '001',
            'nama_jabatan' => 'Staff',
        ]);

        Karyawan::query()->create([
            'nik' => '111111111',
            'no_ktp' => '1111111111111111',
            'nama_karyawan' => 'Staff Test',
            'no_hp' => '081234567890',
            'jenis_kelamin' => 'L',
            'kode_cabang' => '001',
            'kode_dept' => '001',
            'kode_jabatan' => '001',
            'tanggal_masuk' => now()->toDateString(),
            'status_karyawan' => 'T',
            'lock_location' => '0',
            'status_aktif_karyawan' => '1',
            'password' => Hash::make('secret'),
        ]);
    }
}

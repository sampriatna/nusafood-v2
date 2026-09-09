<?php

namespace App\Http\Controllers\Integration\V1;

use App\Http\Controllers\Controller;
use App\Models\Cabang;
use App\Models\Departemen;
use App\Models\Jabatan;
use App\Models\Karyawan;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 50), 1), 200);
        $page = max((int) $request->query('page', 1), 1);

        $query = Karyawan::query()
            ->select([
                'karyawan.nik',
                'karyawan.nama_karyawan',
                'karyawan.no_hp',
                'karyawan.kode_cabang',
                'karyawan.kode_dept',
                'karyawan.kode_jabatan',
                'karyawan.status_aktif_karyawan',
                'karyawan.tanggal_masuk',
                'karyawan.updated_at',
                'cabang.nama_cabang',
                'departemen.nama_dept',
                'jabatan.nama_jabatan',
            ])
            ->leftJoin('cabang', 'karyawan.kode_cabang', '=', 'cabang.kode_cabang')
            ->leftJoin('departemen', 'karyawan.kode_dept', '=', 'departemen.kode_dept')
            ->leftJoin('jabatan', 'karyawan.kode_jabatan', '=', 'jabatan.kode_jabatan');

        if ($request->filled('updated_since')) {
            try {
                $since = Carbon::parse($request->query('updated_since'));
                $query->where('karyawan.updated_at', '>=', $since);
            } catch (\Throwable) {
                return response()->json(['message' => 'Invalid updated_since format'], 422);
            }
        }

        if ($request->filled('status')) {
            $status = strtolower((string) $request->query('status'));
            if ($status === 'active') {
                $query->where('karyawan.status_aktif_karyawan', '1');
            } elseif ($status === 'inactive') {
                $query->where('karyawan.status_aktif_karyawan', '!=', '1');
            }
        }

        if ($request->filled('outlet_id')) {
            $query->where('karyawan.kode_cabang', $request->query('outlet_id'));
        }

        if ($request->filled('division_id')) {
            $query->where('karyawan.kode_dept', $request->query('division_id'));
        }

        $total = (clone $query)->count();
        $rows = $query
            ->orderBy('karyawan.nik')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($row) => $this->transformStaff($row)),
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) max(1, ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    public function show(string $id)
    {
        $row = Karyawan::query()
            ->select([
                'karyawan.nik',
                'karyawan.nama_karyawan',
                'karyawan.no_hp',
                'karyawan.kode_cabang',
                'karyawan.kode_dept',
                'karyawan.kode_jabatan',
                'karyawan.status_aktif_karyawan',
                'karyawan.tanggal_masuk',
                'karyawan.updated_at',
                'cabang.nama_cabang',
                'departemen.nama_dept',
                'jabatan.nama_jabatan',
            ])
            ->leftJoin('cabang', 'karyawan.kode_cabang', '=', 'cabang.kode_cabang')
            ->leftJoin('departemen', 'karyawan.kode_dept', '=', 'departemen.kode_dept')
            ->leftJoin('jabatan', 'karyawan.kode_jabatan', '=', 'jabatan.kode_jabatan')
            ->where('karyawan.nik', $id)
            ->first();

        if (! $row) {
            return response()->json(['message' => 'Staff not found'], 404);
        }

        return response()->json(['data' => $this->transformStaff($row)]);
    }

    private function transformStaff(object $row): array
    {
        $role = $this->resolveRole($row->nama_jabatan ?? '');

        return [
            'id' => trim($row->nik),
            'employee_code' => trim($row->nik),
            'name' => $row->nama_karyawan,
            'phone' => $this->normalizePhone($row->no_hp),
            'outlet' => [
                'id' => trim($row->kode_cabang),
                'name' => $row->nama_cabang ?? trim($row->kode_cabang),
            ],
            'division' => [
                'id' => trim($row->kode_dept),
                'name' => $row->nama_dept ?? trim($row->kode_dept),
            ],
            'position' => [
                'id' => trim($row->kode_jabatan),
                'name' => $row->nama_jabatan ?? trim($row->kode_jabatan),
            ],
            'role' => $role,
            'status' => ($row->status_aktif_karyawan ?? '') === '1' ? 'active' : 'inactive',
            'joined_at' => $row->tanggal_masuk
                ? Carbon::parse($row->tanggal_masuk)->toIso8601String()
                : null,
            'updated_at' => $row->updated_at
                ? Carbon::parse($row->updated_at)->toIso8601String()
                : null,
        ];
    }

    private function resolveRole(string $positionName): string
    {
        $lower = strtolower($positionName);
        foreach (['leader', 'kepala', 'supervisor', 'manager', 'koordinator'] as $keyword) {
            if (str_contains($lower, $keyword)) {
                return 'leader';
            }
        }

        return 'staff';
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);
        if (! $digits) {
            return null;
        }

        if (str_starts_with($digits, '0')) {
            $digits = '62'.substr($digits, 1);
        } elseif (! str_starts_with($digits, '62')) {
            $digits = '62'.$digits;
        }

        return $digits;
    }
}

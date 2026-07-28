<?php

namespace App\Http\Controllers\Integration\V1;

use App\Http\Controllers\Controller;
use App\Models\Detailharilibur;
use App\Models\Karyawan;
use App\Models\Presensi;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function today(Request $request)
    {
        $today = Carbon::today()->toDateString();

        $staffQuery = Karyawan::query()
            ->select([
                'karyawan.nik',
                'karyawan.nama_karyawan',
                'karyawan.kode_cabang',
                'karyawan.kode_dept',
                'karyawan.status_aktif_karyawan',
            ])
            ->where('karyawan.status_aktif_karyawan', '1');

        if ($request->filled('outlet_id')) {
            $staffQuery->where('karyawan.kode_cabang', $request->query('outlet_id'));
        }

        if ($request->filled('division_id')) {
            $staffQuery->where('karyawan.kode_dept', $request->query('division_id'));
        }

        $staffRows = $staffQuery->get();
        $niks = $staffRows->pluck('nik')->all();

        $presensiMap = Presensi::query()
            ->where('tanggal', $today)
            ->whereIn('nik', $niks)
            ->get()
            ->keyBy('nik');

        $izinMap = DB::table('presensi_izinabsen')
            ->whereIn('nik', $niks)
            ->where('status', '1')
            ->whereDate('dari', '<=', $today)
            ->whereDate('sampai', '>=', $today)
            ->pluck('nik')
            ->flip();

        $sakitMap = DB::table('presensi_izinsakit')
            ->whereIn('nik', $niks)
            ->where('status', '1')
            ->whereDate('dari', '<=', $today)
            ->whereDate('sampai', '>=', $today)
            ->pluck('nik')
            ->flip();

        $liburExists = Detailharilibur::query()
            ->join('hari_libur', 'hari_libur_detail.kode_libur', '=', 'hari_libur.kode_libur')
            ->whereDate('hari_libur_detail.tanggal', $today)
            ->exists();

        $data = $staffRows->map(function ($staff) use ($presensiMap, $izinMap, $sakitMap, $liburExists) {
            $nik = trim($staff->nik);
            $presensi = $presensiMap->get($nik);

            $status = 'belum_hadir';
            if ($liburExists) {
                $status = 'libur';
            } elseif (isset($sakitMap[$nik])) {
                $status = 'sakit';
            } elseif (isset($izinMap[$nik])) {
                $status = 'izin';
            } elseif ($presensi && $presensi->jam_in) {
                $status = $presensi->status === 't' ? 'terlambat' : 'hadir';
            }

            return [
                'staff_id' => $nik,
                'employee_code' => $nik,
                'name' => $staff->nama_karyawan,
                'outlet_id' => trim($staff->kode_cabang),
                'division_id' => trim($staff->kode_dept),
                'attendance_status' => $status,
                'check_in_at' => $presensi?->jam_in
                    ? Carbon::parse($presensi->jam_in)->toIso8601String()
                    : null,
                'check_out_at' => $presensi?->jam_out
                    ? Carbon::parse($presensi->jam_out)->toIso8601String()
                    : null,
            ];
        });

        return response()->json([
            'data' => $data->values(),
            'meta' => [
                'date' => $today,
                'total' => $data->count(),
            ],
        ]);
    }
}

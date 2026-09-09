<?php

namespace App\Http\Controllers\Integration\V1;

use App\Http\Controllers\Controller;
use App\Models\Jabatan;

class PositionController extends Controller
{
    public function index()
    {
        $rows = Jabatan::query()
            ->select(['kode_jabatan', 'nama_jabatan', 'updated_at'])
            ->orderBy('kode_jabatan')
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'id' => trim($row->kode_jabatan),
                'name' => $row->nama_jabatan,
                'updated_at' => optional($row->updated_at)?->toIso8601String(),
            ]),
        ]);
    }
}

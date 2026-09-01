<?php

namespace App\Http\Controllers\Integration\V1;

use App\Http\Controllers\Controller;
use App\Models\Cabang;

class OutletController extends Controller
{
    public function index()
    {
        $rows = Cabang::query()
            ->select(['kode_cabang', 'nama_cabang', 'updated_at'])
            ->orderBy('kode_cabang')
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'id' => trim($row->kode_cabang),
                'name' => $row->nama_cabang,
                'updated_at' => optional($row->updated_at)?->toIso8601String(),
            ]),
        ]);
    }
}

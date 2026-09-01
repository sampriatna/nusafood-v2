<?php

namespace App\Http\Controllers\Integration\V1;

use App\Http\Controllers\Controller;
use App\Models\Departemen;

class DivisionController extends Controller
{
    public function index()
    {
        $rows = Departemen::query()
            ->select(['kode_dept', 'nama_dept', 'updated_at'])
            ->orderBy('kode_dept')
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'id' => trim($row->kode_dept),
                'name' => $row->nama_dept,
                'updated_at' => optional($row->updated_at)?->toIso8601String(),
            ]),
        ]);
    }
}

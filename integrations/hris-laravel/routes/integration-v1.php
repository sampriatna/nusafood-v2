<?php

use App\Http\Controllers\Integration\V1\AttendanceController;
use App\Http\Controllers\Integration\V1\DivisionController;
use App\Http\Controllers\Integration\V1\OutletController;
use App\Http\Controllers\Integration\V1\PositionController;
use App\Http\Controllers\Integration\V1\StaffController;
use Illuminate\Support\Facades\Route;

Route::prefix('integration/v1')
    ->middleware(['integration.token', 'throttle:'.config('integration.rate_limit_per_minute', 120).',1'])
    ->group(function () {
        Route::get('/staff', [StaffController::class, 'index']);
        Route::get('/staff/{id}', [StaffController::class, 'show']);
        Route::get('/outlets', [OutletController::class, 'index']);
        Route::get('/divisions', [DivisionController::class, 'index']);
        Route::get('/positions', [PositionController::class, 'index']);
        Route::get('/attendance/today', [AttendanceController::class, 'today']);
    });

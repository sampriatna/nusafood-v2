<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyTaskDashboardIntegrationToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('integration.enabled')) {
            return response()->json([
                'message' => 'Integration API is disabled',
            ], 503);
        }

        $configured = config('integration.api_token');
        if (! $configured || ! is_string($configured) || strlen($configured) < 16) {
            return response()->json([
                'message' => 'Integration token is not configured',
            ], 503);
        }

        $provided = $request->bearerToken();
        if (! $provided || ! hash_equals($configured, $provided)) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 401);
        }

        return $next($request);
    }
}

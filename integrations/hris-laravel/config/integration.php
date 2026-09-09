<?php

return [
    'enabled' => env('TASK_DASHBOARD_INTEGRATION_ENABLED', false),

    'api_token' => env('TASK_DASHBOARD_API_TOKEN'),

    'rate_limit_per_minute' => (int) env('TASK_DASHBOARD_RATE_LIMIT', 120),
];

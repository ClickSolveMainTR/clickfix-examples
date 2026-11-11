<?php

// ClickFix for Laravel. Every key can be set from .env; `php artisan clickfix:install`
// adds the keys, `php artisan clickfix:check` verifies them against the API.

return [
    // Server API key (Organization -> API and automations -> API keys). Starts with cf_sk_.
    'api_key' => env('CLICKFIX_API_KEY'),

    // Base URL without the /v1 suffix.
    'base_url' => env('CLICKFIX_BASE_URL', 'https://api.getclickfix.com'),

    // HTTP timeout in seconds for calls made by the package (check, contact sync).
    'timeout' => (int) env('CLICKFIX_TIMEOUT', 10),

    'widget' => [
        // Public widget id (Web widget -> Install).
        'id' => env('CLICKFIX_WIDGET_ID'),

        // Identity secret (Web widget -> Security -> Identity verification). Never sent to the browser;
        // the package computes user_hash = hex(HMAC-SHA256(secret, user_id)) with it.
        'identity_secret' => env('CLICKFIX_IDENTITY_SECRET'),

        // widget.js location. Only change this for a self-hosted ClickFix.
        'script_url' => env('CLICKFIX_WIDGET_SCRIPT_URL', 'https://getclickfix.com/widget.js'),

        // Default boot options merged into every @clickfixWidget (locale, theme, position, color, ...).
        'options' => [],

        // Which attributes of the authenticated user go into identify() next to user_id and user_hash.
        // A value is an attribute name or a dotted path (data_get); null skips the field. A user model
        // may instead implement ClickFix\Laravel\Contracts\ProvidesClickFixIdentity.
        'user' => [
            'name' => 'name',
            'email' => 'email',
            'phone' => null,
        ],
    ],

    'webhook' => [
        // Signing secret returned once when the subscription is created (POST /v1/public-api/webhooks)
        // or generated with `php artisan clickfix:webhook:secret`.
        'secret' => env('CLICKFIX_WEBHOOK_SECRET'),

        // Register POST {path} automatically. Set false to register the route yourself with the
        // `clickfix.webhook` middleware alias.
        'route' => (bool) env('CLICKFIX_WEBHOOK_ROUTE', true),
        'path' => env('CLICKFIX_WEBHOOK_PATH', 'clickfix/webhook'),

        // Extra middleware for the route (for example 'throttle:120,1').
        'middleware' => [],

        // Accepted clock skew of ClickFix-Webhook-Timestamp, in seconds.
        'tolerance' => (int) env('CLICKFIX_WEBHOOK_TOLERANCE', 300),

        // Remember ClickFix-Webhook-Id in the cache for this many seconds so retries do not fire the
        // events twice. 0 disables deduplication.
        'dedupe_ttl' => (int) env('CLICKFIX_WEBHOOK_DEDUPE_TTL', 86400),

        // Dispatch the events from a queued job instead of inside the request. null/false: inline;
        // true: default queue; a string: that queue name. The webhook still answers 200 immediately.
        'queue' => env('CLICKFIX_WEBHOOK_QUEUE'),
        'queue_connection' => env('CLICKFIX_WEBHOOK_QUEUE_CONNECTION'),
    ],

    'contacts' => [
        // Eloquent model synced by `php artisan clickfix:sync:contacts`. Its primary key is the
        // contact's external_id (the same value `identify` sends as user_id).
        'model' => env('CLICKFIX_CONTACTS_MODEL', 'App\\Models\\User'),

        // ClickFix contact field => model attribute (or dotted path). null skips the field.
        'fields' => [
            'name' => 'name',
            'email' => 'email',
            'phone' => null,
            'job_title' => null,
            'locale' => null,
            'timezone' => null,
        ],

        // ClickFix custom field key (Settings -> Custom fields) => model attribute or dotted path.
        'custom_fields' => [],

        // Rows per chunk when syncing.
        'chunk' => 200,
    ],
];

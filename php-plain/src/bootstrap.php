<?php

declare(strict_types=1);

// Loads .env (if present) and builds the SDK client once. Guzzle is picked up
// through php-http/discovery; any PSR-18 client works.

require __DIR__.'/../vendor/autoload.php';

use ClickFix\Client;
use Dotenv\Dotenv;

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

function env(string $name, ?string $default = null): string
{
    $value = $_ENV[$name] ?? getenv($name) ?: $default;
    if ($value === null || $value === '') {
        fwrite(STDERR, "$name is not set (copy .env.example to .env)\n");
        exit(2);
    }

    return $value;
}

function clickfix(): Client
{
    static $client = null;

    return $client ??= new Client(env('CLICKFIX_BASE_URL', 'https://api.getclickfix.com'), env('CLICKFIX_API_KEY'));
}

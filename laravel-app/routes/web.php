<?php

use App\Support\ClickFixIdentity;
use Illuminate\Support\Facades\Route;

// The page with the widget. In a real app: auth()->user() instead of the demo user.
Route::get('/', function () {
    $user = ClickFixIdentity::demoUser();

    return view('support', [
        'user' => $user,
        'identity' => ClickFixIdentity::for($user),
    ]);
});

// Identity for an SPA / Inertia / mobile app: pass the JSON to ClickFix("identify", ...).
Route::get('/support-session', fn () => response()->json(ClickFixIdentity::for(ClickFixIdentity::demoUser()))
    ->header('Cache-Control', 'private, no-store'));

// POST /clickfix/webhook is registered by clickfix/laravel (config clickfix.webhook.path).

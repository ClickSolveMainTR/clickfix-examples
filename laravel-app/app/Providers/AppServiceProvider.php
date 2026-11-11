<?php

namespace App\Providers;

use App\Listeners\HandleClickFixWebhook;
use ClickFix\Laravel\Events\ConversationCreated;
use ClickFix\Laravel\Events\MessageReceived;
use ClickFix\Laravel\Events\WebhookReceived;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(WebhookReceived::class, [HandleClickFixWebhook::class, 'onAny']);
        Event::listen(ConversationCreated::class, [HandleClickFixWebhook::class, 'onConversationCreated']);
        Event::listen(MessageReceived::class, [HandleClickFixWebhook::class, 'onMessageReceived']);
    }
}

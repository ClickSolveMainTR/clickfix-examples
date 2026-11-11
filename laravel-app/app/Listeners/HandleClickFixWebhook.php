<?php

namespace App\Listeners;

use ClickFix\Laravel\Events\ConversationCreated;
use ClickFix\Laravel\Events\MessageReceived;
use ClickFix\Laravel\Events\WebhookReceived;
use Illuminate\Support\Facades\Log;

/**
 * Every verified delivery of POST /clickfix/webhook raises WebhookReceived plus,
 * for a known event name, a dedicated class (MessageReceived, ...). The route is
 * registered by the package; signature, timestamp window and ClickFix-Webhook-Id
 * deduplication happen before these methods run.
 */
class HandleClickFixWebhook
{
    public function onAny(WebhookReceived $event): void
    {
        Log::info('clickfix webhook', [
            'event' => $event->name(),
            'delivery' => $event->payload->deliveryId,
            'occurred_at' => $event->payload->occurredAt()?->toIso8601String(),
        ]);
    }

    public function onConversationCreated(ConversationCreated $event): void
    {
        // e.g. open a ticket in your CRM
        Log::info('conversation created', ['conversation' => $event->get('conversation_uuid')]);
    }

    public function onMessageReceived(MessageReceived $event): void
    {
        // contact_external_id is your own user id: notify that user, update a badge, ...
        Log::info('message received', [
            'conversation' => $event->get('conversation_uuid'),
            'user' => $event->get('contact_external_id'),
        ]);
    }
}

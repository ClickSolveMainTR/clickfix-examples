<?php

namespace Tests\Feature;

use App\Listeners\HandleClickFixWebhook;
use ClickFix\Laravel\Events\MessageReceived;
use ClickFix\Laravel\Facades\ClickFix;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ClickFixTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Fixed values so the assertions do not depend on the machine's .env.
        config()->set('clickfix.api_key', 'cf_sk_test');
        config()->set('clickfix.widget.id', 'test-widget');
        config()->set('clickfix.widget.identity_secret', 'test-identity-secret');
        config()->set('clickfix.webhook.secret', 'test-webhook-secret');
    }

    public function test_page_boots_the_widget_with_the_signed_in_user(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('ClickFix("boot"', false)
            ->assertSee('"widgetId":"test-widget"', false)
            ->assertSee('"user_id":"1001"', false)
            ->assertSee('https://getclickfix.com/widget.js', false);
    }

    public function test_support_session_signs_user_and_company_together(): void
    {
        $expected = hash_hmac('sha256', "1001\nF-77", 'test-identity-secret');
        $this->getJson('/support-session')
            ->assertOk()
            ->assertJson(['user_id' => '1001', 'user_hash' => $expected, 'company' => ['id' => 'F-77']]);
    }

    public function test_signed_webhook_is_accepted_and_raises_events(): void
    {
        Event::fake([MessageReceived::class]);
        $body = json_encode(['id' => 'evt-1', 'event' => 'message.received', 'version' => 1,
            'occurred_at' => '2026-11-11T10:00:00Z', 'data' => ['conversation_uuid' => 'c-1', 'contact_external_id' => '1001']]);
        $timestamp = time();

        $this->call('POST', '/clickfix/webhook', [], [], [], [
            'HTTP_CLICKFIX_WEBHOOK_ID' => 'delivery-1',
            'HTTP_CLICKFIX_WEBHOOK_TIMESTAMP' => (string) $timestamp,
            'HTTP_CLICKFIX_WEBHOOK_SIGNATURE' => ClickFix::signWebhook($timestamp, $body),
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertOk();

        Event::assertDispatched(MessageReceived::class, fn (MessageReceived $e) => $e->get('contact_external_id') === '1001');
        Event::assertListening(MessageReceived::class, [HandleClickFixWebhook::class, 'onMessageReceived']);
    }

    public function test_tampered_webhook_is_rejected(): void
    {
        $this->call('POST', '/clickfix/webhook', [], [], [], [
            'HTTP_CLICKFIX_WEBHOOK_TIMESTAMP' => (string) time(),
            'HTTP_CLICKFIX_WEBHOOK_SIGNATURE' => 'v1='.str_repeat('0', 64),
            'CONTENT_TYPE' => 'application/json',
        ], '{}')->assertStatus(401);
    }
}

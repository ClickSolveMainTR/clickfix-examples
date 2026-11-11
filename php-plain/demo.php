<?php

declare(strict_types=1);

// Runs the guide's server-side steps in order:  php demo.php

require __DIR__.'/src/bootstrap.php';

use App\Identity;
use ClickFix\Exception\ClickFixException;

// Stand-in for your authentication.
$user = ['id' => '1001', 'name' => 'Ayşe Yılmaz', 'email' => 'ayse@example.com', 'company_id' => 'F-77', 'company_name' => 'Acme A.Ş.'];
$print = static fn (string $step, mixed $data) => print(json_encode(['step' => $step] + ['result' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n");

// 1. Identity: only the hash leaves the server.
$print('support-session', Identity::supportSession(env('CLICKFIX_IDENTITY_SECRET'), $user));

$client = clickfix();
try {
    // 2. Company by its external id (the value the widget sends as company.id), or null.
    $company = $client->companies()->findByExternalId($user['company_id']);
    $print('company', $company ? ['uuid' => $company['uuid'], 'name' => $company['name']] : null);

    // 3. Contact by external id, linked to the company uuid when known. Stable
    // idempotency key per logical change; the API replays a repeated key.
    $contact = $client->contacts()->upsertByExternalId($user['id'], array_filter([
        'name' => $user['name'],
        'email' => $user['email'],
        'company' => $company['uuid'] ?? null,
    ]), idempotencyKey: 'contact-'.$user['id'].'-'.substr(sha1($user['name'].$user['email']), 0, 12));
    $print('contact', ['uuid' => $contact['uuid'], 'external_id' => $contact['external_id']]);

    // 4. Custom fields (keys defined under Settings -> Custom fields).
    $fields = ['plan' => 'pro', 'seats' => 12, 'renewal_date' => '2027-01-31'];
    $withFields = $client->customFields()->setForContact($user['id'], $fields, idempotencyKey: 'fields-'.$user['id'].'-'.substr(sha1(json_encode($fields)), 0, 12));
    $print('custom-fields', $withFields['custom_fields'] ?? []);

    // 5. Product event on the company timeline; your own event id is the
    // idempotency key, so a re-send is reported as duplicate: true.
    $eventId = getenv('EVENT_ID') ?: 'seat-limit-F-77-2027-01';
    $event = $client->events()->track([
        'external_id' => $user['company_id'],
        'contact_email' => $user['email'],
        'name' => 'seat_limit_reached',
        'properties' => ['seats' => 12, 'limit' => 12],
        'idempotency_key' => $eventId,
    ]);
    $print('event', $event);

    // 6. Conversations, page by page.
    $count = 0;
    foreach ($client->conversations()->all() as $conversation) {
        ++$count;
    }
    $print('conversations', ['listed' => $count]);
} catch (ClickFixException $e) {
    fwrite(STDERR, get_class($e).': '.$e->getMessage()."\n");
    exit(1);
}

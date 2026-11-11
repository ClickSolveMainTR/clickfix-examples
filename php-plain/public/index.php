<?php

declare(strict_types=1);

// HTTP front: php -S 127.0.0.1:3000 -t public
//   GET  /support-session   identity for ClickFix("identify", ...)
//   POST /webhooks/clickfix signed webhook receiver (200 / 401)

require __DIR__.'/../src/bootstrap.php';

use App\Identity;
use ClickFix\Webhooks;

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
header('Content-Type: application/json');

if ($method === 'GET' && $path === '/support-session') {
    $user = ['id' => '1001', 'name' => 'Ayşe Yılmaz', 'email' => 'ayse@example.com', 'company_id' => 'F-77', 'company_name' => 'Acme A.Ş.'];
    echo json_encode(Identity::supportSession(env('CLICKFIX_IDENTITY_SECRET'), $user), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST' && $path === '/webhooks/clickfix') {
    // Verify over the raw bytes before decoding; 401 on a bad or stale signature.
    $raw = (string) file_get_contents('php://input');
    $ok = Webhooks::verify(
        env('CLICKFIX_WEBHOOK_SECRET'),
        $_SERVER['HTTP_CLICKFIX_WEBHOOK_TIMESTAMP'] ?? '',
        $_SERVER['HTTP_CLICKFIX_WEBHOOK_SIGNATURE'] ?? '',
        $raw,
    );
    if (!$ok) {
        http_response_code(401);
        echo json_encode(['error' => 'INVALID_SIGNATURE']);
        exit;
    }
    // Deduplicate on the delivery id (retries reuse it); a file stands in for your store.
    $deliveryId = $_SERVER['HTTP_CLICKFIX_WEBHOOK_ID'] ?? '';
    $seenFile = sys_get_temp_dir().'/clickfix-webhook-ids';
    $seen = is_file($seenFile) ? file($seenFile, FILE_IGNORE_NEW_LINES) : [];
    if ($deliveryId !== '' && in_array($deliveryId, $seen, true)) {
        echo json_encode(['duplicate' => true]);
        exit;
    }
    $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    if ($deliveryId !== '') {
        file_put_contents($seenFile, $deliveryId."\n", FILE_APPEND);
    }
    // Act on $payload['event'] and $payload['data'] here (queue it in production).
    error_log(sprintf('received %s at %s', $payload['event'], $payload['occurred_at']));
    echo json_encode(['received' => $payload['event']]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'NOT_FOUND']);

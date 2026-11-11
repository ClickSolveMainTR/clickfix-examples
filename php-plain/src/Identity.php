<?php

declare(strict_types=1);

namespace App;

use ClickFix\UserHash;

/**
 * user_hash for the signed-in user, computed on the server only.
 *
 * Without a company: UserHash::make = hex(HMAC-SHA256(secret, user_id)).
 * With a company the guide signs both ids, hex(HMAC-SHA256(secret, user_id . "\n" . company_id)),
 * so the widget binds the user to company.id and nobody can claim another company.
 * clickfix/sdk 0.1.0 has no helper for the company variant, so it is computed here
 * with the same formula the Node (identityHash) and Go (IdentityCompanyHash) SDKs use.
 */
final class Identity
{
    public static function userHash(#[\SensitiveParameter] string $secret, string $userId, ?string $companyId = null): string
    {
        if ($companyId === null || $companyId === '') {
            return UserHash::make($secret, $userId);
        }
        if (str_contains($userId, "\n") || str_contains($companyId, "\n")) {
            throw new \InvalidArgumentException('ids must not contain line breaks');
        }

        return hash_hmac('sha256', $userId."\n".$companyId, $secret);
    }

    /**
     * What GET /support-session returns; the browser passes it to ClickFix("identify", ...).
     *
     * @return array<string, mixed>
     */
    public static function supportSession(#[\SensitiveParameter] string $secret, array $user): array
    {
        $session = [
            'user_id' => $user['id'],
            'user_hash' => self::userHash($secret, $user['id'], $user['company_id'] ?? null),
            'name' => $user['name'],
            'email' => $user['email'],
        ];
        if (!empty($user['company_id'])) {
            $session['company'] = ['id' => $user['company_id'], 'name' => $user['company_name'] ?? null];
        }

        return $session;
    }
}

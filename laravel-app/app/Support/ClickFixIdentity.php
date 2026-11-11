<?php

namespace App\Support;

use App\Models\User;
use ClickFix\Laravel\Facades\ClickFix;

/**
 * identify() payload with a company-bound user_hash.
 *
 * clickfix/laravel 0.1.0 signs the user id only (ClickFix::userHash), which
 * verifies the user but leaves company.id a hint. The guide's company variant,
 * hex(HMAC-SHA256(secret, user_id . "\n" . company_id)), binds the contact to the
 * company so nobody can claim another one; it is computed here until the
 * package offers it.
 */
final class ClickFixIdentity
{
    /** @return array<string, mixed> */
    public static function for(User $user): array
    {
        $identity = ClickFix::identity($user); // user_id, user_hash (user only), name, email, company
        $companyId = $identity['company']['id'] ?? null;
        if ($companyId !== null && $companyId !== '') {
            $secret = (string) config('clickfix.widget.identity_secret');
            $identity['user_hash'] = hash_hmac('sha256', $identity['user_id']."\n".$companyId, $secret);
        }

        return $identity;
    }

    /** Stand-in for auth()->user(): the signed-in user of every request. */
    public static function demoUser(): User
    {
        $user = new User([
            'name' => 'Ayşe Yılmaz',
            'email' => 'ayse@example.com',
            'company_id' => 'F-77',
            'company_name' => 'Acme A.Ş.',
        ]);
        $user->id = 1001;

        return $user;
    }
}

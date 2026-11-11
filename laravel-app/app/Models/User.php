<?php

namespace App\Models;

use ClickFix\Laravel\Contracts\ProvidesClickFixIdentity;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'company_id', 'company_name'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements ProvidesClickFixIdentity
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * What ClickFix identify() receives for this user (user_hash is added by the
     * package / App\Support\ClickFixIdentity). company.id is the company's id in
     * your system; it is bound only when the hash signs it (see ClickFixIdentity).
     *
     * @return array<string, mixed>
     */
    public function toClickFixIdentity(): array
    {
        $identity = [
            'user_id' => (string) $this->getKey(),
            'name' => $this->name,
            'email' => $this->email,
        ];
        if ($this->company_id) {
            $identity['company'] = ['id' => (string) $this->company_id, 'name' => $this->company_name];
        }

        return $identity;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}

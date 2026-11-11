#!/usr/bin/env bash
# Step 1: user_hash is computed on the server and handed to the signed-in user.
# Without a company: hex(HMAC-SHA256(identity secret, user_id)).
# With one:          hex(HMAC-SHA256(identity secret, user_id + "\n" + company_id)),
# which binds the user to company.id in identify so nobody can claim another company.
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"
: "${CLICKFIX_IDENTITY_SECRET:?CLICKFIX_IDENTITY_SECRET is not set}"

USER_ID="${1:-1001}"
COMPANY_ID="${2:-F-77}"

hash_of() { openssl dgst -sha256 -hmac "$CLICKFIX_IDENTITY_SECRET" | sed 's/^.* //'; }
user_hash=$(printf '%s' "$USER_ID" | hash_of)
company_user_hash=$(printf '%s\n%s' "$USER_ID" "$COMPANY_ID" | hash_of)

printf '{"user_id":"%s","user_hash":"%s","company_id":"%s","company_user_hash":"%s"}\n' \
  "$USER_ID" "$user_hash" "$COMPANY_ID" "$company_user_hash" | pretty

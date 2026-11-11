#!/usr/bin/env bash
# Step 6: list conversations (limit 0-100, offset) and, with INBOX_UUID set,
# open one for the contact by external id and add a message.
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

cf_get "/v1/public-api/conversations?limit=20&offset=0" | pretty

if [ -n "${INBOX_UUID:-}" ]; then
  created=$(cf_post /v1/public-api/conversations "$(idem conv-1001)" \
    "{ \"contact_external_id\": \"1001\", \"inbox_uuid\": \"$INBOX_UUID\", \"subject\": \"Delivery question\" }")
  echo "$created" | pretty
  uuid=$(echo "$created" | sed -n 's/.*"uuid":"\([0-9a-f-]*\)".*/\1/p' | head -1)
  cf_post "/v1/public-api/conversations/$uuid/messages" "$(idem msg-1001)" \
    '{ "content": "When does my order arrive?", "private": false }' | pretty
else
  echo "set INBOX_UUID to also create a conversation and post a message" >&2
fi

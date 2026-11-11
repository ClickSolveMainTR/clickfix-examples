#!/usr/bin/env bash
# Step 2: create or update the contact whose external_id is your user id.
# 201 when created, 200 when it existed; the same id always edits one contact.
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

cf_put /v1/public-api/contacts/by-external-id "$(idem user-1001)" \
  '{ "external_id": "1001", "name": "Ayşe Yılmaz", "email": "ayse@example.com" }' | pretty

# Read it back by external id.
cf_get "/v1/public-api/contacts?external_id=1001&limit=1" | pretty

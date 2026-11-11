#!/usr/bin/env bash
# Step 5: product events on the company timeline (events:write). Your own event
# id goes in idempotency_key and the Idempotency-Key header, so a re-send is
# reported as "duplicate": true instead of creating a second event.
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

EVENT_ID="${EVENT_ID:-seat-limit-F-77-$(date +%s%N)}"
cf_post /v1/public-api/company-events "$EVENT_ID" \
  "{ \"external_id\": \"F-77\", \"contact_email\": \"ayse@example.com\", \"name\": \"seat_limit_reached\", \"properties\": { \"seats\": 12, \"limit\": 12 }, \"idempotency_key\": \"$EVENT_ID\" }" | pretty

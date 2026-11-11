#!/usr/bin/env bash
# Step 7: subscribe a public https URL to events (webhooks:write). data.secret
# is returned only in this response: store it as CLICKFIX_WEBHOOK_SECRET for
# your receiver (see the node-express, go-server, php-plain examples) and never log it.
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"
: "${WEBHOOK_URL:?WEBHOOK_URL is not set (public https URL of your receiver)}"

cf_post /v1/public-api/webhooks "$(idem webhook-crm)" \
  "{ \"name\": \"CRM sync\", \"url\": \"$WEBHOOK_URL\", \"events\": [\"conversation.created\", \"message.received\", \"message.sent\", \"contact.updated\"], \"enabled\": true }" \
  | sed 's/"secret":"[^"]*"/"secret":"<hidden>"/' | pretty

# Existing subscriptions (secrets are never returned again).
cf_get "/v1/public-api/webhooks" | pretty

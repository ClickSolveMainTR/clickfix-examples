#!/usr/bin/env bash
# Runs the scripts in order. Steps that need extra input (INBOX_UUID, WEBHOOK_URL)
# print a note and continue. Stops at the first API error.
set -euo pipefail
cd "$(dirname "$0")"
for script in 01-user-hash.sh 02-contact.sh 03-company.sh 04-custom-fields.sh 05-events.sh 06-conversations.sh; do
  echo "== $script"
  bash "$script"
done
if [ -n "${WEBHOOK_URL:-}" ] || grep -q '^WEBHOOK_URL=https://' .env 2>/dev/null; then
  echo "== 07-webhook-subscription.sh"
  bash 07-webhook-subscription.sh
else
  echo "== 07-webhook-subscription.sh skipped (set WEBHOOK_URL)"
fi

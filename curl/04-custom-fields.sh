#!/usr/bin/env bash
# Step 4: custom fields. Define the field in the panel (Settings -> Custom fields)
# and send it under that key; list fields accept the option id or its label.
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

cf_put /v1/public-api/contacts/by-external-id "$(idem user-1001-fields)" \
  '{ "external_id": "1001", "custom_fields": { "plan": "pro", "seats": 12, "renewal_date": "2027-01-31" } }' | pretty

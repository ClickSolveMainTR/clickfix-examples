#!/usr/bin/env bash
# Step 3: companies. A company is created by the widget (identify with
# company.id) or in the panel; the API finds it by external id and receives
# health signals: usage 0-100 (counts toward the health score for 30 days).
# shellcheck source=lib.sh
. "$(dirname "$0")/lib.sh"

cf_get "/v1/public-api/companies?external_id=F-77" | pretty

cf_put /v1/public-api/company-usage "$(idem usage-F-77)" \
  '{ "external_id": "F-77", "score": 82 }' | pretty

# Link the contact to the company through the company uuid (companies:read + contacts:write).
company_uuid=$(cf_get "/v1/public-api/companies?external_id=F-77&limit=1" | sed -n 's/.*"uuid":"\([0-9a-f-]*\)".*/\1/p' | head -1)
if [ -n "$company_uuid" ]; then
  cf_put /v1/public-api/contacts/by-external-id "$(idem user-1001-company)" \
    "{ \"external_id\": \"1001\", \"company\": \"$company_uuid\" }" | pretty
else
  echo "company F-77 not found yet; identify a widget visitor with company.id F-77 first" >&2
fi

#!/usr/bin/env bash
# Shared by every script: loads .env from this directory, checks the tools and
# defines cf_get / cf_put / cf_post, thin wrappers around curl that add the
# Bearer key and, on writes, the JSON content type and an Idempotency-Key.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$here/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$here/.env"
  set +a
fi

: "${CLICKFIX_BASE_URL:=https://api.getclickfix.com}"
: "${CLICKFIX_API_KEY:?CLICKFIX_API_KEY is not set (copy .env.example to .env)}"

for tool in curl openssl; do
  command -v "$tool" >/dev/null || { echo "$tool is required" >&2; exit 2; }
done
if command -v jq >/dev/null; then pretty() { jq .; }; else pretty() { cat; echo; }; fi

# A key that names one logical write. Reusing it replays the stored response;
# change it (or the suffix) when the input changes.
idem() { printf '%s-%s' "$1" "${IDEMPOTENCY_SUFFIX:-$(date +%s%N)}"; }

cf_get() { # path [curl args...]
  local path="$1"; shift
  curl -sS --fail-with-body "$CLICKFIX_BASE_URL$path" -H "Authorization: Bearer $CLICKFIX_API_KEY" "$@"
}

cf_write() { # METHOD path idempotency-key json-body
  local method="$1" path="$2" key="$3" body="$4"
  curl -sS --fail-with-body -X "$method" "$CLICKFIX_BASE_URL$path" \
    -H "Authorization: Bearer $CLICKFIX_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $key" \
    -d "$body"
}
cf_put() { cf_write PUT "$@"; }
cf_post() { cf_write POST "$@"; }

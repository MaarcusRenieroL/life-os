#!/usr/bin/env bash
# Read-only: shows which Cloudflare Access applications cover the Life OS hostname, their policies in order,
# and whether the native-apps service token exists. Prints no secrets.
#   export CF_API_TOKEN=... CF_ACCOUNT_ID=...   (the token needs Access read permission; the setup token works)
set -euo pipefail
: "${CF_API_TOKEN:?set CF_API_TOKEN}"; : "${CF_ACCOUNT_ID:?set CF_ACCOUNT_ID}"
HOST="${LIFE_OS_HOST:-life-os.maarcus.dev}"; API="https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/access"
get() { curl -sS "$API$1" -H "Authorization: Bearer $CF_API_TOKEN"; }

echo "== Service tokens"; get "/service_tokens" | jq -r '.result[]? | "\(.name)  id=\(.id)  client_id=\(.client_id)  expires=\(.expires_at)"'
echo; echo "== Applications that could cover $HOST"
get "/apps?per_page=100" | jq -c --arg h "$HOST" '.result[]? | select((.domain // "") as $d | ($h == $d) or ($d | startswith("*.")) or (.self_hosted_domains // [] | index($h)) or (($d|split("/")[0]) == $h)) | {id, name, domain, type, session_duration}' | while read -r app; do
  id=$(jq -r .id <<<"$app"); echo "$app"
  echo "  policies, evaluated in this order:"
  get "/apps/$id/policies" | jq -r '.result | sort_by(.precedence)[]? | "    #\(.precedence)  \(.name)  decision=\(.decision)  include=\(.include|tostring)"'
done
echo; echo "Expect: exactly one application for $HOST, with a policy decision=non_identity whose include has your service token,"
echo "listed at precedence 1 (before any 'allow' or 'block' policy)."

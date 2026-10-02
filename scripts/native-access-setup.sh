#!/usr/bin/env bash
# Creates (or rotates) the Cloudflare Access service token the native apps use, makes sure the Life OS
# Access application has a Service Auth policy for it, and prints a one-tap setup link + QR code.
#
#   export CF_API_TOKEN=...   # Cloudflare API token with: Access: Service Tokens Edit, Access: Apps and Policies Edit
#   export CF_ACCOUNT_ID=...  # dash.cloudflare.com > any domain > right sidebar "Account ID"
#   ./scripts/native-access-setup.sh
#
# The token secret is shown by Cloudflare only once; this script never writes it to disk.
set -euo pipefail

: "${CF_API_TOKEN:?set CF_API_TOKEN}"
: "${CF_ACCOUNT_ID:?set CF_ACCOUNT_ID}"
HOST="${LIFE_OS_HOST:-life-os.maarcus.dev}"
TOKEN_NAME="${TOKEN_NAME:-life-os-native-apps}"
POLICY_NAME="Native apps (service token)"
API="https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/access"

cf() { # method path [json]
  local out
  out=$(curl -sS -X "$1" "$API$2" -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" ${3:+--data "$3"})
  if [ "$(jq -r '.success' <<<"$out")" != "true" ]; then
    echo "Cloudflare API error on $1 $2:" >&2; jq -r '.errors[]?.message' <<<"$out" >&2; exit 1
  fi
  echo "$out"
}

echo "→ Service token '$TOKEN_NAME'"
existing=$(cf GET "/service_tokens?name=$TOKEN_NAME" | jq -r '.result[0].id // empty')
if [ -n "$existing" ]; then
  echo "  exists; rotating its secret"
  res=$(cf POST "/service_tokens/$existing/rotate" '{}')
  token_id="$existing"
else
  res=$(cf POST "/service_tokens" "{\"name\":\"$TOKEN_NAME\",\"duration\":\"8760h\"}")
  token_id=$(jq -r '.result.id' <<<"$res")
fi
client_id=$(jq -r '.result.client_id' <<<"$res")
client_secret=$(jq -r '.result.client_secret' <<<"$res")

echo "→ Access application for $HOST"
app_id=$(cf GET "/apps?per_page=100" | jq -r --arg h "$HOST" '[.result[] | select(.domain == $h or (.self_hosted_domains // [] | index($h)))][0].id // empty')
[ -n "$app_id" ] || { echo "No Access application found for $HOST. Create it first (Zero Trust > Access > Applications)." >&2; exit 1; }

echo "→ Service Auth policy"
policy_id=$(cf GET "/apps/$app_id/policies" | jq -r --arg n "$POLICY_NAME" '[.result[] | select(.name == $n)][0].id // empty')
body=$(jq -nc --arg n "$POLICY_NAME" --arg t "$token_id" '{name:$n, decision:"non_identity", include:[{service_token:{token_id:$t}}], precedence:1}')
if [ -n "$policy_id" ]; then cf PUT "/apps/$app_id/policies/$policy_id" "$body" >/dev/null; echo "  updated"; else cf POST "/apps/$app_id/policies" "$body" >/dev/null; echo "  created"; fi

link="lifeos://setup?server=$(jq -rn --arg v "https://$HOST" '$v|@uri')&id=$client_id&secret=$client_secret"
echo
echo "Setup link (paste into the desktop login screen, or scan the QR with your phone camera):"
echo "$link"
echo
npx --yes qrcode-terminal "$link" 2>/dev/null || echo "(install a QR tool, e.g. 'npx qrcode-terminal', to see a QR code)"
echo
echo "Test:  curl -s -o /dev/null -w '%{http_code}\n' -X POST https://$HOST/v1/auth/login -H 'CF-Access-Client-Id: $client_id' -H 'CF-Access-Client-Secret: <secret>' -H 'Content-Type: application/json' -d '{}'   (expect 400/401, not 302)"

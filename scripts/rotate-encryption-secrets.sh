#!/usr/bin/env bash
# Replaces the Gmail and finance encryption secrets and re-encrypts what they protect, in one pass.
#   OLD_GMAIL_ENCRYPTION_SECRET=... OLD_FINANCE_ENCRYPTION_SECRET=... ./scripts/rotate-encryption-secrets.sh
# New secrets are generated and written to .env (never printed). Services that use them are stopped meanwhile.
# Every row is test-decrypted with the old key first; if any fails nothing is changed.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${OLD_GMAIL_ENCRYPTION_SECRET:?}"; : "${OLD_FINANCE_ENCRYPTION_SECRET:?}"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
psql_q() { docker compose exec -T postgres psql -U postgres -d lifeos -At -F $'\t' "$@"; }
rot() { docker run --rm -i -v "$PWD/scripts:/s:ro" eclipse-temurin:21-jdk java /s/RotateSecret.java "$1" "$2"; }

NEW_GMAIL=$(openssl rand -base64 32); NEW_FINANCE=$(openssl rand -base64 32)

rotate() { # name table col oldkey newkey
  psql_q -c "select id, $3 from $2 where $3 is not null" > "$TMP/$1.in"
  rot "$4" "$5" < "$TMP/$1.in" > "$TMP/$1.out"
}
echo "→ checking every value decrypts with the old keys"
rotate gmail_access batches_schema.gmail_oauth_tokens access_token_encrypted "$OLD_GMAIL_ENCRYPTION_SECRET" "$NEW_GMAIL"
rotate gmail_refresh batches_schema.gmail_oauth_tokens refresh_token_encrypted "$OLD_GMAIL_ENCRYPTION_SECRET" "$NEW_GMAIL"
rotate accounts finance_schema.accounts account_number_encrypted "$OLD_FINANCE_ENCRYPTION_SECRET" "$NEW_FINANCE"

echo "→ stopping services, writing re-encrypted values"
docker compose stop batches finance-tracker >/dev/null
{
  echo "begin;"
  while IFS=$'\t' read -r id v; do echo "update batches_schema.gmail_oauth_tokens set access_token_encrypted='$v' where id='$id';"; done < "$TMP/gmail_access.out"
  while IFS=$'\t' read -r id v; do echo "update batches_schema.gmail_oauth_tokens set refresh_token_encrypted='$v' where id='$id';"; done < "$TMP/gmail_refresh.out"
  while IFS=$'\t' read -r id v; do echo "update finance_schema.accounts set account_number_encrypted='$v' where id='$id';"; done < "$TMP/accounts.out"
  echo "commit;"
} | docker compose exec -T postgres psql -U postgres -d lifeos -v ON_ERROR_STOP=1 -q

echo "→ saving the new secrets to .env"
for kv in "GMAIL_ENCRYPTION_SECRET=$NEW_GMAIL" "FINANCE_ENCRYPTION_SECRET=$NEW_FINANCE"; do
  k=${kv%%=*}
  if grep -q "^$k=" .env; then sed -i.bak "s|^$k=.*|$kv|" .env; else echo "$kv" >> .env; fi
done; rm -f .env.bak
docker compose up -d batches finance-tracker >/dev/null
echo "done. Back up .env: losing these secrets makes the encrypted values unreadable."

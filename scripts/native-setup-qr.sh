#!/usr/bin/env bash
# Turns an Access client id + secret you already have into a QR code for the phone, so nothing is typed on it.
#   ./scripts/native-setup-qr.sh
# Paste the two values when asked (the secret is not echoed). Scan the QR with the phone camera.
set -euo pipefail
HOST="${LIFE_OS_HOST:-life-os.maarcus.dev}"
read -r -p "Access client id:     " CLIENT_ID
read -r -s -p "Access client secret: " CLIENT_SECRET; echo
[ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ] || { echo "Both values are required." >&2; exit 1; }
enc() { python3 -c 'import sys,urllib.parse as u; print(u.quote(sys.argv[1], safe=""))' "$1"; }
LINK="lifeos://setup?server=$(enc "https://$HOST")&id=$(enc "$CLIENT_ID")&secret=$(enc "$CLIENT_SECRET")"
echo; echo "Scan with the phone camera and tap the link to open Life OS:"; echo
npx --yes qrcode-terminal "$LINK"
echo; echo "Desktop: paste this into the login screen's 'Paste a setup link' box:"; echo "$LINK"

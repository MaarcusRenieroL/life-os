# Native apps (desktop + mobile)

Both apps have their own UI (not the website in a frame) and share `packages/core`: the game model
(XP, level, rank, quests, achievements), wire types, an API client with token refresh, and a mock
gateway for developing UI without a backend.

## Server address

- Same Mac as the stack: `http://localhost`
- Phone on the same Wi-Fi: `http://<your-mac-ip>` (System Settings > Network)
- From anywhere: `https://life-os-api.maarcus.dev`. This hostname is on the same Cloudflare Tunnel but outside
  Cloudflare Access, because an app cannot do Access's browser login. nginx serves only `/v1/` there (every
  other path is 404, `/v1/*/internal` is blocked, registration is closed) and rate-limits the login
  endpoints to 10 a minute per client. The website stays on `https://life-os.maarcus.dev` behind Access.
  Setup: `~/.cloudflared/life-os.yml` has an ingress entry for the hostname and a CNAME was added with
  `cloudflared tunnel route dns life-os life-os-api.maarcus.dev`. No token is needed in the apps.
- Optional, to keep using the Access-protected hostname instead: create an Access service token and a
  Service Auth policy (`scripts/native-access-setup.sh`), then use `scripts/native-setup-qr.sh`.

## Desktop (Tauri 2)

```bash
cd apps/desktop
pnpm tauri dev      # run
pnpm tauri build    # Life OS.app in src-tauri/target/release/bundle/macos (DMG needs Finder automation)
```

Needs Rust (`rustup`). Tray icon, close-to-tray, `Ctrl+Shift+Space` quick capture. Requests go through
Rust (`tauri-plugin-http`), so the gateway needs no CORS headers. Keep the npm and crate versions of
`@tauri-apps/*` / `tauri-plugin-*` on the same minor.

## Mobile (Expo)

```bash
cd apps/mobile
EXPO_PUBLIC_MOCK=1 pnpm exec expo start --web   # UI preview against a fake gateway
pnpm exec expo prebuild --platform android        # generates android/ (gitignored)
cd android && ./gradlew assembleRelease           # needs a full JDK 21 (with jlink) and the Android SDK
```

The release APK is signed with the debug key (fine for sideloading). Copy it to `./files/life-os.apk`
and it is served at `/files/apk` by nginx.

## Email -> modules

The Gmail poller (`batches`, every 15 min) searches the **connected** mailbox. The log line
`Gmail search query (mailbox <address>)` shows which account that is; if applications go to a
different address, reconnect Gmail with that account.

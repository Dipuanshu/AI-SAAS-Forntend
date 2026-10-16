# AI SaaS – App (Expo / React Native + TypeScript)

One codebase for **Android, iOS and Web**. Uses Expo SDK 57 (expo 57.0.9) + expo-router.

## Screens

**Public** – Welcome · Log in (1. search & pick your company → 2. email + password) · Register company (with plan choice, 14-day trial) · Super Admin login

**Company users** (role-aware tabs)
* Home – greeting, subscription status / days left, expiry warnings, team stats
* Team *(company admin & manager)* – search, role filter, add / edit / deactivate / reset password / delete users (admin only)
* Account – profile, company details (admin can edit), subscription, change password, logout

**Super Admin panel**
* Dashboard – total / paying / trial / expiring (7 days) / expired / suspended companies, users, MRR, companies by plan (cards open the filtered list)
* Companies – search, status filters, sort by expiry; detail screen with **Extend**, **Change / assign plan** (paid, trial, complimentary, amount, notes, keep remaining days), **Suspend / Activate**, **Delete**, subscription history
* Plans – create / edit plans, prices, user limit, features
* Activity – platform audit log
* Account – change password, logout

## Run

```bash
cp .env.example .env     # set EXPO_PUBLIC_API_URL
npm install
npm run web              # browser  (or: npm start, then press a / i, or scan QR with Expo Go)
```

`EXPO_PUBLIC_API_URL` must point to the backend ([ai-saas--backend](https://github.com/Dipuanshu/AI-SAAS--Backend)).
Keep `http://localhost:4000` during development: on a phone the app replaces `localhost` with your computer's IP
automatically (taken from the Expo dev server). For a deployed backend, use its full HTTPS URL.

Phone checklist: phone and computer on the same WiFi · backend running (`npm run dev`) · Windows Firewall allows Node.js
on private networks · `CORS_ORIGINS` is only needed for web. The Super Admin → Account screen shows which API URL the app uses.
If you use `expo start --tunnel`, set `EXPO_PUBLIC_API_URL` to a URL reachable from the phone (your LAN IP or a deployed backend).

## Notes

* Tokens are kept in `expo-secure-store` on phones (localStorage on web). The API client refreshes the access token automatically and logs the user out with a message if the company is suspended or the account is disabled.
* Light theme only for now. Logo / app icon in `assets/images` are Expo placeholders – replace them later.
* `npm run typecheck` · `npm run build:web` (static export in `dist/`) · store builds via EAS (`npx eas-cli build`).

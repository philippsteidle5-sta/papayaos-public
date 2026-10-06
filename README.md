# PapayaOS

PapayaOS multi-agent desktop web app with its public sales page and Gemini-backed server.

## Run locally

1. Install Node.js 22.6+ and pnpm.
2. Copy `.env.example` to `.env` and add your own Gemini API key and a unique `PAPAYA_ADMIN_PASSWORD`.
3. Replace the placeholder `apiKey` in `firebase-applet-config.json` with your own Firebase web configuration before using Firebase-backed features.
4. Run `pnpm install` and then `pnpm run dev`.
5. Open `http://127.0.0.1:3000/?sales=true`.

The sales-page waitlist posts to the PapayaOS backend. Sign in with the configured admin account, open **Admin Tool → Beta-Warteliste**, and view or export signups there. Marking someone as invited records the status; it does not send an email.

For deployment, mount a persistent writable disk and set `PAPAYA_DATA_DIR` to its mount path. The app stores its SQLite database at `PAPAYA_DATA_DIR/data/papayaos.sqlite`; it contains accounts, login sessions, beta signups, leads, billing metadata, invoices, and access keys. Existing `auth-users.json` and `beta-waitlist.json` files are imported automatically on first startup. Use one server instance for this SQLite setup; multiple instances need a shared database service. Back up the database and keep it out of Git. Never commit `.env`, files under `data/`, or generated build folders.

Login uses scrypt password hashes and an HttpOnly session cookie. Five failed attempts for an email and IP address trigger a 15-minute lockout. Session lifetime is seven days, and logout, password changes, account deletion, and account revocation invalidate the relevant sessions.

## Render

`render.yaml` defines the Node version, frontend build, server start, and `/api/health` check. To update an existing dashboard-managed service, use build command `corepack pnpm install --frozen-lockfile --prod=false && pnpm run build` and start command `pnpm start`. The start script runs `server.ts` directly, so it does not depend on a generated `dist/server.cjs` file. Configure a Render persistent disk separately for durable user data.

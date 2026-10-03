# PapayaOS

PapayaOS multi-agent desktop web app with its public sales page and Gemini-backed server.

## Run locally

1. Install Node.js 22+ and pnpm.
2. Copy `.env.example` to `.env` and add your own Gemini API key and a unique `PAPAYA_ADMIN_PASSWORD`.
3. Replace the placeholder `apiKey` in `firebase-applet-config.json` with your own Firebase web configuration before using Firebase-backed features.
4. Run `pnpm install` and then `pnpm run dev`.
5. Open `http://127.0.0.1:3000/?sales=true`.

Never commit `.env`, `data/auth-users.json`, or generated build folders. The server creates its local auth data file at runtime.

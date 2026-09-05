# Language Learning App

Personal vocabulary + practice loop: an Expo iOS app backed by a TypeScript API (Hono) on MongoDB Atlas.
See [PRD.md](PRD.md) for scope and decisions.

## Layout

| Path | What |
| --- | --- |
| `app/` | Expo app (expo-router, TanStack Query, expo-secure-store) |
| `api/` | Hono app; `createApp(deps)` composition root, same handler tree for local Node and Lambda |
| `infra/` | CDK (added in ticket 03) |
| `packages/contracts/` | zod schemas shared by API validation and app types, imported as `@contracts` |
| `docker-compose.yml` | optional local Mongo sandbox — not the default; the API runs against the existing Atlas database |

## Commands

Install everything:

```bash
pnpm install
```

Run the API on http://localhost:8787 (bound to `0.0.0.0`, so a phone on the LAN can reach it).
Copy `api/.env.example` to `api/.env` and fill `MONGO_URI` / `MONGO_DB` with the existing Atlas
database first — startup logs the database name and expression count so you can confirm it is the
existing data:

```bash
pnpm --filter api dev
```

Run every workspace's tests:

```bash
pnpm -r test
```

`pnpm -r lint` and `pnpm -r typecheck` cover the same workspaces.

## Auth

The API and the app share one secret; there is no constant token. Generate a 32-byte secret once:

```bash
openssl rand -hex 32
```

Put it in `api/.env` as `AUTH_SECRET`, and paste the same value into the app's setup screen, which
stores it (with the API URL) in the device keychain. Every request then carries a freshly minted
`Authorization: Bearer <ts>.<nonce>.<sig>`, where `sig` is `HMAC-SHA256(secret, "<ts>.<nonce>")`.
The API recomputes the signature, refuses tokens more than 120s away from its own clock, and
refuses a nonce it has already seen (in-process, 5 minute TTL). `generateToken`/`verifyToken` live
in `packages/contracts/src/token.ts` so the two sides cannot drift.

`/health` is public; every other route answers `401 {"error":{"code":"UNAUTHORIZED",...}}` without a
valid token.

## Health check

```bash
curl localhost:8787/health
# {"status":"ok","db":"ok"}
```

The app's Home screen shows this as a green "API: ok" line, sends you to the setup screen until an
API URL and secret are stored, and shows "Check your secret" when the API rejects the token. Point
the URL at the Mac's LAN address (`http://192.168.x.x:8787`) until the Lambda is deployed in
ticket 03.

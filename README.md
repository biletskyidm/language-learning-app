# Language Learning App

Personal vocabulary + practice loop: an Expo iOS app backed by a TypeScript API (Hono) on MongoDB Atlas.
See [PRD.md](PRD.md) for scope and decisions.

## Layout

| Path | What |
| --- | --- |
| `app/` | Expo app (expo-router, TanStack Query, expo-secure-store) |
| `api/` | Hono app; `createApp(deps)` composition root, same handler tree for local Node and Lambda |
| `infra/` | CDK stack: one Node 22 ARM64 Lambda behind a public Function URL |
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
the URL at the Mac's LAN address (`http://192.168.x.x:8787`) for local iteration, or at the deployed
Function URL.

## Deploy

`infra/` synthesises one Node 22 ARM64 Lambda (1024 MB, 60s — two parallel LLM calls plus a retry)
behind a public Function URL. The API is bundled from `api/src/lambda.ts` with esbuild; the same
`createApp(deps)` tree serves both local Node and Lambda.

Copy `infra/.env.example` to `infra/.env` and fill it — it is untracked and read at synth time.
`MONGO_URI`/`MONGO_DB` point at the same Atlas database local development uses; there is no separate
production database. `AUTH_SECRET` must be byte-identical to the one in `api/.env` and in the app.

```bash
pnpm --filter infra synth
```

With AWS credentials for the target account in the environment (one-off per account/region:
`pnpm --filter infra exec cdk bootstrap`):

```bash
pnpm --filter infra deploy
```

The stack prints `ApiUrl` — paste it into the app's setup screen alongside the secret:

```bash
curl "$ApiUrl/health"
# {"status":"ok","db":"ok"}
```

Redeploy after every ticket so the phone is always testing the real Lambda.

### Rotating `AUTH_SECRET`

1. `openssl rand -hex 32`
2. Put the new value in `infra/.env` (and `api/.env` for local runs).
3. `pnpm --filter infra deploy` — the Lambda picks up the new environment variable.
4. Re-enter the secret on the app's setup screen. Until you do, every request answers `401` and the
   Home screen shows "Check your secret".

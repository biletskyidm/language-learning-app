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

## Health check

```bash
curl localhost:8787/health
# {"status":"ok","db":"ok"}
```

The app's Home screen shows this as a green "API: ok" line. It reads the API base URL from secure
storage, falling back to `EXPO_PUBLIC_API_URL` — point it at the Mac's LAN address
(`http://192.168.x.x:8787`) until the Lambda is deployed in ticket 03.

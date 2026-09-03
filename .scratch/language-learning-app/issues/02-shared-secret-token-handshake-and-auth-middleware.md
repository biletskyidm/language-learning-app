# 02: Shared-secret token handshake and auth middleware

**What to build:** On first launch the app asks for API URL and shared secret, stores both in expo-secure-store, and from then on every request carries a freshly generated bearer token derived from the secret. The API verifies it, rejects missing/invalid/stale/replayed tokens with 401, and stamps the configured `USER_ID` on the request context. PRD stories 1–4.

**Token format (decision):** `Authorization: Bearer <ts>.<nonce>.<sig>`
- `ts` = unix seconds, `nonce` = 16 random bytes hex, `sig` = hex(HMAC-SHA256(secret, `${ts}.${nonce}`)).
- Verify: constant-time compare of sig; `|now - ts| <= 120s`; nonce not seen before (in-memory LRU per process, TTL 5 min — best-effort replay protection, acceptable for single Lambda).
- One module in `packages/contracts/src/token.ts`: `generateToken(secret, {now, random})` and `verifyToken(secret, header, {now, seen})`. Both app and API import it. Uses WebCrypto (`crypto.subtle`) so it runs in RN (via `expo-crypto`/`react-native-quick-crypto` polyfill) and Node.

**Old reference (constant-token middleware being replaced), Go:**
```go
parts := strings.SplitN(header, " ", 2)
if len(parts) != 2 || parts[0] != "Bearer" { 401 "invalid authorization scheme" }
if parts[1] != token { 401 "invalid token" }
ctx = context.WithValue(ctx, userIDKey, userID)
```
New middleware keeps the same shape but calls `verifyToken`. `/health` stays public; everything else is behind it.

**App:** Setup screen (route `/setup`) shown when secret/URL missing; `client.ts` adds the header via `generateToken` per request; a wrong secret surfaces as a "Check your secret" banner (401 handling in the query client).

- [ ] contracts: unit tests for `generateToken`/`verifyToken`: valid; wrong secret; ts 121s old → stale; same nonce twice → replay; malformed header.
- [ ] api: `GET /expressions` (stub 200 for now) → 401 `{error:{code:"UNAUTHORIZED"}}` without header, 200 with a valid generated token; handler sees `c.get('userId') === USER_ID`.
- [ ] app: setup screen saves to secure store; `client.ts` test shows header present and different nonce on two calls.
- [ ] `.env.example` gains `AUTH_SECRET`; README explains generating a 32-byte secret (`openssl rand -hex 32`).

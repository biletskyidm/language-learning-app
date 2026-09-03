# 24: Settings: target counts per mode and default style

**What to build:** Settings screen with number steppers for chat / gaps / describe / smuggle target counts and a default style toggle; values are stored server-side and used as defaults by every start flow (chat create, drill create) when `limit` is not passed. PRD story 16.

**Schema/defaults (contracts `SettingsSchema`):** `{ chatTargets: 5, gapsTargets: 4, describeTargets: 1, smuggleTargets: 3, defaultStyle: 'informal' }`, bounds 1..10 (chat 1..20). Singleton document per user in `settings` collection; `get` returns defaults when absent.

**API:** `GET /settings` → 200 Settings; `PUT /settings` body full Settings → 200. Ticket 13/21/22/23 services read `settings` via `SettingsRepository` instead of hardcoded fallbacks (refactor under green tests).

- [ ] api tests: defaults when no doc; PUT validates bounds; chat create without limit uses `chatTargets`.
- [ ] app: settings form with optimistic update and revert on error (hook test).

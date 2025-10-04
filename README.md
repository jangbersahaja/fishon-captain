# FishOn Captain Registration

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

> Audit Logging: See `README_AUDITLOG.md` for the `AuditLog` model migration template and helper usage (`writeAuditLog`, `auditWithDiff`, `diffObjects`).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
npm run dev
# (yarn / bun also work if you prefer)
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Scripts

| Script                                          | Purpose                                                                                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-env.ts`                          | Validates required environment variables for local/dev runtime.                                                                                                                  |
| `scripts/migrate-legacy-charter-media-paths.ts` | One-off background migration to rewrite legacy `charters/<charterId>/media/*` blob paths into normalized `captains/<userId>/media/*` namespace (idempotent, dry-run by default). |

### Legacy Media Path Migration

Historical uploads stored assets under a charter-scoped prefix (`charters/<charterId>/media/...`). The platform now standardizes on a captain(user)-scoped path (`captains/<userId>/media/...`) to:

- Enforce consistent validation rules (single allowed prefix going forward)
- Enable per-user media quota & lifecycle policies
- Simplify audit tagging and future CDN cache key strategies

The migration script performs for each legacy row:

1. Derive `userId` via charter → captain relation
2. Compute target key `captains/<userId>/media/<filename>`
3. Copy blob to new key (no random suffix) with public access
4. Update `CharterMedia.storageKey` + `url`
5. Attempt deletion of old blob (error tolerated & logged)

Safety / Idempotence:

- Dry-run unless `RUN=apply` env var provided
- Skips if target already exists
- Leaves original in place until DB successfully updated
- Logs every planned (dry) or executed migration

Run dry-run (preview only):

```bash
npx ts-node scripts/migrate-legacy-charter-media-paths.ts
```

Apply changes:

````bash
RUN=apply npx ts-node scripts/migrate-legacy-charter-media-paths.ts

2. Remove temporary allowances in upload/replace routes
3. (Optional) Emit audit log entries per migrated asset
4. Add a one-time metric for number migrated to verify counts

Rollback Strategy:

- If an issue arises mid-migration, unaffected rows remain unchanged
- Already migrated rows can be moved back by reversing from captain path (create a dedicated rescue script) if absolutely necessary
- Keep legacy prefix acceptance in validation until post-migration verification passes

Verification Checklist:

- Row counts: `SELECT COUNT(*) FROM "CharterMedia" WHERE "storage_key" LIKE 'charters/%';` should reach 0
- Spot check random assets (old & new URLs) still load
- Confirm no new writes appear under legacy prefix after deploy freeze window

Monitoring Enhancements (future): Add structured log ingestion for `legacy-media-migrate` events or expose ephemeral dashboard metric.

## Starting Point Autocomplete & Map


### Environment Variables

Copy `.env.example` to `.env.local` and fill in real, non-placeholder values. `.env.local` is git‑ignored.

Run the environment sanity checker:

```bash
````

If any required variables are missing the script will exit non‑zero and list them. Placeholder detection warns if values look like defaults.

Minimum required for local auth + maps:

```env
DATABASE_URL=postgres://user:password@localhost:5432/dbname
NEXTAUTH_SECRET=generate-a-random-long-string
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=browser-key
```

Optional but recommended:

```env
GOOGLE_PLACES_API_KEY=server-restricted-key   # server-side Places Autocomplete & Details
```

Key restriction guidance:

1. Browser Maps key: restrict by HTTP referrer (production domains) & APIs (Maps JavaScript API only).
2. Server Places key: restrict by IP (if static) or at least by API endpoints (Places API). Separate from browser key.
3. Rotate keys immediately if accidentally committed; the repository ignores `.env.local` by default.

### Flow

1. User types in "Starting point address" → debounced call to `/api/places/autocomplete`.
2. User selects a suggestion → we fetch `/api/places/details?placeId=...` to obtain geometry (lat/lng).
3. Latitude & longitude fields auto-fill.
4. Map component becomes active (lazy loads Google Maps JS) and places a draggable marker.
5. Dragging marker updates the lat/lng inputs in real time.
6. Clearing the address hides/disables the map and clears placeId.

### Relevant Files

### Added Schema Fields

### Autofill Behavior

When a starting point address is selected, the app now attempts to fill:

If a component cannot be matched, the original user-selected values remain. Users can still manually adjust any field.

### Extending Further

### Security Note

If any API keys were accidentally committed, rotate them immediately in Google Cloud Console and update `.env.local`. Ensure `.env.local` is in `.gitignore`.

## Charter Draft → Finalize Flow

The captain registration process now supports resilient multi-session progress via a server-backed draft model. Authenticated users autosave each step; on final submission the existing draft is converted into a full Charter record. Unauthenticated users still use the legacy one-shot path (temporary fallback).

### Why

### Data Model

`CharterDraft` (Prisma):

### Lifecycle

1. GET `/api/charter-drafts` → existing active draft or `null`.
2. POST `/api/charter-drafts` → create new empty draft (if none).
3. PATCH `/api/charter-drafts/:id` → debounced autosave (full sanitized snapshot). Includes `clientVersion` for conflict detection.
4. Client uploads media directly to Blob only at final submit (current phase) and constructs `media` payload (image/video keys, order, cover index, optional avatar).
5. POST `/api/charter-drafts/:id/finalize` with media JSON → server validates + persists Charter + marks draft SUBMITTED.

### Conflict Handling

If PATCH returns 409 (version mismatch), the client discards local unsaved changes (Phase 1 strategy) and overwrites with server snapshot. Future improvement: diff/merge UI.

### Validation Layers

| Layer | Purpose |
| Zod schema (client) | Immediate user feedback |
| `validateDraftForFinalizeFeature` (feature server) | Guard rails & basic integrity |
| Database constraints | Referential & uniqueness guarantees |

1. Optional `imagesOrder` / `videosOrder` arrays (0..n-1 permutation). Invalid arrays (duplicates / gaps) are ignored.
2. Optional cover index moved to front if valid (resulting media[0] = cover).

### Legacy Path (Deprecation)

`submitCharter` in `actions.ts` performs a one-shot mutation creating user + charter. It will be removed once all onboarding requires sign‑in and uses the finalize flow.

Feature flag: set `LEGACY_SUBMIT_ENABLED=false` in `.env.local` to hard-disable the legacy endpoint and force users through authenticated draft/finalize.

### Future Enhancements

### Testing

Run unit tests (including finalize coverage):

```bash
npm test
```

CI / single-run optimized reporter:

````bash
npm run test:ci
See `src/server/__tests__/charters.test.ts` for scenarios: validation failures, ordering, cover handling, pickup branch, style mapping.
## Production Hardening Checklist

Tracking items to reach production confidence for the draft → finalize pipeline:

- [x] Core server validation (`validateDraftForFinalizeFeature`).
- [x] Unit tests for charter creation edge cases.
- [x] Integration test: finalize happy path + missing media.
- [x] Added negative finalize tests: unauthorized, wrong owner, invalid status.
- [x] Optimistic version check on finalize (reject if draft.version changed since client last synced via `x-draft-version` header).
- [ ] Structured logging for finalize failures (validation vs DB vs unexpected).
- [x] Rate limiting finalize (pluggable abstraction; memory 5/min per user).
- [x] Structured logging for finalize successes & conflicts.
- [x] Timing metrics (`withTiming`) for key finalize phases.
- [x] Security headers unified via `applySecurityHeaders` (CSP, Referrer, Frame, PermissionsPolicy).
- [ ] Centralize media parsing helpers (reduce inline duplication, ease auditing) (planned extraction from finalize route).
- [ ] E2E (Playwright) flow: create draft → autosave → finalize → assert persisted charter & draft status.
- [ ] Remove legacy `submitCharter` + `LEGACY_SUBMIT_ENABLED` flag post adoption window (see TODO in `actions.ts`).
- [ ] Monitoring hooks / metrics (count finalize success/fail, avg time from first draft to finalize).
- [ ] Alert on repeated validation failures (possible client regression or abuse).

### Rate Limiter Abstraction

`src/lib/rateLimiter.ts` provides a simple interface:

```ts
rateLimit({ key: `finalize:${userId}`, windowMs: 60_000, max: 5 });
````

Current store: in-memory (suitable for single-instance dev). To plug in Redis/Upstash implement `RateLimiterStore` and call `useRateLimiterStore(new RedisStore(...))` during app bootstrap (e.g. inside a server-only init module imported by routes needing it).

Draft endpoints now also use the limiter:

- `POST /api/charter-drafts` → 3 creations/min/user (reuses existing draft if present, so limit only applies to attempts to spawn new drafts).

### Request Timing

`withTiming(name, fn)` wraps async operations and logs:

```json
{
  "msg": "request_timing",
  "name": "finalize_transformAndCreate",
  "ms": 12.34
}
```

Finalize route phases instrumented:

1. `finalize_fetchDraft`
2. `finalize_transformAndCreate`
3. `finalize_markSubmitted`

Draft collection route phases instrumented:

1. `drafts_getActive`
2. `drafts_create`

### Security Headers

All API responses in health, places endpoints, draft PATCH/GET, and finalize now use `applySecurityHeaders` for a consistent baseline CSP and defensive headers.

### Logging Conventions

| Event               | Message                      | Metadata Keys                                 |
| ------------------- | ---------------------------- | --------------------------------------------- |
| Successful finalize | `finalize_success`           | userId, draftId, charterId                    |
| Version conflict    | `finalize_version_conflict`  | userId, draftId, clientVersion, serverVersion |
| Missing media       | `finalize_missing_media`     | userId, draftId                               |
| Validation failure  | `finalize_validation_failed` | userId, draftId, errors                       |
| Rate limited        | `finalize_rate_limited`      | userId, remaining                             |
| Draft patched       | `draft_patched`              | id, version                                   |

Consider redacting or hashing PII fields (emails) in future iterations.

### Media Normalization

`src/server/media.ts` now owns the Zod schema (`FinalizeMediaSchema`) and normalization logic (`normalizeFinalizeMedia`) used by the finalize endpoint. This reduces duplication and creates a single audit point for media constraints (counts, size/ordering fields). Future enhancements can add size / mime type validation here before persistence.

Update this list as items are implemented.

## Feature-Scoped Server Module (Charter Form)

Server logic directly tied to the multi‑step charter form now lives beside the client feature under:
Contents:

- `validation.ts` → `validateDraftForFinalizeFeature(draft, media)` (pure sync validation returning `{ ok:true } | { ok:false, errors }`).
- `mapping.ts` → `mapCharterToDraftValuesFeature({ charter, captainProfile })` used by the draft-from-charter creation flow.
- `diff.ts` (scaffold) → placeholder for future helpers computing minimal changes from draft back to charter (patch semantics / optimistic merge).

Legacy counterparts (`src/server/charters.ts` validation fragment & `charterToDraft.ts`) have been inlined or removed; only the creation transaction remains in `server/charters.ts`.

### Import Guidelines

- Use `@features/charter-onboarding/server/validation` for validation in tests or new endpoints.
- Avoid importing from `src/server/charters.ts` unless you need the full finalize creation (`createCharterFromDraftData`).

### Rationale

Co-locating domain‑specific server utilities with their UI & schema reduces cognitive overhead, eases future extraction to a package, and allows tighter, focused tests without pulling broader server concerns.

## Analytics Instrumentation (Charter Form)

File: `src/features/charter-onboarding/analytics.ts`

Emitted events (subset):

| Event                                                                   | Notes                                                                        |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `step_view`                                                             | Deduped within an 800ms window per step/index to suppress jitter re-renders. |
| `step_complete`                                                         | User advances after passing client validation.                               |
| `draft_saved`                                                           | Autosave; `server` flag indicates whether remote persisted.                  |
| `finalize_attempt` / `finalize_success`                                 | Duration auto-injected if `ms` omitted.                                      |
| `media_upload_start` / `media_upload_complete` / `media_batch_complete` | Per-type timing & grouped batch latency.                                     |
| `lazy_component_loaded` / `preview_ready`                               | Track lazy chunk loads and aggregate readiness for preview groups.           |

Testing utilities:

- `__resetCharterFormAnalyticsForTests()` resets internal timers & dedupe state.
- `stepViewDedupe.test.ts`, `finalizeTiming.test.ts`, `mediaBatch.test.ts`, and `lazyGroup.test.ts` exercise behavioral guarantees.

To enable verbose console logging during local debugging you can temporarily call `enableCharterFormConsoleLogging()` early in a client entry (future enhancement: env flag binding).
Set `NEXT_PUBLIC_CHARTER_FORM_DEBUG=1` in `.env.local` to auto-enable logging.

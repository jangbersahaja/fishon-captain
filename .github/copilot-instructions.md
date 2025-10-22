`````instructions
# Copilot Instructions · FishOn Captain

## Platform Snapshot

Fishon Captain is the **management dashboard** for captains and charter operators, built with Next.js 15 (App Router) + Prisma + NextAuth. This is one of three interconnected Fishon applications:

- **Fishon Captain (this app)**: Internal dashboard for captains/admins; data feeds Fishon.my's public marketplace
- **Fishon.my**: Customer-facing marketplace where anglers discover and book charters
- **Fishon Video Worker**: External video normalization service

### Architecture Highlights
- Domain logic lives in feature modules (e.g. `src/features/charter-onboarding`) that bundle `schema.ts`, `server/`, `components/`, `hooks/`, `__tests__/`, and README guidance
- Import via barrels like `@features/charter-onboarding`
- Middleware (`src/middleware.ts`) gates `/captain/*` and `/staff/*` routes; staff pages require STAFF or ADMIN roles
- PostgreSQL view `v_public_charters` exposes charter data to fishon-market
- Public API at `/api/public/charters` serves as fallback data source for fishon-market

## Core Workflows

### Charter Onboarding
- **New registration** and **edit mode** supported
- Draft saves hit `/api/charter-drafts` and finalization calls `/api/charter-drafts/:id/finalize`
- Always check `isEditing`/initial state before changing flow logic

### Draft Lifecycle
- PATCH `/api/charter-drafts/:id` with `clientVersion` for optimistic locking (409 on conflict)
- POST finalize with media payload → creates Charter + CaptainProfile, marks draft SUBMITTED

### Media Lifecycle
- Direct Vercel Blob uploads (no PendingMedia model)
- Finalize associates blob keys with CharterMedia records
- Videos use `CaptainVideo` with metadata (trim start, processed duration, blob keys, deletion flags)

### Local Dev Commands
```bash
npm run dev --turbopack   # preferred dev server
npm run check:env         # ensure required env vars exist
npm run typecheck         # strict TS gate
npm test                  # Vitest (jsdom)
npm run test:ci           # single-run mode with dot reporter
```

### Database
```bash
npx prisma migrate dev
npx prisma generate
npx prisma studio
npm run migrate:drift-heal  # Schema drift healing
```

## Video Pipeline (Critical Path)

### Client-Side
- **Trim modal** (`src/components/captain/VideoTrimModal.tsx`): enforces ≤30 s clips, bitrate-based size estimates, feeds trim metadata to queue

### Queue Orchestration
- **Video queue** (`src/lib/uploads/videoQueue.ts`): 
  - IndexedDB persistence (survives page refresh)
  - Retry policy
  - Finishing via `/api/blob/finish`

### Server-Side Processing
- **Finish route** (`src/app/api/blob/finish/route.ts`):
  - Decides bypass vs normalization
  - Probes dimensions with ffprobe
  - Sets `processedDurationSec`
  - Enqueues `/api/videos/queue` when `EXTERNAL_WORKER_URL` present

- **Normalization callback** (`/api/videos/normalize-callback`):
  - Ingests worker responses (see `docs/API_VIDEO_ROUTES.md`)
  - External worker template in `src/app/dev/_external-worker/`
  - Required env: `VIDEO_WORKER_SECRET`, `VERCEL_BLOB_READ_WRITE_TOKEN`

### UI Components
- `EnhancedVideoUploader` - Upload interface
- `VideoManager` - Status pills + thumbnails
- `VideoPreviewCarousel` - Review step preview (fixed-height, horizontal scroll)

### Video Status Flow
`queued` → `processing` → `ready` | `failed` (retryable) | `cancelled` (during deletion)

Worker gracefully handles `cancelled` videos

## API & Security Patterns

- **Standard handler structure**: `getServerSession(authOptions)` → role checks → `rateLimit` guard → business logic inside `withTiming` → `applySecurityHeaders(NextResponse.json(...))`
- **Roles**: `/captain/*` requires CAPTAIN+, `/staff/*` requires STAFF+. Admins can impersonate via `?adminUserId=...` query
- **Rate limiter** (`src/lib/rateLimiter.ts`): in-memory store by default, pluggable interface (`RateLimiterStore`) for Redis/Upstash. Common limits: finalize 5/min, draft create 3/min
- **Logging**: structured JSON in prod, colorized in dev via `src/lib/logger.ts` (`logger.info("event", { meta })`)
- **Audit events**: go through `writeAuditLog()` from `@/server/audit`
- **Security headers** (`src/lib/headers.ts`): CSP with Google Maps allowlist, currently uses `'unsafe-inline'` for scripts (Next.js bootstrap) until nonce pipeline implemented

## Testing & Tooling

- Tests sit next to features in `__tests__/` folders; **Vitest + jsdom** with custom mocks for Prisma, IndexedDB, and upload APIs
- **Test config** (`vitest.config.ts`): aliases `@/` and `@features/`, setup via `vitest.setup.ts`
- CI shortcut: `npm run test:ci`. Keep new tests aligned with existing mocking utilities (`__mocks__/`)
- **Mock patterns**: `getServerSession` returns `{ user: { id: "user-1" } }` in tests, Prisma uses inline `vi.fn()` chains

## Feature Module Architecture

- Respect path aliases `@/` and `@features/`. Avoid deep relative imports inside feature modules
- **Charter onboarding** (`src/features/charter-onboarding/`):
  - `charterForm.schema.ts` → Zod validation with step-specific subsets
  - `charterForm.defaults.ts` → type-safe default values
  - `charterForm.draft.ts` → draft sanitization/hydration
  - `server/validation.ts` → `validateDraftForFinalize()`
  - `server/mapping.ts` → charter ↔ draft transformations
  - `analytics.ts` → event bus for instrumentation
  - Components use barrel imports: `import { ... } from "@features/charter-onboarding"`
- **Analytics events**: `step_view`, `step_complete`, `draft_saved`, `finalize_attempt/success`, `media_upload_start/complete/batch_complete`, `lazy_component_loaded`, `preview_ready`. Enable console logging: `NEXT_PUBLIC_CHARTER_FORM_DEBUG=1`

## Implementation Conventions

- **Path aliases**: `@/` (src root) and `@features/` (feature modules). Avoid deep relative imports inside feature modules
- **Form validation**: update both Zod schema and downstream sanitizers/DTOs in the same feature folder. Server-side validation in feature `server/` dir
- **Video UX**: toast auto-dismiss behavior (`ToastContext`) and queue status simplifications—rework both client and API layers when changing states
- **Environment essentials**: `DATABASE_URL`, `NEXTAUTH_SECRET`, Google OAuth pair (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Server-side Places key: `GOOGLE_PLACES_API_KEY`. Fail early with `npm run check:env`
- **Timing instrumentation**: wrap async operations with `withTiming(name, fn)` (logs `request_timing` with ms)
- **Audit log**: use `writeAuditLog({ action, actorId, resourceType, resourceId, metadata })` or `auditWithDiff({ prev, next, ... })` for major mutations

## Data Model Highlights (Prisma)

- **User** (CAPTAIN | STAFF | ADMIN roles) → **CaptainProfile** (1:1) → **Charter** (1:many)
- **CharterDraft** (status: ACTIVE | SUBMITTED) with `version` for optimistic locking, `dataJson` stores sanitized form snapshot
- **Charter** → **CharterMedia** (images/videos), **Boat** (1:1), **Pickup** (1:1), **Trip** (1:many), **Policies** (1:1)
- **CaptainVideo**: `processStatus` (queued/processing/ready/failed/cancelled), `originalBlobKey`, `ready720pBlobKey`, `thumbnailBlobKey`, `didFallback`, `processedDurationSec`, `originalDeletedAt`
- **AuditLog**: tracks mutations with `before`/`after` diffs, `action`, `actorId`, `resourceType`, `resourceId`
- **v_public_charters**: PostgreSQL view exposing charter data to fishon-market; returns `id` (text) and `charter` (jsonb)

## Common Pitfalls & Fixes

- **Infinite render loops**: check `useEffect` deps, especially in forms with autosave. See `docs/FIX_INFINITE_RENDER_LOOP.md`
- **PendingMedia removed**: legacy model, don't import. Direct blob uploads only. See `docs/PENDINGMEDIA_CLEANUP_README.md`
- **Video worker external**: normalization worker runs externally (QStash in prod, direct HTTP in dev). Worker template in `src/app/dev/_external-worker/`. Don't confuse with internal `/api/videos/worker-normalize`
- **CSP violations with Maps**: ensure script-src includes `https://maps.googleapis.com` and `https://maps.gstatic.com`. Current setup in `src/lib/headers.ts`
- **Draft version conflicts**: client must send `x-draft-version` header on finalize; server returns 409 if mismatch. Client strategy: discard local, fetch server snapshot

## Key Files for Onboarding

- `src/middleware.ts` — auth gates
- `src/lib/auth.ts` — NextAuth config with Google OAuth, custom JWT callbacks
- `src/features/charter-onboarding/README.md` — feature module overview
- `docs/API_VIDEO_ROUTES.md` — video API reference
- `src/app/api/README.md` — API cleanup plan, route inventory
- `prisma/schema.prisma` — data model source of truth

## External Integrations

- **Vercel Blob** (`@vercel/blob`): media storage, public URLs with signed tokens. Three-part upload: `create` → multipart chunks → `finish`
- **Google Maps**: Places Autocomplete (`/api/places/autocomplete`), Details API (`/api/places/details`), Maps JS SDK (client). Separate API keys for server vs browser
- **QStash** (`@upstash/qstash`): async video normalization queue in production (dev uses direct HTTP)
- **NextAuth**: Google OAuth provider, Prisma adapter, JWT strategy with role claims in token

## Shared Package Strategy

### Current Packages
- **@fishon/ui**: Shared UI components and types (Charter, Captain, Trip, etc.) - git package
- **@fishon/schemas**: Shared validation schemas - git package

### Future: @fishon/packages
Plan to consolidate `@fishon/ui` and `@fishon/schemas` into a single `@fishon/packages` monorepo containing:
- Components (React UI components)
- Types (TypeScript definitions)
- Schemas (Zod validation)
- Lib (Utility functions, formatters)
- Data (Static data like amenities, species)

### Implementation Guidelines
1. **When Encountering Shared Code**: Add a TODO comment to mark for consolidation
   ```typescript
   // TODO(@fishon/packages): Move this to shared package
   ```

2. **Before Adding to Package**: Ensure code is:
   - Used in at least 2 apps (fishon-market, fishon-captain, or fishon-video-worker)
   - Stable and unlikely to change frequently per app
   - Properly typed with TypeScript
   - Has no app-specific dependencies

3. **Installation**: Always use git URL format for Vercel compatibility
   ```bash
   npm install git+https://github.com/jangbersahaja/fishon-ui#main
   ```

## Documentation

You must always follow the documentation instructions in `.github/documentation.instructions.md` when generating, reviewing, or updating documentation in this repository.

**CRITICAL**: Before creating ANY .md file in `/docs`:
1. Check if `.github/documentation.instructions.md` exists
2. Follow the naming convention: `{fix|feature|plan|design}-{area}-{topic}.md`
3. Include required YAML frontmatter (type, status, updated, feature, author)
4. ONE file per issue - no duplicate summaries/updates/final docs

**Example of what NOT to do**:
- ❌ Creating `FEATURE.md`, `FEATURE_SUMMARY.md`, `FEATURE_UPDATE.md`, `FEATURE_FINAL.md`
- ✅ Creating ONE file: `fix-location-image-mapping.md` with proper frontmatter.

**SUPER CRITICAL**: DO NOT create multiple files for a single issue. DO NOT create separate summary, update, and final documentation files. Create ONE file per issue with the appropriate type in the frontmatter.

**IMPORTANT**: Do not make mistake. Do not repeat mistakes.

## Terminal

You have access to a terminal where you can run commands. Follow instructions in `.github/terminal.instructions.md` when using the terminal.

Need clarification or spot gaps? Ask which sections feel incomplete so we can refine this guide.
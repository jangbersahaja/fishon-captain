# Copilot Instructions · Fishon Captain

## Platform Snapshot

Fishon Captain is the **management dashboard** for captains and charter operators, built with Next.js 15 (App Router) + Prisma + NextAuth. This is one of three interconnected Fishon applications:

- **Fishon Captain (this app)**: Internal dashboard for captains/admins; data feeds Fishon.my's public marketplace
- **Fishon.my**: Customer-facing marketplace where anglers discover and book charters
- **Fishon Video Worker**: External video normalization service

## System Configuration

- Please check on /docs/config/\* to see current system configuration file.
- It's either in Fishon Captain or Fishon Market repository depending on where the main implementation is.
- Treat this document as a living document and update it as necessary when you make changes to the system configuration.

### Admin Tools (`docs/config/ADMIN_TOOLS_SYSTEM.md`)

- **Video Moderation**: Side-by-side comparison of original vs normalized video metadata.
- **Storage Inventory**: Track all video assets (original, thumbnail, 720p) and their relationships.
- **API Cleanup**: Removal of legacy endpoints and consolidation of worker routes.
- **Security**: Role-based access (STAFF/ADMIN), rate limiting, and audit logging for all sensitive actions.

### Authentication (`docs/config/AUTHENTICATION_SYSTEM.md`)

- **Stack**: NextAuth v4 + Prisma Adapter + JWT sessions.
- **Methods**: OAuth (Google, Facebook, Apple), Credentials (Email/Password).
- **Security**: MFA (TOTP), Email Verification (OTP), Password Reset (OTP), Account Lockout (5 failed attempts).
- **Roles**: CAPTAIN, STAFF, ADMIN.

### Booking System (`docs/config/BOOKING_SYSTEM.md`)

- **Dual Flows**:
  - **MANUAL**: Request → Captain Approve → Pay (48h deadline).
  - **AUTO**: Pay Upfront → Captain Acknowledge (24h deadline).
- **Payment**: SenangPay integration (Card Tokenization for MANUAL, Direct FPX/E-Wallet for AUTO).
- **Webhooks**: `booking.created`, `booking.approved`, `booking.acknowledged`, `booking.paid`, `booking.rejected`, `booking.cancelled`.
- **Expiry**: Auto-expiry for approval, payment, and acknowledgment deadlines.

### Captain Payouts (`docs/config/CAPTAIN_PAYOUT_SYSTEM.md`)

- **Commission Tiers**: BASIC (10%), SILVER (8%), GOLD (5%) based on pricing plan.
- **Trigger**: Trip completion (booking status = COMPLETED).
- **Eligibility**: 3 business days after trip completion.
- **Processing**: Manual weekly batches by admin (startup phase).
- **Dashboard**: Earnings overview, pending payouts, transaction history.

### Charter Registration (`docs/config/CHARTER_REGISTRATION_SYSTEM.md`)

- **Wizard**: 8-step registration process with Zod validation.
- **Drafts**: Auto-save with optimistic locking (`x-draft-version` header).
- **Media**: Direct Vercel Blob uploads for photos and videos.
- **Configuration**: Dashboard for managing booking flows, availability, and media.

### Dashboard & Analytics (`docs/config/DASHBOARD_ANALYTICS_SYSTEM.md`)

- **Metrics**: Real-time booking stats, earnings, and charter performance.
- **Alerts**: Priority actionable items (new requests, upcoming trips, deadlines).
- **Privacy**: Direct database analytics (no third-party tracking).
- **Views**: 7-day, 30-day, and 90-day periods.

### Email & Notifications (`docs/config/EMAIL_NOTIFICATION_SYSTEM.md`)

- **Dual Channel**: Email (Zoho SMTP) + Real-time (Pusher).
- **Templates**: Flow-aware templates (MANUAL vs AUTO) in `@fishon/email`.
- **Events**: Booking lifecycle events trigger specific notifications.

### Operational Calendar (`docs/config/OPERATIONAL_CALENDAR_SYSTEM.md`)

- **Management**: Daily operating hours, unavailable dates, seasonal schedules.
- **Visuals**: Color-coded calendar (Available, Booked, Unavailable).
- **Sync**: Updates availability for fishon-market.

### Video Upload System (`docs/config/VIDEO_UPLOAD_SYSTEM.md`)

- **Client**: Trimming (≤30s), queue-based uploads (IndexedDB), retry logic.
- **Server**: Dual pipeline (New + Legacy), external worker for normalization (720p).
- **Status**: `queued` → `processing` → `ready` | `failed` | `cancelled`.

### Architecture Highlights

- Domain logic lives in feature modules (e.g. `src/features/charter-onboarding`) that bundle `schema.ts`, `server/`, `components/`, `hooks/`, `__tests__/`, and README guidance
- Import via barrels like `@features/charter-onboarding`
- Middleware (`src/middleware.ts`) gates `/captain/*` and `/staff/*` routes; staff pages require STAFF or ADMIN roles
- PostgreSQL view `v_public_charters` exposes charter data to fishon-market (primary data source)
- Public v1 API at `/api/public/v1/charters` serves as fallback data source for fishon-market
- v1 API endpoints: `/api/public/v1/charters` (list), `/api/public/v1/charters/:id` (detail), `/api/public/v1/charters/:id/availability` (availability)
- All legacy `/api/public/charters/*` endpoints have been removed and replaced with v1

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
npm run db:migrate:safe <migration-name> # SAFE migration with auto-backup
npx prisma migrate dev
npx prisma generate
npx prisma studio
npm run migrate:drift-heal  # Schema drift healing
```

## Database Backup & Migration Safety

**CRITICAL**: Always backup before database migrations. We learned this lesson the hard way after a data loss incident.

### Backup Strategy

The project includes automated backup scripts to prevent data loss during migrations:

#### Quick Reference

```bash
# Safe migration (RECOMMENDED - auto-backup + review + apply)
npm run db:migrate:safe migration-name

# Manual backup
npm run db:backup backup-name

# Restore from backup
npm run db:restore ./backups/backup-file.sql.gz
```

#### Migration Workflow (ALWAYS USE THIS)

1.  **Before any schema change**: Create a backup
    `npm run db:backup pre-migration`
2.  **Make schema changes**: Edit `prisma/schema.prisma`
3.  **Run safe migration**: Auto-backup, review SQL, confirm, apply
    `npm run db:migrate:safe add_user_field`
4.  **Verify migration**: Check database and run tests
    `npm run typecheck`
    `npm test`

#### Backup Scripts Location

All scripts are in `scripts/` directory:

- **`backup-db.sh`**: Creates timestamped, compressed backups
  - Stores in `./backups/` directory
  - Auto-cleanup: keeps last 10 backups
  - Compression: gzip for space efficiency
- **`restore-db.sh`**: Restores from backup file
  - Lists available backups if none specified
  - Creates safety backup before restore
  - Requires "yes" confirmation to prevent accidents
- **`safe-migrate.sh`**: Complete migration workflow
  - Step 1: Auto-backup (pre-{migration}\_{timestamp})
  - Step 2: Create migration (--create-only)
  - Step 3: Show SQL for review
  - Step 4: Apply after user confirmation
  - Provides rollback instructions on failure

#### Critical Rules

**NEVER DO THIS:**

- ❌ `npx prisma migrate reset` on databases with important data
- ❌ Run migrations without reviewing the SQL first
- ❌ Skip backups "just this once"
- ❌ Edit migration files directly after creation

**ALWAYS DO THIS:**

- ✅ Use `npm run db:migrate:safe` for all migrations
- ✅ Review migration SQL before applying
- ✅ Keep backups in `./backups/` (gitignored)
- ✅ Test migrations on development/staging first
- ✅ Check Neon dashboard for point-in-time restore options

#### Emergency Rollback

If a migration fails or causes issues:

```bash
# 1. List available backups
ls -lh ./backups/

# 2. Restore from pre-migration backup
npm run db:restore ./backups/pre-migration_TIMESTAMP.sql.gz

# 3. Regenerate Prisma client
npx prisma generate

# 4. Fix the schema issue
# Edit prisma/schema.prisma

# 5. Try migration again
npm run db:migrate:safe fixed-migration-name
```

#### Neon-Specific Features

Neon PostgreSQL provides additional safety:

- **Point-in-Time Restore**: Available in Neon dashboard (last 7 days, varies by plan)
- **Branching**: Create test branch for migration testing

  ```bash
  # Install Neon CLI
  npm install -g neonctl

  # Create test branch
  neonctl branches create --name test-migration

  # Test migration on branch, then apply to main if successful
  ```

- **Automatic Snapshots**: Check Neon dashboard for available restore points

#### Backup Schedule Recommendations

- **Development**: Before each migration (automated with `safe-migrate.sh`)
- **Staging**: Daily automated backups + before deployments
- **Production**: Use Neon's built-in backups + daily S3 backups for compliance

#### Documentation

For complete documentation, see: `scripts/README.md`

- Usage examples for all scripts
- Troubleshooting guide
- Neon-specific features
- Advanced backup strategies

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

## Terminal

You have access to a terminal where you can run commands. Follow instructions in `.github/terminal.instructions.md` when using the terminal.

Need clarification or spot gaps? Ask which sections feel incomplete so we can refine this guide.

```

```

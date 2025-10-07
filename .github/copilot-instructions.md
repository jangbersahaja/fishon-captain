# Copilot Instructions: FishOn Captain Registration

## System Context

This is the **captain management backend** for the **Fishon.my e-commerce ecosystem**:

- **Fishon.my** (main site) → Marketplace where charters are published, with booking system and transactions (angler-facing frontend)
- **Fishon Captain** (this app) → Management dashboard for captains and admin staff (backend operations)

Data flows from Captain → Main site for public charter listings and bookings.

## Architecture Overview

This is a **Next.js 15 + Prisma + NextAuth** captain management platform with a sophisticated **draft-to-finalize workflow**. The core pattern is:

1. **Multi-step forms** save drafts automatically (`CharterDraft` model)
2. **Media uploads** go to staging (`PendingMedia`) then get attached on finalize
3. **Video uploads** use Enhanced Video Pipeline (`CaptainVideo` for 30s trimmed clips)
4. **Server validation** layers: Zod schemas → feature validation → DB constraints
5. **Feature modules** under `src/features/` contain domain logic co-located with UI

## Dual-Purpose Captain Form

The **charter onboarding form** serves **two distinct purposes** with different endpoints:

1. **New Registration**: `POST /api/charter-drafts` → `POST /api/charter-drafts/:id/finalize`
2. **Charter Editing**: Uses existing charter data → different validation/submission flow

**Key consideration**: Form behavior changes based on context (new vs edit mode) - always check the form's initialization state.

## Critical Workflows

### Development Environment

```bash
npm run dev --turbopack  # Start with Turbopack for faster builds
npm run check:env        # Validate required environment variables
npm test                 # Run Vitest test suite
npm run typecheck        # TypeScript validation (runs in prebuild)
```

### Database Operations

```bash
npx prisma migrate dev --name "descriptive_change_name"  # Create + apply migration
npx prisma generate      # Regenerate client after schema changes
npx prisma studio        # Visual database browser
```

### Draft → Charter Flow

- `POST /api/charter-drafts` → Creates draft with default values
- `PATCH /api/charter-drafts/:id` → Autosave with conflict resolution via `clientVersion`
- `POST /api/charter-drafts/:id/finalize` → Converts draft to `Charter` record

## Project Structure Patterns

### Feature Modules (`src/features/`)

Self-contained domains with:

- `schema.ts` - Zod validation schemas
- `server/` - Backend validation, mapping, diffing
- `components/` - UI components
- `hooks/` - React state management
- `__tests__/` - Unit tests
- `README.md` - Feature documentation

**Import via barrel**: `@features/charter-onboarding` not deep paths.

### Data Layer Conventions

- **Draft persistence**: Local storage + server drafts with version conflicts
- **Media staging**: `PendingMedia` → `CharterMedia` on finalize (legacy general media)
- **Video pipeline**: `CaptainVideo` model for 30s trimmed clips (Enhanced Video Pipeline)
- **Audit logging**: Use `writeAuditLog(actorUserId, entityType, entityId, action, before, after)`
- **Rate limiting**: `rateLimit({ key, windowMs, max })` with pluggable stores

### API Route Patterns

```typescript
// Standard structure for protected endpoints
export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return applySecurityHeaders(/* 401 response */);

  const rl = await rateLimit({
    key: `action:${userId}`,
    windowMs: 60_000,
    max: 5,
  });
  if (!rl.allowed) return applySecurityHeaders(/* 429 response */);

  // Business logic with timing
  const result = await withTiming("operation_name", () => businessLogic());

  return applySecurityHeaders(NextResponse.json({ result, requestId }));
}
```

## Video Upload System

**Enhanced Video Pipeline**: Uses sophisticated queue system with:

- **30-second trim constraints** with client-side keyframe detection (`VideoTrimModal`)
- **Queue persistence** via IndexedDB (`VideoUploadQueue` class)
- **Concurrent uploads** with pause/resume capabilities
- **Direct `CaptainVideo` storage** (bypasses `PendingMedia` staging)

**Migration Status**: Currently migrating from legacy `VideoUploader` to `EnhancedVideoUploader`. The enhanced system is production-ready but not fully deployed across all forms.

**Key files**:

- `src/lib/uploads/videoQueue.ts` - Core queue implementation
- `src/components/captain/EnhancedVideoUploader.tsx` - Production UI component
- `src/hooks/useVideoQueue.ts` - React integration

## Authentication & Authorization

- **NextAuth** with JWT strategy
- **Middleware protection**: `/captain/*` and `/staff/*` require auth
- **Admin overrides**: `?adminUserId=xyz` param for admin users to access other users' drafts

## User Roles & Access Control

The app serves **two distinct user types**:

1. **CAPTAIN** → Manage their own charter assets (create/edit charters, upload media, manage bookings)
2. **ADMIN/STAFF** → Manage all captains and their assets (ultimate control, can access any captain's data via `?adminUserId=xyz`)

**Critical middleware behavior**: `/captain/*` requires CAPTAIN+ role, `/staff/*` requires STAFF+ role with ADMIN having ultimate access.

## Testing Strategy

- **Vitest** with jsdom environment
- **Pattern**: Tests live in `__tests__/` subdirectories near source code
- **Mocking**: Comprehensive mocks for IndexedDB, XMLHttpRequest, Prisma
- **CI command**: `npm run test:ci` for optimized reporter

## Environment Variables

**Required for development**:

```env
DATABASE_URL=postgres://...
NEXTAUTH_SECRET=long-random-string
GOOGLE_CLIENT_ID=oauth-client-id
GOOGLE_CLIENT_SECRET=oauth-secret
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=browser-key
```

**Key restrictions**: Separate browser vs server Google API keys for security.

## Code Conventions

- **Path aliases**: `@/` for src root, `@features/` for feature modules
- **Error handling**: Zod validation → `getFieldError` for form traversal
- **Logging**: Structured JSON with `logger.info("event_name", { metadata })`
- **Security**: All API responses use `applySecurityHeaders()`
- **Timing**: Instrument slow operations with `withTiming("metric_name", fn)`

## Legacy Migration Notes

- **Draft system** replacing one-shot `submitCharter` action (deprecation in progress)
- **EnhancedVideoUploader** replacing legacy `VideoUploader` components
- **Feature modules** centralizing scattered server utilities

When modifying forms, always update both the Zod schema and the sanitization logic in the corresponding feature module.

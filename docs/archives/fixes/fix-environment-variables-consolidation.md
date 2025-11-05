---
type: fix
status: completed
updated: 2025-01-19
feature: environment-variables
author: copilot
---

# Environment Variables Consolidation

## Problem Statement

The Fishon platform had confusing and inconsistent environment variables between `fishon-market` and `fishon-captain` apps, causing integration failures and developer confusion:

1. **Webhook Secret Mismatch**: `CAPTAIN_WEBHOOK_SECRET` had different values in both apps, causing auth failures
2. **URL Variable Confusion**: 6 different URL variables pointing to the captain app with unclear purposes
3. **Inconsistent Naming**: Mixed naming patterns for integration variables
4. **No Documentation**: No inline guidance on variable purposes or naming conventions

## Solution Overview

Executed a three-phase consolidation:

- **Phase 1**: Fixed webhook secret mismatch
- **Phase 2**: Simplified URL variables
- **Phase 3**: Added comprehensive naming documentation

Additional improvements:

- Created type-safe environment validation (`env.ts`)
- Updated environment checking scripts
- Removed redundant GitHub Actions CI (Vercel handles validation)

## Changes Made

### Phase 1: Webhook Secret Consolidation

**Problem**: Different secrets in both apps

```bash
# fishon-market/.env.local (OLD)
CAPTAIN_WEBHOOK_SECRET="jw4nkb..."

# fishon-captain/.env.local (OLD)
CAPTAIN_WEBHOOK_SECRET="tklqnF..."
```

**Solution**: Consolidated to `CAPTAIN_API_SECRET` with matching values

```bash
# Both apps now use:
CAPTAIN_API_SECRET="<same-secret-in-both-apps>"
```

**Files Updated** (9 files):

- `fishon-market/.env.local` - Changed variable name and value
- `fishon-captain/.env.local` - Changed variable name
- `fishon-market/src/app/api/bookings/create/route.ts`
- `fishon-market/src/app/api/bookings/create-guest/route.ts`
- `fishon-market/src/app/api/bookings/approve/route.ts`
- `fishon-market/src/app/api/bookings/reject/route.ts`
- `fishon-market/src/app/api/bookings/pay/route.ts`
- `fishon-market/src/app/api/bookings/cancel/route.ts`
- `fishon-market/src/app/api/bookings/status-webhook/route.ts`

### Phase 2: URL Variable Simplification

**Problem**: Too many URL variables with unclear purposes

```bash
# OLD - 6 confusing variables
CAPTAIN_API_URL=
FISHON_CAPTAIN_URL=
NEXT_PUBLIC_CAPTAIN_API_URL=
NEXT_PUBLIC_CAPTAIN_URL=
CAPTAIN_API_BASE_URL=
FISHON_CAPTAIN_API_URL=
```

**Solution**: Reduced to 3 clear variables with specific purposes

```bash
# NEW - 3 clear variables
FISHON_CAPTAIN_API_URL=http://localhost:3000  # Server-side API calls
NEXT_PUBLIC_CAPTAIN_URL=http://localhost:3000  # Client-side calls (browser)
CAPTAIN_WEBHOOK_URL=http://localhost:3000/api/webhooks/booking  # Webhook endpoint
```

**Files Updated** (5 files):

- `fishon-market/.env.local` - Consolidated URL variables
- `fishon-market/.env.example` - Updated template
- `fishon-market/src/app/api/bookings/pay/route.ts` - Updated URL usage
- `fishon-market/src/app/api/bookings/cancel/route.ts` - Updated URL usage
- `fishon-market/src/lib/api/availability-api.ts` - Updated to use `NEXT_PUBLIC_CAPTAIN_URL`

### Phase 3: Naming Convention Documentation

Added comprehensive inline documentation to all environment files:

**Naming Patterns**:

```bash
# Pattern: FISHON_{APP}_*
FISHON_CAPTAIN_API_URL=    # Server-side captain API
FISHON_MARKET_API_URL=     # Server-side market API

# Pattern: NEXT_PUBLIC_*
NEXT_PUBLIC_CAPTAIN_URL=   # Client-side captain URL
NEXT_PUBLIC_BASE_URL=      # Client-side market URL

# Pattern: CAPTAIN_*
CAPTAIN_API_SECRET=        # Shared secret (must match both apps)
CAPTAIN_WEBHOOK_URL=       # Webhook endpoint
FISHON_CAPTAIN_API_KEY=    # Public API key (must match both apps)
```

**Files Updated** (4 files):

- `fishon-market/.env.local` - Added naming guide
- `fishon-market/.env.example` - Added naming guide
- `fishon-captain/.env.local` - Added naming guide
- `fishon-captain/.env.example` - Added naming guide

### Type Safety Improvements

Created centralized environment validators:

**fishon-captain/src/lib/env.ts**:

```typescript
const ServerEnvShape = {
  // ... existing vars ...
  FISHON_MARKET_API_URL: z.string().url().optional(),
  CAPTAIN_API_SECRET: z.string().min(32).optional(),
  FISHON_CAPTAIN_API_KEY: z.string().min(32).optional(),
  // ...
};
```

**fishon-market/src/lib/env.ts** (NEW):

```typescript
// Comprehensive validation for all environment variables
// Database, Auth, Integration, Email, Pusher, etc.
```

### Validation Scripts

**fishon-captain/scripts/check-env.js**:

- Added Fishon integration variables to `OPTIONAL` array:
  - `FISHON_MARKET_API_URL`
  - `CAPTAIN_API_SECRET`
  - `FISHON_CAPTAIN_API_KEY`
  - `MARKET_DATABASE_URL`

**fishon-market/scripts/check-env.js** (NEW):

- Created comprehensive environment checker
- Validates all required variables
- Checks for placeholder values
- Displays summary table

**Usage**:

```bash
# Both apps now have:
npm run check:env
```

### CI/CD Cleanup

**Removed GitHub Actions CI** (both apps):

- Deleted `.github/workflows/ci.yml`
- Deleted `test-ci.sh` scripts
- Removed `test:ci` from package.json scripts

**Rationale**: Vercel already validates:

- TypeScript compilation
- Environment variables
- Database connections
- Build process

## Integration Architecture

### Bidirectional Communication

```
fishon-market (Port 3001)          fishon-captain (Port 3000)
┌─────────────────────────┐        ┌─────────────────────────┐
│                         │        │                         │
│  API Calls →────────────┼───────→│  /api/public/charters   │
│  (FISHON_CAPTAIN_API_URL)       │                         │
│                         │        │                         │
│  ← Webhooks ────────────┼───────→  Booking webhooks       │
│  (CAPTAIN_API_SECRET)   │        │  (CAPTAIN_API_SECRET)   │
│                         │        │                         │
│                         │←───────┼── API Calls             │
│  /api/webhooks/booking  │        │  (FISHON_MARKET_API_URL)│
└─────────────────────────┘        └─────────────────────────┘
```

### Critical Matching Variables

These variables **MUST** have identical values in both apps:

1. **CAPTAIN_API_SECRET** - Shared secret for bidirectional service-to-service authentication

   ```bash
   # Generate new secret:
   openssl rand -base64 48

   # Use same value in both apps
   ```

2. **FISHON_CAPTAIN_API_KEY** - Public API key for charter data access

   ```bash
   # Generate new key:
   openssl rand -base64 32

   # Use same value in both apps
   ```

## Testing & Verification

### Verification Checklist

- [x] No remaining `CAPTAIN_WEBHOOK_SECRET` references in codebase
- [x] All booking API routes use `CAPTAIN_API_SECRET`
- [x] URL variables follow naming conventions
- [x] Environment files have inline documentation
- [x] `env.ts` files created with type safety
- [x] `check:env` scripts work in both apps
- [x] GitHub Actions CI removed from both repos

### Manual Testing

```bash
# Test fishon-captain environment
cd /Users/jangbersahaja/Website/fishon-captain
npm run check:env

# Test fishon-market environment
cd /Users/jangbersahaja/Website/fishon-market
npm run check:env
```

## Production Deployment

### Pre-Deployment Checklist

1. **Generate Production Secrets**:

   ```bash
   # Generate CAPTAIN_API_SECRET (both apps)
   openssl rand -base64 48

   # Generate FISHON_CAPTAIN_API_KEY (both apps)
   openssl rand -base64 32

   # Generate NEXTAUTH_SECRET (both apps)
   openssl rand -base64 32
   ```

2. **Update Vercel Environment Variables**:

   **fishon-captain** project:

   ```bash
   CAPTAIN_API_SECRET=<matching-secret>
   FISHON_CAPTAIN_API_KEY=<matching-key>
   FISHON_MARKET_API_URL=https://fishon.my/api
   ```

   **fishon-market** project:

   ```bash
   CAPTAIN_API_SECRET=<matching-secret>
   FISHON_CAPTAIN_API_KEY=<matching-key>
   FISHON_CAPTAIN_API_URL=https://captain.fishon.my/api
   NEXT_PUBLIC_CAPTAIN_URL=https://captain.fishon.my
   CAPTAIN_WEBHOOK_URL=https://captain.fishon.my/api/webhooks/booking
   ```

3. **Verify Matching Secrets**:
   - Ensure `CAPTAIN_API_SECRET` matches in both Vercel projects
   - Ensure `FISHON_CAPTAIN_API_KEY` matches in both Vercel projects
   - Double-check production URLs have HTTPS

4. **Test Integration**:
   - Create test booking in production
   - Verify webhook delivery
   - Check captain dashboard receives notification

## Documentation Updates

All documentation now references correct variable names:

- ✅ `CAPTAIN_API_SECRET` (not `CAPTAIN_WEBHOOK_SECRET`)
- ✅ `FISHON_CAPTAIN_API_URL` for server-side calls
- ✅ `NEXT_PUBLIC_CAPTAIN_URL` for client-side calls

## Lessons Learned

1. **Document Inline**: Add comments directly in `.env` files explaining variable purposes
2. **Consolidate Shared Secrets**: Use single variable name for bidirectional auth
3. **Respect Third-Party Naming**: Keep standard names like `NEXTAUTH_SECRET` unchanged
4. **Type Safety**: Create `env.ts` validators for better DX and early error detection
5. **Avoid Redundant CI**: Leverage platform-native validation (Vercel) instead of duplicating with GitHub Actions

## Future Improvements

1. **Migrate to Typed Env**: Gradually replace `process.env` with typed imports from `env.ts`
2. **Automate Secret Rotation**: Implement secret rotation strategy for production
3. **Add Runtime Checks**: Validate environment on app startup, not just build time
4. **Centralize Integration Config**: Consider shared package for integration constants

## Related Documentation

- `.env.local` files in both repositories contain detailed inline documentation
- `src/lib/env.ts` files provide TypeScript type safety
- `scripts/check-env.js` scripts validate local development environments

---

**Status**: ✅ Completed and production ready
**Impact**: Fixed critical webhook auth failures, improved developer experience, simplified integration
**Breaking Changes**: Renamed `CAPTAIN_WEBHOOK_SECRET` to `CAPTAIN_API_SECRET`

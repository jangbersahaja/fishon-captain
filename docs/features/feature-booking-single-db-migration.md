---
type: feature
status: in-progress
updated: 2025-10-23
feature: booking-integration
author: copilot
---

# Booking System: Single Database Migration

## Goal

Migrate from dual-database webhook architecture to single database (Market DB) with read-only access from Captain app.

## Architecture Change

### Before (Dual Database + Webhooks)

```
Market DB (Bookings) --webhook--> Captain DB (Bookings copy)
Captain reads from local copy
Captain updates via webhook callback to Market
```

### After (Single Database + Read-Only)

```
Market DB (Bookings) <--read-only-- Captain App
Captain reads directly from Market DB
Captain updates via Market API
```

## Progress Tracking

### Phase 1: Cleanup Captain DB ✅

- [ ] Remove Booking model from captain Prisma schema
- [ ] Remove BookingStatus enum from captain schema
- [ ] Revert migration properly (avoid drift)
- [ ] Remove webhook endpoints from captain API
- [ ] Remove booking page from captain (temporary)

### Phase 2: Setup Read-Only Access

- [ ] Create read-only PostgreSQL user in Market DB
- [ ] Add MARKET_DATABASE_URL to captain .env
- [ ] Create prisma-market.ts client in captain app
- [ ] Create market-db.ts with read queries
- [ ] Test connection and queries

### Phase 3: Implement Booking Service

- [ ] Create booking-service.ts (DB → API fallback)
- [ ] Implement getBookings(captainCharterId)
- [ ] Implement getBookingById(id)
- [ ] Add captain filtering logic

### Phase 4: Rebuild Captain Booking Page

- [ ] Create new booking page using market-db service
- [ ] Filter bookings by captain's charters
- [ ] Implement approve/reject via Market API
- [ ] Add proper error handling

### Phase 5: Testing & Documentation

- [ ] Test read-only access (ensure no writes possible)
- [ ] Test approve/reject flow
- [ ] Test error cases (DB down, network issues)
- [ ] Create user guide documentation

## Technical Notes

### Database Users

- Market DB primary: `neondb_owner` (full access)
- Captain read-only: `captain_readonly` (SELECT only)

### Environment Variables

```bash
# fishon-captain
MARKET_DATABASE_URL="postgresql://captain_readonly:password@host/neondb"

# fishon-market (unchanged)
DATABASE_URL="postgresql://neondb_owner:password@host/neondb"
```

### Security

- Captain app uses read-only DB user (cannot write/delete)
- Status updates go through Market API (with authentication)
- No webhook secrets needed anymore

## Current Status

### Phase 1: ✅ COMPLETE

- Removed Booking model and BookingStatus enum from captain schema
- Removed tables using `npx prisma db push` (no migration drift)
- Regenerated Prisma client
- Removed old webhook endpoints
- Removed old booking page

### Phase 2: ✅ COMPLETE

- Created separate Prisma schema for Market DB (`prisma/schema-market.prisma`)
- Generated Market DB client to `node_modules/.prisma/client-market`
- Created `prisma-market.ts` client connection
- Created `market-db.ts` with read queries
- Created SQL script for read-only user (`prisma/create-readonly-user.sql`)
- Type checking passes

### Phase 3: ✅ COMPLETE

- Created `booking-service.ts` with unified API
- Implemented getCaptainBookings, getBookingStats functions
- Implemented approveBooking, rejectBooking API calls

### Phase 4: ⚠️ IN PROGRESS - File System Issue

- Created `BookingActions.tsx` client component ✅
- **BLOCKED**: `page.tsx` creation encountering file corruption
  - Files being merged/appended instead of created cleanly
  - Need to resolve before continuing

### Next Steps:

1. Fix file creation issue for page.tsx
2. Test booking page renders without errors
3. Create approve/reject API endpoints in Market app
4. Test end-to-end booking flow
5. Update progress doc with final status

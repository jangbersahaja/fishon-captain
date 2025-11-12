# Fishon Captain Database Schema Cleanup Plan

**Created**: November 12, 2025  
**Status**: Planning Phase  
**Constraint**: Must maintain `v_public_charters` view compatibility with fishon-market

## Executive Summary

The fishon-captain database has accumulated technical debt from rapid feature development and an incomplete ownership migration (Phase 2). This plan addresses:

1. **Media schemas** - Triple ownership tracking (ownerId/captainId/charterId), dual video-charter relationships
2. **Trip storage** - 3 unnecessary junction tables for simple string arrays
3. **User/Captain relations** - Incomplete migration from captainId to ownerId
4. **Crew system** - Over-engineered for current business needs
5. **v_public_charters view** - Critical constraint blocking cleanup

**Method**: Create fresh clean schema in new database, migrate data with zero downtime, maintain view compatibility.

---

## Phase 1: Planning & Analysis ✅

**Objective**: Document current state, identify all dependencies, create migration strategy.

### Completed Research

- ✅ Analyzed all 4 problem areas (media, trips, user/captain, crew)
- ✅ Documented v_public_charters view dependencies
- ✅ Identified migration complexity (low/medium/high risk)
- ✅ Created cleanup priority matrix

### Key Findings

**Critical Blocker**: `v_public_charters` view uses `Charter.captainId` (INNER JOIN). Cannot remove until:

1. fishon-market updated to handle view changes
2. View migrated to use `ownerId` instead
3. End-to-end testing completed

**Technical Debt Metrics**:

- 3 redundant ownership fields (ownerId, captainId, charterId) across media models
- 3 unnecessary junction tables (TripStartTime, TripSpecies, TripTechnique)
- 2 ways to link videos to charters (direct FK + junction table)
- 2 nearly identical junction tables (CharterCaptain, CharterCrew)

---

## Phase 2: Ownership Migration Completion (HIGH PRIORITY)

**Dependencies**: Phase 8 from original migration (fishon-market integration)

### 2A. Update v_public_charters View

**Objective**: Switch view from `captainId` to `ownerId` while maintaining backward compatibility.

**Files to Modify**:

- `scripts/update_v_public_charters_with_schedule.sql`
- Add migration script: `prisma/migrations/YYYYMMDD_view_use_ownerId/migration.sql`

**Current**:

```sql
FROM "Charter" c
INNER JOIN "CaptainProfile" cp ON c."captainId" = cp.id
```

**New**:

```sql
FROM "Charter" c
INNER JOIN "User" u ON c."ownerId" = u.id
LEFT JOIN "CaptainProfile" cp ON u.id = cp."userId"
```

**Changes**:

- Replace `captain` object with `owner` object (User fields)
- Keep `captainProfile` optional for backward compat
- Update fishon-market to read from new structure

**Steps**:

1. Write new view SQL with ownerId
2. Create migration script
3. Test in development
4. Deploy to staging, verify fishon-market works
5. Deploy to production with rollback plan

**Tests to Write**:

- View returns all active charters
- Owner fields populated correctly
- fishon-market queries work without changes
- Performance comparable (add indexes if needed)

### 2B. Make ownerId Required

**Objective**: Remove optional ownerId, make it required (non-nullable).

**Files to Modify**:

- `prisma/schema.prisma`:
  - `Charter.ownerId: String` (remove `?`)
  - `CharterMedia.ownerId: String` (remove `?`)
  - `CaptainVideo.ownerId: String` (remove `?`)

**Prerequisites**:

- All existing records have ownerId populated (verified ✅)
- View migration complete
- fishon-market updated

**Steps**:

1. Create migration: `npx prisma migrate dev --name make_ownerId_required`
2. Verify migration SQL: `ALTER COLUMN "ownerId" SET NOT NULL`
3. Run migration in development
4. Test all charter creation/edit flows
5. Deploy to production

**Tests to Write**:

- Cannot create Charter without ownerId
- Cannot create CharterMedia without ownerId
- Cannot create CaptainVideo without ownerId
- Existing queries still work

### 2C. Remove captainId Fields

**Objective**: Remove redundant captainId from Charter, CharterMedia, CaptainVideo.

**Files to Modify**:

- `prisma/schema.prisma`:
  - Remove `Charter.captainId` and `charter` relation to CaptainProfile
  - Remove `CharterMedia.captainId` and `captain` relation
  - Remove `CaptainVideo.captainId` and `captain` relation
- Code search for `captainId` (expect ~50+ matches):
  - Replace with `ownerId` queries
  - Remove "Phase 2" comments
  - Update all API routes reading/writing captainId

**Critical Files** (from research):

- `src/app/api/charter-drafts/[id]/finalize/route.ts` (Lines 221, 231, 238, 409)
- `src/app/api/media/photo/route.ts` (Line 55)
- `src/app/api/blob/finish/route.ts` (Line 196)
- Search for: `"captainId.*ownerId|ownerId.*captainId"` (10+ matches)

**Steps**:

1. Create branch: `chore/remove-captainId-fields`
2. Remove from schema
3. Generate migration: `npx prisma migrate dev --name remove_captainId_fields`
4. Update all code references (batch replace recommended)
5. Run typecheck: `npm run typecheck`
6. Run tests: `npm test`
7. Manual QA on all charter/media flows
8. Deploy

**Tests to Write**:

- All charter queries use ownerId
- Media uploads associate with ownerId
- Video finish API uses ownerId
- Draft finalization uses ownerId
- No TypeScript errors

**Risk**: HIGH (touches many files)  
**Rollback**: Revert migration, restore captainId columns

---

## Phase 3: Trip Storage Simplification (MEDIUM PRIORITY)

**Objective**: Replace 3 junction tables with JSON arrays in Trip model.

### 3A. Add JSON Array Columns

**Files to Modify**:

- `prisma/schema.prisma`:

  ```prisma
  model Trip {
    // ... existing fields ...
    startTimes String[] @default([])
    species    String[] @default([])
    techniques String[] @default([])

    // Mark for removal:
    // startTimesLegacy TripStartTime[]
    // speciesLegacy    TripSpecies[]
    // techniquesLegacy TripTechnique[]
  }
  ```

**Steps**:

1. Add array columns (allow null initially)
2. Create migration
3. Write data migration script to populate arrays from junction tables
4. Verify data integrity (count matches)

**Tests to Write**:

- Trip creation with arrays works
- Trip updates preserve arrays
- Data migration script populates all trips correctly

### 3B. Update v_public_charters View

**Critical**: Must maintain JSON structure for fishon-market compatibility.

**Current**:

```sql
'startTimes', (
  SELECT jsonb_agg(jsonb_build_object('value', tst.value))
  FROM "TripStartTime" tst
  WHERE tst."tripId" = t.id
)
```

**New**:

```sql
'startTimes', (
  SELECT jsonb_agg(jsonb_build_object('value', v))
  FROM unnest(t."startTimes") AS v
)
```

**Alternative** (simpler, but requires fishon-market update):

```sql
'startTimes', to_jsonb(t."startTimes")
-- Returns: ["07:00", "09:00"] instead of [{"value": "07:00"}, {"value": "09:00"}]
```

**Decision needed**: Keep `{value}` wrapper for backward compat or simplify?

**Steps**:

1. Update view SQL
2. Test in development
3. Verify fishon-market charter detail pages work
4. Verify fishon-market search/filters work
5. Deploy view update
6. Monitor fishon-market error logs

### 3C. Remove Junction Tables

**Prerequisites**:

- Array columns populated
- View updated and tested
- fishon-market verified working

**Files to Modify**:

- `prisma/schema.prisma`: Remove models `TripStartTime`, `TripSpecies`, `TripTechnique`

**Steps**:

1. Remove from schema
2. Generate migration: `npx prisma migrate dev --name remove_trip_junction_tables`
3. **Review migration SQL** - should be `DROP TABLE`
4. Run in development
5. Test all trip queries/mutations
6. Deploy

**Tests to Write**:

- Trip creation/updates work with arrays
- Charter detail API returns correct trip data
- Draft finalization handles trip arrays

**Rollback**: Restore junction tables, re-migrate data

---

## Phase 4: Video-Charter Junction Cleanup (MEDIUM PRIORITY)

**Objective**: Remove legacy `CaptainVideo.charterId` FK, use `CharterVideo` junction table exclusively.

### 4A. Audit Current Usage

**Research Questions**:

1. Is `CaptainVideo.charterId` still populated by finish API?
2. Do any queries use direct charterId FK?
3. Does CharterVideo junction have complete data?

**Steps**:

1. Search codebase: `grep -r "charterId" src/`
2. Check video finish API: `src/app/api/blob/finish/route.ts`
3. Check video listing queries: `src/app/api/media/video/*`
4. Verify junction table populated: SQL query count mismatch

**Expected**: Junction table has all videos, charterId FK redundant.

### 4B. Update Code to Use Junction Only

**Files to Modify**:

- `src/app/api/blob/finish/route.ts`: Remove charterId from CaptainVideo creation
- Video query APIs: Use `CharterVideo` join instead of direct FK
- Any code checking `video.charterId` directly

**Steps**:

1. Create branch: `chore/video-junction-cleanup`
2. Update finish API to not set charterId
3. Update all video queries to use junction
4. Test video upload → charter association flow
5. Verify videos appear on charter detail pages

**Tests to Write**:

- Video upload creates CharterVideo junction record
- Video upload does NOT set captainId on CaptainVideo
- Charter video queries use junction table
- Video order preserved

### 4C. Remove charterId FK

**Files to Modify**:

- `prisma/schema.prisma`:

  ```prisma
  model CaptainVideo {
    // Remove:
    // charterId String?
    // charter   Charter? @relation("LegacyCharterVideos", fields: [charterId], references: [id])

    // Keep:
    charters CharterVideo[] // Junction table
  }

  model Charter {
    // Remove:
    // videos CaptainVideo[] @relation("LegacyCharterVideos")

    // Keep:
    charterVideos CharterVideo[]
  }
  ```

**Steps**:

1. Remove from schema
2. Generate migration
3. Deploy

**Risk**: MEDIUM (video display broken if code not updated)  
**Rollback**: Restore FK, repopulate charterId from junction table

---

## Phase 5: Media Model Consolidation (LOW PRIORITY)

**Objective**: Merge `BoatImage` into `CharterMedia`, simplify media architecture.

### 5A. Extend CharterMedia Model

**Rationale**: Boats are part of charters. Separate BoatImage model is unnecessary.

**Files to Modify**:

- `prisma/schema.prisma`:

  ```prisma
  model CharterMedia {
    id         String
    charterId  String?
    boatId     String?  // NEW: Link to boat
    mediaType  String   // "CHARTER_PHOTO" | "BOAT_PHOTO" | "CAPTAIN_AVATAR"
    url        String
    storageKey String
    sortOrder  Int @default(0)
    // ... other fields ...

    charter Charter? @relation(...)
    boat    Boat?    @relation(fields: [boatId], references: [id])
  }

  model Boat {
    // Remove: BoatImage[] relation
    // Add: media CharterMedia[]
  }

  // Remove: model BoatImage
  ```

**Benefits**:

- Single media table (simpler queries)
- Consistent media handling
- Unified sortOrder system

**Drawback**: Boat images tied to boat, not charter (if boat shared across charters)

### 5B. Migrate BoatImage Data

**Steps**:

1. Create migration script: `INSERT INTO CharterMedia ... SELECT FROM BoatImage`
2. Set `mediaType = 'BOAT_PHOTO'`
3. Preserve sortOrder
4. Verify image count matches

**Tests to Write**:

- All boat images migrated
- Boat detail pages show images
- sortOrder preserved

### 5C. Update Boat Image Queries

**Files to Check**:

- Boat detail components
- Charter detail boat section
- Boat CRUD APIs

**Steps**:

1. Replace `boat.BoatImage[]` with `boat.media[]`
2. Filter by `mediaType = 'BOAT_PHOTO'`
3. Test boat image upload/delete

---

## Phase 6: Crew System Review (LOW PRIORITY)

**Objective**: Decide if crew system is premature, simplify or document.

### Options

#### Option A: Simplify (Mark as Future Feature)

1. Hide crew UI in production (feature flag)
2. Document as "Phase 9" (post-launch)
3. Keep schema but don't actively develop

**When to activate**: After 10+ operators request crew management.

#### Option B: Consolidate Junction Tables

Merge `CharterCaptain` and `CharterCrew` into single `CharterStaff` model:

```prisma
enum StaffType {
  CAPTAIN
  CREW
}

model CharterStaff {
  charterId    String
  staffId      String  // User.id or CrewMember.id
  staffType    StaffType
  role         String?  // CrewRole or "PRIMARY_CAPTAIN"
  isPrimary    Boolean  @default(false)
  isActive     Boolean  @default(true)
  schedule     String?
  compensation Json?
  notes        String?
  startDate    DateTime
  endDate      DateTime?

  charter Charter @relation(...)
}
```

**Benefits**: Single junction table, simpler schema.

#### Option C: Document Current System

Add comprehensive schema comments:

- When to use `CrewMember.userId` vs null
- Difference between `CrewMember.primaryRole` and `CharterCrew.role`
- Cascade delete rules
- Emergency contact rationale

**Recommendation**: **Option A** (defer until validated need).

---

## Phase 7: New Clean Schema Design

**Objective**: Design ideal schema without legacy constraints.

### Principles

1. **Single ownership**: User owns charters (no dual captainId/ownerId)
2. **Consistent media**: Single CharterMedia table with type discriminator
3. **Simple trips**: JSON arrays for startTimes/species/techniques
4. **Clear junctions**: One junction pattern for staff/crew
5. **Extensible**: Room for future features without rewrites

### Proposed Clean Schema (Highlights)

```prisma
model User {
  id            String
  email         String @unique
  role          Role   // CAPTAIN, OPERATOR, CREW, STAFF, ADMIN

  charters      Charter[]
  media         CharterMedia[]
  videos        CaptainVideo[]
  profile       Profile?        // Replaces CaptainProfile
  crewProfile   CrewMember?     // If CREW role
}

model Profile {
  userId        String @unique
  firstName     String
  lastName      String
  displayName   String
  bio           String
  experienceYrs Int
  phone         String
  avatarUrl     String?

  user          User @relation(...)
}

model Charter {
  ownerId    String  // Required, no captainId
  owner      User    @relation(...)
  staff      CharterStaff[]  // Unified junction
  // ... other fields
}

model CharterMedia {
  ownerId   String  // Required
  charterId String?
  boatId    String?
  mediaType String  // "CHARTER_PHOTO" | "BOAT_PHOTO" | etc.
  // No captainId
}

model CaptainVideo {
  ownerId   String  // Required
  // No charterId FK
  charters  CharterVideo[]  // Junction only
}

model Trip {
  startTimes String[] @default([])
  species    String[] @default([])
  techniques String[] @default([])
  // No junction tables
}

model CharterStaff {
  charterId String
  staffId   String  // User.id
  staffType StaffType  // CAPTAIN | CREW
  role      String?
  isPrimary Boolean
  // ... compensation, schedule, etc.
}

// Remove: CharterCaptain, CharterCrew (merged into CharterStaff)
// Remove: TripStartTime, TripSpecies, TripTechnique
// Rename: CaptainProfile → Profile (generic)
```

### Migration Strategy

**Zero-Downtime Approach**:

1. Create new clean database
2. Write migration scripts for each table
3. Run dual-write during transition (old + new DB)
4. Validate data parity
5. Switch read traffic to new DB
6. Stop writes to old DB
7. Decommission old schema

**Rollback**: Keep old DB for 30 days, can revert read traffic.

---

## Phase 8: v_public_charters Future-Proofing

**Objective**: Make view resilient to schema changes.

### Strategies

#### A. Versioned Views

Maintain multiple view versions during transitions:

- `v_public_charters` (current, legacy compat)
- `v_public_charters_v2` (new structure with ownerId)
- `v_public_charters_v3` (simplified trips as arrays)

fishon-market queries specific version, gives time to update.

#### B. View Abstraction Layer

Create stored procedures wrapping view queries:

```sql
CREATE FUNCTION get_public_charters(version INT DEFAULT 1)
RETURNS TABLE (id TEXT, charter JSONB) AS $$
BEGIN
  IF version = 1 THEN
    RETURN QUERY SELECT * FROM v_public_charters;
  ELSIF version = 2 THEN
    RETURN QUERY SELECT * FROM v_public_charters_v2;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

API endpoint specifies version: `/api/public/v1/charters?view_version=2`

#### C. View-Independent API

fishon-market calls `/api/public/v2/charters` API instead of querying view directly:

**Benefits**:

- Schema changes don't break fishon-market
- API can transform data format
- Easier to version

**Drawback**: Slower than direct view query.

**Recommendation**: **Strategy A** (versioned views) - best balance of performance and flexibility.

---

## Migration Checklist

### Pre-Migration

- [ ] Backup production database (`npm run db:backup pre-schema-cleanup`)
- [ ] Document current table/column counts
- [ ] Test view query performance baseline
- [ ] Clone production data to staging
- [ ] Set up monitoring alerts

### Phase 2 (Ownership Completion)

- [ ] Update v_public_charters view to use ownerId
- [ ] Deploy view change to staging
- [ ] Verify fishon-market works with new view
- [ ] Deploy view to production
- [ ] Make ownerId required in schema
- [ ] Deploy schema migration
- [ ] Remove captainId fields
- [ ] Update all code references
- [ ] Deploy code changes
- [ ] Monitor error logs (24 hours)

### Phase 3 (Trip Simplification)

- [ ] Add array columns to Trip
- [ ] Write and test data migration script
- [ ] Run migration in staging
- [ ] Verify trip data integrity
- [ ] Update v_public_charters view for arrays
- [ ] Test fishon-market compatibility
- [ ] Deploy view and schema changes
- [ ] Remove junction tables
- [ ] Monitor error logs (24 hours)

### Phase 4 (Video Junction)

- [ ] Audit charterId usage in code
- [ ] Update finish API to use junction only
- [ ] Update video queries
- [ ] Test video upload flows
- [ ] Deploy code changes
- [ ] Remove charterId FK from schema
- [ ] Deploy schema migration
- [ ] Monitor video displays

### Phase 5 (Media Consolidation)

- [ ] Extend CharterMedia for boat images
- [ ] Write BoatImage migration script
- [ ] Test migration in staging
- [ ] Update boat image queries
- [ ] Deploy migration and code
- [ ] Remove BoatImage model

### Phase 6 (Crew System)

- [ ] Business review: Is crew system needed now?
- [ ] If no: Add feature flag, hide UI
- [ ] If yes: Document usage, add tests

### Phase 7 (New Schema)

- [ ] Create new clean database
- [ ] Design final schema (no legacy)
- [ ] Write migration scripts
- [ ] Test dual-write setup
- [ ] Validate data parity
- [ ] Plan cutover (low-traffic window)

### Post-Migration

- [ ] Run full test suite
- [ ] Manual QA on all flows
- [ ] Check fishon-market charter pages
- [ ] Monitor database performance
- [ ] Document lessons learned
- [ ] Update schema documentation
- [ ] Archive old backups (after 30 days)

---

## Risk Assessment

### High Risk Changes

1. **Remove captainId fields** - Touches many files, breaks if missed anywhere
2. **Update v_public_charters** - Breaks fishon-market if incompatible
3. **Dual-write migration** - Data sync complexity, rollback difficulty

### Medium Risk Changes

4. **Trip JSON arrays** - View structure change, needs fishon-market coordination
5. **Video junction cleanup** - Could break video display if code not updated
6. **BoatImage merge** - Rare but impacts boat image upload

### Low Risk Changes

7. **Make ownerId required** - Data already populated, straightforward
8. **Crew system defer** - Feature flag, no data loss
9. **Add indexes** - Performance improvement, no breaking changes

### Mitigation Strategies

- **Always backup before migration** (automated script)
- **Test in staging first** (production clone)
- **Deploy during low-traffic hours** (2-4 AM MYT)
- **Have rollback script ready** (< 5 min recovery)
- **Monitor error logs actively** (first 24 hours)
- **Coordinate with fishon-market team** (joint testing)

---

## Testing Strategy

### Unit Tests

- All Prisma queries use correct fields (ownerId not captainId)
- Trip arrays serialized correctly
- Video junction queries return expected results
- Media type filters work

### Integration Tests

- Charter creation flow (draft → finalize → active)
- Media upload flows (photos, videos, boat images)
- v_public_charters view returns all expected fields
- fishon-market API calls work with view changes

### End-to-End Tests

- Captain registers → creates charter → uploads media → goes live
- Angler views charter on fishon-market → sees photos/videos
- Operator manages multiple charters → crew assignments work
- Admin queries analytics → ownerId tracking correct

### Performance Tests

- View query time < 100ms (baseline comparison)
- Charter list API < 500ms (no regression)
- Media upload < 3s (no change)
- Database query count (check for N+1 after changes)

---

## Timeline Estimate

| Phase                          | Duration    | Dependencies                      |
| ------------------------------ | ----------- | --------------------------------- |
| Phase 1: Planning              | ✅ Complete | -                                 |
| Phase 2: Ownership             | 2 weeks     | fishon-market team coordination   |
| Phase 3: Trip Simplification   | 1 week      | Phase 2 complete, view tested     |
| Phase 4: Video Junction        | 3 days      | Code audit complete               |
| Phase 5: Media Consolidation   | 3 days      | Phase 4 complete                  |
| Phase 6: Crew Review           | 2 days      | Business decision                 |
| Phase 7: New Schema (optional) | 4 weeks     | All above complete, dual-DB setup |
| Phase 8: View Future-Proofing  | 1 week      | Concurrent with above             |

**Total**: 5-9 weeks depending on scope (with Phase 7 optional).

**Critical Path**: Phase 2 → Phase 3 (blocks everything else).

---

## Success Criteria

### Functional

- ✅ All existing features work (no regressions)
- ✅ fishon-market charter pages display correctly
- ✅ Captain can upload photos/videos
- ✅ Drafts finalize successfully
- ✅ Analytics track ownerId correctly

### Performance

- ✅ View query time ≤ baseline
- ✅ API response times ≤ baseline
- ✅ Database storage reduced (junction tables removed)
- ✅ No N+1 query issues introduced

### Code Quality

- ✅ Zero TypeScript errors
- ✅ All tests passing
- ✅ No "Phase 2" legacy comments
- ✅ Schema well-documented
- ✅ Migration scripts idempotent

### Documentation

- ✅ Schema diagram updated
- ✅ API docs reflect ownerId usage
- ✅ Migration runbook complete
- ✅ Rollback procedures tested

---

## Open Questions

### Business/Product

1. **Crew system**: Is multi-captain per charter actively used? Can we defer?
2. **Boat images**: Are boats shared across charters? (Impacts BoatImage merge decision)
3. **Video limits**: Should we enforce max videos per charter at DB level?

### Technical

4. **View versioning**: Should we maintain v1/v2 views during transition?
5. **Trip array format**: Keep `{value}` wrapper or simplify to `["item"]`?
6. **Dual-write**: Use DB triggers or application-level for new schema migration?
7. **Indexes**: Which queries are most frequent? Optimize those first.

### Coordination

8. **fishon-market timeline**: When can they test view changes?
9. **Deployment window**: What's the longest acceptable downtime?
10. **Rollback SLA**: How fast must we be able to rollback? (Current: manual backup restore ~5 min)

---

## Next Steps (Immediate Actions)

### 1. Get Business Approval

- [ ] Review plan with stakeholders
- [ ] Confirm crew system deferral decision
- [ ] Approve Phase 2 timeline (2 weeks coordination)

### 2. Coordinate with fishon-market Team

- [ ] Schedule joint meeting
- [ ] Share view migration plan
- [ ] Set up staging testing environment
- [ ] Agree on deployment coordination

### 3. Set Up Testing Infrastructure

- [ ] Clone production to staging
- [ ] Write view compatibility tests
- [ ] Create rollback scripts
- [ ] Set up error monitoring alerts

### 4. Begin Phase 2 (if approved)

- [ ] Create feature branch: `chore/schema-cleanup-phase2`
- [ ] Update v_public_charters view (ownerId)
- [ ] Deploy to staging
- [ ] Begin fishon-market testing

### 5. Document Progress

- [ ] Weekly status updates
- [ ] Migration log (issues encountered)
- [ ] Lessons learned (post-Phase 2)

---

## Appendix A: Current Schema Metrics

_To be filled after production DB analysis_

- Total tables: ~35
- Charter count: 21 (verified)
- Media records: TBD
- Video records: TBD
- Trip records: TBD
- Database size: TBD
- View query time: TBD ms

## Appendix B: View Compatibility Matrix

| fishon-market Feature | View Fields Used                | Migration Impact            |
| --------------------- | ------------------------------- | --------------------------- |
| Charter List          | id, name, state, trips[].price  | Low (structure unchanged)   |
| Charter Detail        | All fields                      | Medium (test thoroughly)    |
| Search/Filters        | charterType, state, trips       | Medium (test filters)       |
| Booking Widget        | trips, schedule, unavailability | High (availability logic)   |
| Captain Profile       | captain.\*                      | HIGH (field source changed) |
| Photo Gallery         | media[]                         | Low (unchanged)             |
| Video Player          | videos[]                        | N/A (not in view yet)       |

## Appendix C: Rollback Procedures

### Phase 2 Rollback (if view breaks fishon-market)

```bash
# Restore old view
psql $DATABASE_URL < backup/v_public_charters_v1.sql

# Revert ownerId migration (if applied)
npx prisma migrate rollback

# Restart services
vercel deploy --prod
```

Expected recovery time: **5 minutes**

### Data Loss Scenarios

- **View update**: No data loss (view is query only)
- **Schema migration**: Rollback via Prisma, no data loss
- **Dropped columns**: High risk - backup essential

---

**Plan Status**: 🟡 Awaiting approval for Phase 2  
**Next Review**: After Phase 2 completion  
**Last Updated**: November 12, 2025

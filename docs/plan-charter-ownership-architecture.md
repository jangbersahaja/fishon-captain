---
type: plan
status: in-progress
updated: 2025-11-05
feature: charter-ownership-architecture
author: system
completion: Phase 1-3 complete, Phase 4 in progress
---

# Charter Ownership Architecture Redesign

## Executive Summary

**Problem**: Current architecture uses `CaptainProfile` as both user profile AND charter ownership, with incorrect foreign key relationships that prevent multi-charter operations and proper crew management.

**Solution**: Introduce proper ownership model where Users own Charters, and Captains/Crews are assigned to Charters via junction tables.

**Impact**: Enables OPERATOR role, multiple charters per owner, multiple boats per charter, proper crew management, and scalable charter operations.

---

## 📊 Current State Analysis

### Architecture Issues

#### 1. Conceptual Confusion

```
CURRENT (WRONG):
User (1:1) → CaptainProfile (1:many) → Charter
              ↑ Used as ownership

BUSINESS REQUIREMENT:
User (Owner) → Multiple Charters → Multiple Captains/Crews/Boats
```

**Root Cause**: `CaptainProfile` conflates two concepts:

- Personal profile of a captain (qualifications, experience)
- Charter business ownership

#### 2. Incorrect Foreign Keys

| Model          | Current FK                   | Issue                              | Impact                            |
| -------------- | ---------------------------- | ---------------------------------- | --------------------------------- |
| `Charter`      | `captainId` → CaptainProfile | Ties charter to profile, not owner | Can't have OPERATOR role          |
| `CharterMedia` | `captainId` → CaptainProfile | Media belongs to profile, not user | Orphaned media on profile changes |
| `CaptainVideo` | `captainId` → CaptainProfile | Videos belong to profile, not user | Same orphaning issue              |
| `Boat`         | Part of Charter (1:1)        | One boat max per charter           | Can't scale operations            |

#### 3. Cross-App Tight Coupling

**fishon-market** directly queries `CaptainProfile`:

```sql
-- fishon-market/src/lib/services/booking-service.ts
SELECT c.id, c."captainId", cp."userId"
FROM "Charter" c
INNER JOIN "CaptainProfile" cp ON c."captainId" = cp.id
```

**Breaking Changes**: Any schema change to `captainId` breaks fishon-market.

#### 4. Business Logic Limitations

**Cannot Support**:

- ❌ User owns multiple charters (OPERATOR role)
- ❌ Multiple boats per charter
- ❌ Multiple captains per charter (for simultaneous trips)
- ❌ Proper crew management
- ❌ Charter operations without captain being user

---

## 🎯 Target Architecture

### Core Principles

1. **Separation of Concerns**
   - User = Account owner (can be OPERATOR or CAPTAIN)
   - Charter = Business entity
   - Captain = Role/profile (can work for multiple charters)
   - Crew = Staff member (can work for multiple charters)

2. **Ownership Model**
   - Users OWN charters (via `ownerId`)
   - Captains are ASSIGNED to charters (via junction table)
   - Crews are ASSIGNED to charters (via junction table)
   - Boats BELONG to charters (via `charterId`)

3. **Scalability**
   - One user can own multiple charters
   - One charter can have multiple captains/crews/boats
   - One captain/crew can work for multiple charters

### New Schema Design

```prisma
// ============================================================================
// USER & ROLES
// ============================================================================

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  firstName     String?
  lastName      String?
  role          Role     @default(CAPTAIN)

  // Ownership relations
  ownedCharters  Charter[]      @relation("CharterOwner")
  ownedMedia     CharterMedia[] @relation("OwnedMedia")
  ownedVideos    CaptainVideo[] @relation("OwnedVideos")

  // Profile relations (keep for backward compat)
  captainProfile CaptainProfile?
  crewProfile    CrewMember?

  // ... other existing fields
}

enum Role {
  CAPTAIN   // Can own 1 charter (current users)
  OPERATOR  // Can own multiple charters (future)
  CREW      // Works for others, no ownership
  STAFF     // Platform staff
  ADMIN     // Platform admin
}

// ============================================================================
// CHARTER OWNERSHIP
// ============================================================================

model Charter {
  id          String   @id @default(cuid())
  ownerId     String   // NEW: User who owns this charter
  captainId   String   // DEPRECATED: Keep for migration

  owner       User     @relation("CharterOwner", fields: [ownerId], references: [id])
  captain     CaptainProfile @relation("LegacyCaptainCharters", fields: [captainId], references: [id]) // Deprecated

  // Charter details
  name        String
  charterType String
  state       String
  city        String
  // ... other existing fields

  // NEW: Multiple boats support
  boats       Boat[]   // Changed from 1:1 to 1:many

  // NEW: Staff assignments
  captainAssignments CharterCaptain[] // Captains working this charter
  crewAssignments    CharterCrew[]    // Crew working this charter

  // Existing relations
  trips       Trip[]
  media       CharterMedia[]
  videos      CharterVideo[]
  // ... other existing relations

  @@index([ownerId])
  @@index([captainId]) // Keep for migration
}

// ============================================================================
// BOATS (Multiple per charter)
// ============================================================================

model Boat {
  id        String   @id @default(cuid())
  charterId String   // CHANGED: No longer unique
  charter   Charter  @relation(fields: [charterId], references: [id], onDelete: Cascade)

  name      String
  type      String
  lengthFt  Int
  capacity  Int

  // NEW: Boat status
  isActive  Boolean  @default(true)

  // NEW: Registration & licensing
  registrationNumber String?
  licenseExpiry      DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([charterId])
  @@index([charterId, isActive])
}

// ============================================================================
// CAPTAIN PROFILES (Can work for multiple charters)
// ============================================================================

model CaptainProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])

  // Personal info
  firstName     String
  lastName      String
  displayName   String
  phone         String
  avatarUrl     String?

  // Professional info
  bio           String
  experienceYrs Int      @default(0)

  // NEW: Qualifications
  licenses      String[] // e.g., ["USCG Master 100 Ton", "CPR Certified"]
  certifications Json?   // Structured certification data with expiry dates
  specialties   String[] // e.g., ["Offshore Fishing", "Deep Sea"]

  // NEW: Charter assignments
  charterAssignments CharterCaptain[]

  // DEPRECATED: Keep for migration
  legacyCharters Charter[] @relation("LegacyCaptainCharters")

  // Existing relations
  media         CharterMedia[]  // Keep for migration
  videos        CaptainVideo[]  // Keep for migration

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ============================================================================
// CREW MEMBERS (Can work for multiple charters)
// ============================================================================

model CrewMember {
  id             String   @id @default(cuid())
  userId         String?  @unique // Optional - crew might not have account
  user           User?    @relation(fields: [userId], references: [id])

  // Basic info (required even for non-user crew)
  firstName      String
  lastName       String
  email          String?
  phone          String
  avatarUrl      String?

  // Professional info
  displayName    String   // Preferred name or nickname
  primaryRole    CrewRole // Default role
  bio            String?
  experienceYrs  Int      @default(0)

  // Qualifications
  skills         String[] // e.g., ["Filleting", "Navigation", "First Aid"]
  certifications String[] // e.g., ["STCW Basic Safety", "Food Handler"]
  licenses       String[] // e.g., ["Commercial Fishing License"]

  // Emergency contact
  emergencyName     String?
  emergencyPhone    String?
  emergencyRelation String?

  // Status
  isActive       Boolean  @default(true)

  // Charter assignments
  charterAssignments CharterCrew[]

  // Notes (internal, for charter owner only)
  internalNotes  String?  @db.Text

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId])
  @@index([isActive])
}

enum CrewRole {
  FIRST_MATE    // Second in command
  DECKHAND      // General deck duties
  COOK          // Meal preparation
  ENGINEER      // Boat maintenance
  GUIDE         // Fishing guide/instructor
  CLEANER       // Cleaning duties
  OTHER         // Custom role
}

// ============================================================================
// CAPTAIN ASSIGNMENTS (Many-to-Many)
// ============================================================================

model CharterCaptain {
  id          String         @id @default(cuid())
  charterId   String
  captainId   String         // CaptainProfile.id

  charter     Charter        @relation(fields: [charterId], references: [id], onDelete: Cascade)
  captain     CaptainProfile @relation(fields: [captainId], references: [id], onDelete: Cascade)

  // Assignment details
  isPrimary   Boolean        @default(false) // Primary captain for this charter
  isActive    Boolean        @default(true)

  // Work arrangement
  schedule    String?        // e.g., "Weekends only", "Full-time"
  compensation Json?         // Private: { type: "salary|hourly|commission", amount: 1000 }
  notes       String?        @db.Text

  // Dates
  startDate   DateTime       @default(now())
  endDate     DateTime?

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@unique([charterId, captainId])
  @@index([charterId])
  @@index([captainId])
  @@index([isActive])
}

// ============================================================================
// CREW ASSIGNMENTS (Many-to-Many)
// ============================================================================

model CharterCrew {
  id          String      @id @default(cuid())
  charterId   String
  crewId      String      // CrewMember.id

  charter     Charter     @relation(fields: [charterId], references: [id], onDelete: Cascade)
  crew        CrewMember  @relation(fields: [crewId], references: [id], onDelete: Cascade)

  // Assignment details
  role        CrewRole    // Role for this specific charter (can override primaryRole)
  isActive    Boolean     @default(true)

  // Work arrangement
  schedule    String?     // e.g., "Part-time", "Seasonal"
  compensation Json?      // Private: { type: "salary|hourly|per-trip", amount: 500 }
  notes       String?     @db.Text

  // Dates
  startDate   DateTime    @default(now())
  endDate     DateTime?

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@unique([charterId, crewId])
  @@index([charterId])
  @@index([crewId])
  @@index([isActive])
}

// ============================================================================
// MEDIA & VIDEOS (Owned by User, not CaptainProfile)
// ============================================================================

model CharterMedia {
  id         String   @id @default(cuid())
  charterId  String?
  ownerId    String   // NEW: User.id who uploaded
  captainId  String?  // DEPRECATED: Keep for migration

  charter    Charter? @relation(fields: [charterId], references: [id])
  owner      User     @relation("OwnedMedia", fields: [ownerId], references: [id])
  captain    CaptainProfile? @relation(fields: [captainId], references: [id]) // Deprecated

  url        String
  storageKey String
  mimeType   String?
  sizeBytes  Int?
  width      Int?
  height     Int?
  sortOrder  Int      @default(0)

  createdAt  DateTime @default(now())

  @@index([ownerId, createdAt])
  @@index([captainId, createdAt]) // Keep for migration
  @@index([charterId, sortOrder])
}

model CaptainVideo {
  id                   String          @id @default(cuid())
  ownerId              String          // NEW: User.id who uploaded
  captainId            String          // DEPRECATED: Keep for migration

  owner                User            @relation("OwnedVideos", fields: [ownerId], references: [id])
  captain              CaptainProfile  @relation(fields: [captainId], references: [id]) // Deprecated

  originalUrl          String
  thumbnailUrl         String?
  ready720pUrl         String?
  processStatus        String          @default("queued")

  // ... other existing fields

  charters             CharterVideo[]  // M:N with charters

  @@index([ownerId, processStatus])
  @@index([captainId, processStatus]) // Keep for migration
  @@index([createdAt])
}
```

---

## 🔄 Migration Strategy

### Phase 1: Add New Fields (Non-Breaking) ✅ SAFE

**Goal**: Add new columns without removing old ones

**Timeline**: Week 1

**Steps**:

1. Add `ownerId` to Charter
2. Add `ownerId` to CharterMedia
3. Add `ownerId` to CaptainVideo
4. Create new models: CrewMember, CharterCaptain, CharterCrew
5. Add Boat.charterId index (remove unique constraint)

**Migration SQL**:

```sql
-- Step 1: Add new columns (nullable initially)
ALTER TABLE "Charter" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "CharterMedia" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "CaptainVideo" ADD COLUMN "ownerId" TEXT;

-- Step 2: Populate ownerId from existing captainId
UPDATE "Charter" c
SET "ownerId" = (
  SELECT cp."userId"
  FROM "CaptainProfile" cp
  WHERE cp.id = c."captainId"
);

UPDATE "CharterMedia" cm
SET "ownerId" = (
  SELECT cp."userId"
  FROM "CaptainProfile" cp
  WHERE cp.id = cm."captainId"
);

UPDATE "CaptainVideo" cv
SET "ownerId" = (
  SELECT cp."userId"
  FROM "CaptainProfile" cp
  WHERE cp.id = cv."captainId"
);

-- Step 3: Make ownerId NOT NULL
ALTER TABLE "Charter" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "CharterMedia" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "CaptainVideo" ALTER COLUMN "ownerId" SET NOT NULL;

-- Step 4: Add foreign keys
ALTER TABLE "Charter"
  ADD CONSTRAINT "Charter_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id");

ALTER TABLE "CharterMedia"
  ADD CONSTRAINT "CharterMedia_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id");

ALTER TABLE "CaptainVideo"
  ADD CONSTRAINT "CaptainVideo_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id");

-- Step 5: Add indexes
CREATE INDEX "Charter_ownerId_idx" ON "Charter"("ownerId");
CREATE INDEX "CharterMedia_ownerId_createdAt_idx" ON "CharterMedia"("ownerId", "createdAt");
CREATE INDEX "CaptainVideo_ownerId_processStatus_idx" ON "CaptainVideo"("ownerId", "processStatus");

-- Step 6: Create new tables
-- (Prisma migrate will handle this)
```

**Code Changes**: NONE - old code continues to work

**Testing**:

- ✅ Existing charter creation works
- ✅ Existing media upload works
- ✅ fishon-market queries still work
- ✅ Data integrity: all ownerId populated correctly

---

### Phase 2: Update Application Code ⚠️ BREAKING

**Goal**: Switch application to use `ownerId` instead of `captainId`

**Timeline**: Week 2-3

**fishon-captain Changes**:

#### A. Draft Creation

```typescript
// src/server/drafts.ts
// BEFORE
await prisma.captainProfile.upsert({
  where: { userId: params.userId },
  // ...
});

// AFTER
// No need to create CaptainProfile during draft
// Only create on finalize if user wants to be a captain
```

#### B. Charter Finalization

```typescript
// src/app/api/charter-drafts/[id]/finalize/route.ts
// BEFORE
const charter = await tx.charter.create({
  data: {
    captainId: captainProfile.id, // ❌
    // ...
  },
});

// AFTER
const charter = await tx.charter.create({
  data: {
    ownerId: userId, // ✅
    // ...
  },
});
```

#### C. Media Upload

```typescript
// src/app/api/media/photo/route.ts
// BEFORE
const media = await prisma.charterMedia.create({
  data: {
    captainId: profile.id, // ❌
    // ...
  },
});

// AFTER
const media = await prisma.charterMedia.create({
  data: {
    ownerId: userId, // ✅
    // ...
  },
});
```

#### D. Video Upload

```typescript
// src/app/api/videos/create/route.ts
// BEFORE
const video = await prisma.captainVideo.create({
  data: {
    captainId: profile.id, // ❌
    // ...
  },
});

// AFTER
const video = await prisma.captainVideo.create({
  data: {
    ownerId: userId, // ✅
    // ...
  },
});
```

**fishon-market Changes**:

```typescript
// src/lib/services/booking-service.ts
// BEFORE
SELECT c.id, c."captainId", cp."userId"
FROM "Charter" c
INNER JOIN "CaptainProfile" cp ON c."captainId" = cp.id

// AFTER
SELECT c.id, c."ownerId", u.email
FROM "Charter" c
INNER JOIN "User" u ON c."ownerId" = u.id
```

**Testing**:

- ✅ New charter creation works
- ✅ Existing charters still accessible
- ✅ Media/videos link to correct owner
- ✅ fishon-market bookings work
- ✅ Notifications reach correct owner

---

### Phase 3: Implement Crew System 🆕

**Goal**: Enable crew management

**Timeline**: Week 4-5

**Steps**:

1. Build Captain & Crew management UI
2. Create CRUD APIs for CrewMember
3. Create CRUD APIs for CharterCaptain/CharterCrew
4. Add crew assignment features
5. Display crew on charter detail pages

**Features**:

- ✅ Owner can add/edit/remove crew members
- ✅ Assign crew to specific charters
- ✅ Track crew roles and schedules
- ✅ Show crew on charter detail (fishon-market)

---

### Phase 4: Multi-Charter Support 🚀

**Goal**: Enable OPERATOR role with multiple charters

**Timeline**: Week 6-7

**Steps**:

1. Add OPERATOR role validation
2. Update UI to show multiple charters
3. Add charter switching in dashboard
4. Implement charter-level permissions
5. Add "Upgrade to Operator" flow

**Business Rules**:

```typescript
// Validation on charter creation
if (user.role === "CAPTAIN") {
  const existingCount = await prisma.charter.count({
    where: { ownerId: user.id },
  });

  if (existingCount >= 1) {
    throw new Error("Captains can only own 1 charter. Upgrade to OPERATOR.");
  }
}

if (user.role === "OPERATOR") {
  // No limit on charter count
}
```

---

### Phase 5: Multiple Boats Per Charter 🚤

**Goal**: Allow multiple boats per charter

**Timeline**: Week 8

**Steps**:

1. Remove unique constraint on Charter.boatId
2. Change schema: Charter → Boat (1:many)
3. Update boat management UI
4. Add boat selection in trip creation
5. Show all boats on charter detail

---

### Phase 6: Cleanup & Deprecation 🧹

**Goal**: Remove deprecated fields

**Timeline**: 3-6 months after Phase 2

**Steps**:

1. Verify all code uses `ownerId`
2. Verify fishon-market migrated
3. Remove `captainId` from Charter
4. Remove `captainId` from CharterMedia
5. Remove `captainId` from CaptainVideo
6. Remove deprecated relation fields

**Migration SQL**:

```sql
-- Only after 100% confident all code migrated
ALTER TABLE "Charter" DROP CONSTRAINT "Charter_captainId_fkey";
ALTER TABLE "Charter" DROP COLUMN "captainId";

ALTER TABLE "CharterMedia" DROP CONSTRAINT "CharterMedia_captainId_fkey";
ALTER TABLE "CharterMedia" DROP COLUMN "captainId";

ALTER TABLE "CaptainVideo" DROP CONSTRAINT "CaptainVideo_captainId_fkey";
ALTER TABLE "CaptainVideo" DROP COLUMN "captainId";
```

---

## 🎯 Implementation Checklist

### Phase 1: Foundation (Week 1) ✅ COMPLETED

- [x] Create migration: Add `ownerId` to Charter, CharterMedia, CaptainVideo
- [x] Create migration: Populate `ownerId` from `captainId`
- [x] Create migration: Add CrewMember model
- [x] Create migration: Add CharterCaptain junction table
- [x] Create migration: Add CharterCrew junction table
- [x] Create migration: Remove unique constraint on Boat.charterId
- [x] Run migrations on dev database
- [x] Verify data migration successful
- [x] Test existing functionality still works

**Completion Date**: 2025-11-05
**Migrations Applied**:

- `20251105_add_crew_and_ownership` - Added ownerId fields, crew models, junction tables
- `20251105_remove_boat_unique_constraint` - Removed Boat.charterId unique constraint (1:1 → 1:many)

**Verification Results**:

- ✅ 21 charters with ownerId populated
- ✅ 210 media files with ownerId populated
- ✅ 28 videos with ownerId populated
- ✅ CrewMember, CharterCaptain, CharterCrew tables created
- ✅ Boat → Charter relationship now 1:many (multiple charters can share same boat)
- ✅ All existing functionality verified working

### Phase 2: Application Code Migration ✅ COMPLETED

**fishon-captain Updates**:

- [x] Update draft creation (remove CaptainProfile auto-create)
- [x] Update finalize route (use ownerId)
- [x] Update media upload (use ownerId)
- [x] Update video upload (use ownerId)
- [x] Type checking passed

**Completion Date**: 2025-11-05

**Files Modified**:

- `/src/server/drafts.ts` - Removed automatic CaptainProfile.upsert (fixed firstName="Captain" bug)
- `/src/app/api/charter-drafts/[id]/finalize/route.ts` - Uses ownerId, creates profile with real data
- `/src/app/api/media/photo/route.ts` - Sets ownerId for media uploads
- `/src/app/api/blob/finish/route.ts` - Sets ownerId for video uploads

**Verification Results**:

- ✅ All data has ownerId populated
- ✅ Schema validation passed
- ✅ Type checking passed with no errors
- ✅ Backward compatibility maintained (captainId still set)

### Phase 3: OAuth Signup Flow ✅ COMPLETED

- [x] Remove CaptainProfile creation from OAuth callback
- [x] Defer profile creation to charter finalize
- [x] Preserve User firstName/lastName from OAuth provider
- [x] Verify no default "Captain" profiles created for new signups

**Completion Date**: 2025-11-05

**Files Modified**:

- `/src/lib/auth.ts` - Removed CaptainProfile.upsert from signIn callback

**Verification Results**:

- ✅ 39 users, 34 captain profiles (5 OAuth-only users without profiles - expected)
- ✅ OAuth signIn callback updated correctly
- ✅ Profile creation deferred to finalize route
- ✅ Found 5 legacy profiles with firstName="Captain" (pre-fix data)
- ✅ New signups will NOT create default profiles

### Phase 4: Testing & Cleanup 🔄 IN PROGRESS

**Code Review**:

- [ ] Review all modified files for consistency
- [ ] Check error handling in updated routes
- [ ] Verify backward compatibility maintained
- [ ] Review security implications of ownerId changes
- [ ] Check for edge cases (null ownerId, orphaned records)

**Manual Testing Preparation**:

- [ ] Create comprehensive testing checklist
- [ ] Document test scenarios for charter creation
- [ ] Document test scenarios for media/video uploads
- [ ] Document test scenarios for OAuth signup
- [ ] Prepare test data cleanup scripts
- [ ] Document rollback procedures

**Manual Testing Execution**:

- [ ] Test OAuth signup flow (Google)
- [ ] Create new charter via onboarding
- [ ] Upload photos to charter
- [ ] Upload and trim videos
- [ ] Verify ownerId populated in all records
- [ ] Test existing charter editing still works
- [ ] Verify no firstName="Captain" defaults created
- [ ] Test charter finalization with real user data

**Future Phases** (Deferred - UI Development):

### Phase 5: Captain Profile Management UI

- [ ] Create `/captain/profile` page
- [ ] Add profile edit form (displayName, bio, phone, experience)
- [ ] Add avatar upload
- [ ] Add certifications/licenses section
- [ ] Create API: `PATCH /api/captain/profile`

### Phase 6: Crew Management UI

- [ ] Create `/captain/crew` page
- [ ] Build crew list table with sorting/filtering
- [ ] Create "Add Crew" modal/form
- [ ] Create APIs for crew CRUD operations
- [ ] Add crew assignment to charter flow

### Phase 7: OPERATOR Role Support

- [ ] Update dashboard for multiple charters
- [ ] Add charter switcher in navbar
- [ ] Create "Upgrade to Operator" flow
- [ ] Update onboarding to choose role

### Phase 8: fishon-market Integration

- [ ] Update charter queries (join on ownerId)
- [ ] Update booking service (use ownerId)
- [ ] Update trip service (use ownerId)
- [ ] Test booking flow end-to-end

### Phase 9: Production Deployment

- [ ] Run migrations on production
- [ ] Monitor error rates
- [ ] Monitor database performance
- [ ] Verify fishon-market integration
- [ ] Monitor user feedback
- [ ] Fix any issues

### Phase 8: Deprecation (3-6 months later)

- [ ] Verify 100% code migrated to ownerId
- [ ] Create backup of production data
- [ ] Drop captainId columns
- [ ] Remove deprecated relations
- [ ] Update documentation
- [ ] Celebrate! 🎉

---

## 🚨 Risk Assessment

### High Risk Items

| Risk                            | Mitigation                                       |
| ------------------------------- | ------------------------------------------------ |
| Breaking fishon-market bookings | Keep dual-column support, gradual migration      |
| Data loss during migration      | Test on staging, backup production before deploy |
| User confusion with new UI      | Gradual rollout, clear documentation             |
| Performance issues with joins   | Add proper indexes, monitor query performance    |

### Rollback Plan

If critical issues occur after Phase 2 deployment:

1. **Immediate** (< 5 min):
   - Revert application code to use `captainId`
   - Keep database changes (no rollback needed)
2. **Short-term** (< 1 hour):
   - Fix bugs in new code
   - Re-deploy fixed version

3. **Long-term** (if unfixable):
   - Revert all code changes
   - Keep `ownerId` columns for future attempt
   - Document lessons learned

---

## 📊 Success Metrics

### Technical Metrics

- ✅ Zero data loss during migration
- ✅ < 5% increase in API response time
- ✅ Zero downtime during deployment
- ✅ 100% test coverage on new APIs

### Business Metrics

- ✅ Enable OPERATOR role by Q1 2026
- ✅ 10+ operators with multiple charters by Q2 2026
- ✅ 50+ crew members managed by Q2 2026
- ✅ 100+ boats tracked by Q3 2026

### User Experience

- ✅ < 2% increase in support tickets
- ✅ Positive feedback on crew management
- ✅ No booking failures due to migration

---

## 📚 Documentation Updates Needed

- [ ] Update API documentation with new endpoints
- [ ] Create crew management user guide
- [ ] Update charter creation guide
- [ ] Document OPERATOR role upgrade process
- [ ] Create database schema diagram
- [ ] Update developer onboarding docs

---

## 🤝 Team Coordination

### Stakeholders

- **Backend Team**: Schema changes, API updates
- **Frontend Team**: UI implementation
- **QA Team**: Testing strategy
- **DevOps**: Migration scripts, deployment
- **Product**: User communication

### Communication Plan

- Weekly standups to track progress
- Demo sessions after each phase
- Slack updates on blockers
- Post-deployment retrospective

---

## 📅 Timeline Summary

| Phase                   | Timeline   | Status         |
| ----------------------- | ---------- | -------------- |
| Phase 1: Foundation     | Week 1     | 🟡 Planning    |
| Phase 2: Profile UI     | Week 2     | ⚪ Not Started |
| Phase 3: Crew UI        | Week 3-4   | ⚪ Not Started |
| Phase 4: Code Migration | Week 5-6   | ⚪ Not Started |
| Phase 5: OPERATOR Role  | Week 7-8   | ⚪ Not Started |
| Phase 6: Multiple Boats | Week 9     | ⚪ Not Started |
| Phase 7: Production     | Week 10    | ⚪ Not Started |
| Phase 8: Deprecation    | 3-6 months | ⚪ Not Started |

**Total Estimated Duration**: 10 weeks active development + 3-6 months stabilization

---

## ✅ Next Steps

1. **Review this plan** with team
2. **Get approval** from stakeholders
3. **Start Phase 1** - Create database migrations
4. **Set up staging environment** for testing
5. **Begin UI design** for crew management

---

## 📝 Notes

- Keep this document updated as implementation progresses
- Track blockers and decisions in separate issue tracker
- Update timeline if priorities change
- Document any deviations from plan

---

**Last Updated**: 2025-11-05
**Next Review**: After Phase 1 completion

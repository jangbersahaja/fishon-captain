---
type: testing
status: active
updated: 2025-11-05
feature: charter-ownership-architecture
author: system
---

# Manual Testing Guide: Charter Ownership Architecture

## Overview

This guide covers manual testing for Phases 1-3 of the charter ownership architecture redesign. These phases focused on **database schema changes** and **application code migration** to use `ownerId` instead of `captainId` for ownership.

## Prerequisites

- Access to fishon-captain development environment
- Google account for OAuth testing
- Ability to view database records (Prisma Studio or direct SQL)

## Testing Phases

### Phase 1 Verification: Database Schema ✅ AUTOMATED

**Status**: Already verified via automated scripts

**What Was Tested**:

- ✅ ownerId fields added to Charter, CharterMedia, CaptainVideo
- ✅ Data migrated: 21 charters, 210 media, 28 videos
- ✅ CrewMember, CharterCaptain, CharterCrew tables created
- ✅ Boat → Charter relationship changed from 1:1 to 1:many

**Verification Scripts**:

- `/scripts/verify-migration.ts`
- `/scripts/verify-boat-migration.ts`

---

## Phase 2-3 Manual Testing: Application Code

### Test Suite 1: OAuth Signup Flow

**Objective**: Verify new OAuth users don't get automatic CaptainProfile with firstName="Captain"

#### Test Case 1.1: New Google OAuth Signup

**Steps**:

1. Clear browser cache/cookies for fishon-captain
2. Navigate to login page
3. Click "Sign in with Google"
4. Use a **NEW** Google account (never used before)
5. Complete OAuth authorization

**Expected Results**:

- ✅ User account created
- ✅ User.firstName = Google first name (not "Captain")
- ✅ User.lastName = Google last name
- ✅ NO CaptainProfile created yet
- ✅ Redirected to dashboard or onboarding

**Verification**:

```sql
-- Check in Prisma Studio or via SQL
SELECT u.id, u.email, u.firstName, u.lastName, u.role,
       cp.id as profileId, cp.firstName as profileFirstName
FROM "User" u
LEFT JOIN "CaptainProfile" cp ON u.id = cp."userId"
WHERE u.email = 'your-new-test-email@gmail.com';
```

**Pass Criteria**:

- User record exists with Google names
- CaptainProfile is NULL (not created yet)

#### Test Case 1.2: Existing User OAuth Re-login

**Steps**:

1. Log out
2. Sign in again with the same Google account
3. Check User and CaptainProfile records

**Expected Results**:

- ✅ User firstName/lastName updated from Google (if changed)
- ✅ Still NO CaptainProfile created
- ✅ Existing data unchanged

---

### Test Suite 2: Charter Registration (Onboarding)

**Objective**: Verify charter finalization creates CaptainProfile with real user data

#### Test Case 2.1: Complete Charter Onboarding

**Steps**:

1. Log in with a test account (OAuth or email)
2. Navigate to charter onboarding (`/captain/charter/register`)
3. Complete all onboarding steps:
   - Step 1: Basic Info (charter name, type, location)
   - Step 2: Boat Details
   - Step 3: Trip Details
   - Step 4: Pricing
   - Step 5: Amenities
   - Step 6: Policies
   - Step 7: Media Upload (add at least 1 photo)
4. Click "Submit for Review" (finalize)

**Expected Results**:

- ✅ Charter created with `ownerId = userId`
- ✅ CaptainProfile created with:
  - `firstName = User.firstName` (NOT "Captain")
  - `lastName = User.lastName`
  - `userId = User.id`
- ✅ CharterCaptain junction record created linking charter to profile
- ✅ Backward compatibility: `Charter.captainId = CaptainProfile.id`

**Verification**:

```sql
-- Check Charter ownership
SELECT c.id, c.name, c.ownerId, c.captainId,
       u.email as ownerEmail,
       cp.firstName as captainFirstName, cp.lastName as captainLastName
FROM "Charter" c
JOIN "User" u ON c.ownerId = u.id
LEFT JOIN "CaptainProfile" cp ON c.captainId = cp.id
WHERE c.id = 'your-charter-id';

-- Check CharterCaptain junction
SELECT cc.*, cp.firstName, cp.lastName
FROM "CharterCaptain" cc
JOIN "CaptainProfile" cp ON cc."captainId" = cp.id
WHERE cc."charterId" = 'your-charter-id';
```

**Pass Criteria**:

- Charter.ownerId matches User.id
- CaptainProfile.firstName = User.firstName (NOT "Captain")
- CharterCaptain record exists
- No duplicate profiles created

#### Test Case 2.2: Draft Auto-Save During Onboarding

**Steps**:

1. Start charter onboarding
2. Fill in Step 1 (Basic Info)
3. Wait for auto-save (or manually trigger by moving to Step 2)
4. Check CharterDraft record in database

**Expected Results**:

- ✅ Draft saved with `userId` (owner)
- ✅ NO CaptainProfile created during draft save
- ✅ Draft.dataJson contains form data

**Verification**:

```sql
SELECT cd.id, cd."userId", cd.status,
       cp.id as existingProfileId
FROM "CharterDraft" cd
LEFT JOIN "CaptainProfile" cp ON cp."userId" = cd."userId"
WHERE cd."userId" = 'your-user-id'
ORDER BY cd."createdAt" DESC
LIMIT 1;
```

**Pass Criteria**:

- Draft exists
- NO new CaptainProfile created (check before/after count)

---

### Test Suite 3: Media Uploads

**Objective**: Verify media uploads use ownerId instead of captainId

#### Test Case 3.1: Photo Upload During Onboarding

**Steps**:

1. During charter onboarding Step 7 (Media)
2. Upload at least 2 photos
3. Complete finalization

**Expected Results**:

- ✅ CharterMedia records created with `ownerId = userId`
- ✅ Backward compatibility: `captainId = CaptainProfile.id` (set during finalize)
- ✅ Photos visible on charter detail page

**Verification**:

```sql
SELECT cm.id, cm."ownerId", cm."captainId", cm.url, cm."mediaType",
       c.id as charterId, c.name as charterName
FROM "CharterMedia" cm
LEFT JOIN "Charter" c ON cm."charterId" = c.id
WHERE cm."ownerId" = 'your-user-id'
ORDER BY cm."createdAt" DESC;
```

**Pass Criteria**:

- All photos have ownerId populated
- Matches User.id (not CaptainProfile.id)

#### Test Case 3.2: Video Upload with Trimming

**Steps**:

1. During charter onboarding Step 7 (Media)
2. Upload a video (>30s recommended for trim testing)
3. Use trim modal to select 30s clip
4. Save and finalize charter

**Expected Results**:

- ✅ CaptainVideo record created with `ownerId = userId`
- ✅ Video metadata saved (trim start, duration, etc.)
- ✅ Video shows in review step
- ✅ Backward compatibility: `captainId` set during finalize

**Verification**:

```sql
SELECT cv.id, cv."ownerId", cv."captainId", cv."processStatus",
       cv."processedDurationSec", cv."trimStartSec"
FROM "CaptainVideo" cv
WHERE cv."ownerId" = 'your-user-id'
ORDER BY cv."createdAt" DESC;
```

**Pass Criteria**:

- Video has ownerId = userId
- Trim metadata saved correctly
- processStatus updates (queued → processing → ready)

---

### Test Suite 4: Existing Functionality

**Objective**: Verify backward compatibility - existing features still work

#### Test Case 4.1: View Existing Charters

**Steps**:

1. Log in with account that has existing charters
2. Navigate to captain dashboard
3. View charter list

**Expected Results**:

- ✅ All existing charters visible
- ✅ Charter detail pages load
- ✅ Media/videos display correctly
- ✅ No errors in console

#### Test Case 4.2: Edit Existing Charter

**Steps**:

1. Open an existing charter in edit mode
2. Change a field (e.g., description)
3. Save changes

**Expected Results**:

- ✅ Changes saved successfully
- ✅ ownerId still populated
- ✅ No errors during save
- ✅ Edit flow works as before

---

## Test Data Tracking

### Before Testing Session

**Capture Baseline Counts**:

```sql
-- User count
SELECT COUNT(*) FROM "User";

-- CaptainProfile count
SELECT COUNT(*) FROM "CaptainProfile";

-- Charter count with ownerId
SELECT COUNT(*) FROM "Charter" WHERE "ownerId" IS NOT NULL;

-- Profiles with firstName="Captain" (should not increase)
SELECT COUNT(*) FROM "CaptainProfile" WHERE "firstName" = 'Captain';
```

### After Testing Session

**Verify No Regression**:

```sql
-- Profiles with firstName="Captain" (should be SAME as before, not increased)
SELECT id, "userId", "firstName", "lastName", "createdAt"
FROM "CaptainProfile"
WHERE "firstName" = 'Captain'
ORDER BY "createdAt" DESC;

-- All new charters have ownerId
SELECT id, name, "ownerId", "captainId"
FROM "Charter"
WHERE "createdAt" > '2025-11-05'  -- Adjust date to your testing start
ORDER BY "createdAt" DESC;

-- New media has ownerId
SELECT id, "ownerId", "captainId", "createdAt"
FROM "CharterMedia"
WHERE "createdAt" > '2025-11-05'
ORDER BY "createdAt" DESC;
```

---

## Known Issues & Edge Cases

### Legacy Data

**Issue**: 5 existing profiles with firstName="Captain" (created before Phase 2-3 fixes)

**Impact**: These are PRE-FIX data, not a bug

**Verification**:

```sql
SELECT cp.id, cp."firstName", cp."lastName", cp."createdAt",
       u.email, u."firstName" as userFirstName
FROM "CaptainProfile" cp
JOIN "User" u ON cp."userId" = u.id
WHERE cp."firstName" = 'Captain';
```

**Expected**: These should all be older than 2025-11-05 (before Phase 2-3)

### OAuth-Only Users

**Issue**: Users who signed up via OAuth but never created a charter will NOT have CaptainProfile

**Impact**: This is CORRECT behavior (profiles created only when finalizing charter)

**Current Count**: 5 users without profiles (39 users - 34 profiles = 5)

---

## Pass/Fail Criteria

### Overall Success Criteria

✅ **PASS** if:

1. New OAuth signups do NOT create firstName="Captain" profiles
2. Charter finalization creates profile with User.firstName (not "Captain")
3. Media uploads have ownerId = userId
4. Video uploads have ownerId = userId
5. Existing charters still accessible and editable
6. No errors in browser console during testing
7. No firstName="Captain" profiles created after 2025-11-05

❌ **FAIL** if:

1. New profiles created with firstName="Captain"
2. New records missing ownerId
3. Existing functionality broken
4. Errors during charter creation/editing
5. Media/videos not saved correctly

---

## Rollback Procedure

**If Critical Issues Found**:

1. **Stop all charter registrations**
2. **Document the exact issue** (screenshots, SQL queries, error logs)
3. **Run rollback migration** (if schema changes need reverting)
4. **Notify team** with issue details

**Rollback SQL** (if needed):

```sql
-- This is a last resort - discuss with team first!
-- Remove ownerId fields if causing issues
ALTER TABLE "Charter" DROP COLUMN IF EXISTS "ownerId";
ALTER TABLE "CharterMedia" DROP COLUMN IF EXISTS "ownerId";
ALTER TABLE "CaptainVideo" DROP COLUMN IF EXISTS "ownerId";
```

**Note**: Rollback should only be used if there's a critical production issue. For dev/testing issues, fix forward instead.

---

## Testing Checklist

### Pre-Testing

- [ ] Capture baseline database counts
- [ ] Clear browser cache
- [ ] Have Prisma Studio open for verification
- [ ] Note current time (for filtering new records)

### Test Execution

- [ ] Test Case 1.1: New OAuth signup
- [ ] Test Case 1.2: Existing user re-login
- [ ] Test Case 2.1: Complete charter onboarding
- [ ] Test Case 2.2: Draft auto-save
- [ ] Test Case 3.1: Photo upload
- [ ] Test Case 3.2: Video upload with trimming
- [ ] Test Case 4.1: View existing charters
- [ ] Test Case 4.2: Edit existing charter

### Post-Testing

- [ ] Verify no new "Captain" profiles
- [ ] Check all new records have ownerId
- [ ] Verify baseline counts (no regressions)
- [ ] Document any issues found
- [ ] Clean up test data (if needed)

---

## Test Report Template

```
## Test Session Report

**Date**: 2025-11-05
**Tester**: [Your Name]
**Environment**: Development

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1.1 OAuth Signup | ⬜ Pass / ⬜ Fail | |
| 1.2 Re-login | ⬜ Pass / ⬜ Fail | |
| 2.1 Charter Onboarding | ⬜ Pass / ⬜ Fail | |
| 2.2 Draft Save | ⬜ Pass / ⬜ Fail | |
| 3.1 Photo Upload | ⬜ Pass / ⬜ Fail | |
| 3.2 Video Upload | ⬜ Pass / ⬜ Fail | |
| 4.1 View Charters | ⬜ Pass / ⬜ Fail | |
| 4.2 Edit Charter | ⬜ Pass / ⬜ Fail | |

### Issues Found

1. [Issue description]
   - Severity: Critical / High / Medium / Low
   - Steps to reproduce:
   - Expected vs Actual:

### Database Verification

- New profiles with "Captain": [count]
- New charters with ownerId: [count]
- New media with ownerId: [count]
- Console errors: [Yes/No]

### Recommendation

⬜ Ready for production
⬜ Minor fixes needed
⬜ Major issues - hold deployment
```

---

## Next Steps After Testing

1. **If all tests pass**:
   - Mark Phase 4 as complete
   - Plan Phase 5 (UI development)
   - Document lessons learned

2. **If issues found**:
   - Create issue tickets with details
   - Prioritize fixes (Critical → High → Medium → Low)
   - Re-test after fixes applied

3. **Before production deployment**:
   - Run tests on staging environment
   - Create production deployment checklist
   - Prepare monitoring/alerting for ownerId fields
   - Brief team on changes

---

## Contact & Support

**Questions about this testing guide?**

- Review plan document: `/docs/plan-charter-ownership-architecture.md`
- Check implementation PRs for Phase 2-3
- Review verification scripts in `/scripts/`

**Found a bug?**

- Document with SQL queries showing the issue
- Include browser console errors
- Note which test case failed
- Capture before/after database state

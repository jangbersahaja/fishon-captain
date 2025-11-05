# Phase 4 Cleanup Checklist

**Status**: In Progress  
**Updated**: 2025-11-05

## Overview

Phase 4 focuses on code review, cleanup, and preparing for manual testing of the charter ownership architecture changes (Phases 1-3).

---

## 1. Code Review

### Files Modified in Phases 1-3

**Phase 1: Database Schema**

- [x] `prisma/schema.prisma` - Added ownerId, crew models, junction tables
- [x] `prisma/migrations/20251105_add_crew_and_ownership/migration.sql`
- [x] `prisma/migrations/20251105_remove_boat_unique_constraint/migration.sql`

**Phase 2: Application Code**

- [x] `/src/server/drafts.ts`
- [x] `/src/app/api/charter-drafts/[id]/finalize/route.ts`
- [x] `/src/app/api/media/photo/route.ts`
- [x] `/src/app/api/blob/finish/route.ts`

**Phase 3: OAuth Flow**

- [x] `/src/lib/auth.ts`

### Code Review Tasks

- [ ] Review error handling in finalize route
  - [ ] Check ownerId null handling
  - [ ] Verify CaptainProfile creation errors handled
  - [ ] Test CharterCaptain junction creation failures
- [ ] Review backward compatibility
  - [ ] Confirm captainId still set for existing code
  - [ ] Check if any queries still use captainId exclusively
  - [ ] Verify no breaking changes to existing APIs
- [ ] Security review
  - [ ] Verify ownerId matches authenticated user
  - [ ] Check authorization on media/video uploads
  - [ ] Ensure no user can create charters for others
- [ ] Performance review
  - [ ] Check for N+1 queries with new joins
  - [ ] Review indexes on ownerId fields
  - [ ] Test query performance with joins

---

## 2. Documentation

- [x] Update plan document with Phase 1-3 completion status
- [x] Create manual testing guide
- [ ] Create Phase 4 cleanup checklist (this file)
- [ ] Document edge cases discovered
- [ ] Update API documentation (if public APIs affected)
- [ ] Create runbook for production deployment

---

## 3. Testing Preparation

### Test Environment Setup

- [ ] Verify development database has test data
- [ ] Create fresh test user accounts (OAuth + email)
- [ ] Clear any draft charter data
- [ ] Note baseline counts (users, profiles, charters)

### Test Data Scripts

- [ ] Create script to generate test users
- [ ] Create script to clean up test data after testing
- [ ] Create script to verify ownerId population
- [ ] Create script to check for "Captain" firstName regression

### Test Scenarios Documented

- [x] OAuth signup flow (documented in testing guide)
- [x] Charter onboarding flow (documented in testing guide)
- [x] Media upload flow (documented in testing guide)
- [x] Video upload flow (documented in testing guide)
- [x] Existing charter editing (documented in testing guide)

---

## 4. Edge Cases & Known Issues

### Documented Edge Cases

1. **Legacy "Captain" Profiles**
   - Status: Known issue (5 profiles)
   - Impact: Pre-fix data, not a regression
   - Resolution: Leave as-is, monitor no new ones created

2. **OAuth Users Without Profiles**
   - Status: Expected behavior
   - Impact: 5 users without CaptainProfile
   - Resolution: Profiles created only when finalizing charter

3. **Null ownerId Handling**
   - Status: Need to verify
   - Files to check: finalize route, media routes
   - Test: What happens if ownerId is null?

### Issues to Investigate

- [ ] What happens if User is deleted but Charter exists?
  - Check ON DELETE CASCADE behavior
  - Verify orphaned charter handling
- [ ] Can ownerId be changed after charter creation?
  - Should it be immutable?
  - Add validation in update routes?
- [ ] What if captain creates charter, then role changes?
  - Does CAPTAIN → USER role change affect ownership?
  - Check authorization logic

---

## 5. Database Verification

### Run Verification Scripts

- [x] `/scripts/verify-migration.ts` - Phase 1 verification
- [x] `/scripts/verify-phase2.ts` - Phase 2 verification
- [x] `/scripts/verify-phase3.ts` - Phase 3 verification
- [x] `/scripts/verify-boat-migration.ts` - Boat relationship verification

### Manual Database Checks

- [ ] Verify all charters have ownerId

  ```sql
  SELECT COUNT(*) FROM "Charter" WHERE "ownerId" IS NULL;
  -- Should be 0
  ```

- [ ] Verify all media has ownerId

  ```sql
  SELECT COUNT(*) FROM "CharterMedia" WHERE "ownerId" IS NULL;
  -- Should be 0
  ```

- [ ] Verify all videos have ownerId

  ```sql
  SELECT COUNT(*) FROM "CaptainVideo" WHERE "ownerId" IS NULL;
  -- Should be 0
  ```

- [ ] Check junction tables populated (if any charters finalized)
  ```sql
  SELECT COUNT(*) FROM "CharterCaptain";
  -- Should match number of charters with profiles
  ```

---

## 6. Type Checking & Linting

- [x] Run type checking: `npm run typecheck`
  - Result: PASSED ✅
  - Fixed: Updated Boat.charter → Boat.charters in `/src/app/api/charters/[id]/route.ts`
- [ ] Run linting: `npm run lint`
  - Status: Not yet run
- [x] Check for TypeScript errors in modified files
  - Status: All type checking passed, no errors

---

## 7. Pre-Testing Checklist

Before starting manual testing:

- [ ] All Phase 4 code review tasks completed
- [ ] All verification scripts run successfully
- [ ] Test environment prepared
- [ ] Test data scripts created
- [ ] Manual testing guide reviewed
- [ ] Baseline database counts captured
- [ ] Team notified of testing schedule

---

## 8. Testing Execution

- [ ] Execute all test cases in testing guide
- [ ] Document results in test report template
- [ ] Capture screenshots of key flows
- [ ] Record any errors or unexpected behavior
- [ ] Verify no new "Captain" profiles created

---

## 9. Post-Testing Tasks

- [ ] Review test results with team
- [ ] Create issue tickets for any bugs found
- [ ] Prioritize fixes (Critical → High → Medium → Low)
- [ ] Update documentation with lessons learned
- [ ] Mark Phase 4 as complete (if all tests pass)

---

## 10. Production Deployment Preparation

**Do NOT proceed to production until:**

- [ ] All manual tests pass
- [ ] Critical/High bugs fixed and re-tested
- [ ] Rollback procedure documented and tested
- [ ] Team trained on new architecture
- [ ] Monitoring/alerting configured for ownerId fields
- [ ] Backup verified before migration
- [ ] Deployment window scheduled (off-peak hours)

### Production Deployment Steps

1. [ ] Take full database backup
2. [ ] Run migrations on staging first
3. [ ] Smoke test on staging
4. [ ] Run migrations on production
5. [ ] Monitor error rates for 24 hours
6. [ ] Verify ownerId population on new records
7. [ ] Check for any "Captain" firstName regressions

---

## Issues Tracker

| Issue                 | Severity | Status | Notes |
| --------------------- | -------- | ------ | ----- |
| _No issues found yet_ | -        | -      | -     |

---

## Next Actions

1. **Complete code review tasks** (Section 1)
2. **Run linting** (Section 6)
3. **Investigate edge cases** (Section 4)
4. **Prepare test environment** (Section 3)
5. **Execute manual testing** (Section 8)
6. **Review results and plan fixes** (Section 9)

---

## Notes

- Keep this checklist updated as tasks are completed
- Mark tasks with [x] when done
- Add issues to the tracker as they're discovered
- Update the testing guide if new scenarios emerge

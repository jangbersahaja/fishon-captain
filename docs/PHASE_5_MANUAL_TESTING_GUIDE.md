# Phase 5: Manual Testing Guide

## Promo Split Configuration System - Testing Checklist

**Date**: 20 December 2025  
**Version**: 1.0  
**Status**: Ready for Manual Testing

---

## Prerequisites

- [ ] fishon-captain running on `localhost:3000` (or staging URL)
- [ ] fishon-market running on `localhost:3001` (or staging URL)
- [ ] Database seeded with PROMO_SPLIT_CONFIG (default 50/50)
- [ ] User account with STAFF or ADMIN role
- [ ] Browser DevTools open (for network inspection)

---

## Test 1: Admin UI Access & Display

**Objective**: Verify UI loads correctly and shows current configuration

### Steps:

1. **Login** as STAFF or ADMIN user
2. **Navigate** to `/staff/pricing`
3. **Verify** page loads without errors
4. **Check** Promo Split Config card appears at top
5. **Verify** current split displays (should be 50/50 by default)

### Expected Results:

- ✅ Page loads successfully
- ✅ PromoSplitConfig component visible
- ✅ Two cards show "50.0% Captain" and "50.0% Platform"
- ✅ Slider positioned at middle (50%)
- ✅ Example shows "Captain contributes: RM50.00" for RM100 discount
- ✅ "Save Changes" button is disabled (no changes yet)

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 2: Slider Interaction

**Objective**: Verify slider adjusts percentages correctly

### Steps:

1. **Drag slider** to the right (increase captain %)
2. **Verify** Captain % increases, Platform % decreases
3. **Check** values sum to 100%
4. **Drag slider** to 70%
5. **Verify** Captain: 70.0%, Platform: 30.0%
6. **Check** example calculation updates: Captain pays RM70, Platform pays RM30

### Expected Results:

- ✅ Slider moves smoothly
- ✅ Percentages update in real-time
- ✅ Sum always equals 100%
- ✅ Example calculation reflects new split
- ✅ "Save Changes" button becomes enabled

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 3: Preset Buttons

**Objective**: Verify preset buttons apply correct splits

### Steps:

1. **Click** "0/100" button
2. **Verify** Captain: 0%, Platform: 100%
3. **Check** example: Captain pays RM0, Platform pays RM100
4. **Click** "30/70" button
5. **Verify** Captain: 30%, Platform: 70%
6. **Click** "50/50" button (reset)
7. **Verify** Captain: 50%, Platform: 50%
8. **Click** "70/30" button
9. **Verify** Captain: 70%, Platform: 30%

### Expected Results:

- ✅ Each button applies correct split instantly
- ✅ Slider position matches button value
- ✅ Example calculations update correctly
- ✅ Active preset button highlighted (bg-slate-100)

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 4: Save Configuration (50/50)

**Objective**: Save default 50/50 split and verify persistence

### Steps:

1. **Ensure** slider at 50/50
2. **Move slider** to 60/40 then back to 50/50
3. **Click** "Save Changes"
4. **Wait** for success message
5. **Refresh page**
6. **Verify** split still shows 50/50

### Expected Results:

- ✅ "Saving..." indicator appears
- ✅ Green success alert: "Configuration updated successfully!"
- ✅ "Save Changes" button becomes disabled again
- ✅ After refresh, split remains 50/50
- ✅ No errors in console

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 5: Save Configuration (70/30)

**Objective**: Update to 70/30 split and verify all systems reflect change

### Steps:

1. **Click** "70/30" preset button
2. **Verify** Captain: 70%, Platform: 30%
3. **Click** "Save Changes"
4. **Wait** for success message
5. **Open DevTools** → Network tab
6. **Verify** PATCH request to `/api/admin/pricing/promo-split`
7. **Check** request body: `{"captainPercent": 70, "platformPercent": 30}`
8. **Check** response: `{"success": true, "data": {...}}`

### Expected Results:

- ✅ Success alert appears
- ✅ Network request shows 200 status
- ✅ Response contains updated config
- ✅ UI remains at 70/30 after save
- ✅ "Save Changes" button disabled (no unsaved changes)

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 6: Public API Endpoint

**Objective**: Verify public API returns updated configuration

### Steps:

1. **Open new browser tab**
2. **Navigate** to `http://localhost:3000/api/public/v1/settings/promo-split`
3. **Verify** JSON response
4. **Check** `data.captainPercent` matches saved value (70)
5. **Check** `data.platformPercent` matches saved value (30)

### Expected Results:

```json
{
  "success": true,
  "data": {
    "captainPercent": 70.0,
    "platformPercent": 30.0
  },
  "cached": false
}
```

### Actual Results:

- [ ] Pass / [ ] Fail
- Response: ****************\_****************

---

## Test 7: Admin API Authentication

**Objective**: Verify only STAFF/ADMIN can access admin endpoints

### Steps:

1. **Logout** from current session
2. **Use curl** or Postman to test:
   ```bash
   curl http://localhost:3000/api/admin/pricing/promo-split
   ```
3. **Verify** 403 Unauthorized response
4. **Login** as CAPTAIN (not STAFF/ADMIN)
5. **Try accessing** `/staff/pricing`
6. **Verify** redirect to login

### Expected Results:

- ✅ Unauthenticated request: 403 Unauthorized
- ✅ CAPTAIN role: Redirect to login
- ✅ STAFF/ADMIN role: Access granted

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 8: Reset Functionality

**Objective**: Verify reset button reverts unsaved changes

### Steps:

1. **Current config**: 70/30 (from previous test)
2. **Move slider** to 50/50
3. **Verify** "Reset" button appears
4. **Click** "Reset"
5. **Verify** slider returns to 70/30
6. **Check** "Save Changes" button becomes disabled

### Expected Results:

- ✅ "Reset" button only visible when changes exist
- ✅ Click reset reverts to last saved config
- ✅ "Save Changes" button disabled after reset
- ✅ No API call made (client-side only)

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 9: Fishon-Market Integration

**Objective**: Verify fishon-market fetches and uses updated configuration

### Steps:

1. **Ensure** fishon-captain has 70/30 split saved
2. **Start** fishon-market dev server
3. **Open** fishon-market in browser
4. **Navigate** to any charter booking page
5. **Add** promo code with RM100 discount
6. **Open DevTools** → Network tab
7. **Check** for request to `http://localhost:3000/api/public/v1/settings/promo-split`
8. **Verify** pricing calculation in console/network

### Expected Results:

- ✅ fishon-market fetches config from fishon-captain
- ✅ 5-minute cache applied (subsequent requests use cache)
- ✅ Pricing calculations use 70/30 split
- ✅ Captain earnings reflect 70% contribution

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 10: Cache Invalidation

**Objective**: Verify cache clears after admin updates

### Steps:

1. **In fishon-captain**: Change split to 50/50, save
2. **Wait** 10 seconds
3. **In fishon-market**: Trigger pricing calculation (refresh page or add promo)
4. **Verify** new request to `/api/public/v1/settings/promo-split`
5. **Check** fishon-market uses 50/50 split now

### Expected Results:

- ✅ fishon-captain cache cleared after admin update
- ✅ fishon-market cache expires after 5 minutes
- ✅ Fresh config fetched automatically
- ✅ Pricing calculations update to new split

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 11: Edge Case - 0/100 Split

**Objective**: Platform absorbs all promo discount

### Steps:

1. **Click** "0/100" preset
2. **Save** configuration
3. **Verify** example shows Captain pays RM0
4. **Test booking** with RM100 promo in fishon-market
5. **Verify** captain earnings = full trip price (no reduction)

### Expected Results:

- ✅ Captain contribution: RM0
- ✅ Platform contribution: RM100
- ✅ Captain receives full base price
- ✅ Platform absorbs entire discount cost

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 12: Edge Case - 100/0 Split

**Objective**: Captain absorbs all promo discount

### Steps:

1. **Set** split to 100/0 (custom via slider)
2. **Save** configuration
3. **Verify** example shows Platform pays RM0
4. **Test booking** with RM100 promo
5. **Verify** captain earnings = trip price - RM100

### Expected Results:

- ✅ Captain contribution: RM100
- ✅ Platform contribution: RM0
- ✅ Captain earnings reduced by full discount
- ✅ Platform commission unchanged

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Test 13: Validation - Invalid Splits

**Objective**: Verify server validates percentage sums

### Steps:

1. **Use** browser DevTools console
2. **Send** invalid PATCH request:
   ```javascript
   fetch("/api/admin/pricing/promo-split", {
     method: "PATCH",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ captainPercent: 60, platformPercent: 30 }), // Sum = 90
   })
     .then((r) => r.json())
     .then(console.log);
   ```
3. **Verify** 400 Bad Request response
4. **Check** error message mentions "sum to 100"

### Expected Results:

- ✅ Server rejects invalid splits
- ✅ Error message clear and actionable
- ✅ Database not updated
- ✅ UI shows error alert (if triggered from UI)

### Actual Results:

- [ ] Pass / [ ] Fail
- Response: ****************\_****************

---

## Test 14: Audit Log

**Objective**: Verify configuration changes are logged

### Steps:

1. **Update** split from 50/50 to 70/30
2. **Save** changes
3. **Check database**: Query `audit_log` table
4. **Verify** entry with:
   - action: "update" or similar
   - resourceType: "SystemSettings"
   - before: `{"captainPercent": 50, "platformPercent": 50}`
   - after: `{"captainPercent": 70, "platformPercent": 30}`
   - actorId: Your user ID

### Expected Results:

- ✅ Audit log entry created
- ✅ Before/after values recorded
- ✅ Timestamp accurate
- ✅ Actor ID correct

### Actual Results:

- [ ] Pass / [ ] Fail
- Query: ****************\_****************

---

## Test 15: Concurrent Updates

**Objective**: Test behavior with multiple admins updating simultaneously

### Steps:

1. **Open** two browser windows (Window A, Window B)
2. **Login** as STAFF in both
3. **Window A**: Change to 60/40, DON'T save yet
4. **Window B**: Change to 70/30, SAVE
5. **Window A**: Now click SAVE
6. **Verify** Window A sees 60/40 saved (or shows conflict)
7. **Refresh** Window A
8. **Check** which config persisted

### Expected Results:

- ✅ Last save wins (Window A's 60/40)
- ✅ No data corruption
- ✅ Both windows eventually show same config after refresh

### Actual Results:

- [ ] Pass / [ ] Fail
- Notes: ****************\_****************

---

## Summary

### Test Results Overview

| Test # | Test Name                 | Status | Notes |
| ------ | ------------------------- | ------ | ----- |
| 1      | Admin UI Access           | [ ]    |       |
| 2      | Slider Interaction        | [ ]    |       |
| 3      | Preset Buttons            | [ ]    |       |
| 4      | Save Config (50/50)       | [ ]    |       |
| 5      | Save Config (70/30)       | [ ]    |       |
| 6      | Public API Endpoint       | [ ]    |       |
| 7      | Admin API Auth            | [ ]    |       |
| 8      | Reset Functionality       | [ ]    |       |
| 9      | Fishon-Market Integration | [ ]    |       |
| 10     | Cache Invalidation        | [ ]    |       |
| 11     | Edge Case 0/100           | [ ]    |       |
| 12     | Edge Case 100/0           | [ ]    |       |
| 13     | Validation - Invalid      | [ ]    |       |
| 14     | Audit Log                 | [ ]    |       |
| 15     | Concurrent Updates        | [ ]    |       |

### Issues Found

1. ***
2. ***
3. ***

### Recommendations

1. ***
2. ***
3. ***

---

**Tester**: ********\_\_\_********  
**Date Completed**: ********\_\_\_********  
**Sign-off**: ********\_\_\_******** (STAFF/ADMIN)

# Date/Time Timezone Fix - Action Plan

**Date**: October 12, 2025  
**Issue**: Date/time components displaying in browser's local timezone instead of consistent Malaysia time (GMT+8)  
**Solution**: Created centralized `src/lib/datetime.ts` utility with Malaysia timezone formatting

---

## ✅ Completed

### 1. Created Date/Time Utility (`src/lib/datetime.ts`)

Comprehensive utility with Malaysia timezone (Asia/Kuala_Lumpur, GMT+8):

- `formatDateTime(date)` - Full date + time in Malaysia timezone
- `formatDate(date)` - Date only
- `formatTime(date)` - Time only
- `formatRelative(date)` - Relative time ("2h ago", "just now")
- `formatISO(date)` - ISO 8601 with +08:00 offset
- `nowInMalaysia()` - Current Malaysia time
- `parseDate(string)` - Parse date strings
- `isToday(date)` - Check if date is today in Malaysia
- `formatLocalYMD(date)` - YYYY-MM-DD format
- `todayYMD()` - Today as YYYY-MM-DD

### 2. Updated Files

#### Staff Pages

- ✅ `/app/(admin)/staff/registrations/page.tsx`

  - Line 366: `formatDateTime(d.lastTouchedAt)`
  - Added: `formatRelative(d.lastTouchedAt)` for relative time

- ✅ `/app/(admin)/staff/registrations/[id]/page.tsx`
  - Lines 162-170: All date displays now use `formatDateTime()`
  - Line 237: Note timestamps use `formatDateTime()`

---

## 📋 Files Requiring Updates

### High Priority (Staff/Admin Pages)

#### 1. `/app/(admin)/staff/charters/_components/ChartersClient.tsx`

```tsx
// Line 152
- Updated {new Date(c.updatedAt).toLocaleString()}
+ Updated {formatDateTime(c.updatedAt)}
```

#### 2. `/app/(admin)/staff/charters/[id]/page.tsx`

Multiple instances (lines 163, 164, 332, 338, 355, 423, 427, 509, 513, 605, 688, 798):

```tsx
- {new Date(timestamp).toLocaleString()}
+ {formatDateTime(timestamp)}
```

#### 3. `/app/(admin)/staff/verification/page.tsx`

```tsx
// Line 92
- Updated {new Date(it.updatedAt).toLocaleString()}
+ Updated {formatDateTime(it.updatedAt)}
```

#### 4. `/app/(admin)/staff/verification/[userId]/page.tsx`

```tsx
// Line 157
- {new Date(iso).toLocaleString(undefined, { ... })}
+ {formatDateTime(iso)}
```

### Medium Priority (Captain/User-Facing)

#### 5. `/features/charter-onboarding/FormSection.tsx`

```tsx
// Line 920
- Last saved {new Date(lastSavedAt).toLocaleTimeString()}
+ Last saved {formatTime(lastSavedAt)}
```

#### 6. `/features/charter-onboarding/components/DraftDevPanel.tsx`

```tsx
// Lines 62, 65
- {new Date(lastSavedAt).toLocaleTimeString()}
+ {formatTime(lastSavedAt)}

- {new Date(fetchedAt).toLocaleTimeString()}
+ {formatTime(fetchedAt)}
```

#### 7. `/components/charter/ReviewsList.tsx`

```tsx
// Line 12-22: Replace formatDate function
function formatDate(iso: string): string {
  if (!iso) return "";
  return formatDate(iso); // Use our utility instead
}
```

#### 8. `/components/charter/GuestFeedbackPanel.tsx`

```tsx
// Line 5-13: Replace formatDate function
function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return formatDate(iso); // Use our utility
}
```

### Low Priority (Video Manager - Relative Time Already OK)

#### 9. `/components/captain/VideoManager.tsx`

Already has custom `timeAgo()` function which is fine for relative time.  
Could optionally replace with `formatRelative()` for consistency.

---

## Implementation Strategy

### Phase 1: Staff/Admin Pages (Highest Impact)

Update all staff dashboard pages first since these are internal tools and most critical for data accuracy.

**Files**:

1. ChartersClient.tsx
2. /staff/charters/[id]/page.tsx
3. /staff/verification/page.tsx
4. /staff/verification/[userId]/page.tsx

**Import to add**:

```tsx
import { formatDateTime } from "@/lib/datetime";
```

### Phase 2: Captain/User Forms

Update charter onboarding form and related components.

**Files**:

1. FormSection.tsx
2. DraftDevPanel.tsx

**Imports to add**:

```tsx
import { formatTime } from "@/lib/datetime";
// or
import { formatDateTime } from "@/lib/datetime";
```

### Phase 3: Public-Facing Components

Update review and guest feedback components.

**Files**:

1. ReviewsList.tsx
2. GuestFeedbackPanel.tsx

**Strategy**: Replace custom `formatDate` functions with utility import.

---

## Search & Replace Pattern

### Find

```tsx
new Date(variable).toLocaleString();
```

### Replace with

```tsx
formatDateTime(variable);
```

### Also find

```tsx
new Date(variable).toLocaleDateString(undefined, { ... })
```

### Replace with

```tsx
formatDate(variable);
```

### Time only

```tsx
new Date(variable).toLocaleTimeString();
```

### Replace with

```tsx
formatTime(variable);
```

---

## Testing Checklist

After updates, verify:

- [ ] Staff registrations page shows Malaysia time
- [ ] Individual draft detail page shows Malaysia time
- [ ] Charters list and detail pages show Malaysia time
- [ ] Verification pages show Malaysia time
- [ ] Charter form "Last saved" shows Malaysia time
- [ ] Draft dev panel shows Malaysia time
- [ ] Reviews show correct dates
- [ ] All timestamps are GMT+8 (8 hours ahead of UTC)

### Test Scenario

1. Create a draft at a known UTC time (e.g., 12:00 UTC)
2. Verify it displays as 20:00 (8:00 PM) Malaysia time
3. Check across different pages for consistency

---

## Database Considerations

**Important**: Database timestamps are stored in UTC (correct behavior).  
The utility converts to Malaysia timezone only for **display purposes**.

- ✅ Database: Store in UTC (no changes needed)
- ✅ API responses: Can use ISO format (UTC)
- ✅ Display: Convert to Malaysia timezone using utility

---

## CalendarPicker Component

**Status**: Already handles local dates correctly!

The `CalendarPicker.tsx` component uses:

- `new Intl.DateTimeFormat("en-US", ...)` for display
- Local date construction: `new Date(year, month, day)`
- `formatLocalYMD()` and `parseLocalYMD()` functions

These work in local browser timezone, which is appropriate for date selection.  
**No changes needed** - dates should be picked in user's local context.

---

## Quick Reference

### Common Replacements

| Old Code                             | New Code                     | Use Case         |
| ------------------------------------ | ---------------------------- | ---------------- |
| `new Date().toLocaleString()`        | `formatDateTime(new Date())` | Full date + time |
| `new Date(iso).toLocaleDateString()` | `formatDate(iso)`            | Date only        |
| `new Date(iso).toLocaleTimeString()` | `formatTime(iso)`            | Time only        |
| `new Date(iso).toISOString()`        | `formatISO(iso)`             | API/Database     |
| Custom `timeAgo()`                   | `formatRelative(date)`       | Relative time    |

### Import Statement

```tsx
import {
  formatDateTime,
  formatDate,
  formatTime,
  formatRelative,
} from "@/lib/datetime";
```

---

## Files Summary

**Total files requiring updates**: ~9 files  
**Completed**: 2 files  
**Remaining**: 7 files

### By Priority

- **High**: 4 files (staff pages)
- **Medium**: 3 files (captain forms)
- **Low**: 1 file (video manager - optional)
- **No change**: 1 file (CalendarPicker - correct as-is)

---

## Next Steps

1. Run through Phase 1 (staff pages) - ~15 minutes
2. Test staff dashboard thoroughly
3. Run through Phase 2 (captain forms) - ~10 minutes
4. Test charter registration flow
5. Run through Phase 3 (public components) - ~5 minutes
6. Final comprehensive test

**Estimated total time**: 45-60 minutes

---

**Created**: October 12, 2025  
**Status**: In Progress (2/9 files updated)  
**Utility**: `/src/lib/datetime.ts` (✅ Complete)

# Color System Guidelines - Fishon Captain

**Last Updated**: 17 November 2025  
**Version**: 1.0  
**Status**: ✅ Implemented

---

## Overview

This document defines the standardized color system for the Fishon Captain application. Following these guidelines ensures consistent visual communication across all features.

**Key Principle**: Each color has a specific semantic meaning. Use colors consistently to help users quickly understand status, priority, and context.

---

## Semantic Color Palette

### 🔴 Red - Urgent/Critical Action Required

**When to use:**

- Bookings requiring immediate attention (PENDING status)
- Error states and destructive actions (REJECTED, CANCELLED)
- High-priority indicators
- Critical warnings

**Tailwind classes:**

- Backgrounds: `bg-red-50` (light), `bg-red-100` (medium)
- Text: `text-red-600`, `text-red-800`
- Borders: `border-red-300`

**Examples:**

- PENDING booking status badge
- REJECTED/CANCELLED booking status
- High-priority booking card border

---

### 🟠 Orange - Expired/Warning

**When to use:**

- Expired bookings or opportunities
- Secondary warnings
- Tab count badges for new requests

**Tailwind classes:**

- Backgrounds: `bg-orange-50`, `bg-orange-100`
- Text: `text-orange-600`, `text-orange-800`
- Borders: `border-orange-300`

**Examples:**

- EXPIRED booking status badge
- "New Requests" tab count badge

---

### 🟡 Yellow - In Progress/Awaiting Action

**When to use:**

- Actions in progress (AWAITING_PAYMENT)
- Medium priority indicators
- Direct payment flow info
- "Pending Payment" tab badges

**Tailwind classes:**

- Backgrounds: `bg-yellow-50`, `bg-yellow-100`
- Text: `text-yellow-600`, `text-yellow-800`
- Borders: `border-yellow-300`

**Examples:**

- AWAITING_PAYMENT booking status badge
- Direct payment flow info box
- Medium-priority booking card border
- "Pending Payment" tab count badge

---

### 🟣 Indigo - Payment Authorized/On Hold

**When to use:**

- Payment authorized but not captured (PAYMENT_AUTHORIZED)
- Tokenized payment flow info
- Payment-related states requiring approval

**Tailwind classes:**

- Backgrounds: `bg-indigo-50`, `bg-indigo-100`
- Text: `text-indigo-600`, `text-indigo-800`
- Borders: `border-indigo-300`

**Examples:**

- PAYMENT_AUTHORIZED booking status badge
- Tokenized payment flow info box
- Status timeline icon for payment authorized

---

### 🟢 Green - Success/Confirmed

**When to use:**

- Successful completion (PAID, COMPLETED)
- Confirmed bookings
- Positive states and approvals
- "Confirmed" tab badges

**Tailwind classes:**

- Backgrounds: `bg-green-50`, `bg-green-100`
- Text: `text-green-600`, `text-green-800`
- Borders: `border-green-300`

**Examples:**

- PAID booking status badge
- COMPLETED booking status badge
- "Confirmed" tab count badge
- Success messages

---

### ⚫ Gray - Neutral/Completed/Cancelled

**When to use:**

- COMPLETED bookings (past trips)
- CANCELLED bookings (neutral, not urgent)
- Neutral/inactive states
- Default states

**Tailwind classes:**

- Backgrounds: `bg-gray-50`, `bg-gray-100`, `bg-slate-50`
- Text: `text-gray-600`, `text-gray-800`, `text-slate-700`
- Borders: `border-gray-300`, `border-slate-200`

**Examples:**

- COMPLETED booking status badge
- CANCELLED booking status (non-critical)
- Booking notes (neutral information)
- "History" tab

---

## Component-Specific Guidelines

### 1. Booking Status Badges

**Component**: `BookingStatusBadge.tsx`

**Status → Color Mapping:**

| Status             | Color  | Meaning                      |
| ------------------ | ------ | ---------------------------- |
| PENDING            | Red    | Urgent - needs approval      |
| PAYMENT_AUTHORIZED | Indigo | Payment on hold - approve    |
| AWAITING_PAYMENT   | Yellow | In progress - waiting        |
| PAID               | Green  | Success - confirmed          |
| COMPLETED          | Gray   | Neutral - finished           |
| REJECTED           | Red    | Critical - declined          |
| CANCELLED          | Gray   | Neutral - customer cancelled |
| EXPIRED            | Orange | Warning - opportunity lost   |

**Usage:**

```tsx
import { BookingStatusBadge } from "@/components/captain/BookingStatusBadge";

<BookingStatusBadge status={booking.status} size="md" />;
```

**❌ Don't:** Create inline status badges with custom colors  
**✅ Do:** Always use the `BookingStatusBadge` component

---

### 2. Payment Flow Info Boxes

**Component**: Booking detail page, Payment Flow Info section

**Flow Type → Color Mapping:**

| Flow Type | Color  | Meaning                    |
| --------- | ------ | -------------------------- |
| TOKENIZED | Indigo | Card authorization on hold |
| DIRECT    | Yellow | Payment received, awaiting |

**Classes:**

- TOKENIZED: `bg-indigo-50 text-indigo-800`
- DIRECT: `bg-yellow-50 text-yellow-800`

---

### 3. Status Timeline Icons

**Component**: Booking detail page, Status Timeline section

**Status → Icon Background:**

| Status             | Background     |
| ------------------ | -------------- |
| PENDING            | `bg-red-50`    |
| PAYMENT_AUTHORIZED | `bg-indigo-50` |
| AWAITING_PAYMENT   | `bg-yellow-50` |
| PAID               | `bg-green-50`  |
| REJECTED/CANCELLED | `bg-red-50`    |

**Icon Color:**

- Match background intensity: `-50` backgrounds use `-600` text colors

---

### 4. Priority Indicators

**Component**: `EnhancedBookingCard.tsx`

**Priority → Color Mapping:**

| Priority | Border/Background                   | Badge Variant |
| -------- | ----------------------------------- | ------------- |
| High     | `border-red-300 bg-red-50/30`       | destructive   |
| Medium   | `border-yellow-300 bg-yellow-50/30` | secondary     |
| Low      | Default slate                       | outline       |

**Badge Labels:**

- High: "Urgent"
- Medium: "Priority"

---

### 5. Booking Notes & Reasons

**Component**: Various (EnhancedBookingCard, booking detail, ChatHeader)

**Note Type → Color Mapping:**

| Note Type                     | Background/Border              | Text             |
| ----------------------------- | ------------------------------ | ---------------- |
| Angler's Note (informational) | `bg-slate-50 border-slate-200` | `text-slate-700` |
| Rejection Reason              | `bg-red-50 border-red-100`     | `text-red-800`   |
| Cancellation Reason           | `bg-gray-50 border-gray-200`   | `text-gray-700`  |

**Why slate for notes?**

- Neutral, doesn't conflict with status colors
- Previous blue conflicted with payment statuses

---

### 6. Booking Tabs

**Component**: `BookingTabs.tsx`

**Tab → Color Mapping:**

| Tab             | Count Badge Color | Icon         |
| --------------- | ----------------- | ------------ |
| New Requests    | Orange            | Inbox        |
| Confirmed       | Green             | CheckCircle2 |
| Pending Payment | Yellow            | Clock3       |
| History         | Gray              | Archive      |

**Badge Classes (inactive state):**

- Orange: `bg-orange-100 text-orange-700`
- Green: `bg-green-100 text-green-700`
- Yellow: `bg-yellow-100 text-yellow-700`
- Gray: `bg-slate-100 text-slate-600`

---

## Cross-App Consistency

### Fishon Market Alignment

The **fishon-market** application uses the same color system for booking statuses to ensure consistent user experience.

**Alignment File**: `fishon-market/src/lib/helpers/booking-helpers.ts`

**Functions aligned:**

- `getBookingStatusColor()` - Badge classes
- `getBookingStatusIconColor()` - Icon colors
- `getBookingStatusBgColor()` - Background colors

**Status mappings match exactly between captain and market apps.**

---

## Migration Notes

**Date Implemented**: 17 November 2025

**Major Changes:**

1. PENDING: Amber → Red (urgent action)
2. PAYMENT_AUTHORIZED: Blue → Indigo (payment on hold)
3. AWAITING_PAYMENT: Green → Yellow (in progress)
4. PAID: Blue → Green (success)
5. EXPIRED: Red → Orange (expired opportunity)

**Deprecated Patterns:**

- ❌ Inline `statusColor` objects in components
- ❌ Blue for multiple different statuses
- ❌ Green for "awaiting" states (confusing)
- ❌ Blue backgrounds for booking notes

**Migration Phases Completed:**

1. ✅ Core Status Badges (BookingStatusBadge.tsx)
2. ✅ Payment Flow Info & Status Timeline
3. ✅ Booking Notes & Reasons
4. ✅ Chat Component Refactoring
5. ✅ Priority Section
6. ✅ Booking Tabs (already correct)
7. ✅ Fishon Market Alignment
8. ✅ Documentation & Guidelines

---

## Developer Checklist

When adding new features involving status or priority:

- [ ] Check if `BookingStatusBadge` component already covers your use case
- [ ] Use semantic colors according to this guide (red=urgent, yellow=in progress, green=success, etc.)
- [ ] Avoid creating duplicate status badge components
- [ ] Keep colors consistent with existing patterns
- [ ] Update fishon-market if changes affect angler-facing features
- [ ] Test color contrast for accessibility (WCAG AA minimum)

---

## Common Mistakes to Avoid

### ❌ Don't Use Blue for Everything

**Problem:** Blue was previously overloaded for multiple meanings (payment authorized, confirmed, info, tokenized flow)

**Solution:** Use specific colors:

- Payment authorized → Indigo
- Confirmed → Green
- Info/notes → Slate/Gray
- Tokenized flow → Indigo

---

### ❌ Don't Use Green for "Waiting" States

**Problem:** Green typically means "success" or "complete", not "waiting"

**Solution:**

- Waiting states → Yellow (AWAITING_PAYMENT)
- Success states → Green (PAID, COMPLETED)

---

### ❌ Don't Create Inline Status Badges

**Problem:** Duplicate color mappings, inconsistent styling

**Solution:**

```tsx
// ❌ Don't do this
const statusColor = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  // ...
};

// ✅ Do this instead
import { BookingStatusBadge } from "@/components/captain/BookingStatusBadge";
<BookingStatusBadge status={booking.status} />;
```

---

### ❌ Don't Mix Color Intensities Arbitrarily

**Problem:** Inconsistent visual weight

**Solution:** Follow the pattern:

- Backgrounds: `-50` (lighter) or `-100` (medium)
- Text: `-600` (medium) or `-800` (darker)
- Borders: `-200` (light) or `-300` (medium)
- Icons: `-600` (medium)

---

## Accessibility Notes

**Color Contrast:**

- All color combinations meet WCAG AA standards (4.5:1 for text)
- Status information is not conveyed by color alone (labels included)
- Icons supplement color coding

**Testing:**

- Test with browser dev tools color blindness simulators
- Verify labels are descriptive without relying on color

---

## Future Considerations

**When to Expand:**

- If new booking statuses are added, assign colors following semantic meanings
- If new priority levels are needed, use colors consistently (red=highest, yellow=medium, gray=low)

**Color Palette Stability:**

- This palette is designed to be stable for the long term
- Any changes should be documented and announced to the team
- Consider creating migration plan for major color changes

---

## Questions?

For questions about color usage or to propose changes:

1. Refer to this document first
2. Check `COLOR_AUDIT.md` for historical context
3. Review `COLOR_STANDARDIZATION_PROPOSAL.md` for rationale
4. Discuss with team before making changes to core components

---

**Related Documentation:**

- [COLOR_AUDIT.md](./COLOR_AUDIT.md) - Complete audit of all color usage
- [COLOR_STANDARDIZATION_PROPOSAL.md](./COLOR_STANDARDIZATION_PROPOSAL.md) - Proposal and migration plan
- [BookingStatusBadge.tsx](../src/components/captain/BookingStatusBadge.tsx) - Core status badge component

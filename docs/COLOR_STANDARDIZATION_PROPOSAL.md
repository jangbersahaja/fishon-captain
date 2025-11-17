# Fishon Captain - Color Standardization Proposal

**Date**: 17 November 2025  
**Status**: PROPOSED  
**Related**: `COLOR_AUDIT.md`

---

## PROBLEM STATEMENT

Current color usage across the fishon-captain app is inconsistent and confusing:

1. **Same colors represent different states** (e.g., blue for both PAYMENT_AUTHORIZED and PAID)
2. **Different colors represent the same state** (e.g., PENDING is amber in badge, orange in tab, red in priority)
3. **Semantic confusion** (e.g., green for "awaiting payment" contradicts "success" meaning)
4. **Cross-app inconsistency** (fishon-market uses different colors for same booking statuses)

This causes user confusion and increases cognitive load for captains managing bookings.

---

## DESIGN PRINCIPLES

### 1. Semantic Clarity

Each color must have a clear, consistent meaning across the entire system.

### 2. Visual Hierarchy

Colors should indicate urgency/importance at a glance:

- **Red** = Needs immediate action or negative state
- **Amber/Orange** = Needs attention soon
- **Yellow** = In progress, waiting
- **Blue/Indigo** = Information, on hold
- **Green** = Success, complete, positive
- **Gray** = Neutral, archived, inactive

### 3. Accessibility

All color combinations must meet WCAG AA contrast ratios (4.5:1 for text).

### 4. Cross-App Consistency

Fishon Captain and Fishon Market must use identical colors for shared concepts (booking statuses).

### 5. Scalability

System should support adding new statuses/states without color conflicts.

---

## PROPOSED COLOR SYSTEM

### Core Status Color Palette

| Tailwind Color     | Role                | Meaning                                    | Usage                                           |
| ------------------ | ------------------- | ------------------------------------------ | ----------------------------------------------- |
| **Red 500-800**    | Urgent / Negative   | Needs immediate action or negative outcome | New requests, rejections, cancellations, errors |
| **Orange 500-800** | Warning / Attention | Needs attention, action required           | Pending decisions, expiring soon                |
| **Amber 500-800**  | Caution             | Minor warnings, conditional states         | Authorization holds, temporary states           |
| **Yellow 500-800** | In Progress         | Actively processing or waiting             | Payment processing, awaiting payment            |
| **Indigo 500-800** | On Hold / Reserved  | Something is held/reserved but not final   | Payment authorized (card held), reserved slots  |
| **Blue 500-800**   | Information         | Neutral information, non-urgent            | General info, default states                    |
| **Green 500-800**  | Success / Complete  | Positive outcome, action complete          | Confirmed, paid, completed trips                |
| **Gray 500-800**   | Neutral / Inactive  | Completed, archived, or inactive           | History, completed bookings, disabled states    |

### Extended Palette (Supporting Colors)

| Color      | Usage                                 |
| ---------- | ------------------------------------- |
| **Purple** | Analytics, special features, premium  |
| **Pink**   | Favorites, highlights                 |
| **Teal**   | Alternative success, seafishing theme |
| **Cyan**   | Alternative information               |

---

## PROPOSED BOOKING STATUS COLORS

### Status Badge Redesign

| Status               | Current Color | **New Color**      | Rationale                                               |
| -------------------- | ------------- | ------------------ | ------------------------------------------------------- |
| `PENDING`            | Amber 50/800  | **Red 100/800**    | NEW REQUEST - needs immediate captain action            |
| `PAYMENT_AUTHORIZED` | Blue 100/800  | **Indigo 100/800** | Payment is HELD (not captured), distinct from confirmed |
| `AWAITING_PAYMENT`   | Green 100/800 | **Yellow 100/800** | Actively WAITING for payment action                     |
| `PAID`               | Blue 100/800  | **Green 100/800**  | SUCCESS - booking confirmed and paid                    |
| `COMPLETED`          | Gray 100/800  | **Gray 100/800**   | ✅ Keep - neutral completed state                       |
| `REJECTED`           | Red 100/800   | **Red 100/800**    | ✅ Keep - negative outcome                              |
| `CANCELLED`          | Red 100/800   | **Red 100/800**    | ✅ Keep - negative outcome                              |
| `EXPIRED`            | Red 100/800   | **Orange 100/800** | EXPIRED (less severe than cancelled/rejected)           |

**Visual Preview** (conceptual):

```tsx
// PENDING - Urgent red (needs action)
className = "bg-red-50 text-red-800 border-red-300";

// PAYMENT_AUTHORIZED - Indigo (card held, on hold)
className = "bg-indigo-100 text-indigo-800 border-indigo-300";

// AWAITING_PAYMENT - Yellow (in progress, waiting)
className = "bg-yellow-100 text-yellow-800 border-yellow-300";

// PAID - Green (success, confirmed)
className = "bg-green-100 text-green-800 border-green-300";

// EXPIRED - Orange (warning, less severe)
className = "bg-orange-100 text-orange-800 border-orange-300";
```

---

## PROPOSED PAYMENT FLOW INFO SECTION

### Info Boxes on Booking Detail Page

| Payment Flow | Current Color | **New Color**     | Rationale                                |
| ------------ | ------------- | ----------------- | ---------------------------------------- |
| `TOKENIZED`  | Blue 50/800   | **Indigo 50/800** | Matches PAYMENT_AUTHORIZED status        |
| `DIRECT`     | Green 50/800  | **Yellow 50/800** | Matches payment pending/processing state |

**Location**: `/captain/bookings/[id]` page (lines 152-190)

**Benefit**: Info box colors now **match** the related booking status!

---

## PROPOSED STATUS TIMELINE COLORS

### Status Icon Backgrounds

| Status               | Current      | **New Color**     | Rationale                          |
| -------------------- | ------------ | ----------------- | ---------------------------------- |
| `PENDING`            | Amber 50/600 | **Red 50/600**    | Urgent - matches status badge      |
| `PAYMENT_AUTHORIZED` | Blue 50/600  | **Indigo 50/600** | On hold - matches status badge     |
| `AWAITING_PAYMENT`   | Green 50/600 | **Yellow 50/600** | In progress - matches status badge |
| `PAID`               | Green 50/600 | **Green 50/600**  | ✅ Keep - matches status badge     |
| REJECTED/CANCELLED   | Red 50/600   | **Red 50/600**    | ✅ Keep - matches status badge     |

**Location**: `/captain/bookings/[id]` page (lines 204-266)

**Benefit**: Timeline colors now **perfectly match** status badges!

---

## PROPOSED NOTE & REASON COLORS

### Angler's Note

| Element  | Current     | **New Color**    | Rationale                            |
| -------- | ----------- | ---------------- | ------------------------------------ |
| Note Box | Blue 50/800 | **Slate 50/700** | Neutral info, avoid status conflicts |

**Locations**: EnhancedBookingCard, booking detail page, ChatHeader

### Rejection/Cancellation Reasons

| Reason Type  | Current Color | **New Color**   | Rationale                  |
| ------------ | ------------- | --------------- | -------------------------- |
| Rejection    | Red 50/800    | **Red 50/800**  | ✅ Keep - negative outcome |
| Cancellation | Gray 50/700   | **Gray 50/700** | ✅ Keep - neutral          |

**Location**: BookingTimeline.tsx

---

## PROPOSED CHAT COMPONENT COLORS

### Legacy Status Badges (ChatHeader, BookingDetailsCard)

**Action**: Replace inline status colors with `BookingStatusBadge` component

| Status             | Current        | **New**                    |
| ------------------ | -------------- | -------------------------- |
| `PENDING`          | Yellow 100/800 | **Use BookingStatusBadge** |
| `APPROVED`         | Blue 100/800   | **DEPRECATED - Remove**    |
| `PAID`             | Green 100/800  | **Use BookingStatusBadge** |
| All other statuses | Various        | **Use BookingStatusBadge** |

**Files to Refactor**:

- `src/components/captain/chat/ChatHeader.tsx` (remove lines 71-79)
- `src/components/captain/chat/BookingDetailsCard.tsx` (remove lines 87-92)

**Benefit**: Single source of truth for status colors across entire app!

---

## PROPOSED PRIORITY SECTION COLORS

### Priority Type Pills

| Priority Type       | Current Color | **New Color**      | Rationale                                  |
| ------------------- | ------------- | ------------------ | ------------------------------------------ |
| **New Request**     | Red 100/800   | **Red 100/800**    | ✅ Keep - urgent action required           |
| **Upcoming Trip**   | Blue 100/800  | **Teal 100/800**   | Changed to avoid conflict with info badges |
| **Payment Pending** | Amber 100/800 | **Yellow 100/800** | Matches AWAITING_PAYMENT status            |

### Priority Indicator Icons (Small Circles)

| Priority Type   | Current        | **New**                                         |
| --------------- | -------------- | ----------------------------------------------- |
| New Request     | `bg-red-500`   | **`bg-red-600`** (slightly darker for contrast) |
| Upcoming Trip   | `bg-blue-500`  | **`bg-teal-600`**                               |
| Payment Pending | `bg-amber-500` | **`bg-yellow-600`**                             |

---

## PROPOSED BOOKING TAB COLORS

### Tab Count Badges (Inactive State)

| Tab                 | Current Color  | **New Color**      | Rationale                       |
| ------------------- | -------------- | ------------------ | ------------------------------- |
| **Requests**        | Orange 100/700 | **Red 100/800**    | Matches PENDING status (urgent) |
| **Confirmed**       | Green 100/700  | **Green 100/700**  | ✅ Keep - matches PAID status   |
| **Pending Payment** | Yellow 100/700 | **Yellow 100/800** | Matches AWAITING_PAYMENT status |
| **History**         | Slate 100/600  | **Gray 100/700**   | Neutral archive color           |

**Result**: Tab colors now **perfectly match** the booking statuses they contain!

---

## PROPOSED NOTIFICATION COLORS

### Notification Types

| Type        | Current      | **New**           | Rationale                             |
| ----------- | ------------ | ----------------- | ------------------------------------- |
| **Warning** | Amber 50/700 | **Orange 50/700** | Reserve amber for authorization holds |
| **Error**   | Red 50/700   | **Red 50/700**    | ✅ Keep                               |
| **Info**    | -            | **Blue 50/700**   | Add info notification type            |
| **Success** | -            | **Green 50/700**  | Add success notification type         |

---

## FISHON MARKET ALIGNMENT

### Booking Status Colors (Must Match Captain App)

Update `fishon-market/src/components/account/BookingStatusGuide.tsx`:

| Status             | Market Current | **Market New** | Captain New | Match? |
| ------------------ | -------------- | -------------- | ----------- | ------ |
| Pending            | Blue 50        | **Red 50**     | Red 50      | ✅     |
| Payment Authorized | -              | **Indigo 50**  | Indigo 50   | ✅     |
| Awaiting Payment   | Emerald 50     | **Yellow 50**  | Yellow 50   | ✅     |
| Confirmed (Paid)   | Green 50       | **Green 50**   | Green 50    | ✅     |
| Rejected           | Red 50         | **Red 50**     | Red 50      | ✅     |
| Cancelled          | Orange 50      | **Red 50**     | Red 50      | ✅     |
| Expired            | -              | **Orange 50**  | Orange 50   | ✅     |
| Completed          | Gray 50        | **Gray 50**    | Gray 50     | ✅     |

---

## MIGRATION PLAN

### Phase 1: Core Status Badges (Priority: CRITICAL)

**Files to Update**:

1. `src/components/captain/BookingStatusBadge.tsx` ⭐ **Master component**
2. `src/components/captain/EnhancedBookingCard.tsx` (uses BookingStatusBadge)
3. `src/app/(portal)/captain/bookings/[id]/page.tsx` (uses BookingStatusBadge)
4. `src/app/(portal)/captain/messages/conversations-client.tsx` (uses BookingStatusBadge)

**Action**: Update `getStatusConfig()` function with new color mappings

**Testing**: Visual regression test on all booking pages

---

### Phase 2: Payment Flow Info & Status Timeline (Priority: HIGH)

**Files to Update**:

1. `src/app/(portal)/captain/bookings/[id]/page.tsx` - Payment Flow Info (lines 152-190)
2. `src/app/(portal)/captain/bookings/[id]/page.tsx` - Status Timeline (lines 204-266)

**Action**:

- TOKENIZED info: blue → indigo
- DIRECT info: green → yellow
- Timeline icons: match new status badge colors

**Testing**: Verify info boxes match status badges on booking detail page

---

### Phase 3: Booking Notes & Reasons (Priority: MEDIUM)

**Files to Update**:

1. `src/components/captain/EnhancedBookingCard.tsx` (lines 405-411)
2. `src/app/(portal)/captain/bookings/[id]/page.tsx` (lines 508-513)
3. `src/components/captain/chat/ChatHeader.tsx` (lines 296-303)

**Action**: Change angler note background from blue to slate (neutral)

**Testing**: Verify note boxes don't conflict with status colors

---

### Phase 4: Chat Component Refactoring (Priority: HIGH)

**Files to Update**:

1. `src/components/captain/chat/ChatHeader.tsx` - Remove inline statusColor (lines 70-79)
2. `src/components/captain/chat/BookingDetailsCard.tsx` - Remove inline statusColor (lines 87-92)

**Action**:

- Import and use `BookingStatusBadge` component
- Remove legacy status color mappings
- Remove APPROVED status (deprecated)

**Testing**: Verify chat shows consistent status colors with booking pages

---

### Phase 5: Priority Section (Priority: HIGH)

**Files to Update**:

1. `src/components/captain/PriorityBookings.tsx`

**Action**:

- Update Upcoming Trip pills/icons: blue → teal
- Update Payment Pending pills/icons: amber → yellow

**Testing**: Verify priority pills don't conflict with status badges

---

### Phase 6: Booking Tabs (Priority: MEDIUM)

**Files to Update**:

1. `src/components/captain/BookingTabs.tsx`

**Action**: Update tab count badge colors to match status badges

**Testing**: Verify tab colors match their content statuses

---

### Phase 7: Fishon Market Alignment (Priority: MEDIUM)

**Files to Update**:

1. `fishon-market/src/components/account/BookingStatusGuide.tsx`
2. `fishon-market/src/components/account/BookingCard.tsx`
3. Any other market files using status colors

**Action**: Apply same color scheme as captain app

**Testing**: Cross-app consistency verification

---

### Phase 8: Documentation & Guidelines (Priority: LOW)

**Files to Create/Update**:

1. `docs/COLOR_SYSTEM.md` - Comprehensive color usage guide
2. `docs/UI_COMPONENTS.md` - Component usage patterns
3. Update Storybook (if exists) with new color samples

---

## TESTING CHECKLIST

### Visual Testing

- [ ] All 8 booking status badges render correctly
- [ ] Payment flow badges match their related booking status
- [ ] Priority section pills and icons use new colors
- [ ] Tab count badges match their content statuses
- [ ] No color conflicts between adjacent elements
- [ ] Colors work in both light and dark mode (if applicable)

### Accessibility Testing

- [ ] All text meets WCAG AA contrast ratio (4.5:1)
- [ ] Color is not the only indicator (icons/labels present)
- [ ] Screen reader announces status correctly

### Cross-App Testing

- [ ] Booking status colors match between captain and market apps
- [ ] Email templates use consistent colors (if applicable)
- [ ] Mobile app matches if applicable

### User Testing

- [ ] Captains can quickly distinguish urgent bookings
- [ ] Status meanings are immediately clear
- [ ] No confusion between similar states

---

## ROLLOUT STRATEGY

### Option A: Big Bang (Recommended)

**Timeline**: 1-2 days  
**Approach**: Update all components in single PR, deploy simultaneously  
**Pros**: Clean cutover, no mixed color states  
**Cons**: Larger risk, requires thorough testing

### Option B: Phased

**Timeline**: 1-2 weeks  
**Approach**: Deploy phases sequentially with user feedback loops  
**Pros**: Lower risk, can iterate based on feedback  
**Cons**: Temporary mixed color states, user confusion during transition

**Recommendation**: **Option A (Big Bang)** because:

1. Color changes are visual only, low technical risk
2. Mixed states would cause more confusion than single cutover
3. Can test thoroughly in staging before production
4. Users adapt quickly to visual changes when comprehensive

---

## DOCUMENTATION DELIVERABLES

### 1. Color System Guide (`docs/COLOR_SYSTEM.md`)

- Complete color palette with hex codes
- Semantic meaning for each color
- Usage examples and anti-patterns
- Accessibility notes

### 2. Component Library Update

- Update BookingStatusBadge documentation
- Add color prop validation
- Include visual examples

### 3. Migration Guide

- Before/after screenshots
- Code migration examples
- Testing checklist

### 4. User-Facing Documentation

- Update help docs with new color meanings
- Add status legend to booking pages (optional)
- In-app tooltips if needed

---

## APPROVAL & SIGN-OFF

### Stakeholders

- [ ] Product Owner - Design approval
- [ ] UX Designer - Color accessibility verification
- [ ] Engineering Lead - Technical feasibility
- [ ] QA Lead - Testing plan approval

### Timeline

- **Proposal Review**: 1-2 days
- **Design Mockups**: 1-2 days
- **Implementation**: 2-3 days
- **Testing & QA**: 1-2 days
- **Deployment**: 1 day

**Total Estimated**: ~1-2 weeks from approval to production

---

## NEXT STEPS

1. **Review this proposal** - Get stakeholder feedback
2. **Create visual mockups** - Design tool screenshots of new colors
3. **Create detailed implementation plan** - Break down each file change
4. **Implement in feature branch** - Apply all color changes
5. **Comprehensive testing** - Visual + functional + accessibility
6. **Deploy to production** - Big bang cutover

---

**END OF PROPOSAL**

**Questions or Feedback?** Please comment on the related GitHub issue or PR.

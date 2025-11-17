# Booking Tab Reorganization Analysis

## Current Status Flow

### All Booking Statuses

1. **PENDING** - New booking request, needs captain approval
2. **AWAITING_PAYMENT** - Captain approved (manual flow), waiting for angler payment
3. **PAYMENT_AUTHORIZED** - Payment received (instant flow), needs captain approval
4. **PAID** - Payment received + Captain approved, trip confirmed
5. **COMPLETED** - Trip completed (auto-set by cron after trip date)
6. **REJECTED** - Captain rejected the booking
7. **CANCELLED** - Angler or captain cancelled
8. **EXPIRED** - Booking expired (payment not received in time)
9. **UNDER_REVIEW** - Special status (rarely used)

## Current Tab Organization (Problems Identified)

### 1. **Requests Tab**

**Current Filter:** `PAYMENT_AUTHORIZED` OR `PENDING`

- ✅ PENDING = New requests needing approval
- ❌ PAYMENT_AUTHORIZED = Payment already received, just needs approval
- **Problem:** Mixing unpaid requests with paid requests

### 2. **Approved Tab**

**Current Filter:** `PAID` OR `AWAITING_PAYMENT`

- ✅ PAID = Confirmed bookings
- ❌ AWAITING_PAYMENT = Approved but not paid yet
- **Problem:** Mixing confirmed bookings with pending payment bookings

### 3. **History Tab**

**Current Filter:** `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED`

- ❌ EXPIRED is missing from filter (bug confirmed)
- ✅ Includes all terminal statuses

### 4. **All Tab**

**Current Filter:** All bookings (correct)

## Proposed Reorganization

### Option A: 4-Tab System (Clearer Workflow)

#### Tab 1: "New Requests"

**Statuses:** `PENDING`, `PAYMENT_AUTHORIZED`
**Description:** Bookings requiring captain action (approve/reject)

- PENDING = New request, no payment yet
- PAYMENT_AUTHORIZED = Payment received, needs approval

#### Tab 2: "Confirmed"

**Statuses:** `PAID`
**Description:** Upcoming trips that are fully confirmed

- Payment received + Captain approved
- Ready for trip

#### Tab 3: "Pending Payment"

**Statuses:** `AWAITING_PAYMENT`
**Description:** Captain approved, waiting for angler payment

- Separated from confirmed bookings for clarity
- Captain can follow up if payment delayed

#### Tab 4: "History"

**Statuses:** `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED`
**Description:** All finished bookings (successful or unsuccessful)

---

### Option B: 5-Tab System (Maximum Clarity)

#### Tab 1: "Action Required" 🔴

**Statuses:** `PENDING`, `PAYMENT_AUTHORIZED`
**Badge:** Red/Orange priority badge
**Description:** Requires immediate captain action

#### Tab 2: "Confirmed" ✅

**Statuses:** `PAID`
**Badge:** Green
**Description:** Upcoming confirmed trips

#### Tab 3: "Awaiting Payment" ⏳

**Statuses:** `AWAITING_PAYMENT`
**Badge:** Yellow
**Description:** Approved by captain, waiting for payment

#### Tab 4: "Completed" 🎉

**Statuses:** `COMPLETED`
**Description:** Successfully completed trips

#### Tab 5: "Cancelled/Rejected"

**Statuses:** `REJECTED`, `CANCELLED`, `EXPIRED`
**Description:** Unsuccessful bookings

---

### Option C: 3-Tab System (Simplified)

#### Tab 1: "Active"

**Statuses:** `PENDING`, `PAYMENT_AUTHORIZED`, `AWAITING_PAYMENT`, `PAID`
**Description:** All bookings in progress
**Sub-sections shown in grouped view:**

- New Requests (PENDING, PAYMENT_AUTHORIZED)
- Awaiting Payment (AWAITING_PAYMENT)
- Confirmed (PAID)

#### Tab 2: "Completed"

**Statuses:** `COMPLETED`
**Description:** Successfully completed trips

#### Tab 3: "History"

**Statuses:** `REJECTED`, `CANCELLED`, `EXPIRED`
**Description:** Cancelled, rejected, or expired bookings

## Recommended Solution: **Option A (4-Tab System)**

### Why Option A?

1. **Clear workflow stages** - Easy to understand booking lifecycle
2. **Actionable grouping** - "New Requests" clearly shows what needs action
3. **Separate payment tracking** - "Pending Payment" tab helps captains follow up
4. **Not too many tabs** - Keeps UI clean while being comprehensive
5. **Fixes both known issues:**
   - Separates AWAITING_PAYMENT from confirmed bookings
   - Properly includes EXPIRED in history

### Implementation Details

#### Updated Tab Structure

```typescript
const tabs = [
  {
    id: "requests",
    label: "New Requests",
    statuses: ["PENDING", "PAYMENT_AUTHORIZED"],
    description: "Bookings requiring your approval",
    emoji: "📬",
    color: "orange", // Indicates action needed
  },
  {
    id: "confirmed",
    label: "Confirmed",
    statuses: ["PAID"],
    description: "Upcoming confirmed trips",
    emoji: "✅",
    color: "green",
  },
  {
    id: "pending-payment",
    label: "Pending Payment",
    statuses: ["AWAITING_PAYMENT"],
    description: "Approved, awaiting payment",
    emoji: "⏳",
    color: "yellow",
  },
  {
    id: "history",
    label: "History",
    statuses: ["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"],
    description: "All finished bookings",
    emoji: "📚",
    color: "gray",
  },
];
```

#### Priority Indicators

- **New Requests:** Show badge count, use warning colors
- **Pending Payment:** Show days since approval
- **Confirmed:** Show days until trip
- **History:** Standard display

## Migration Notes

### Database Changes

- None required (only UI reorganization)

### User Communication

- Add brief tooltip/help text explaining each tab
- Consider showing a "What's New" banner for first-time users after update

### Analytics Impact

- Update tab tracking events to reflect new tab IDs
- Track which tabs users spend most time in

## Testing Checklist

- [ ] All statuses appear in correct tabs
- [ ] EXPIRED bookings show in History tab
- [ ] Tab counts are accurate
- [ ] Filters work across all tabs
- [ ] Grouped view shows correct sections
- [ ] Empty states show correct messages
- [ ] Mobile layout works with new tabs
- [ ] Priority indicators display correctly

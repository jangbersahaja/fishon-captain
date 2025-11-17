# Fishon Captain - Color & Status Badge Audit

**Date**: 17 November 2025  
**Purpose**: Comprehensive audit of all status badges, colors, and visual indicators across the fishon-captain application to identify inconsistencies and plan standardization.

---

## 1. BOOKING STATUS BADGES

### Current Implementation: `BookingStatusBadge.tsx`

Location: `src/components/captain/BookingStatusBadge.tsx`

| Status               | Label                | Background     | Text             | Border             | Usage Context                             |
| -------------------- | -------------------- | -------------- | ---------------- | ------------------ | ----------------------------------------- |
| `PENDING`            | "New Request"        | `bg-amber-50`  | `text-amber-800` | `border-amber-300` | New bookings awaiting captain decision    |
| `PAYMENT_AUTHORIZED` | "Payment Authorized" | `bg-blue-100`  | `text-blue-800`  | `border-blue-300`  | Card tokenized, awaiting captain approval |
| `AWAITING_PAYMENT`   | "Payment Pending"    | `bg-green-100` | `text-green-800` | `border-green-300` | Captain approved, angler needs to pay     |
| `PAID`               | "Confirmed"          | `bg-blue-100`  | `text-blue-800`  | `border-blue-300`  | Payment completed, trip confirmed         |
| `COMPLETED`          | "Completed"          | `bg-gray-100`  | `text-gray-800`  | `border-gray-300`  | Trip finished                             |
| `REJECTED`           | "Rejected"           | `bg-red-100`   | `text-red-800`   | `border-red-300`   | Captain declined booking                  |
| `CANCELLED`          | "Cancelled"          | `bg-red-100`   | `text-red-800`   | `border-red-300`   | Angler cancelled                          |
| `EXPIRED`            | "Expired"            | `bg-red-100`   | `text-red-800`   | `border-red-300`   | Payment deadline passed                   |
| Default              | "Unknown"            | `bg-gray-100`  | `text-gray-800`  | `border-gray-300`  | Fallback                                  |

**Usage Locations**:

- `src/components/captain/EnhancedBookingCard.tsx` (2 instances)
- `src/app/(portal)/captain/bookings/[id]/page.tsx` (1 instance)
- `src/app/(portal)/captain/messages/conversations-client.tsx` (1 instance - chat UI)

**Issues Identified**:

1. ❌ **PAID and PAYMENT_AUTHORIZED use same blue color** - confusing since they're different states
2. ❌ **AWAITING_PAYMENT uses green** - conflicts with "success" meaning
3. ⚠️ **PENDING uses amber** - conflicts with "warning" in priority badges

---

## 2. PAYMENT FLOW BADGES

### Location: Multiple files

Used to show payment method type alongside booking status

| Payment Flow | Label          | Background    | Text             | Border             | Context                       |
| ------------ | -------------- | ------------- | ---------------- | ------------------ | ----------------------------- |
| `TOKENIZED`  | "Card Payment" | `bg-blue-50`  | `text-blue-700`  | `border-blue-300`  | Credit card with tokenization |
| `DIRECT`     | "Billplz"      | `bg-green-50` | `text-green-700` | `border-green-300` | Direct payment gateway        |

**Usage Locations**:

- `src/components/captain/EnhancedBookingCard.tsx`
- `src/app/(portal)/captain/bookings/[id]/page.tsx`
- `fishon-market/src/app/(marketplace)/book/confirm/page.tsx`

**Visual Style**:

```tsx
// Tokenized (Card Payment)
className = "border-blue-300 text-blue-700 bg-blue-50";

// Direct (Billplz)
className = "border-green-300 text-green-700 bg-green-50";
```

**Issues Identified**:

1. ⚠️ **TOKENIZED (blue) conflicts with PAYMENT_AUTHORIZED status badge**
2. ⚠️ **DIRECT (green) conflicts with AWAITING_PAYMENT status badge**

---

## 3. STATUS TIMELINE SECTION

### Location: `/captain/bookings/[id]` page (lines 204-266)

**Purpose**: Shows current booking status with icon and description

| Status                     | Icon Background | Icon Color       | Context                           |
| -------------------------- | --------------- | ---------------- | --------------------------------- |
| `PENDING`                  | `bg-amber-50`   | `text-amber-600` | "New Request" - Awaiting response |
| `PAYMENT_AUTHORIZED`       | `bg-blue-50`    | `text-blue-600`  | "Payment Received" - Secured      |
| `AWAITING_PAYMENT`         | `bg-green-50`   | `text-green-600` | "Awaiting Payment" - Approved     |
| `PAID`                     | `bg-green-50`   | `text-green-600` | "Confirmed" - Completed           |
| Other (REJECTED/CANCELLED) | `bg-red-50`     | `text-red-600`   | Error states                      |

**Issues Identified**:

1. ❌ **Same colors as Payment Flow Info** - blue/green overlap
2. ❌ **AWAITING_PAYMENT uses green** - conflicts with success meaning
3. ❌ **PAYMENT_AUTHORIZED and PAID both use different backgrounds** but same status badge colors

---

## 4. BOOKING NOTES & REASON MESSAGES

### Angler's Note (Booking Request)

**Locations**:

- `EnhancedBookingCard.tsx` (lines 405-411)
- `/captain/bookings/[id]` page (lines 508-513)
- `ChatHeader.tsx` (lines 296-303)

**Current Style**:

```tsx
// Angler's note (blue)
className = "p-2.5 border border-blue-100 rounded-lg bg-blue-50";
text: "text-blue-800";
```

### Rejection Reason

**Location**: `BookingTimeline.tsx` (lines 116-125)

**Current Style**:

```tsx
// Rejection (red)
className = "bg-red-50 border-red-100 text-red-800";
```

### Cancellation Reason

**Location**: `BookingTimeline.tsx` (lines 116-125)

**Current Style**:

```tsx
// Cancellation (gray)
className = "bg-gray-50 border-gray-200 text-gray-700";
```

**Issues Identified**:

1. ⚠️ **Blue for angler notes** - conflicts with PAYMENT_AUTHORIZED and PAID status
2. ✅ **Red for rejection** - correct semantic use
3. ✅ **Gray for cancellation** - appropriate neutral color

---

## 5. CHAT COMPONENTS (LEGACY STATUS BADGES)

### Location: Multiple chat components using inline status colors

#### ChatHeader.tsx (lines 70-79)

**Legacy status color mapping**:

```tsx
const statusColor = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
  EXPIRED: "bg-gray-100 text-gray-800 border-gray-200",
};
```

#### BookingDetailsCard.tsx (lines 87-92)

**Same legacy mapping** as ChatHeader

#### ChatStatusNotice.tsx (lines 19-37)

**Lock notice colors**:

```tsx
// Expired booking (amber)
color: "text-amber-600";
bgColor: "bg-amber-50";
borderColor: "border-amber-200";

// Rejected/Cancelled (red)
color: "text-red-600";
bgColor: "bg-red-50";
borderColor: "border-red-200";
```

**Issues Identified**:

1. ❌ **PENDING uses yellow** - different from booking pages (amber)
2. ❌ **APPROVED status exists** - should be PAYMENT_AUTHORIZED or AWAITING_PAYMENT
3. ❌ **Not using BookingStatusBadge component** - should be refactored
4. ⚠️ **Inconsistent with main booking status badges**

---

## 6. PRIORITY BOOKINGS SECTION

### Location: `src/components/captain/PriorityBookings.tsx`

#### Priority Section Header

- **Container**: `border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-white`
- **Icon Badge**: `bg-amber-500` (amber solid for alert icon)
- **Text**: `text-amber-900` (title), `text-amber-700` (subtitle)

#### Priority Type Pills

| Priority Type       | Background     | Text             | Icon Badge                                 | Indicator                      |
| ------------------- | -------------- | ---------------- | ------------------------------------------ | ------------------------------ |
| **New Request**     | `bg-red-100`   | `text-red-800`   | Red pulse dot (`bg-red-500 animate-pulse`) | Exclamation mark in red circle |
| **Upcoming Trip**   | `bg-blue-100`  | `text-blue-800`  | Calendar icon                              | Calendar icon in blue circle   |
| **Payment Pending** | `bg-amber-100` | `text-amber-800` | Clock icon                                 | Clock icon in amber circle     |

#### Priority Indicator Icons

Small circular badges on booking cards:

- **New Request**: `bg-red-500` (exclamation mark)
- **Upcoming Trip**: `bg-blue-500` (calendar)
- **Payment Pending**: `bg-amber-500` (clock)

#### Countdown Badge

- **Style**: `bg-slate-900 text-white` (dark badge, top-right corner)
- **Purpose**: Shows time remaining (e.g., "2h 15m")

**Issues Identified**:

1. ⚠️ **New Request uses red** - conflicts with REJECTED/CANCELLED status
2. ⚠️ **Payment Pending uses amber** - conflicts with PENDING status
3. ⚠️ **Upcoming Trip uses blue** - conflicts with PAYMENT_AUTHORIZED and PAID status

---

## 7. BOOKING TABS

### Location: `src/components/captain/BookingTabs.tsx`

#### Active Tab

- **Background**: `bg-[#ec2227]` (Fishon brand red)
- **Text**: `text-white`
- **Shadow**: `shadow-md`

#### Inactive Tab

- **Background**: `transparent`
- **Text**: `text-slate-600`
- **Hover**: `hover:bg-slate-50`

#### Tab Count Badges

| Tab Type                     | Active State             | Inactive State (count > 0)      | Inactive State (count = 0)    |
| ---------------------------- | ------------------------ | ------------------------------- | ----------------------------- |
| **Requests** (orange)        | `bg-white/20 text-white` | `bg-orange-100 text-orange-700` | `bg-slate-100 text-slate-600` |
| **Confirmed** (green)        | `bg-white/20 text-white` | `bg-green-100 text-green-700`   | `bg-slate-100 text-slate-600` |
| **Pending Payment** (yellow) | `bg-white/20 text-white` | `bg-yellow-100 text-yellow-700` | `bg-slate-100 text-slate-600` |
| **History** (gray)           | `bg-white/20 text-white` | `bg-slate-100 text-slate-600`   | `bg-slate-100 text-slate-600` |

**Issues Identified**:

1. ❌ **Tab "Requests" (orange)** but status badge PENDING (amber) - should match
2. ❌ **Tab "Pending Payment" (yellow)** but status badge AWAITING_PAYMENT (green) - should match
3. ❌ **Tab "Confirmed" (green)** but status badge PAID (blue) - should match
4. ⚠️ **Yellow (yellow-100) vs Amber (amber-50)** - inconsistent naming/usage

---

## 8. BOOKING CARD VISUAL INDICATORS

### Location: `src/components/captain/EnhancedBookingCard.tsx`

#### Card Border Colors (Urgent states)

```tsx
// Rejected/Cancelled
"border-red-300 bg-red-50/30";

// Pending (needs action)
"border-amber-300 bg-amber-50/30";
```

#### Revenue/Price Display

- **Background**: `bg-slate-50/80`
- **Icon container**: `p-2 border border-blue-100 rounded-lg bg-blue-50`

#### Action Buttons

- **View Details**: `bg-white border-slate-300 hover:bg-slate-50`
- **Primary Actions**: `bg-slate-900 text-white hover:bg-slate-800`

**Issues Identified**:

1. ✅ Red border for rejected/cancelled is consistent with status badges
2. ✅ Amber border for pending matches status badge
3. ⚠️ Blue revenue icon conflicts with payment flow badges

---

## 9. NOTIFICATION CENTER

### Location: `src/components/NotificationCenter.tsx`

#### Notification Type Colors

```tsx
// Warning notifications
"border-amber-200 bg-amber-50 text-amber-700";

// Error notifications
"border-red-200 bg-red-50 text-red-700";
```

#### Unread Indicator

```tsx
// Unread notification background
"bg-blue-50 dark:bg-blue-950/20";
```

#### Mark All Read Button

- **Style**: `bg-slate-900 text-white hover:bg-slate-800`

**Issues Identified**:

1. ✅ Amber for warnings is consistent with alert patterns
2. ✅ Red for errors is consistent
3. ✅ Blue for unread is distinct from other states

---

## 10. CALENDAR & DATE PICKER

### Location: `src/components/CalendarPicker.tsx`

#### Interactive Elements

- **Hover**: `hover:bg-gray-100`
- **Navigation buttons**: `text-gray-700 hover:bg-gray-100`
- **Today button**: `text-gray-700 hover:bg-gray-100`

**Issues Identified**:

1. ✅ Neutral gray is appropriate for calendar UI
2. ⚠️ No visual distinction for booked dates

---

## 11. FISHON MARKET - BOOKING STATUS (Cross-Reference)

### Location: `fishon-market/src/components/account/BookingStatusGuide.tsx`

| Status          | Background      | Context             |
| --------------- | --------------- | ------------------- |
| Pending         | `bg-blue-50`    | New booking request |
| Confirmed       | `bg-green-50`   | Payment completed   |
| Payment Pending | `bg-emerald-50` | Awaiting payment    |
| Rejected        | `bg-red-50`     | Declined by captain |
| Cancelled       | `bg-orange-50`  | Cancelled by angler |
| Completed       | `bg-gray-50`    | Trip finished       |

**Issues Identified**:

1. ❌ **Fishon Market uses DIFFERENT colors than Fishon Captain** for same statuses
2. ❌ **Emerald vs Green distinction unclear** (Payment Pending vs Confirmed)
3. ❌ **Cancelled (orange) vs Rejected (red)** - inconsistent with captain app

---

## 12. OTHER UI ELEMENTS

### PWA Install Badge

- **Ready**: `bg-green-500`
- **Secondary**: `variant="secondary"`
- **Not Supported**: `variant="destructive"` (red)
- **Warning**: `border-yellow-200 bg-yellow-50`

### Chat/Conversation

- **Unread badge**: `variant="default"` (default badge color)
- **Booker badge**: `variant="secondary"`

### Analytics/Stats

- **Funnel Stage 1**: `bg-blue-500`
- **Funnel Stage 2**: `bg-purple-500`
- **Funnel Stage 3**: `bg-orange-500`
- **Funnel Stage 4**: `bg-green-500`

---

## SUMMARY OF COLOR CONFLICTS

### 🔴 CRITICAL CONFLICTS

1. **Blue Overload**
   - PAYMENT_AUTHORIZED status badge (blue)
   - PAID status badge (blue)
   - TOKENIZED payment flow (blue)
   - Upcoming Trip priority pill (blue)
   - Fishon Market "Pending" (blue) vs Captain "PENDING" (amber)

2. **Green Confusion**
   - AWAITING_PAYMENT status badge (green)
   - DIRECT payment flow (green)
   - "Confirmed" tab count badge (green)
   - Success states (green)
   - Fishon Market "Confirmed" (green) matches success meaning ✅

3. **Amber/Yellow/Orange Inconsistency**
   - PENDING status badge (amber)
   - Priority section (amber)
   - Payment Pending priority pill (amber)
   - "Requests" tab count (orange)
   - "Pending Payment" tab count (yellow)
   - Notifications warning (amber)

4. **Red Usage**
   - REJECTED/CANCELLED/EXPIRED status badges (red)
   - New Request priority pill (red)
   - Error states (red)
   - Fishon Market "Rejected" (red) ✅

### ⚠️ DESIGN PRINCIPLE VIOLATIONS

1. **Same color for different meanings**
   - Blue used for: authorized payment, confirmed payment, upcoming trips, tokenized method
   - Green used for: awaiting payment (action needed) AND success states (confusing!)

2. **Different colors for same meaning**
   - PENDING status (amber) vs "Requests" tab (orange) vs "New Request" priority (red)
   - AWAITING_PAYMENT status (green) vs "Pending Payment" tab (yellow) vs priority pill (amber)

3. **Semantic color misuse**
   - Green typically means "success/complete" but used for "awaiting payment" (incomplete state)
   - Amber/yellow typically means "warning/attention" but inconsistently applied

---

## RECOMMENDATIONS FOR NEXT STEP

### Proposed Color System (Semantic Approach)

**Priority**: Establish clear semantic meanings first, then assign colors consistently

| Semantic Meaning             | Suggested Color | Use Cases                               |
| ---------------------------- | --------------- | --------------------------------------- |
| **Action Required (Urgent)** | Red             | New requests, payment expiring soon     |
| **Action Required (Normal)** | Orange/Amber    | Pending approvals, awaiting decisions   |
| **In Progress / Awaiting**   | Yellow          | Pending payment, processing             |
| **Authorized / Held**        | Indigo/Purple   | Payment authorized but not captured     |
| **Confirmed / Success**      | Green           | Paid, confirmed, completed successfully |
| **Cancelled / Rejected**     | Red             | All rejection/cancellation states       |
| **Neutral / Complete**       | Gray            | Completed trips, archived               |
| **Info / Default**           | Blue            | Information, neutral states             |

### Next Steps

1. Map each current status/state to semantic meaning
2. Redesign color palette with clear hierarchy
3. Create unified component library with standardized colors
4. Update all instances to use new system
5. Document color usage guidelines

---

**END OF AUDIT**

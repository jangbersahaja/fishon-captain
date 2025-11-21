# Plan: Dashboard Overview Redesign & Configuration

## TL;DR

Enhance the captain dashboard homepage (`/captain`) with a tiered information architecture that displays real-time metrics, priority alerts, and quick access to key features. The redesign incorporates 5 high-value components (BookingStatsCards, PriorityBookings, AnalyticsStatsCards, EarningsOverview, CharterStatus) in a responsive grid layout with admin override support, following existing Fishon design patterns.

---

## Layout Design

### Visual Hierarchy (Mobile-First Responsive)

```
┌────────────────────────────────────────────────────────────┐
│                       HEADER SECTION                       │
│  Title: "Welcome back, [Captain Name]"                     │
│  Subtitle: "Manage your charter and documents here."       │
│  Admin Banner (if applicable)                              │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                   PRIORITY ALERTS SECTION                  │
│  PriorityBookings Component (Collapsible)                  │
│  - Shows: New Requests, Upcoming Trips, Payment Holds      │
│  - Color-coded icons, counts, and action links             │
│  - Defaults to expanded if items present, collapsed if none│
└────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    METRICS GRID (Responsive)                │
│                                                             │
│  MOBILE (1 column):                                         │
│  ┌────────────────────────────────┐                         │
│  │  Booking Stats (4 cards stack) │                         │
│  ├────────────────────────────────┤                         │
│  │  Period Earnings               │                         │
│  ├────────────────────────────────┤                         │
│  │  Marketplace Analytics         │                         │
│  ├────────────────────────────────┤                         │
│  │  Charter Performance           │                         │
│  └────────────────────────────────┘                         │
│                                                             │
│  TABLET (2 columns):                                        │
│  ┌──────────────────┬──────────────────┐                    │
│  │  Booking Stats   │  Period Earnings │                    │
│  ├──────────────────┼──────────────────┤                    │
│  │  Analytics Stats │  Charter Perf.   │                    │
│  └──────────────────┴──────────────────┘                    │
│                                                             │
│  DESKTOP (3+ columns):                                      │
│  ┌────────────────┬────────────────┬────────────────┐       │
│  │  Booking Stats │  Period Earn   │  Analytics     │       │
│  ├────────────────┼────────────────┼────────────────┤       │
│  │  Charter Perf. │   (Reserved)   │   (Reserved)   │       │
│  └────────────────┴────────────────┴────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                  MULTIPLE CHARTERS SECTION                 │
│  (Only shown if charters.length > 1)                       │
│                                                            │
│  Title: "Your Charters (N)"  [+ Add Charter Button]        │
│  Grid: Responsive (1 col mobile, 2 tablet, 3 desktop)      │
│  - Charter cards with enhanced stats                       │
│  - Active/Inactive indicators                              │
│  - Quick access links                                      │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                    QUICK LINKS SECTION                     │
│  Horizontal button/link row to key pages:                  │
│  - Manage Bookings | View Earnings | Documents             │
│  - Settings | Support | Messages                           │
└────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Admin Override Banner (Existing Pattern - Reuse)

**Location**: Top of page (if `targetUserInfo` exists)
**Purpose**: Alert admins they're viewing another user's dashboard
**Props**:

- `targetUserInfo: { id, email, name, role }`
- `onExit: () => navigate("/staff")`

**Design**:

```
┌─────────────────────────────────────────────────┐
│ 🛡️ Admin Override Active                        │
│ Viewing dashboard for: [Name] ([Email])  [Exit] │
└─────────────────────────────────────────────────┘
```

**Styling**: `border-2 border-orange-200 rounded-lg bg-orange-50`

---

### 2. Header Section (New)

**Location**: Below admin banner
**Purpose**: Title, greeting, context setting

**Content**:

- `h1`: "Welcome back, [displayName]" OR "Dashboard - [target user email]" (if admin viewing)
- `p`: "Manage your charter and documents here." OR "Admin view of user's charter and documents"

**Styling**: Existing pattern from current page

---

### 3. Priority Bookings Component (Relocated)

**Location**: Below header, full-width
**Current Source**: `/bookings` page
**Purpose**: Alert captain to urgent items needing attention

**Included Items** (with collapsible sections):

1. **New Requests** (< 24h old)
   - Count badge
   - Small preview cards with customer, trip, date
   - "View All" link to `/bookings?tab=requests`

2. **Upcoming Trips** (< 48h until trip date)
   - Count badge
   - Preview cards with trip name, date, time, customer
   - "View All" link to `/bookings?tab=confirmed`

3. **Payment Pending** (status = PAYMENT_AUTHORIZED)
   - Count badge
   - Booking cards with amount, date
   - "Collect Payment" action links

**Styling**:

- Background: `bg-white border border-slate-200 rounded-2xl p-4`
- Header: `flex items-center justify-between`
- Section headers: Caps text with count badges in red
- Items: Use `EnhancedBookingCard` component (already exists)

**Behavior**:

- Default: Collapsed if no items, expanded if items present
- Chevron icon to toggle
- Smooth height animation

**Data Requirements**:

- All bookings for captain's charters (Market DB)
- Enriched with trip details, customer info
- Pre-calculated urgency/priority

---

### 4. Metrics Grid Section (New Architecture)

**Location**: Below priority alerts
**Purpose**: At-a-glance view of key performance indicators

#### 4.1 Booking Stats Card (Relocated from `/bookings`)

**Component**: Reuse `BookingStatsCards`
**Location**: Grid item 1 (top-left on desktop)
**Purpose**: Monthly booking activity summary

**Displays**:

- **Requests**: Count of PENDING bookings
- **Upcoming Trips**: Count of trips with `tripDate > now AND tripDate < now + 7 days`
- **Completed Trips**: Count of completed bookings this month
- **Cancellations**: Count of CANCELLED bookings this month

**Stats Card Format** (4 cards in grid):

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 📋 Requests  │  │ 📅 Upcoming  │  │ ✓ Completed  │  │ ✗ Cancelled  │
│      12      │  │       8      │  │      24      │  │       2      │
│  ↑ 2 this wk │  │ Next: Dec 15 │  │ This month   │  │ This month   │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**Styling**: Use existing `BookingStatsCards` component structure
**Data Requirements**: All captain's bookings (Market DB)

---

#### 4.2 Period Earnings Card (Relocated from `/earnings`)

**Component**: Compact variant of `EarningsOverview`
**Location**: Grid item 2 (top-center on desktop)
**Purpose**: Revenue snapshot with period comparison

**Displays**:

```
┌─────────────────────────────────────┐
│ 💰 Period Earnings                  │
│ RM 4,500                            │
│ ↑ 15% vs last month                 │
├─────────────────────────────────────┤
│ Pending Settlement:  RM 1,200       │
│ Commission Rate:     5%             │
│ Next Payout:        Dec 15          │
└─────────────────────────────────────┘
```

**Styling**:

- Header: `text-sm font-semibold text-slate-900`
- Large value: `text-2xl font-bold text-[#ec2227]`
- Trend: Green arrow ↑ if positive, red ↓ if negative
- Subtext: Gray for pending/rate/date info

**Data Requirements**:

- Period selector: Default = "this month"
- Compare current period vs previous period
- Sum bookings where `status = PAID` or `PAYMENT_AUTHORIZED`
- Fetch Payout records for next payout date

---

#### 4.3 Analytics Stats Card (Relocated from planned `/dashboard` analytics)

**Component**: Use `AnalyticsStatsCards` structure
**Location**: Grid item 3 (top-right on desktop)
**Purpose**: Marketplace visibility & conversion metrics

**Displays** (4 cards):

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 👁️ Views     │  │ 👤 Visitors  │  │ 📊 Conv Rate │  │ 📌 Requests  │
│     342      │  │      58      │  │    3.5%      │  │      15      │
│  ↑ 12%       │  │  ↑ 8%        │  │  ↓ 0.5%      │  │  ↑ 2.3%      │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**Data Requirements**:

- Views: Aggregate page views for captain's charters (from analytics table if available)
- Visitors: Unique visitor count
- Conversion Rate: Booking requests / views (%)
- Requests: Count of new booking requests this period
- Trend indicators: Compare to previous period

**Note**: If analytics data not available, show placeholder/coming soon state

---

#### 4.4 Charter Performance Grid (New Component Variant)

**Location**: Grid item 4 (bottom-left on desktop)
**Purpose**: Quick health check of active charters

**Display Format** (if multiple charters):

```
┌─────────────────────────────────┐
│ 🎣 Charter Performance          │
├─────────────────────────────────┤
│ Great Catch (Active)            │
│ ⭐ 4.8 (12 reviews)             │
│ 5 bookings this month           │
│ 📸 12 media items               │
├─────────────────────────────────┤
│ Trip 2                          │
│ ⭐ 4.5 (8 reviews)              │
│ 2 bookings this month           │
│ 📸 8 media items                │
└─────────────────────────────────┘
```

**Display Format** (if single charter):

```
┌──────────────────────────────────┐
│ 🎣 Charter Health                │
│ Great Catch (Active)             │
├──────────────────────────────────┤
│ Reviews:      4.8 ⭐ (12 total)  │
│ Bookings:     5 this month       │
│ Media:        12 items           │
│ Last Updated: Dec 18, 2:30pm     │
└──────────────────────────────────┘
```

**Data Requirements**:

- Charter name, active status
- Average rating (if reviews implemented)
- Booking count for this month
- Media count (photos + videos)
- Last update timestamp

---

### 5. Multiple Charters Section (Enhanced)

**Location**: Below metrics grid (if `charters.length > 1`)
**Purpose**: Manage multiple charter listings

**Current State**: Existing charter grid already on page
**Enhancement**:

- Keep existing layout/styling
- Consider adding quick stats under each charter name
- Show booking count badge

**Content**:

```
┌──────────────────────────────────────────────────────┐
│ Your Charters (3)              [+ Add Charter]       │
├──────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐             │
│ │ ✓ Great Catch   │  │  Trip 2         │             │
│ │ Jakarta, DKI    │  │  Lombok, NTB    │             │
│ │ 5 trips · 12 📸  │  │  2 trips · 8 📸  │             │
│ │ [5 bookings]    │  │  [2 bookings]   │             │
│ │ [Manage →]      │  │  [Manage →]     │             │
│ └─────────────────┘  │  └─────────────────┘             │
│                                                         │
│ ┌─────────────────┐                                   │
│ │  Archived       │                                   │
│ │  South Coast    │                                   │
│ │  0 trips · 0 📸  │                                   │
│ │  [Manage →]     │                                   │
│ └─────────────────┘                                   │
└──────────────────────────────────────────────────────┘
```

---

### 6. Quick Links Section (Optional, New)

**Location**: Bottom of page
**Purpose**: Fast access to frequent tasks

**Design Options**:

**Option A: Button Group (Horizontal)**

```
┌──────────────────────────────────────────────────────┐
│  [Bookings]  [Earnings]  [Documents]  [Settings]     │
│  [Messages]  [Support]   [Crew]       [Boats]        │
└──────────────────────────────────────────────────────┘
```

**Option B: Card-Based (Grid)**

```
┌─────────────────┬─────────────────┬─────────────────┐
│ 📋 Bookings     │ 💰 Earnings     │ 📄 Documents    │
│ View & manage   │ Revenue & payouts│ Verify identity │
└─────────────────┴─────────────────┴─────────────────┘
```

**Recommendation**: Use Option A (simpler, less clutter at bottom)

---

## Responsive Breakpoints

```
MOBILE (< 640px):
├─ Admin Banner (full width)
├─ Header (full width)
├─ Priority Bookings (full width, may be collapsed)
├─ Metrics Grid (1 column)
│  ├─ Booking Stats (4 stacked cards)
│  ├─ Period Earnings (full width)
│  ├─ Analytics Stats (4 stacked cards)
│  └─ Charter Performance (full width)
├─ Charter List (1 column grid)
└─ Quick Links (stacked buttons)

TABLET (640px - 1024px):
├─ Admin Banner (full width)
├─ Header (full width)
├─ Priority Bookings (full width)
├─ Metrics Grid (2 columns)
│  ├─ Booking Stats | Period Earnings
│  ├─ Analytics Stats | Charter Perf
├─ Charter List (2 column grid)
└─ Quick Links (2-row button grid)

DESKTOP (> 1024px):
├─ Admin Banner (full width)
├─ Header (full width)
├─ Priority Bookings (full width, may be collapsed)
├─ Metrics Grid (4 columns - 2 rows)
│  ├─ Booking Stats | Period Earnings | Analytics | Reserved
│  ├─ Charter Perf | Reserved | Reserved | Reserved
├─ Charter List (3 column grid)
└─ Quick Links (inline button row)
```

---

## Data Architecture & Flow

### Data Sources (by component)

| Component           | Data Source                 | Query                                        | Caching           |
| ------------------- | --------------------------- | -------------------------------------------- | ----------------- |
| BookingStatsCards   | Market DB (Booking)         | `getBookingsForCaptain()`                    | Server cache 5min |
| PriorityBookings    | Market DB (Booking)         | `getPriorityBookings()` + priority algorithm | Server cache 1min |
| EarningsOverview    | Market DB (Booking, Payout) | `getEarningsSummary()` + compare periods     | Server cache 5min |
| AnalyticsStatsCards | Analytics table (TBD)       | `getCharterAnalytics()`                      | Server cache 1hr  |
| CharterPerformance  | Prisma (Charter, Review)    | `getCaptainCharters()` + booking counts      | Server cache 5min |

### Server-Side Data Fetching Function (New)

Create: `src/lib/dashboard-service.ts`

```typescript
export async function getDashboardData(
  userId: string,
  period: "7d" | "30d" | "90d" = "30d"
) {
  // 1. Get captain profile & charters
  const profile = await getCaptainProfile(userId);

  // 2. Get booking stats for period
  const bookingStats = await getBookingStats(profile.id, period);

  // 3. Get priority bookings (urgent items)
  const priorityBookings = await getPriorityBookings(profile.id);

  // 4. Get earnings summary (current period vs previous)
  const earningsData = await getEarningsSummary(userId, period);

  // 5. Get analytics (views, conversion rate, etc)
  const analyticsData = await getCharterAnalytics(profile.id, period);

  // 6. Get charter performance (ratings, booking counts)
  const charterPerformance = await getCharterPerformance(profile.id);

  return {
    profile,
    bookingStats,
    priorityBookings,
    earningsData,
    analyticsData,
    charterPerformance,
  };
}
```

### Service Functions to Create/Update

1. **`getBookingStats(captainId, period)`**
   - Queries: Market DB (Booking table)
   - Returns: `{ requests, upcoming, completed, cancellations }`

2. **`getPriorityBookings(captainId)`**
   - Queries: Market DB (Booking) + Prisma (Charter)
   - Returns: Organized by priority type with urgency info

3. **`getEarningsSummary(userId, period)`**
   - Queries: Market DB (Booking, Payout)
   - Returns: `{ currentPeriod, previousPeriod, percentChange, pending, nextPayoutDate }`

4. **`getCharterAnalytics(captainId, period)`**
   - Queries: Analytics table (if available) or fallback to mock
   - Returns: `{ views, visitors, conversionRate, requests }`

5. **`getCharterPerformance(captainId)`**
   - Queries: Prisma (Charter + Booking counts) + Review table (if available)
   - Returns: Array of charters with stats

---

## Component Creation/Modification Plan

### New Components to Create

1. **`src/components/captain/DashboardMetricsGrid.tsx`**
   - Container component for metrics grid
   - Handles responsive layout (1-4 columns)
   - Props: `bookingStats`, `earningsData`, `analyticsData`, `charterPerf`

2. **`src/components/captain/QuickLinksSection.tsx`** (Optional)
   - Row of quick-access buttons/links
   - Props: `adminUserId` (for maintaining query param)

### Components to Relocate/Adapt

1. **`BookingStatsCards`** (from `/bookings`)
   - Use as-is, or create dashboard variant with slightly reduced styling

2. **`PriorityBookings`** (from `/bookings`)
   - Extract to standalone component if not already
   - Make collapsible (default behavior)

3. **`EarningsOverview`** (from `/earnings`)
   - Create compact variant for dashboard
   - Retain period selector or make fixed to current month

4. **`AnalyticsStatsCards`** (from `analytics/` folder)
   - Extract to dashboard if not yet connected
   - Show placeholder if data unavailable

### Components to Update in Current Page

1. **Admin Banner** - Keep existing pattern ✓
2. **Header** - Keep existing pattern ✓
3. **Charter Grid** - Enhance with optional booking count badges (optional)

---

## Phases (Implementation Steps)

### Phase 1: Data Layer Setup

- **Objective**: Create dashboard data service with all necessary queries
- **Files/Functions to Create/Modify**:
  - `src/lib/dashboard-service.ts` (new) - Main dashboard data fetcher
  - `src/lib/booking-service.ts` (update) - Add `getBookingStats()`
  - `src/lib/services/finance-service.ts` (update) - Add period comparison logic
  - `src/lib/charter-service.ts` (update) - Add charter performance queries
- **Tests to Write**:
  - `getBookingStats()` returns correct counts
  - `getPriorityBookings()` prioritizes correctly by urgency
  - `getEarningsSummary()` calculates period comparison
  - Period selector works (7d, 30d, 90d)
- **Steps**:
  1. Write tests first (TDD) - define expected outputs
  2. Create service functions with minimal implementation
  3. Tests pass ✓
  4. Lint & format
  5. Verify all calculations match expected data

### Phase 2: Component Extraction & Creation

- **Objective**: Extract and adapt existing components for dashboard reuse
- **Files/Functions to Create/Modify**:
  - Extract `PriorityBookings` to standalone component (if needed)
  - Create `DashboardMetricsGrid.tsx` - container for metric cards
  - Create `CharterPerformanceCard.tsx` - new card component
  - Create `QuickLinksSection.tsx` (optional) - bottom link bar
  - Create `AdminBannerDashboard.tsx` - refactor existing banner
- **Tests to Write**:
  - Each component renders correctly with provided props
  - Responsive grid layout adapts to breakpoints
  - Admin banner shows/hides based on `targetUserInfo`
  - Collapsible sections toggle correctly
- **Steps**:
  1. Write component tests with mocked data
  2. Create components with minimal styling (focus on structure)
  3. Tests pass ✓
  4. Lint & format

### Phase 3: Page Integration

- **Objective**: Integrate all components into `/captain` page with data
- **Files/Functions to Modify**:
  - `src/app/(portal)/captain/page.tsx` (update)
- **Tests to Write**:
  - Page renders without admin banner when not admin
  - Page shows admin banner when adminUserId provided
  - Period selector works (query param: `?period=30d`)
  - All metrics display correctly
  - Responsive layout works on mobile/tablet/desktop
- **Steps**:
  1. Update `getCharter()` to call `getDashboardData()`
  2. Pass dashboard data to new grid component
  3. Add period selector (query param handler)
  4. Verify admin override still works
  5. Tests pass ✓

### Phase 4: Styling & Polish

- **Objective**: Apply Fishon design system, ensure responsive perfection
- **Files/Functions to Modify**:
  - All component files (tailwind class updates)
  - `src/app/(portal)/captain/page.tsx` (layout refinements)
- **Tests to Write**:
  - Visual regression tests (screenshot tests optional)
  - Accessibility checks (ARIA labels, contrast ratios)
  - Responsive behavior on all breakpoints
- **Steps**:
  1. Apply consistent spacing, colors, typography
  2. Verify all components match Fishon design system
  3. Test on mobile/tablet/desktop
  4. Ensure animations smooth and performant
  5. Tests pass ✓
  6. Final lint & format

### Phase 5: Analytics & Period Selection (Optional)

- **Objective**: Add period selector and analytics calculations
- **Files/Functions to Create/Modify**:
  - Add period selector UI (dropdown or tabs)
  - Update all data services to support period parameter
  - Add analytics calculations if not already done
- **Tests to Write**:
  - Period selector updates data when changed
  - Calculations correct for each period
  - URL query param persists across refreshes
- **Steps**:
  1. Implement period selector component
  2. Connect to query params
  3. Update `getDashboardData()` to accept period
  4. Tests pass ✓

### Phase 6: Final Testing & Deployment

- **Objective**: Full integration testing, performance, accessibility
- **Tests to Write**:
  - End-to-end tests for all dashboard scenarios
  - Performance tests (page load time, component render time)
  - Accessibility audit
  - Admin bypass works correctly
- **Steps**:
  1. Run full test suite
  2. Performance profiling
  3. Accessibility check (axe, lighthouse)
  4. Manual QA on staging
  5. Deploy to production

---

## Design Specifications

### Colors & Typography

| Element            | Color              | Font Size   | Font Weight     |
| ------------------ | ------------------ | ----------- | --------------- |
| Admin Banner Title | `text-orange-800`  | `text-sm`   | `font-semibold` |
| Admin Banner Bg    | `bg-orange-50`     | -           | -               |
| Page Title         | `text-slate-900`   | `text-2xl`  | `font-semibold` |
| Metric Label       | `text-slate-900`   | `text-sm`   | `font-semibold` |
| Metric Value       | `text-slate-900`   | `text-2xl`  | `font-bold`     |
| Trending Up        | `text-green-600`   | `text-sm`   | `font-medium`   |
| Trending Down      | `text-red-600`     | `text-sm`   | `font-medium`   |
| Section Header     | `text-slate-900`   | `text-base` | `font-semibold` |
| Card Border        | `border-slate-200` | -           | -               |
| Card Background    | `bg-white`         | -           | -               |

### Spacing

| Element                   | Spacing                       |
| ------------------------- | ----------------------------- |
| Page padding (top/bottom) | `py-8`                        |
| Page padding (left/right) | `px-6`                        |
| Section gap               | `space-y-6`                   |
| Grid gap                  | `gap-4`                       |
| Card padding              | `p-4` or `p-5`                |
| Card border radius        | `rounded-2xl` or `rounded-xl` |

### Icons Used

- 📋 Requests / Bookings
- 📅 Upcoming / Calendar
- ✓ Completed / Checkmark
- ✗ Cancelled / X
- 💰 Earnings / Money
- 👁️ Views / Eye
- 👤 Visitors / Person
- 📊 Conversion / Chart
- 📌 Requests Pin
- ⭐ Rating / Star
- 🎣 Charter / Fish Hook
- 📸 Media / Camera
- 🛡️ Admin / Shield
- 🚀 Upgrade / Rocket

---

## Open Questions

1. **Analytics Data Source**: Are views/conversion data available in analytics table, or should we mock this initially?
2. **Reviews/Ratings**: When will review system be implemented? Should we show placeholder UI now?
3. **Period Selector**: Should we add dropdown (7d/30d/90d) or keep fixed to "30d"?
4. **Quick Links**: Should we include optional quick links section at bottom, or keep page focused?
5. **Admin Bypass**: Should admin view show all charters across user's account, or filter same as captain view?

---

## Success Criteria

✅ Dashboard displays all 5 metric components
✅ Responsive layout works on mobile/tablet/desktop
✅ Admin override banner displays & functions correctly
✅ Priority alerts show only relevant items
✅ All metrics calculate correctly from real data
✅ Period comparison shows trend indicators
✅ Page loads within performance budget (< 2s LCP)
✅ Accessibility score > 90 (lighthouse)
✅ Unit tests cover all new services & components
✅ E2E tests verify dashboard workflows

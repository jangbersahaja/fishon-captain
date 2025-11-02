---
type: plan
status: proposed
updated: 2025-10-30
feature: captain-booking-management
author: copilot
---

# Captain Booking Management UX - Comprehensive Plan

## Problem Statement

The current captain bookings page (`/captain/bookings`) lacks clear prioritization and workflow guidance:

1. **No Priority System**: All bookings shown equally - captain doesn't know what needs immediate attention
2. **Limited Filters**: No way to filter by date, status groups, or charter
3. **Poor Organization**: Just a flat list - hard to manage when volume increases
4. **No Urgency Indicators**: Time-sensitive bookings (pending requests, upcoming trips) not highlighted
5. **Missing Context**: Can't see booking timeline, response time, or angler history at a glance

**User Quote**: "I don't really know what to do and focus on. It just show list of booking, without any priority, no filters and tabs."

## Research Insights

### Airbnb Host Dashboard Pattern

- **Inbox-style priority**: "Requires Action" at top
- **Time-based urgency**: "Respond within 24 hours" countdown
- **Tab organization**: Today → Upcoming → Past → Cancelled
- **Quick actions**: Approve/Decline with one click
- **Guest info preview**: Rating, verified badge, booking history

### Booking.com Extranet Pattern

- **Dashboard overview**: Stats + actions needed
- **Calendar view**: Monthly/weekly grid with bookings
- **Filter stack**: Date range + Status + Property + Sort
- **Color coding**: Visual status indicators (green=confirmed, yellow=pending, red=cancelled)
- **Bulk actions**: Select multiple, approve/reject together

### Key Principles for Captain UX

1. **Attention-driven design**: Show what needs action FIRST
2. **Time sensitivity**: Highlight requests that need quick response
3. **Context at a glance**: Booking date, angler info, price visible immediately
4. **Progressive disclosure**: Summary view → Full details on demand
5. **Reduce cognitive load**: Clear status, next actions obvious

## Proposed Solution

### Architecture: Three-Level Information Hierarchy

```
┌─────────────────────────────────────────┐
│  LEVEL 1: PRIORITY ALERTS               │  ← Urgent attention needed
│  - New requests (< 24h old)             │
│  - Upcoming trips (next 7 days)         │
│  - Payment pending (approved bookings)  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  LEVEL 2: ORGANIZED VIEWS               │  ← Filtered by intent
│  [Tabs]                                 │
│  - Requests (needs decision)            │
│  - Upcoming (next 30 days)              │
│  - All Bookings (searchable)            │
│  - History (past + cancelled)           │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  LEVEL 3: ADVANCED FILTERS              │  ← Power user tools
│  - Date range picker                    │
│  - Charter selector                     │
│  - Status multi-select                  │
│  - Sort options (date, price, status)   │
└─────────────────────────────────────────┘
```

## Detailed Implementation Plan

### Phase 1: Priority Section (High Impact)

**Location**: Above stats cards

**Component**: `<PriorityBookings />`

```typescript
interface PriorityBooking {
  id: string;
  type: "new-request" | "upcoming-trip" | "payment-pending";
  urgency: "high" | "medium" | "low";
  booking: EnrichedMarketBooking;
  countdown?: string; // "23h remaining to respond"
  action: string; // "Review request", "Prepare trip", "Follow up payment"
}
```

**Display Rules**:

1. **New Requests** (PENDING < 24h old)
   - Badge: "NEW" (red pulse animation)
   - Countdown: Time since request
   - CTA: "Review Now" (approve/reject)
   - Sort: Oldest first (first-in-first-out)

2. **Upcoming Trips** (PAID, date within 7 days)
   - Badge: "UPCOMING" (blue)
   - Days until trip: "In 3 days"
   - CTA: "View Details", "Contact Angler"
   - Sort: Soonest first

3. **Payment Pending** (APPROVED > 48h, no payment)
   - Badge: "PAYMENT PENDING" (amber)
   - Days since approval: "Waiting 3 days"
   - CTA: "Send Reminder" (future feature)
   - Sort: Longest waiting first

**Visual Design**:

```
┌──────────────────────────────────────────────────────────┐
│ ⚡ NEEDS ATTENTION (3)                                    │
├──────────────────────────────────────────────────────────┤
│ 🔴 NEW   John Smith requested "Half Day Offshore"        │
│          Tomorrow, 8:00 AM • RM 800 • 4 guests          │
│          ⏰ 23h remaining    [Review Request →]          │
├──────────────────────────────────────────────────────────┤
│ 🔵 TRIP  Sarah Lee - "Full Day Inshore"                 │
│          In 3 days • RM 1,200 • Paid                    │
│          [View Details →] [Contact Angler]               │
├──────────────────────────────────────────────────────────┤
│ 🟡 WAIT  Mike Tan waiting for payment                   │
│          Approved 3 days ago • RM 600                   │
│          [Send Reminder] [View Details →]               │
└──────────────────────────────────────────────────────────┘
```

**Collapsible**: Allow captain to collapse section once reviewed

---

### Phase 2: Tab-Based Organization (Medium Impact)

**Tabs**: 4 main views + badge counts

```typescript
type BookingTab =
  | "requests" // PENDING status
  | "upcoming" // PAID + date <= 30 days
  | "all" // All statuses, searchable
  | "history"; // COMPLETED + REJECTED + CANCELLED + date > 30 days
```

#### Tab 1: Requests (PENDING)

- **Purpose**: Decision-making view
- **Sort**: Oldest first (urgent on top)
- **Highlight**: Requests > 12h old (yellow warning)
- **Actions**: Approve/Reject inline
- **Empty state**: "No pending requests 🎉 All caught up!"

#### Tab 2: Upcoming (PAID, next 30 days)

- **Purpose**: Trip preparation view
- **Sort**: Date ascending (soonest first)
- **Grouping**: By week ("This Week", "Next Week", "2-4 Weeks")
- **Actions**: "View Details", "Contact Angler", "Add Notes"
- **Empty state**: "No upcoming trips. Check your calendar availability."

#### Tab 3: All Bookings (Searchable + Filterable)

- **Purpose**: Full history, research, reporting
- **Features**:
  - Search bar (angler name, charter, booking ID)
  - Multi-status filter (checkboxes)
  - Date range picker
  - Charter selector (if captain has multiple)
  - Sort dropdown (date, price, status)
- **Default**: All statuses, last 90 days, sorted by date DESC

#### Tab 4: History (Archived)

- **Purpose**: Past bookings, cancelled bookings
- **Includes**: COMPLETED, REJECTED, CANCELLED, EXPIRED
- **Sort**: Date descending (recent first)
- **Pagination**: 20 per page
- **Filters**: Status filter, date range
- **Empty state**: "No booking history yet."

---

### Phase 3: Enhanced Booking Cards (High Impact)

**Current Issues**:

- Too much info in one horizontal row
- Hard to scan quickly
- Actions not prominent enough

**Proposed Card Design**:

```
┌────────────────────────────────────────────────────────────┐
│ [Status Badge]    [Charter Name] • [Trip Name]         [⋮] │
│                                                              │
│ 👤 Angler Name (Guest badge if guest)                       │
│ 📅 Mon, Dec 2 • 8:00 AM                                     │
│ 👥 4 adults, 2 children                                     │
│ 💰 RM 1,200 (2 days × RM 600)                              │
│                                                              │
│ [Timeline Component] ───────────●────────○────────○         │
│                    Requested  Approved  Payment  Trip       │
│                    2h ago                                    │
│                                                              │
│ 📝 Note: "First time fishing, need guidance"               │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │  [View Full Details]  [Approve]  [Reject]  [Contact]  │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Key Enhancements**:

1. **Status Timeline**: Visual progress indicator
   - Shows booking journey: Requested → Approved → Paid → Trip → Completed
   - Current stage highlighted
   - Time since last action

2. **Angler Context**:
   - Name + avatar
   - Guest vs registered user badge
   - Booking history count (future: "5th booking with you")
   - Email visible (for contact)

3. **Trip Details at Glance**:
   - Date in human format ("Tomorrow", "In 3 days", "Dec 25")
   - Time (if specified)
   - Guest count (adults + children)
   - Duration (if multi-day)

4. **Financial Info**:
   - Total price prominent
   - Breakdown visible (days × rate)
   - Payment status indicator

5. **Special Notes**:
   - Angler notes highlighted (yellow background)
   - Dietary restrictions, special requests
   - Rejection/cancellation reason (if applicable)

6. **Quick Actions**:
   - Context-sensitive buttons (status-dependent)
   - PENDING: Approve + Reject
   - APPROVED: "Contact Angler" + "View Details"
   - PAID: "Prepare Trip" + "Contact Angler"
   - COMPLETED: "View Details" + "Request Review"

---

### Phase 4: Calendar View (Optional, Lower Priority)

**Purpose**: Visual schedule overview

**Implementation**: Optional toggle view

```
┌──────────────────────────────────────────────────────────┐
│ [List View] [Calendar View] ←────────────── Toggle       │
└──────────────────────────────────────────────────────────┘

 DECEMBER 2025
 SUN  MON  TUE  WED  THU  FRI  SAT
  1    2    3    4    5    6    7
            ─────            ─────
            │8AM│            │1PM│  ← Booking blocks
            ─────            ─────
  8    9    10   11   12   13   14
 ─────
 │FUL│ ← Full day trip
 ─────
```

**Features**:

- Month view with booking blocks
- Color-coded by status
- Click to see booking details
- Day view shows time slots
- Export to .ics (sync with Google Calendar)

**Considerations**:

- Additional development time
- Mobile responsiveness challenging
- May be overkill for captains with low booking volume
- **Recommendation**: Implement in Phase 2 if data shows high booking volume (>20/month)

---

### Phase 5: Advanced Features (Future)

**Smart Notifications**:

- Desktop/mobile push when new request arrives
- Email digest: "3 pending requests need your attention"
- SMS for urgent bookings (< 2h response time)

**Angler Insights**:

- Booking history with this captain
- Average rating given by angler (from reviews)
- Cancellation rate (red flag for repeat cancellers)
- Preferred trip types

**Response Analytics**:

- Average response time
- Approval rate
- Revenue by month/quarter
- Peak booking days/times

**Bulk Actions**:

- Select multiple bookings
- Bulk approve/reject (with reason)
- Bulk export to CSV

**Auto-Responses**:

- Template messages for common scenarios
- "Thank you for booking, I'll review within 24h"
- "Trip confirmed! Here's what to bring..."

---

## Implementation Phases

### MVP (Week 1-2): Priority Alerts + Tabs

- Priority section with 3 urgency types
- 4-tab navigation (Requests, Upcoming, All, History)
- Enhanced booking cards with timeline
- Mobile-responsive design

**Files to Create**:

- `/components/captain/PriorityBookings.tsx`
- `/components/captain/BookingTabs.tsx`
- `/components/captain/EnhancedBookingCard.tsx`
- `/components/captain/BookingTimeline.tsx`
- `/lib/booking-priority.ts` (urgency calculation logic)

**Files to Modify**:

- `/app/(portal)/captain/bookings/page.tsx` (integrate new components)
- `/lib/booking-service.ts` (add priority fetching functions)

### Phase 2 (Week 3-4): Filters + Search

- Date range picker
- Multi-charter filter (if applicable)
- Status multi-select
- Search by angler name/ID
- Sort options

**Dependencies**:

- `react-day-picker` for date selection
- `cmdk` for search command palette (optional enhancement)

### Phase 3 (Week 5-6): Calendar View

- Monthly calendar grid
- Day detail view
- Booking conflict detection
- Export to iCal

**Dependencies**:

- `@fullcalendar/react` or custom implementation
- `.ics` file generation library

### Phase 4 (Future): Advanced Features

- Analytics dashboard
- Angler insights
- Bulk actions
- Auto-responses

---

## Metrics to Track

### UX Success Metrics

1. **Response Time**: Average time to approve/reject requests
   - Target: < 6 hours for 80% of requests
2. **Booking Clarity**: % of captains who report "always knowing what to do"
   - Target: > 90% (via survey)
3. **Task Completion**: % of pending bookings resolved within 24h
   - Target: > 95%

### Technical Metrics

1. **Page Load**: Time to interactive
   - Target: < 2s on 3G connection
2. **Filter Performance**: Time to apply filters
   - Target: < 300ms
3. **Error Rate**: Failed approve/reject actions
   - Target: < 0.1%

---

## Design System

### Color Coding

- **Red/Amber**: Needs urgent attention (new requests, payment pending)
- **Blue**: Informational (upcoming trips, confirmed)
- **Green**: Success states (approved, paid, completed)
- **Gray**: Archived (cancelled, rejected, expired)

### Status Badges

```typescript
const statusConfig = {
  PENDING: {
    color: "amber",
    icon: "⏱️",
    label: "Pending Review",
    action: "Review Request",
  },
  APPROVED: {
    color: "blue",
    icon: "✅",
    label: "Awaiting Payment",
    action: "Follow Up",
  },
  PAID: {
    color: "green",
    icon: "💰",
    label: "Confirmed",
    action: "Prepare Trip",
  },
  COMPLETED: {
    color: "gray",
    icon: "🎉",
    label: "Completed",
    action: "View Details",
  },
  REJECTED: {
    color: "red",
    icon: "❌",
    label: "Declined",
    action: "View Reason",
  },
  CANCELLED: {
    color: "gray",
    icon: "🚫",
    label: "Cancelled",
    action: "View Details",
  },
};
```

### Responsive Breakpoints

- Mobile: < 640px (vertical cards, stacked actions)
- Tablet: 640px - 1024px (2-column layout)
- Desktop: > 1024px (full layout with sidebar filters)

---

## Accessibility Considerations

1. **Keyboard Navigation**: Tab through bookings, arrow keys for tabs
2. **Screen Reader**: Announce priority count, status changes
3. **Focus Management**: Clear focus indicators, logical tab order
4. **Color Contrast**: WCAG AA compliance (4.5:1 minimum)
5. **Reduced Motion**: Disable animations for users with motion sensitivity

---

## Mobile Optimization

### Condensed Priority View

- Show top 3 priority items
- "View All (5)" button to expand
- Swipe gestures for quick actions (swipe right = approve, swipe left = reject)

### Bottom Sheet Actions

- Tap booking card → opens bottom sheet with full details
- Primary actions at bottom (thumb-reachable)
- Sticky header with booking summary

### Notification Badge

- Red dot on tab bar when new requests arrive
- Push notification permission prompt on first visit

---

## Security & Privacy

1. **Angler Email Protection**: Only show to authenticated captains
2. **Guest Booking Data**: Masked email (joh\*\*\*@gmail.com) until approved
3. **Audit Log**: Track all approve/reject actions with timestamps
4. **Rate Limiting**: Prevent spam approve/reject (max 10/min)

---

## Testing Strategy

### Unit Tests

- Priority calculation logic
- Filter combinations
- Sort functions
- Date range validation

### Integration Tests

- Tab navigation
- Filter + search combinations
- Approve/reject workflows
- Real-time updates (via webhooks)

### E2E Tests (Playwright)

- Captain reviews new request → approves → sees status update
- Filter by date → verify results
- Search by angler name → verify results
- Mobile responsive → verify touch interactions

### User Testing

- 5 captains with varying booking volumes
- Task: "Find bookings that need your attention today"
- Observe: Time to complete, errors, confusion points
- Survey: Confidence rating (1-5), feature requests

---

## Migration Plan

### Phase 1: Soft Launch (Feature Flag)

- Enable new UI for 10% of captains
- Collect feedback via in-app survey
- Monitor metrics (response time, task completion)

### Phase 2: Gradual Rollout

- 25% → 50% → 100% over 2 weeks
- Monitor error rates, support tickets
- Fix critical bugs before next increment

### Phase 3: Deprecate Old UI

- Keep old UI accessible via URL param (`?legacy=true`)
- Sunset after 30 days if no critical issues

---

## Open Questions

1. **Multiple Charters**: Should captains be able to filter by specific charter? (Yes if captain has >1 charter)
2. **Auto-Approval**: Should we allow captains to set auto-approve rules? (e.g., repeat customers, specific date ranges)
3. **Angler Ratings**: Should captains see angler ratings/reviews from other captains? (Privacy concerns)
4. **Booking Templates**: Should captains be able to create quick-reply templates? (e.g., "Weather conditions look perfect!")
5. **Calendar Integration**: Should we sync with Google Calendar / Outlook? (High value but complex)

---

## Success Criteria

**MVP Success** (Go/No-Go for Phase 2):

- ✅ 90% of captains find priority section "very helpful" or "helpful"
- ✅ Average response time improves by 30%
- ✅ < 5% error rate on approve/reject actions
- ✅ Page load time < 2s on 4G

**Full Feature Success** (3 months post-launch):

- ✅ 95% of captains report "always knowing what needs attention"
- ✅ 80% of bookings responded to within 6 hours
- ✅ Support tickets about "booking management" decrease by 50%
- ✅ Captain NPS (Net Promoter Score) > 50

---

## References

- **Airbnb Host Dashboard**: <https://airbnb.com/hosting> (inbox pattern)
- **Booking.com Extranet**: <https://admin.booking.com> (calendar view)
- **Stripe Dashboard**: <https://dashboard.stripe.com> (priority alerts)
- **Linear Issue Tracker**: <https://linear.app> (tab organization)
- **Notion Databases**: <https://notion.so> (flexible filters)

---

## Next Steps

1. **Review this plan** with team and captain stakeholders
2. **Prototype** priority section + tabs in Figma
3. **User interview** with 3-5 captains to validate assumptions
4. **Technical spike** on real-time updates (webhook → page refresh)
5. **Estimate effort** for MVP (ideally 1-2 week sprint)
6. **Create tickets** in Linear/GitHub for each component
7. **Start development** on priority section (highest impact, lowest effort)

---

**Document Owner**: Copilot AI Assistant  
**Last Updated**: 2025-10-30  
**Status**: Awaiting review and approval

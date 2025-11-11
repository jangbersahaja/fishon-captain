---
type: feature
status: planning
updated: 2025-11-06
feature: Captain Dashboard Overview Redesign
author: system
---

# Captain Dashboard Overview Redesign

## Overview

Redesign the captain portal overview page (`/captain/page.tsx`) to serve as a comprehensive dashboard with actionable insights, quick access to key features, and real-time status updates.

## Current State

The existing overview page shows:

- Admin override banner (if applicable)
- Charter offline warnings (verification status)
- Multiple charters list (if applicable)
- Upgrade to operator banner
- Optional documents checklist
- Basic stats cards (charters, media, trips, performance)
- "Upcoming features" placeholder list

### Limitations

- No actionable booking information
- No review/rating visibility
- No calendar preview
- No quick actions
- Limited at-a-glance insights
- No priority alerts system

## Proposed Dashboard Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [ADMIN OVERRIDE BANNER] - conditional                           │
├─────────────────────────────────────────────────────────────────┤
│ HEADER                                                          │
│ Welcome back, Captain Name                                     │
│ Today • X bookings need attention                              │
├─────────────────────────────────────────────────────────────────┤
│ 🚨 PRIORITY ALERTS (conditional, collapsible)                  │
│ - Verification incomplete                                      │
│ - New booking requests                                         │
│ - Upcoming trips (24-48hrs)                                    │
│ - Payment pending                                              │
├─────────────────────────────────────────────────────────────────┤
│ 📊 STATS OVERVIEW (4-5 cards grid)                             │
│ [Total Bookings] [Pending] [Upcoming] [Revenue] [Views]       │
├──────────────────────────┬──────────────────────────────────────┤
│ ⚡ QUICK ACTIONS          │ 📅 UPCOMING TRIPS                    │
│ - View Bookings          │ - Tomorrow: 2 trips                  │
│ - Edit Charter           │ - This Week: 5 trips                 │
│ - Add Media              │ - Next 7 days list                   │
│ - Upload Docs            │                                      │
│ - Update Pricing         │                                      │
├──────────────────────────┴──────────────────────────────────────┤
│ 📆 MINI BOOKING CALENDAR (month-at-a-glance)                   │
│ Current month with booking indicators                          │
├──────────────────────────┬──────────────────────────────────────┤
│ ⭐ RECENT REVIEWS         │ 🎣 CHARTER PERFORMANCE               │
│ - Last 3-5 reviews       │ - Average rating                     │
│ - Quick preview          │ - Total reviews                      │
│                          │ - Top badges                         │
├──────────────────────────┼──────────────────────────────────────┤
│ 🚤 YOUR CHARTERS         │ 📈 PERFORMANCE SNAPSHOT              │
│ - Active charters list   │ - Profile views                      │
│ - Quick edit links       │ - Conversion rate                    │
│                          │ - Response metrics                   │
├──────────────────────────┴──────────────────────────────────────┤
│ 💡 TIPS & RECOMMENDATIONS                                      │
│ - Profile completion suggestions                               │
│ - Best practice recommendations                                │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Recommended Approach: **Phased Implementation**

#### Phase 1: Build Foundation Pages First ✅ RECOMMENDED

**Build these pages before dashboard redesign:**

1. **Analytics Page** (`/captain/analytics`)
   - Profile views tracking
   - Conversion metrics
   - Response time analytics
   - Engagement data
   - **Why first**: Dashboard needs real analytics data to display

2. **Chat/Messages System** (`/captain/messages`)
   - Message inbox
   - Unread count
   - Quick reply functionality
   - **Why first**: Dashboard needs unread message count for priority alerts

**Benefits of Phase 1:**

- ✅ Dashboard can pull real data from these pages
- ✅ No placeholder/dummy data needed
- ✅ Better user experience (functional features vs. static widgets)
- ✅ Avoid rework when real features are implemented
- ✅ Clearer feature dependencies

**Estimated Timeline:**

- Analytics page: 2-3 days
- Chat/Messages: 3-4 days
- **Total: ~1 week** before dashboard redesign

---

#### Phase 2: Dashboard Redesign (After Foundation)

**Build dashboard sections in this order:**

1. **Priority Alerts Section**
   - Reuse existing verification alerts
   - Add booking request count (from bookings API)
   - Add message notification count (from chat)
   - Add upcoming trip alerts

2. **Stats Overview Cards**
   - Total bookings (existing booking API)
   - Pending review count
   - Upcoming trips count
   - Revenue (placeholder until payment system)
   - Profile views (from analytics)

3. **Quick Actions Grid**
   - Navigation buttons to all key pages
   - Static component, no data dependencies

4. **Upcoming Trips Widget**
   - Query bookings with status PAID/COMPLETED
   - Filter by next 7-14 days
   - Sort by date ascending

5. **Mini Booking Calendar**
   - Simplified version of BookingCalendar component
   - Month view with booking indicators
   - Click to navigate to full calendar

6. **Recent Reviews Widget**
   - Query last 3-5 reviews
   - Show rating, name, excerpt
   - Link to full reviews page

7. **Charter Performance Widget**
   - Reuse review stats from reviews page
   - Show average rating, total reviews
   - Display top 3 badges

8. **Your Charters Summary**
   - List active charters (existing query)
   - Show trip/media counts
   - Quick edit links

9. **Performance Snapshot**
   - Pull from analytics page
   - Show key metrics
   - Link to detailed analytics

10. **Tips & Recommendations**
    - Dynamic suggestions based on profile data
    - Document upload reminders
    - Media upload suggestions

**Estimated Timeline:**

- Priority alerts: 1 day
- Stats cards: 1 day
- Quick actions + upcoming trips: 1 day
- Calendar widget: 2 days
- Review widgets: 1 day
- Charter + performance: 1 day
- Tips widget: 0.5 day
- **Total: ~7-8 days**

---

### Alternative Approach: Dashboard First (NOT RECOMMENDED)

**Issues with building dashboard before foundation pages:**

- ❌ Dashboard would show placeholder data for analytics
- ❌ Message notifications would be fake/static
- ❌ Creates technical debt (need to refactor when real features added)
- ❌ Poor user experience (non-functional widgets)
- ❌ Wasted development time on mock data

---

## Data Dependencies

### Required Data Sources

1. **Bookings Data** ✅ AVAILABLE
   - Source: `getCaptainBookings()` from `/lib/booking-service.ts`
   - Used for: Stats cards, upcoming trips, calendar

2. **Reviews Data** ✅ AVAILABLE
   - Source: `getCaptainReviews()` + `getCaptainReviewStats()`
   - Used for: Recent reviews widget, performance widget

3. **Charters Data** ✅ AVAILABLE
   - Source: Existing queries in current page
   - Used for: Charter summary widget

4. **Analytics Data** ❌ NOT AVAILABLE
   - Source: **NEEDS TO BE BUILT**
   - Used for: Profile views, conversion rate, performance snapshot
   - **BLOCKER**: Cannot show real analytics without this page

5. **Messages/Chat Data** ❌ NOT AVAILABLE
   - Source: **NEEDS TO BE BUILT**
   - Used for: Unread message count, priority alerts
   - **BLOCKER**: Cannot show real message notifications

6. **Verification Data** ✅ AVAILABLE
   - Source: Existing `getVerification()` function
   - Used for: Priority alerts, offline banner

---

## Component Architecture

### New Components to Build

```
src/components/captain/dashboard/
├── DashboardStatsCards.tsx        # Metric overview cards
├── PriorityAlertsSection.tsx      # Urgent action alerts (reuse existing)
├── QuickActionsGrid.tsx           # Navigation shortcuts
├── UpcomingTripsWidget.tsx        # Next 7 days trips
├── MiniBookingCalendar.tsx        # Simplified month view
├── RecentReviewsWidget.tsx        # Latest review preview
├── CharterPerformanceWidget.tsx   # Rating summary
├── CharterSummaryWidget.tsx       # Active charters list
├── PerformanceSnapshotWidget.tsx  # Analytics preview
└── TipsRecommendations.tsx        # Dynamic suggestions
```

### Reusable Components

- `BookingCalendar` → Simplify for `MiniBookingCalendar`
- `BookingStatsCards` → Adapt for `DashboardStatsCards`
- `PriorityBookings` → Integrate into `PriorityAlertsSection`

---

## API Endpoints Needed

### Existing (Ready to Use)

- ✅ `getCaptainBookings(charterIds)` - Booking data
- ✅ `getCaptainReviews(charterIds)` - Reviews
- ✅ `getCaptainReviewStats(charterIds)` - Review stats
- ✅ Charter queries - Active charters
- ✅ Verification queries - Document status

### New (Need to Build)

- ❌ `/api/captain/analytics` - Profile views, conversion rates
- ❌ `/api/captain/messages/unread-count` - Message notifications
- ❌ `/api/captain/dashboard/summary` - Combined dashboard data (optional, for performance)

---

## Mobile Responsiveness

### Breakpoints

- **Mobile (<768px)**: Single column, collapsed sections
- **Tablet (768-1023px)**: 2 columns for some widgets
- **Desktop (1024px+)**: Full layout with side-by-side widgets

### Mobile Optimizations

- Horizontal scroll for stats cards
- Collapsible priority alerts
- Week view calendar (instead of month)
- Reduced widget count (show top 3 instead of 5)

---

## Performance Considerations

1. **Server Components**: Use for data fetching
2. **Client Components**: Only for interactive widgets
3. **Data Caching**: Revalidate every 5-10 minutes
4. **Lazy Loading**: Load calendar and charts on demand
5. **Pagination**: Limit reviews/bookings to 5 items

---

## Accessibility

- Keyboard navigation for quick actions
- ARIA labels for stat cards
- Screen reader announcements for priority alerts
- Focus management for collapsible sections
- High contrast mode support

---

## Success Metrics

### User Experience

- ✅ Captain can see all actionable items at a glance
- ✅ Quick access to common tasks (< 2 clicks)
- ✅ Real-time booking/review updates
- ✅ Mobile-friendly design

### Performance

- ✅ Page load < 2 seconds
- ✅ Time to interactive < 3 seconds
- ✅ No layout shifts (CLS < 0.1)

### Business

- ✅ Increased engagement with bookings page
- ✅ Faster response times to requests
- ✅ Improved document upload completion rate

---

## Recommendation

### ✅ **BUILD ANALYTICS & CHAT PAGES FIRST**

**Reasoning:**

1. **Data Integrity**: Dashboard needs real data from these systems
2. **User Value**: Functional analytics/chat > static dashboard widgets
3. **Avoid Rework**: Building dashboard with placeholders creates technical debt
4. **Better UX**: Users expect functional features, not fake previews
5. **Development Efficiency**: One-time build vs. build-refactor-rebuild

**Timeline:**

- Week 1: Build Analytics page
- Week 2: Build Chat/Messages system
- Week 3-4: Redesign Dashboard with real data

**Total: ~4 weeks** for complete, functional system vs. ~2 weeks for incomplete dashboard with placeholders.

---

## Next Steps

### If Building Foundation First (Recommended)

1. [ ] Create analytics page implementation plan
2. [ ] Design analytics data schema
3. [ ] Build analytics tracking system
4. [ ] Create chat/messages system architecture
5. [ ] Implement message storage & notifications
6. [ ] Build dashboard with real data integration

### If Building Dashboard First (Not Recommended)

1. [ ] Create dashboard widget components
2. [ ] Use placeholder data for analytics/messages
3. [ ] Mark widgets as "Coming Soon" where data unavailable
4. [ ] Refactor later when real systems are built

---

## Questions to Resolve

1. **Analytics Implementation**: What metrics are most important?
   - Profile views, click-through rate, booking conversion, search appearances?

2. **Chat System**: Real-time or async messaging?
   - WebSocket for real-time, or polling for simpler implementation?

3. **Revenue Tracking**: When will payment system be integrated?
   - Include revenue widget now (placeholder) or wait for payment system?

4. **Mobile Priority**: Which widgets are most important on mobile?
   - May need to hide some sections on small screens

5. **Data Refresh**: How often should dashboard data update?
   - Real-time, every 5 mins, or on page load only?

---

## References

- Existing Components: `src/components/captain/`
- Booking Service: `src/lib/booking-service.ts`
- Review Service: `src/lib/review-service.ts`
- Current Dashboard: `src/app/(portal)/captain/page.tsx`

---

## Related Documents

- `docs/BOOKING_FLOW.md` - Booking system architecture
- `docs/BOOKING_STATUS_AUTOMATION.md` - Status transitions
- `prisma/schema.prisma` - Database schema

---

**Status**: Planning phase - awaiting decision on implementation approach
**Last Updated**: 2025-11-06

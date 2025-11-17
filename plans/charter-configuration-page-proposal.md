# Charter Configuration Page - Comprehensive Redesign Proposal

## Current State Analysis

**Current Page**: `/captain/charters`

**Current Features**:

- Simple charter cards showing:
  - Name, charter type, location
  - Active/Inactive status badge
  - Trip count, media count
  - View (external link) and Edit buttons

**Current Limitations**:

- No configuration visibility (trips, boat, crew assignments)
- No booking flow settings control
- No last booking information
- No quick status toggle (active/inactive)
- No at-a-glance operational readiness

---

## Proposed Enhanced Layout

### Design Philosophy

Transform the page from a simple list into a **comprehensive charter operations dashboard** where captains can:

1. See charter configuration at a glance
2. Manage operational settings quickly
3. Monitor booking activity
4. Access related resources efficiently

### Layout Structure

#### Option A: Expandable Cards (Recommended)

**Visual Hierarchy**:

```
┌─────────────────────────────────────────────────────────────────┐
│ Charter Name                    [Active ▾] [⚙️ Settings]        │
│ OFFSHORE FISHING                                                │
│ ───────────────────────────────────────────────────────────────│
│ 📍 Kuala Rompin, Pahang                                         │
│                                                                  │
│ ⚙️ Configuration                                                │
│   ├─ 🚤 Boat: Sea Hunter 42 (42ft, 8 capacity)                 │
│   ├─ 🧑‍✈️ Captain: John Doe                                       │
│   ├─ 👥 Crew: 2 assigned (View all)                             │
│   └─ 🎣 Trips: 3 active trips (Shared, Private, Custom)        │
│                                                                  │
│ 📊 Booking Flow: Manual (24h approval)  [Change to Auto ▾]    │
│                                                                  │
│ 📅 Last Booking                                                 │
│   • Guest User - RM 450 - Tomorrow 8:00 AM                      │
│   • Status: Confirmed • 2 adults • Shared Trip                 │
│   [View Booking →]                                              │
│                                                                  │
│ 🎯 Quick Actions                                                │
│   [📊 Analytics] [📸 Media] [📝 Edit Details] [🔗 View Live]   │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits**:

- Clean, scannable at collapsed state
- Expandable for details when needed
- Mobile-friendly accordion design
- Preserves 2-column grid on desktop

#### Option B: Tabbed Detail View

**Structure**:

```
┌─────────────────────────────────────────────────────────────────┐
│ Charter Name                                    [Active] [Edit] │
│ ───────────────────────────────────────────────────────────────│
│ [Overview] [Configuration] [Bookings] [Settings]                │
│                                                                  │
│ Overview Tab Content:                                           │
│ • Boat, Captain, Crew at a glance                              │
│ • Last booking info                                             │
│ • Quick stats                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits**:

- More organized for complex data
- Better for deep configuration
- Desktop-optimized

**Drawbacks**:

- Requires clicks to see details
- Less scannable
- More complex mobile UX

---

## Feature Specifications

### 1. Charter Configuration Section

**Data to Display**:

```typescript
interface CharterConfiguration {
  boat: {
    id: string;
    name: string;
    type: string;
    lengthFt: number;
    capacity: number;
    imageUrl?: string;
  } | null;

  captain: {
    id: string;
    userId: string;
    name: string;
    phone?: string;
  };

  crew: {
    count: number;
    members: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  };

  trips: {
    count: number;
    active: number;
    types: string[]; // ["Shared", "Private", "Custom"]
  };
}
```

**UI Components**:

- **Boat Card**: Image thumbnail, name, specs, "Change Boat" link
- **Captain Badge**: Name with captain icon, contact info tooltip
- **Crew Summary**: Count with expandable list, "Manage Crew" link
- **Trips Summary**: Count with type badges, "Manage Trips" link

**Empty States**:

- No boat: "⚠️ No boat assigned - [Assign Boat →]"
- No crew: "ℹ️ No crew assigned (optional)"
- No trips: "⚠️ No trips configured - [Create Trip →]"

### 2. Booking Flow Settings

**Data to Display**:

```typescript
interface BookingFlowSettings {
  bookingFlowType: "MANUAL" | "AUTO";
  approvalTimeHours: number; // For MANUAL: 12, 24, 48, or custom
  instantBookingEnabled: boolean; // For AUTO
}
```

**UI Components**:

**Option A: Inline Toggle with Dropdown**

```
📊 Booking Flow
[●━━━━━━━○] Manual              Auto
├─ Approval Time: [24 hours ▾]
└─ Require captain approval before payment
```

**Option B: Settings Card**

```
┌─────────────────────────────────────────┐
│ 📊 Booking Flow Settings                │
│ ○ Manual Approval (Current)             │
│   └─ Approval deadline: 24 hours        │
│ ○ Instant Booking                       │
│   └─ Auto-approve with payment          │
│ [Save Changes]                          │
└─────────────────────────────────────────┘
```

**Recommended: Option A** (inline, fewer clicks)

**Business Logic**:

- MANUAL → AUTO: Show confirmation modal
  - "Switch to instant booking? Bookings will be auto-confirmed upon payment."
- AUTO → MANUAL: Show confirmation modal
  - "Switch to manual approval? You'll review each booking before payment."
- Approval time options: 12h, 24h (default), 48h, Custom (1-168h range)

### 3. Last Booking Info

**Data to Display**:

```typescript
interface LastBooking {
  id: string;
  guestName: string;
  totalPrice: number;
  tripDate: Date;
  tripTime: string;
  status: BookingStatus;
  participants: {
    adults: number;
    children: number;
  };
  tripType: string; // "Shared", "Private"
  createdAt: Date;
}
```

**UI Components**:

```
📅 Recent Activity
├─ Last Booking: 2 hours ago
│  • Guest User - RM 450
│  • Tomorrow 8:00 AM - Shared Trip
│  • Status: Confirmed
│  [View Details →]
│
└─ Total Bookings: 24 (This Month: 5)
```

**Empty State**:

```
📅 Recent Activity
No bookings yet
[Share charter link →]
```

**Click Behavior**:

- "View Details" → Opens `/captain/bookings/{bookingId}`
- Shows loading skeleton while fetching

### 4. Active/Inactive Status Toggle

**Current**: Static badge  
**Proposed**: Interactive toggle with API integration

**UI Component**:

```typescript
<Switch
  checked={charter.isActive}
  onCheckedChange={handleToggleActive}
  disabled={!canActivate}
/>
```

**Validation Before Activation**:

```typescript
function canActivate(charter: Charter): {
  allowed: boolean;
  reason?: string;
} {
  if (!charter.boat)
    return {
      allowed: false,
      reason: "Boat not assigned",
    };

  if (charter.trips.length === 0)
    return {
      allowed: false,
      reason: "No trips configured",
    };

  if (charter.media.length === 0)
    return {
      allowed: false,
      reason: "No photos uploaded",
    };

  return { allowed: true };
}
```

**UI Behavior**:

- Toggle disabled with tooltip if validation fails
- Toggle enabled: Shows confirmation modal
  - Active → Inactive: "Hide charter from marketplace?"
  - Inactive → Active: "Publish charter to marketplace?"
- Success: Show toast notification
- Error: Show error message, revert toggle

### 5. Quick Actions Toolbar

**Actions**:

1. **📊 Analytics** → `/captain/analytics?charterId={id}`
2. **📸 Media Manager** → `/captain/media?charterId={id}`
3. **🎣 Manage Trips** → `/captain/trips?charterId={id}`
4. **🚤 Change Boat** → `/captain/boats?selectFor={charterId}`
5. **👥 Manage Crew** → `/captain/crew?charterId={id}`
6. **📝 Edit Details** → `/captain/form?editCharterId={id}`
7. **🔗 View Live** → `https://fishon.my/charters/{id}` (external)
8. **📋 Copy Link** → Copies public URL to clipboard

**UI Layout**:

**Desktop** (2-column grid):

```
[📊 Analytics] [📸 Media]
[🎣 Trips]     [🚤 Boat]
[👥 Crew]      [📝 Edit]
[🔗 View Live] [📋 Copy Link]
```

**Mobile** (stacked):

```
[📊 Analytics]
[📸 Media]
[🎣 Trips]
...
```

---

## Recommended Layout: Expandable Cards

### Default (Collapsed) State

```tsx
┌───────────────────────────────────────────────────────────────┐
│ 🎣 Deep Sea Fishing Adventure        [🟢 Active ▾] [⚙️]      │
│ OFFSHORE FISHING                                              │
│ ─────────────────────────────────────────────────────────────│
│ 📍 Kuala Rompin, Pahang                                       │
│                                                                │
│ ✓ Boat: Sea Hunter 42  ✓ 3 Trips  ✓ 12 Photos               │
│ 📊 Manual Booking (24h)                                       │
│ 📅 Last booking: 2 hours ago                                  │
│                                                                │
│ [View Details ▾]  [📝 Edit]  [🔗 View Live]                  │
└───────────────────────────────────────────────────────────────┘
```

### Expanded State

```tsx
┌───────────────────────────────────────────────────────────────┐
│ 🎣 Deep Sea Fishing Adventure        [🟢 Active ▾] [⚙️]      │
│ OFFSHORE FISHING                                              │
│ ─────────────────────────────────────────────────────────────│
│ 📍 Kuala Rompin, Pahang                                       │
│                                                                │
│ ⚙️ Configuration                                              │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🚤 Boat                                                  │  │
│ │ [IMG] Sea Hunter 42                                      │  │
│ │       42ft • Sportfisher • 8 passengers                  │  │
│ │       [Change Boat →]                                    │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🧑‍✈️ Captain & Crew                                        │  │
│ │ Captain: John Doe (Primary)                             │  │
│ │ Crew: 2 members assigned                                 │  │
│ │ • Jane Smith (First Mate)                               │  │
│ │ • Mike Johnson (Deckhand)                               │  │
│ │ [Manage Crew →]                                          │  │
│ └─────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🎣 Trips (3 active)                                      │  │
│ │ • Shared Trip - RM 150/person                           │  │
│ │ • Private Charter - RM 1,200                            │  │
│ │ • Custom Package - Varies                               │  │
│ │ [Manage Trips →]                                         │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                                │
│ 📊 Booking Flow Settings                                      │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Current: Manual Approval                                 │  │
│ │ Approval Time: [24 hours ▾]                             │  │
│ │ [Switch to Instant Booking →]                           │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                                │
│ 📅 Recent Bookings                                            │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Last Booking: 2 hours ago                                │  │
│ │ • Guest User - RM 450                                    │  │
│ │ • Tomorrow 8:00 AM - Shared Trip                        │  │
│ │ • Status: Confirmed • 2 adults                          │  │
│ │ [View Booking →]                                         │  │
│ │                                                           │  │
│ │ This Month: 5 bookings • Total: 24 bookings             │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                                │
│ 🎯 Quick Actions                                              │
│ [📊 Analytics] [📸 Media] [📝 Edit] [🔗 View Live]           │
│                                                                │
│ [Collapse ▴]                                                  │
└───────────────────────────────────────────────────────────────┘
```

---

## Data Requirements

### Database Queries Needed

```typescript
// Enhanced charter query with relations
const charter = await prisma.charter.findUnique({
  where: { id: charterId },
  select: {
    // Basic info (existing)
    id: true,
    name: true,
    charterType: true,
    city: true,
    state: true,
    startingPoint: true,
    isActive: true,

    // Booking flow settings (NEW)
    bookingFlowType: true,
    approvalTimeHours: true,
    instantBookingEnabled: true,

    // Relations
    boat: {
      select: {
        id: true,
        name: true,
        type: true,
        lengthFt: true,
        capacity: true,
        imageUrl: true,
      },
    },

    captain: {
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    },

    // Crew assignments (NEW relation)
    crewAssignments: {
      select: {
        id: true,
        crew: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    },

    // Trips
    trips: {
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        price: true,
      },
    },

    // Media count
    _count: {
      select: {
        media: true,
      },
    },
  },
});

// Last booking query (from fishon-market DB)
const lastBooking = await marketPrisma.booking.findFirst({
  where: { charterId: charter.id },
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    primaryBooker: true,
    finalPrice: true,
    date: true,
    time: true,
    status: true,
    adults: true,
    children: true,
    tripId: true,
    trip: {
      select: {
        name: true,
        type: true,
      },
    },
    createdAt: true,
  },
});

// Booking stats
const bookingStats = await marketPrisma.booking.aggregate({
  where: { charterId: charter.id },
  _count: true,
});

const thisMonthBookings = await marketPrisma.booking.count({
  where: {
    charterId: charter.id,
    createdAt: {
      gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    },
  },
});
```

---

## API Endpoints Needed

### 1. Toggle Charter Active Status

```typescript
// POST /api/captain/charters/[id]/toggle-status
{
  "isActive": boolean
}

// Response
{
  "success": true,
  "charter": {
    "id": string,
    "isActive": boolean
  }
}
```

### 2. Update Booking Flow Settings

```typescript
// PATCH /api/captain/charters/[id]/booking-flow
{
  "bookingFlowType": "MANUAL" | "AUTO",
  "approvalTimeHours"?: number  // Required if MANUAL
}

// Response
{
  "success": true,
  "settings": {
    "bookingFlowType": string,
    "approvalTimeHours": number,
    "instantBookingEnabled": boolean
  }
}
```

### 3. Get Charter Configuration

```typescript
// GET /api/captain/charters/[id]/config
// (Enhanced version of existing charter fetch)

// Response
{
  "charter": {
    // Basic info
    "id": string,
    "name": string,
    // ... all fields from query above
  },
  "lastBooking": {
    // Booking details
  } | null,
  "bookingStats": {
    "total": number,
    "thisMonth": number
  }
}
```

---

## Component Structure

```
src/app/(portal)/captain/charters/
├── page.tsx                           # Server component (data fetching)
├── CharterConfigList.tsx              # Client component (list container)
├── CharterConfigCard.tsx              # Individual charter card
│   ├── CharterHeader.tsx              # Name, status, settings button
│   ├── CharterConfiguration.tsx       # Boat, captain, crew, trips
│   ├── BookingFlowSettings.tsx        # Flow type toggle & approval time
│   ├── RecentBookings.tsx             # Last booking info
│   └── QuickActions.tsx               # Action buttons toolbar
├── components/
│   ├── StatusToggle.tsx               # Active/inactive switch
│   ├── BookingFlowSelector.tsx        # Manual/Auto selector with modal
│   ├── ConfigurationItem.tsx          # Reusable config display
│   └── EmptyConfigState.tsx           # Warning for missing configs
└── hooks/
    ├── useToggleCharterStatus.ts      # Status toggle mutation
    └── useUpdateBookingFlow.ts        # Booking flow update mutation
```

---

## User Experience Flows

### Flow 1: Toggle Charter Status

1. **User clicks status toggle**
2. **Validation check**:
   - If validation fails → Show tooltip with reason (disabled state)
   - If validation passes → Show confirmation modal
3. **User confirms in modal**
4. **API call**: `POST /api/captain/charters/{id}/toggle-status`
5. **On success**:
   - Update UI optimistically
   - Show toast: "Charter published" / "Charter hidden"
   - Refresh page data
6. **On error**:
   - Revert toggle
   - Show error toast

### Flow 2: Change Booking Flow Type

1. **User clicks booking flow selector**
2. **Show modal with flow type options**:
   - Manual: "Review each booking before payment" (24h deadline selector)
   - Auto: "Instant booking with payment" (12h acknowledge deadline)
3. **User selects flow type**
4. **Show confirmation**:
   - "This will affect new bookings. Existing bookings remain unchanged."
5. **API call**: `PATCH /api/captain/charters/{id}/booking-flow`
6. **On success**:
   - Update UI
   - Show toast: "Booking flow updated to {type}"
7. **On error**:
   - Show error message

### Flow 3: View Configuration Details

1. **User clicks "View Details" button**
2. **Card expands with animation**
3. **Load additional data if needed** (lazy load crew, trips)
4. **Show configuration sections**
5. **User can click action links**:
   - Change Boat → Navigate to boats page
   - Manage Crew → Navigate to crew page
   - etc.

---

## Mobile Responsiveness

### Breakpoints

- **Mobile** (<640px): Single column, full-width cards, stacked actions
- **Tablet** (640-1024px): Single column with more padding
- **Desktop** (>1024px): 2-column grid

### Mobile-Specific Adaptations

1. **Collapsed by default** on mobile
2. **Bottom sheet** for settings modals instead of center modal
3. **Swipe gestures** for actions (swipe left to edit, swipe right to view)
4. **Sticky header** with charter name when expanded
5. **FAB (Floating Action Button)** for primary actions

---

## Accessibility Considerations

1. **Keyboard Navigation**:
   - Tab through all interactive elements
   - Enter/Space to toggle status
   - Arrow keys for dropdowns

2. **Screen Readers**:
   - Proper ARIA labels for all buttons
   - Status announcements on changes
   - Semantic HTML structure

3. **Visual**:
   - High contrast status badges
   - Icons with text labels
   - Clear focus indicators

4. **Motion**:
   - Respect `prefers-reduced-motion`
   - Smooth transitions, not jarring
   - Optional animation disable

---

## Implementation Priority

### Phase 1: Core Configuration Display (Week 1)

- [ ] Enhanced data fetching with relations
- [ ] Expandable card layout
- [ ] Configuration sections (boat, captain, crew, trips)
- [ ] Empty states for missing configs

### Phase 2: Booking Flow Settings (Week 2)

- [ ] Booking flow selector component
- [ ] API endpoints for flow updates
- [ ] Approval time configuration
- [ ] Confirmation modals

### Phase 3: Status Toggle & Validation (Week 2)

- [ ] Status toggle component
- [ ] Validation logic
- [ ] API endpoint for status updates
- [ ] Optimistic UI updates

### Phase 4: Recent Bookings Integration (Week 3)

- [ ] Last booking query
- [ ] Booking stats aggregation
- [ ] Recent bookings display
- [ ] Link to booking details

### Phase 5: Quick Actions & Polish (Week 3)

- [ ] Quick actions toolbar
- [ ] Copy link functionality
- [ ] Mobile optimizations
- [ ] Loading states & error handling

---

## Success Metrics

### User Experience

- [ ] Reduce clicks to view charter configuration (from 3+ to 0-1)
- [ ] Enable inline status changes (from 0 to 100%)
- [ ] Show booking activity at a glance (new feature)
- [ ] Reduce time to change booking flow (from N/A to <30s)

### Technical

- [ ] Page load time <2s with all data
- [ ] Mobile-optimized layout (100% responsive)
- [ ] Accessibility score 95+ (Lighthouse)
- [ ] TypeScript strict mode compliance

### Business

- [ ] Increase charter activation rate (show missing configs)
- [ ] Reduce support tickets (self-service flow changes)
- [ ] Improve captain engagement (show booking activity)

---

## Next Steps

1. **Review & Approve** this proposal
2. **Create detailed implementation plan** (separate document)
3. **Design UI mockups** (Figma/Sketch)
4. **Break down into tickets** (Phase 1-5)
5. **Begin Phase 1 development**

---

## Questions for Clarification

1. **Crew Management**: Should crew assignments be shown here or just crew count with link to crew page?
2. **Multiple Captains**: Charter schema supports `captainAssignments` - do we need to handle multiple captains?
3. **Booking Flow Default**: When captain hasn't set flow type, should we default to MANUAL or force them to choose?
4. **Analytics Integration**: Should we show quick stats (views, conversion rate) or just link to analytics page?
5. **Permissions**: Should CREW role have any access to change settings, or read-only?

---

**Created**: 17 November 2025  
**Status**: Proposal - Awaiting Approval  
**Estimated Effort**: 3 weeks (1 developer)

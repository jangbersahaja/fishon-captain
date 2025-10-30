---
type: plan
status: in-progress
updated: 2025-01-30
feature: charter-availability-calendar
author: copilot
progress:
  phase: "Phase 10 Complete: Charter Registration Integration"
  completed:
    - "Phase 1-3: Database, Service Layer, and APIs"
    - Database schema (CharterSchedule, CharterUnavailability models)
    - Schema migration and seeding (21 charters with EVERYDAY schedule)
    - Availability service layer (10 functions, all tests passing)
    - Schedule Management API (GET, PATCH)
    - Unavailability Management API (GET, POST, DELETE)
    - Public Availability API for fishon-market integration
    - Comprehensive unit tests (10/10 passing)
    - "Phase 4-6: Calendar UI Components"
    - Calendar page at /captain/bookings/calendar
    - CharterCalendar component (responsive: desktop grid + mobile list)
    - CalendarDay component (status colors, booking indicators)
    - CalendarLegend component (status indicators)
    - ScheduleSection component (schedule display)
    - ScheduleModal component (edit schedule)
    - UnavailabilitySection component (list unavailable dates)
    - UnavailabilityModal component (create/edit/delete blocks)
    - "Phase 7: Booking Integration"
    - Integrated with existing getCaptainBookings service
    - Angler data fetching from market database
    - Booking modal with EnhancedBookingCard
    - All booking statuses displayed with correct colors
    - "Phase 8: Mobile Responsiveness"
    - Mobile vertical scrollable list view
    - Mobile scroll-to-today functionality
    - Full-width tap targets for better UX
    - Responsive layout (grid desktop, list mobile)
    - "Phase 9: Advanced Features & UX Improvements"
    - Custom ConfirmDialog component for deletions
    - Edit functionality from unavailable list (Edit + Delete buttons)
    - Edit mode modal when clicking blocked dates on calendar
    - Disabled past dates without bookings (visual + functional)
    - Filter unavailable list to show only upcoming dates
    - Fixed blocked date click detection (manual vs schedule-based)
    - Toast auto-dismiss for all operations (4-6 seconds)
    - "Phase 10: Charter Registration Integration"
    - Updated @fishon/schemas with scheduleType and operationalDays fields
    - Added schedule fields to charterFormSchema and experienceStepSchema
    - Added schedule defaults (EVERYDAY, empty operationalDays array)
    - Integrated schedule UI in ExperienceStep component
    - Draft save API handles schedule fields automatically
    - Finalize API creates CharterSchedule record
    - Charter edit API (PATCH) handles schedule updates with upsert logic
    - Charter GET API includes schedule relation
    - Charter-to-draft mapping includes schedule fields
    - Both new registration and edit flows fully support schedule
  in-progress:
    - Ready for Phase 11 (Fishon-Market Integration)
  pending:
    - Fishon-market integration (availability API consumption)
---

# Charter Availability & Calendar System

## Current Status (Phase 10 Complete) ✅

**Last Updated:** January 30, 2025

The Charter Availability & Calendar System is now fully integrated into the charter registration flow. Captains can configure their operational schedules during both new charter registration and when editing existing charters. The system allows captains to manage their operational schedules, block unavailable dates, and view all bookings in a comprehensive calendar interface.

### ✅ What's Complete

1. **Backend Infrastructure**
   - Database schema with CharterSchedule and CharterUnavailability models
   - Complete API suite (Schedule, Unavailability, Public Availability)
   - Availability service layer with 10 helper functions
   - Unit tests (10/10 passing)

2. **Calendar UI (Desktop & Mobile)**
   - Full month calendar view with responsive design
   - Desktop: 7-column grid layout
   - Mobile: Vertical scrollable list with scroll-to-today
   - Status-based color coding for all booking states
   - Interactive date clicking with context-aware modals

3. **Schedule Management**
   - View and edit operational schedules (Everyday, Weekdays, Weekends, Custom)
   - Schedule section in sidebar
   - Schedule modal for editing

4. **Unavailability Management**
   - Create single-day or date range blocks
   - View upcoming unavailable dates
   - Edit and delete blocks via list or calendar
   - Custom confirm dialog for deletions
   - Auto-dismiss toast notifications

5. **User Experience Features**
   - Past dates disabled (no accidental past blocks)
   - Click blocked dates to edit/delete
   - Click available dates to create blocks
   - Click dates with bookings to view booking details
   - Only upcoming unavailable dates shown in list
   - Visual distinction between manual blocks and schedule-based closures

6. **Charter Registration Integration**
   - Schedule configuration in Experience step (after boat/amenities)
   - Four schedule types: Everyday, Weekdays, Weekends, Custom
   - Custom days with multi-select checkbox grid
   - Schedule persisted in draft auto-save
   - CharterSchedule record created during finalization
   - Schedule editable via charter edit API
   - Schedule loaded correctly in edit mode
   - Default schedule: EVERYDAY for all new charters

### 🚀 Ready for Next Phase

### Phase 10: Charter Registration Integration ✅

**Implementation Complete:** January 30, 2025

**Changes Made:**

1. **Schema Updates (@fishon/schemas)**
   - Added `scheduleType` field (enum: EVERYDAY, WEEKDAYS, WEEKENDS, CUSTOM)
   - Added `operationalDays` field (array of day indexes 0-6)
   - Updated `experienceStepSchema` to include schedule fields
   - Default values: EVERYDAY schedule with empty operationalDays

2. **UI Integration (ExperienceStep.tsx)**
   - Schedule section added after Pickup section
   - Dropdown selector for schedule type
   - Conditional custom days grid (7 checkboxes for Sun-Sat)
   - Responsive layout: 4-column grid on mobile, flex on desktop
   - Matches existing form component styling

3. **Draft Handling**
   - Schedule fields automatically saved in draft dataJson
   - `sanitizeForDraft()` includes schedule in spread operator
   - `hydrateDraftValues()` correctly restores schedule data
   - Charter-to-draft mapping includes schedule fields

4. **API Updates**
   - **Finalize API:** Creates CharterSchedule record after charter creation
   - **Charter PATCH API:** Upserts schedule with update/create logic
   - **Charter GET API:** Includes schedule relation in all queries
   - **Audit logging:** Schedule changes tracked in before/after snapshots

5. **Edit Mode Support**
   - Schedule loaded from database in edit mode
   - `mapCharterToDraftValues()` includes schedule mapping
   - Charter detail type includes schedule field
   - Database query includes schedule relation

**Testing:**

- ✅ New registration flow creates schedule
- ✅ Edit flow loads and updates schedule
- ✅ Draft auto-save persists schedule data
- ✅ All TypeScript checks pass
- ✅ No breaking changes to existing flows

**Phase 11: Fishon-Market Integration**

- Availability API client
- Date picker integration with soft warnings
- Operational schedule display in trip details

## Overview

Implement a comprehensive availability and calendar management system where captains can:

1. Define operational schedules (which days charters operate)
2. Mark specific dates as unavailable with optional reasons
3. View all bookings (all statuses) on a full calendar
4. Block future bookings on unavailable dates

This system will integrate with fishon-market to prevent bookings on blocked dates and ensure charter operators have full control over their availability.

## Current State Analysis

### Existing Systems

**Booking Flow (fishon-market):**

- Anglers can book trips through `/book/[charterId]/[tripId]`
- Bookings stored in Market DB with statuses: PENDING → APPROVED → PAID → COMPLETED
- No availability checks currently implemented
- Captains approve/reject via fishon-captain dashboard

**Captain Dashboard:**

- `/captain/bookings` - Shows bookings with filters (PAID/COMPLETED on calendar)
- BookingCalendar component - Month-based horizontal scroll view
- Priority bookings, stats cards, tabbed views

**Charter Registration:**

- Multi-step form: Basics → Experience → Trips → Description → Media
- Trip configuration includes: name, type, price, duration, maxAnglers, startTimes
- No operational schedule configuration exists

**Database (fishon-captain DB):**

- Charter → Trips (1:many)
- Trip has startTimes (e.g., "07:00", "14:00")
- No availability or schedule tables exist

**Missing Constraints:**

- No operational day restrictions (weekdays only, weekends only, etc.)
- No blocked date system
- Captains registered before this system have no schedule defaults
- No validation preventing bookings on unavailable dates

## Goals & Requirements

### Primary Objectives

1. **Captain Schedule Management**
   - Define which days charter operates (daily, weekdays, weekends, custom)
   - Per-trip schedule configuration (some trips may only run certain days)
   - Visual calendar showing operational vs non-operational days

2. **Unavailable Date Management**
   - Mark single dates or date ranges as unavailable
   - Optional reason field (holiday, maintenance, weather, personal)
   - Validation: Cannot mark unavailable if PAID/COMPLETED bookings exist
   - Option to auto-reject PENDING bookings when marking unavailable

3. **Comprehensive Calendar View**
   - Show ALL booking statuses with clear differentiation
   - Overlay operational schedule (grayed out non-operational days)
   - Highlight unavailable dates with reasons
   - Multi-day bookings span visualization
   - Today indicator with Malaysia timezone

4. **Market Integration**
   - API endpoint for checking date availability
   - Block unavailable dates in booking date picker
   - Show operational days in trip details
   - Prevent booking creation on blocked dates

5. **Backward Compatibility**
   - Existing captains default to "everyday" schedule
   - Migration script to populate default schedules
   - Graceful degradation if schedule not configured

## Database Schema Design

### New Models

```prisma
// Charter operational schedule configuration
model CharterSchedule {
  id        String   @id @default(cuid())
  charterId String   @unique
  charter   Charter  @relation(fields: [charterId], references: [id], onDelete: Cascade)

  // Operational pattern
  scheduleType ScheduleType @default(EVERYDAY)

  // Custom days (used when scheduleType = CUSTOM)
  // Array of day indexes: 0=Sunday, 1=Monday, ..., 6=Saturday
  operationalDays Int[] @default([]) // e.g., [1,2,3,4,5] for weekdays

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([charterId])
  @@map("charter_schedules")
}

// Unavailable date ranges
model CharterUnavailability {
  id        String   @id @default(cuid())
  charterId String
  charter   Charter  @relation(fields: [charterId], references: [id], onDelete: Cascade)

  // Date range
  startDate DateTime // Inclusive start date
  endDate   DateTime // Inclusive end date

  // Optional reason
  reason    String?  // e.g., "Annual maintenance", "Holiday", "Weather"

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   // CaptainProfile.id or User.id

  @@index([charterId, startDate, endDate])
  @@index([charterId])
  @@map("charter_unavailability")
}

enum ScheduleType {
  EVERYDAY      // Operates every day
  WEEKDAYS      // Monday - Friday
  WEEKENDS      // Saturday - Sunday
  CUSTOM        // Use operationalDays array
}
```

### Schema Relationships

```prisma
model Charter {
  // ... existing fields
  schedule      CharterSchedule?
  unavailability CharterUnavailability[]
}
```

### Migration Strategy

**Phase 1: Schema Migration**

```bash
npx prisma migrate dev --name add-charter-availability-system
```

**Phase 2: Data Seeding**

```sql
-- Create default EVERYDAY schedule for all existing charters
INSERT INTO charter_schedules (id, charter_id, schedule_type, operational_days, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  id,
  'EVERYDAY',
  ARRAY[]::integer[],
  NOW(),
  NOW()
FROM charters
WHERE id NOT IN (SELECT charter_id FROM charter_schedules);
```

**Phase 3: Add to Charter Registration**

- New step or section in Experience step for schedule configuration
- Default to EVERYDAY for new charters
- Captains can modify later in Calendar page

## API Design

### Captain App Endpoints

#### 1. Get Charter Schedule

```typescript
GET /api/charters/[id]/schedule

Response:
{
  charterId: string;
  scheduleType: "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";
  operationalDays?: number[]; // [0-6] for CUSTOM type
  createdAt: string;
  updatedAt: string;
}
```

#### 2. Update Charter Schedule

```typescript
PATCH /api/charters/[id]/schedule

Body:
{
  scheduleType: "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";
  operationalDays?: number[]; // Required if CUSTOM
  confirmRejectPending?: boolean; // Required if affectedBookings exist
}

Response (when affectedBookings exist):
{
  success: false;
  requiresConfirmation: true;
  affectedBookings: Array<{
    id: string;
    date: string;
    anglerName: string;
    tripName: string;
  }>;
  message: "Schedule change affects X pending booking(s). Set confirmRejectPending=true to proceed.";
}

Response (success):
{
  success: boolean;
  schedule: CharterSchedule;
  rejectedBookings?: string[]; // IDs of auto-rejected bookings
}
```

#### 3. List Unavailable Dates

```typescript
GET /api/charters/[id]/unavailability?from=2025-01-01&to=2025-12-31

Response:
{
  unavailability: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason: string | null;
    createdAt: string;
  }>;
}
```

#### 4. Add Unavailable Date Range

```typescript
POST /api/charters/[id]/unavailability

Body:
{
  startDate: string; // ISO date
  endDate: string;   // ISO date
  reason?: string;
  autoRejectPending?: boolean; // Reject PENDING bookings in range
}

Validation:
- Check for PAID/COMPLETED bookings in range
- If found, return 409 Conflict with booking details
- If autoRejectPending=true, batch reject PENDING bookings

Response:
{
  success: boolean;
  unavailability: CharterUnavailability;
  rejectedBookings?: string[]; // Booking IDs that were rejected
}
```

#### 5. Remove Unavailable Date Range

```typescript
DELETE / api / charters / [id] / unavailability / [unavailabilityId];

Response: {
  success: boolean;
}
```

#### 6. Check Date Availability (Internal)

```typescript
GET /api/charters/[id]/check-availability?date=2025-11-15

Response:
{
  available: boolean;
  reason?: "unavailable" | "non-operational-day" | "booked";
  unavailability?: {
    startDate: string;
    endDate: string;
    reason: string | null;
  };
}
```

### Public API (fishon-market Integration)

#### 7. Get Charter Availability

```typescript
GET /api/public/charters/[id]/availability?from=2025-11-01&to=2025-11-30

Response:
{
  charterId: string;
  schedule: {
    type: "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";
    operationalDays?: number[];
  };
  unavailableDates: Array<{
    startDate: string;
    endDate: string;
  }>;
  // Optionally include booked dates (PAID/COMPLETED)
  bookedDates?: string[];
}
```

## UI Components Architecture

### 1. Calendar Page (`/captain/calendar`)

**Layout Structure:**

```
┌─────────────────────────────────────────────┐
│ Header: "Charter Calendar"                  │
│ Subtitle: Manage availability & schedule    │
├─────────────────────────────────────────────┤
│ Schedule Section                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Current: Everyday ▼  [Edit Schedule]    │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Unavailable Dates Section                   │
│ [+ Add Unavailable Dates]                   │
│ ┌─────────────────────────────────────────┐ │
│ │ 📅 Dec 25-26, 2025                      │ │
│ │ "Christmas Holiday"      [Edit] [Remove]│ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Full Calendar View                          │
│ [< Nov 2025 >]              [Today]         │
│ ┌─────────────────────────────────────────┐ │
│ │ Su Mo Tu We Th Fr Sa                    │ │
│ │                1  2  3  (status badges)  │ │
│ │  4  5  6  7  8  9 10                    │ │
│ │ 11 12 13 14 15 16 17                    │ │
│ │ ...                                      │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Legend:**

- 🟢 Operational day with PAID booking
- 🔵 Operational day with PENDING booking
- 🟡 Operational day with APPROVED booking
- ⚫ Operational day (no bookings)
- 🔴 Unavailable date (blocked)
- ⚪ Non-operational day (grayed out)
- 💠 Today (blue highlight)

### 2. Schedule Configuration Modal

```tsx
<ScheduleModal
  charter={charter}
  currentSchedule={schedule}
  onSave={handleSaveSchedule}
  onClose={handleClose}
/>
```

**Content:**

- Radio buttons: Everyday | Weekdays | Weekends | Custom
- Custom: Day checkboxes (Sun-Sat)
- Preview: "Your charter will operate on: Monday, Wednesday, Friday"

**Schedule Change Confirmation (if PENDING bookings affected):**

```tsx
<ScheduleChangeConfirmation
  affectedBookings={affectedBookings}
  newScheduleType={newScheduleType}
  onConfirm={handleConfirmChange}
  onCancel={handleCancel}
/>
```

**Confirmation Modal Content:**

- Title: "Schedule Change Confirmation"
- Warning message: "Changing to [WEEKENDS] will affect [3] pending booking(s) on non-operational days."
- Table of affected bookings:

  ```
  Date          | Angler Name    | Trip
  -------------|----------------|------------------
  Nov 5, 2025  | Ahmad Rahman   | Half Day Fishing
  Nov 12, 2025 | Sarah Lee      | Full Day Trip
  Nov 19, 2025 | John Tan       | Evening Charter
  ```

- Info text: "These bookings will be automatically rejected with an explanation sent to the anglers."
- Actions:
  - "Cancel" button (secondary)
  - "Change Schedule & Reject Bookings" button (destructive/red)

### 3. Unavailable Dates Modal

```tsx
<UnavailableDatesModal
  charter={charter}
  onAdd={handleAddUnavailability}
  onClose={handleClose}
/>
```

**Content:**

- Date range picker (start date - end date)
- Reason textarea (optional)
- Warning: Check for existing bookings
  - If PAID/COMPLETED found: "Cannot mark unavailable - confirmed bookings exist"
  - If PENDING found: Option "Auto-reject pending requests in this range"
- Submit button

### 4. Full Calendar Component

```tsx
<CharterCalendar
  charterId={charterId}
  bookings={bookings}
  schedule={schedule}
  unavailability={unavailabilityRanges}
  onDateClick={handleDateClick}
/>
```

**Features:**

- Month navigation (prev/next/today)
- Multi-day booking spans with visual continuity
- Status color coding with legend
- Click date → show bookings modal
- Responsive: Stack days on mobile
- Timezone: All dates in Malaysia timezone (GMT+8)

### 5. Booking Status Colors

```typescript
const STATUS_COLORS = {
  PENDING: "bg-blue-100 border-blue-300 text-blue-700",
  APPROVED: "bg-yellow-100 border-yellow-300 text-yellow-700",
  REJECTED: "bg-red-100 border-red-300 text-red-700",
  EXPIRED: "bg-gray-100 border-gray-300 text-gray-500",
  PAID: "bg-green-100 border-green-300 text-green-700",
  CANCELLED: "bg-orange-100 border-orange-300 text-orange-700",
  COMPLETED: "bg-purple-100 border-purple-300 text-purple-700",
};

const DAY_TYPES = {
  operational: "bg-white border-slate-200",
  nonOperational: "bg-slate-50 border-slate-100 text-slate-400",
  unavailable: "bg-red-50 border-red-200 text-red-600",
  today: "ring-2 ring-blue-500",
};
```

## Component Implementation Plan

### 1. New Components to Create

```
src/components/captain/
├── calendar/
│   ├── CharterCalendar.tsx              # Main full calendar view
│   ├── ScheduleSection.tsx              # Schedule display & edit trigger
│   ├── ScheduleModal.tsx                # Schedule configuration modal
│   ├── ScheduleChangeConfirmation.tsx   # Confirm modal for affected bookings
│   ├── UnavailabilitySection.tsx        # List of unavailable ranges
│   ├── UnavailabilityModal.tsx          # Add/edit unavailable dates
│   ├── CalendarDay.tsx                  # Single day cell with bookings
│   ├── CalendarLegend.tsx               # Status color legend
│   └── DateRangePicker.tsx              # Date range input component
```

### 2. Page Implementation

```tsx
// src/app/(portal)/captain/bookings/calendar/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCaptainBookings } from "@/lib/booking-service";
import { CharterCalendar } from "@/components/captain/calendar/CharterCalendar";
import { ScheduleSection } from "@/components/captain/calendar/ScheduleSection";
import { UnavailabilitySection } from "@/components/captain/calendar/UnavailabilitySection";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  // Get captain's charters
  const captain = await prisma.captainProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const charters = await prisma.charter.findMany({
    where: { captainId: captain.id, isActive: true },
    select: {
      id: true,
      name: true,
      schedule: true, // Include schedule relation
    },
  });

  const charterIds = charters.map((c) => c.id);

  // Get all bookings (not filtered by status)
  const bookings = await getCaptainBookings(charterIds);

  // Get unavailability ranges
  const unavailability = await prisma.charterUnavailability.findMany({
    where: {
      charterId: { in: charterIds },
      endDate: { gte: new Date() }, // Only future/ongoing
    },
    orderBy: { startDate: "asc" },
  });

  return (
    <div className="px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Charter Calendar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your availability, schedule, and view all bookings
        </p>
      </div>

      {/* Schedule Configuration */}
      <ScheduleSection charters={charters} />

      {/* Unavailable Dates Management */}
      <UnavailabilitySection
        charters={charters}
        unavailability={unavailability}
      />

      {/* Full Calendar */}
      <CharterCalendar
        bookings={bookings}
        schedules={charters.map((c) => c.schedule)}
        unavailability={unavailability}
      />
    </div>
  );
}
```

### 3. Service Layer

```typescript
// src/lib/availability-service.ts

import { prisma } from "./prisma";
import type { CharterSchedule, CharterUnavailability } from "@prisma/client";
import { toDateStringMY } from "./datetime";

/**
 * Check if a date is operational based on charter schedule
 */
export function isOperationalDay(
  date: Date,
  schedule: CharterSchedule
): boolean {
  const dayIndex = date.getDay(); // 0=Sun, 6=Sat

  switch (schedule.scheduleType) {
    case "EVERYDAY":
      return true;
    case "WEEKDAYS":
      return dayIndex >= 1 && dayIndex <= 5;
    case "WEEKENDS":
      return dayIndex === 0 || dayIndex === 6;
    case "CUSTOM":
      return schedule.operationalDays.includes(dayIndex);
    default:
      return true; // Fallback to available
  }
}

/**
 * Check if a date is marked as unavailable
 */
export function isUnavailable(
  date: Date,
  unavailability: CharterUnavailability[]
): CharterUnavailability | null {
  const dateString = toDateStringMY(date);

  for (const range of unavailability) {
    const start = toDateStringMY(new Date(range.startDate));
    const end = toDateStringMY(new Date(range.endDate));

    if (dateString >= start && dateString <= end) {
      return range;
    }
  }

  return null;
}

/**
 * Check if a date is available for booking
 */
export async function checkDateAvailability(
  charterId: string,
  date: Date
): Promise<{
  available: boolean;
  reason?: "unavailable" | "non-operational-day";
  unavailability?: CharterUnavailability;
}> {
  // Get schedule
  const schedule = await prisma.charterSchedule.findUnique({
    where: { charterId },
  });

  if (!schedule) {
    // No schedule = default to available
    return { available: true };
  }

  // Check operational day
  if (!isOperationalDay(date, schedule)) {
    return {
      available: false,
      reason: "non-operational-day",
    };
  }

  // Check unavailability
  const unavailability = await prisma.charterUnavailability.findMany({
    where: {
      charterId,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });

  if (unavailability.length > 0) {
    return {
      available: false,
      reason: "unavailable",
      unavailability: unavailability[0],
    };
  }

  return { available: true };
}

/**
 * Validate unavailability creation
 * Returns existing bookings that would conflict
 */
export async function validateUnavailability(
  charterId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  canCreate: boolean;
  conflictingBookings: Array<{
    id: string;
    status: string;
    date: Date;
  }>;
}> {
  const { prismaMarket } = await import("./prisma-market");

  // Check for PAID or COMPLETED bookings in range
  const bookings = await prismaMarket.marketBooking.findMany({
    where: {
      charterId,
      status: { in: ["PAID", "COMPLETED"] },
      date: { gte: startDate, lte: endDate },
    },
    select: { id: true, status: true, date: true },
  });

  return {
    canCreate: bookings.length === 0,
    conflictingBookings: bookings,
  };
}
```

## Fishon-Market Integration

### 1. Availability API Client

```typescript
// fishon-market/src/lib/api/availability-api.ts

export interface CharterAvailability {
  charterId: string;
  schedule: {
    type: "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";
    operationalDays?: number[];
  };
  unavailableDates: Array<{
    startDate: string;
    endDate: string;
  }>;
}

export async function getCharterAvailability(
  charterId: string,
  from: Date,
  to: Date
): Promise<CharterAvailability | null> {
  const captainApiUrl = process.env.FISHON_CAPTAIN_API_URL;
  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  try {
    const response = await fetch(
      `${captainApiUrl}/api/public/charters/${charterId}/availability?from=${fromStr}&to=${toStr}`
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch availability:", error);
    return null;
  }
}
```

### 2. Date Picker Integration (Soft Warnings)

**Behavior:** Show warnings instead of hard-blocking dates (captain approval flow)

```tsx
// fishon-market/src/components/booking/DatePicker.tsx

import { getCharterAvailability } from "@/lib/api/availability-api";
import { useState, useEffect } from "react";

export function BookingDatePicker({ charterId, onSelect }: Props) {
  const [availability, setAvailability] = useState<CharterAvailability | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    // Fetch next 3 months availability
    const from = new Date();
    const to = new Date();
    to.setMonth(to.getMonth() + 3);

    getCharterAvailability(charterId, from, to).then(setAvailability);
  }, [charterId]);

  const getDateWarning = (date: Date): string | null => {
    if (!availability) return null;

    // Check operational day
    const dayIndex = date.getDay();
    const { type, operationalDays } = availability.schedule;

    if (type === "WEEKDAYS" && (dayIndex === 0 || dayIndex === 6)) {
      return "This charter typically operates on weekdays. Your request will need captain approval.";
    }
    if (type === "WEEKENDS" && dayIndex >= 1 && dayIndex <= 5) {
      return "This charter typically operates on weekends. Your request will need captain approval.";
    }
    if (type === "CUSTOM" && !operationalDays?.includes(dayIndex)) {
      return "This date is outside normal operating days. Your request will need captain approval.";
    }

    // Check unavailability
    const dateStr = date.toISOString().split("T")[0];
    const unavailable = availability.unavailableDates.find((range) => {
      return dateStr >= range.startDate && dateStr <= range.endDate;
    });

    if (unavailable) {
      return "Limited availability on this date. Your request will need captain approval.";
    }

    return null;
  };

  const handleDateSelect = (date: Date) => {
    const dateWarning = getDateWarning(date);
    setWarning(dateWarning);
    setSelectedDate(date);
    onSelect(date);
  };

  return (
    <>
      <CalendarPicker
        selectedDate={selectedDate}
        onSelect={handleDateSelect}
        dateClassName={(date) => {
          const warning = getDateWarning(date);
          return warning ? "text-orange-600" : undefined; // Visual indicator
        }}
        minDate={new Date()}
        maxDate={/* 3 months from now */}
      />

      {warning && (
        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">⚠️ {warning}</p>
        </div>
      )}
    </>
  );
}
```

### 3. Booking Creation (Allow with Metadata)

**Behavior:** Allow booking creation but add availability metadata for captain review

```typescript
// fishon-market/src/app/api/bookings/create/route.ts

import { checkDateAvailability } from "@/lib/availability-api";

export async function POST(req: Request) {
  // ... existing validation

  // Check date availability (non-blocking)
  const availability = await checkDateAvailability(charterId, bookingDate);

  // Add availability context to booking metadata
  const availabilityFlags = {
    isOperationalDay: availability?.available || false,
    reason: availability?.reason || null,
    requiresExtraReview: !availability?.available,
  };

  // Proceed with booking creation (always allowed)
  const booking = await prisma.booking.create({
    data: {
      // ... existing fields
      metadata: {
        availability: availabilityFlags,
        // ... other metadata
      },
    },
  });

  // Note: Captain will see "Requires extra review" flag in dashboard
  // Captain approves/rejects based on their actual availability

  return NextResponse.json({ booking });
}
```

## Charter Registration Integration

### Implementation: Add to Experience Step ✅

**Decision confirmed:** Add schedule configuration after boat/amenities section in Experience step.

```tsx
// src/features/charter-onboarding/steps/ExperienceStep.tsx

<section>
  <h3 className="text-lg font-semibold">Operational Schedule</h3>
  <p className="text-sm text-slate-600">
    When does your charter operate? This helps anglers know when they can book.
  </p>

  <Field label="Schedule Type" error={fieldError("scheduleType")}>
    <select {...register("scheduleType")} className={inputClass}>
      <option value="EVERYDAY">Everyday</option>
      <option value="WEEKDAYS">Weekdays (Mon-Fri)</option>
      <option value="WEEKENDS">Weekends (Sat-Sun)</option>
      <option value="CUSTOM">Custom Days</option>
    </select>
  </Field>

  {scheduleType === "CUSTOM" && (
    <Field label="Operating Days">
      <div className="flex gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
          <label key={day} className="flex items-center gap-1">
            <input
              type="checkbox"
              value={idx}
              checked={operationalDays?.includes(idx)}
              onChange={(e) => {
                const checked = e.target.checked;
                const updated = checked
                  ? [...(operationalDays || []), idx]
                  : operationalDays?.filter((d) => d !== idx) || [];
                setValue("operationalDays", updated);
              }}
            />
            <span className="text-sm">{day}</span>
          </label>
        ))}
      </div>
    </Field>
  )}
</section>
```

### Alternative: Separate Schedule Step (Not Used)

~~Add new step between Experience and Trips (if schedule is complex enough).~~

**Decision:** Not implementing separate step. Schedule integrated into Experience step for streamlined flow.

### Schema Updates

```typescript
// @fishon/schemas/src/charter.ts

export const charterFormSchema = z.object({
  // ... existing fields

  // Schedule configuration
  scheduleType: z
    .enum(["EVERYDAY", "WEEKDAYS", "WEEKENDS", "CUSTOM"])
    .default("EVERYDAY"),
  operationalDays: z.array(z.number().min(0).max(6)).optional(),
});

export const experienceStepSchema = charterFormSchema.pick({
  // ... existing fields
  scheduleType: true,
  operationalDays: true,
});
```

### Finalization Logic

```typescript
// src/features/charter-onboarding/server/finalize.ts

// After creating charter, create schedule
await prisma.charterSchedule.create({
  data: {
    charterId: newCharter.id,
    scheduleType: formData.scheduleType || "EVERYDAY",
    operationalDays: formData.operationalDays || [],
  },
});
```

## Testing Strategy

### 1. Unit Tests

```typescript
// __tests__/availability-service.test.ts

describe("isOperationalDay", () => {
  it("should return true for all days with EVERYDAY schedule", () => {
    const schedule = { scheduleType: "EVERYDAY", operationalDays: [] };
    const monday = new Date("2025-11-03"); // Monday
    expect(isOperationalDay(monday, schedule)).toBe(true);
  });

  it("should return false for weekends with WEEKDAYS schedule", () => {
    const schedule = { scheduleType: "WEEKDAYS", operationalDays: [] };
    const saturday = new Date("2025-11-01"); // Saturday
    expect(isOperationalDay(saturday, schedule)).toBe(false);
  });

  it("should respect custom operational days", () => {
    const schedule = {
      scheduleType: "CUSTOM",
      operationalDays: [1, 3, 5], // Mon, Wed, Fri
    };
    const monday = new Date("2025-11-03");
    const tuesday = new Date("2025-11-04");
    expect(isOperationalDay(monday, schedule)).toBe(true);
    expect(isOperationalDay(tuesday, schedule)).toBe(false);
  });
});

describe("validateUnavailability", () => {
  it("should prevent marking unavailable if PAID bookings exist", async () => {
    // Mock booking with PAID status
    const result = await validateUnavailability(
      "charter-123",
      new Date("2025-11-01"),
      new Date("2025-11-07")
    );

    expect(result.canCreate).toBe(false);
    expect(result.conflictingBookings).toHaveLength(1);
  });

  it("should allow if only PENDING bookings exist", async () => {
    // Mock booking with PENDING status
    const result = await validateUnavailability(
      "charter-123",
      new Date("2025-11-01"),
      new Date("2025-11-07")
    );

    expect(result.canCreate).toBe(true);
  });
});
```

### 2. Integration Tests

```typescript
// __tests__/api/unavailability.test.ts

describe("POST /api/charters/[id]/unavailability", () => {
  it("should create unavailability and reject PENDING bookings", async () => {
    const response = await fetch("/api/charters/charter-123/unavailability", {
      method: "POST",
      body: JSON.stringify({
        startDate: "2025-11-15",
        endDate: "2025-11-20",
        reason: "Holiday",
        autoRejectPending: true,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.rejectedBookings).toBeDefined();
  });

  it("should return 409 if PAID bookings exist", async () => {
    const response = await fetch("/api/charters/charter-123/unavailability", {
      method: "POST",
      body: JSON.stringify({
        startDate: "2025-11-25",
        endDate: "2025-11-30",
      }),
    });

    expect(response.status).toBe(409);
  });
});
```

### 3. E2E Tests (Optional)

```typescript
// e2e/calendar-management.spec.ts

test("captain can set weekdays-only schedule", async ({ page }) => {
  await page.goto("/captain/calendar");
  await page.click("[data-testid='edit-schedule']");
  await page.selectOption("select[name='scheduleType']", "WEEKDAYS");
  await page.click("button:has-text('Save')");

  // Verify weekends are grayed out on calendar
  const saturday = page.locator("[data-date='2025-11-01']");
  await expect(saturday).toHaveClass(/non-operational/);
});

test("captain can mark dates unavailable", async ({ page }) => {
  await page.goto("/captain/calendar");
  await page.click("[data-testid='add-unavailable']");
  await page.fill("input[name='startDate']", "2025-12-25");
  await page.fill("input[name='endDate']", "2025-12-26");
  await page.fill("textarea[name='reason']", "Christmas Holiday");
  await page.click("button:has-text('Save')");

  // Verify dates appear in unavailability list
  await expect(page.locator("text=Dec 25-26, 2025")).toBeVisible();
});
```

## Migration Checklist

### Database Changes

- [ ] Create Prisma schema for CharterSchedule and CharterUnavailability
- [ ] Run migration: `npx prisma migrate dev --name add-charter-availability`
- [ ] Seed default schedules for existing charters
- [ ] Update Charter model relationships
- [ ] Generate Prisma client: `npx prisma generate`

### API Development

- [ ] Create `/api/charters/[id]/schedule` (GET/PATCH)
- [ ] Create `/api/charters/[id]/unavailability` (GET/POST/DELETE)
- [ ] Create `/api/charters/[id]/check-availability` (GET)
- [ ] Create `/api/public/charters/[id]/availability` (GET) for market
- [ ] Add validation for booking conflicts
- [ ] Add auto-reject logic for PENDING bookings

### Service Layer

- [ ] Create `availability-service.ts` with helpers
- [ ] Add `isOperationalDay()` function
- [ ] Add `isUnavailable()` function
- [ ] Add `checkDateAvailability()` function
- [ ] Add `validateUnavailability()` function

### Captain App UI

- [ ] Create Calendar page at `/captain/bookings/calendar`
- [ ] Build ScheduleSection component
- [ ] Build ScheduleModal component
- [ ] Build ScheduleChangeConfirmation component (affected bookings modal)
- [ ] Build UnavailabilitySection component
- [ ] Build UnavailabilityModal component
- [ ] Build CharterCalendar component (full month view)
- [ ] Build CalendarDay component
- [ ] Build CalendarLegend component
- [ ] Build DateRangePicker component
- [ ] Add navigation link in sidebar
- [ ] Update BookingCalendar to show all statuses
- [ ] Add "Requires extra review" badge to priority bookings

### Charter Registration

- [ ] Add schedule fields to charter form schema
- [ ] Update Experience step with schedule section
- [ ] Add default "EVERYDAY" in defaults
- [ ] Update finalization to create CharterSchedule
- [ ] Update edit mode to load/save schedule

### Fishon-Market Integration

- [ ] Create availability API client
- [ ] Update DatePicker to show warnings (not block dates)
- [ ] Add visual indicators for non-operational days (orange text)
- [ ] Add visual indicators for unavailable dates (orange text)
- [ ] Show warning banner when problematic date selected
- [ ] Show schedule info in trip details ("Operates: Weekdays")
- [ ] Add availability metadata in booking creation API
- [ ] Update booking confirmation page with schedule info

### Testing

- [ ] Unit tests for availability helpers
- [ ] Unit tests for validation logic
- [ ] API route tests for schedule endpoints
- [ ] API route tests for unavailability endpoints
- [ ] Integration tests for booking conflicts
- [ ] E2E tests for calendar management

### Documentation

- [ ] Update API documentation
- [ ] Add availability system guide to README
- [ ] Document schedule types and behaviors
- [ ] Add migration guide for existing captains
- [ ] Update fishon-market integration docs

## Constraints & Edge Cases

### 1. Existing Captains

- **Problem:** Captains registered before this system have no schedule
- **Solution:** Migration script creates EVERYDAY default
- **Validation:** Check if schedule exists, fallback to available if missing

### 2. Unavailability vs Bookings

- **Constraint:** Cannot mark unavailable if PAID/COMPLETED bookings exist
- **UI:** Show warning with booking details, prevent creation
- **API:** Return 409 Conflict with conflicting bookings
- **PENDING:** Option to auto-reject when marking unavailable

### 3. Multi-Charter Captains

- **Problem:** Captain with multiple charters needs per-charter schedule
- **Solution:** Schedule tied to charterId, not captain
- **UI:** Dropdown to select charter on Calendar page

### 4. Past Unavailability

- **Problem:** Historical unavailability clutters the list
- **Solution:** Only fetch future/ongoing ranges (`endDate >= now`)
- **Cleanup:** Optional CRON job to archive old ranges

### 5. Timezone Consistency

- **Critical:** All dates must use Malaysia timezone (GMT+8)
- **Functions:** Use `toDateStringMY()` for date comparisons
- **Display:** Use `formatDate()` for user-facing dates

### 6. Booking Date Validation (Soft Warnings)

- **Server-side:** Check availability but allow booking creation (add metadata flag)
- **Client-side:** Show warning badges on non-operational/unavailable dates
- **Captain review:** Highlighted bookings with "Requires extra review" flag
- **Approval flow:** Captain makes final decision based on actual availability

### 7. Schedule Changes (Confirmation Required)

- **Problem:** Captain changes WEEKDAYS → WEEKENDS, pending bookings on Mon-Fri exist
- **Solution:** Show confirmation modal with list of affected PENDING bookings
- **Captain action:** Must explicitly confirm to proceed with auto-rejection
- **Notification:** Email sent to affected anglers with explanation
- **Audit log:** Record schedule change + list of rejected booking IDs
- **Status:** PENDING bookings auto-rejected, APPROVED/PAID/COMPLETED bookings unaffected

### 8. Per-Trip Schedules (Future)

- **Current:** Schedule applies to all trips
- **Future:** Each trip can have own schedule (more complex)
- **Schema:** Add `tripId` to CharterSchedule (nullable)

## Performance Considerations

### 1. Calendar Queries

- **Index:** Add composite index on `(charterId, startDate, endDate)`
- **Optimization:** Fetch only date ranges needed for current month view
- **Caching:** Consider Redis cache for schedule (rarely changes)

### 2. Availability Checks

- **Batch:** Check multiple dates in single query
- **Cache:** Cache unavailability ranges (1 hour TTL)
- **Fallback:** If API fails, default to available (graceful degradation)

### 3. Market API Calls

- **Rate limit:** Cache availability response (5 min TTL)
- **Parallel:** Fetch availability + charter data in parallel
- **Timeout:** 5s timeout with fallback

## Future Enhancements

### Phase 2: Advanced Features

- [ ] Per-trip schedules (different trips on different days)
- [ ] Recurring unavailability (every Monday, monthly maintenance)
- [ ] Capacity limits per day (max 2 bookings per day)
- [ ] Automatic unavailability based on weather API
- [ ] Bulk unavailability import (CSV upload)
- [ ] Unavailability templates (holidays preset)

### Phase 3: Analytics

- [ ] Availability analytics (% of days available)
- [ ] Missed opportunity tracking (rejected due to unavailability)
- [ ] Seasonal trends (when captain is most available)
- [ ] Booking density heatmap

### Phase 4: Angler Features

- [ ] Show "usually available" days in charter details
- [ ] Email notification when unavailable dates removed
- [ ] Waitlist for blocked dates
- [ ] Suggest alternative dates when date unavailable

## Success Metrics

### Captain Adoption

- % of captains with configured schedules (target: 80% within 1 month)
- % of captains using unavailability feature (target: 50% within 3 months)
- Avg unavailable days per captain per month (baseline metric)

### Booking Impact

- Reduction in booking conflicts (target: 90% reduction)
- Reduction in manual rejections due to availability (target: 70%)
- Increase in booking success rate (target: +15%)

### System Health

- API response time < 200ms (p95)
- Calendar page load < 1s (p95)
- Zero booking conflicts due to race conditions

## Decisions Made

### 1. Charter Registration Integration ✅

**Decision:** Add schedule configuration to Experience step (not separate step)

**Rationale:**

- Keeps form flow streamlined (already 5 steps)
- Schedule is related to boat/amenities/operational details
- Fits naturally in Experience step context
- Reduces cognitive load for captains

**Implementation:** Add schedule section after boat configuration in Experience step

### 2. Multi-Day Bookings & Unavailability ✅

**Decision:** Allow booking requests even if dates become unavailable (captain approval flow)

**Rationale:**

- Fishon-market uses approval-based booking (not instant confirmation)
- Captain has final say via PENDING → APPROVED/REJECTED flow
- Unavailability acts as soft block (UI shows "Limited availability" warning)
- Prevents over-restriction while maintaining captain control

**Implementation:**

- UI: Show warning "Some dates may have limited availability" in date picker
- Backend: Don't hard-block unavailable dates in booking creation
- Captain dashboard: Highlight bookings that conflict with unavailable dates
- Captain can review and reject if truly unavailable

### 3. Schedule Changes & PENDING Bookings ✅

**Decision:** Show confirmation modal with affected bookings list before schedule change

**Confirmation Flow:**

```tsx
// When captain changes schedule (e.g., EVERYDAY → WEEKENDS)
// Check for PENDING bookings on now-non-operational days

if (affectedPendingBookings.length > 0) {
  showModal({
    title: "Schedule Change Confirmation",
    message: `Changing to ${newScheduleType} will affect ${affectedPendingBookings.length} pending booking(s) on non-operational days.`,
    bookings: affectedPendingBookings, // Show list with dates
    actions: [
      {
        label: "Cancel",
        action: "close",
      },
      {
        label: "Change Schedule & Auto-Reject These Bookings",
        action: "confirm",
        variant: "destructive",
      },
    ],
  });
}
```

**Implementation:**

- API: `PATCH /api/charters/[id]/schedule` includes `affectedBookings` validation
- UI: Modal shows table of affected bookings (angler name, date, trip)
- Action: Captain must explicitly confirm auto-rejection
- Notification: Send email to affected anglers with explanation
- Audit: Log schedule change + rejected booking IDs

### 4. Unavailability Permissions

**Decision:** Staff/Admin can mark unavailable for captains (with audit log)

**Use cases:**

- Emergency maintenance by platform
- Compliance/regulatory requirements
- Captain support requests

**Implementation:** Check user role, add `createdBy` field to track who set unavailability

### 5. Historical Unavailability Data

**Decision:** Archive unavailability records after 1 year (soft delete)

**Implementation:**

- Add `archivedAt` field (nullable)
- CRON job: Archive records where `endDate < 1 year ago`
- Archived records excluded from queries but retained for analytics

### 6. Booking Density Limits

**Decision:** Phase 2 feature (not MVP)

**Rationale:**

- Adds complexity to availability checks
- Most captains handle 1-2 bookings/day naturally
- Can be added later without schema changes

## Conclusion

### Key Design Decisions Summary

**1. Soft Availability Checks (Not Hard Blocks)**

- Unavailable/non-operational dates shown as warnings, not blockers
- Anglers can still request bookings on any date
- Captain has final approval via PENDING → APPROVED/REJECTED flow
- Rationale: Maintains captain control, prevents over-restriction

**2. Schedule in Experience Step**

- Integrated into existing Experience step (not separate)
- Keeps charter registration streamlined at 5 steps
- Natural fit with boat/amenities configuration

**3. Schedule Change Confirmation**

- Modal shows list of affected PENDING bookings before change
- Captain must explicitly confirm auto-rejection
- Affected anglers notified via email with explanation
- Audit log tracks schedule changes and rejected bookings

---

This calendar and availability system provides captains with granular control over their operational schedule and booking availability. The implementation strategy balances:

- **Backward compatibility:** Existing captains get default schedules
- **User experience:** Clear visual calendar, intuitive controls
- **Data integrity:** Strong validation prevents booking conflicts
- **Market integration:** Seamless availability checks during booking flow
- **Performance:** Optimized queries and caching strategies

The phased approach allows for iterative development:

1. **Phase 1 (MVP):** Basic schedule + unavailability + calendar view
2. **Phase 2:** Advanced features (per-trip, recurring, capacity)
3. **Phase 3:** Analytics and insights
4. **Phase 4:** Angler-facing features (waitlist, suggestions)

**Estimated Development Time:**

- Database schema & migration: 1 day
- API development: 2-3 days
- Captain UI (calendar page): 3-4 days
- Charter registration integration: 1 day
- Fishon-market integration: 2 days
- Testing & refinement: 2 days

**Total:** ~2 weeks (1 developer)

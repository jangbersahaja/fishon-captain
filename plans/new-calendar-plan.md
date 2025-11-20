## Plan: New Comprehensive Captain Calendar

**Objective:** Create a new, feature-rich calendar at `/captain/new-calendar` to eventually replace the existing calendar. It will support Month, Week, Day, and Agenda views, along with better resource management and filtering.

**Phases**

1. **Phase 1: Foundation & Shell** - **Assigned Agent:** frontend-subagent
   - **Objective:** Set up the page structure, URL state management, and layout shell.
   - **Files:**
     - `src/app/(portal)/captain/new-calendar/page.tsx` (New)
     - `src/components/captain/new-calendar/CalendarShell.tsx` (New)
     - `src/components/captain/new-calendar/CalendarSidebar.tsx` (New)
     - `src/components/captain/new-calendar/CalendarHeader.tsx` (New)
     - `src/hooks/useCalendarState.ts` (New)
   - **Step-by-Step:**
     1. Create the new page route fetching initial data (charters, bookings).
     2. Implement `useCalendarState` hook to manage `view`, `date`, `charterId` via URL search params.
     3. Build `CalendarShell` with a responsive sidebar/main layout.
     4. Build `CalendarSidebar` with a `MiniCalendar` (using `react-day-picker` or custom) and Filter controls.
     5. Build `CalendarHeader` with view switcher (Month/Week/Day) and date navigation.

2. **Phase 2: Month View Migration** - **Assigned Agent:** frontend-subagent
   - **Objective:** Port the recently improved Month view logic into the new architecture.
   - **Files:**
     - `src/components/captain/new-calendar/views/MonthView.tsx` (New)
     - `src/components/captain/new-calendar/CalendarEventBand.tsx` (New - reusable band component)
   - **Step-by-Step:**
     1. Extract the band calculation logic (overnight/multi-day handling) from `CharterCalendar.tsx` into a helper `src/lib/calendar/event-layout.ts`.
     2. Create `MonthView` component that uses this logic.
     3. Implement the grid rendering matching the "Google Calendar" style.
     4. Ensure clicking a band/day triggers the correct state (placeholder for details).

3. **Phase 3: Week & Day Views** - **Assigned Agent:** frontend-subagent
   - **Objective:** Implement time-grid views for granular scheduling.
   - **Files:**
     - `src/components/captain/new-calendar/views/WeekView.tsx` (New)
     - `src/components/captain/new-calendar/views/DayView.tsx` (New)
     - `src/components/captain/new-calendar/TimeGrid.tsx` (New - shared grid)
   - **Step-by-Step:**
     1. Create `TimeGrid` component rendering 24h (or operational hours) vertical axis.
     2. Implement `WeekView` rendering 7 columns.
     3. Implement event positioning logic (top/height based on start/end time).
     4. Implement `DayView` (single column version of WeekView).

4. **Phase 4: Interactivity & Details** - **Assigned Agent:** frontend-subagent
   - **Objective:** Add booking details, creation flows, and polish.
   - **Files:**
     - `src/components/captain/new-calendar/EventDetailsPanel.tsx` (New - Slide-over)
     - `src/components/captain/new-calendar/CreateBlockModal.tsx` (New)
   - **Step-by-Step:**
     1. Create a slide-over panel (Sheet) for displaying booking details (reusing `EnhancedBookingCard`).
     2. Implement "Click empty slot" to trigger "Block Date" or "New Booking" (if applicable).
     3. Connect the "New Booking/Block" button in the header.

5. **Phase 5: Cleanup & Switchover** - **Assigned Agent:** simple-task-subagent
   - **Objective:** Finalize and prepare for replacing the old calendar.
   - **Step-by-Step:**
     1. Verify all features match or exceed `/captain/calendar`.
     2. (Optional) Add redirect or update navigation links.

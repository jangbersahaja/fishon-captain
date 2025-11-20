# Plan: Add Operational Days Feature to New Calendar

**Objective:** Restore the operational days management feature from the legacy calendar. Captains will see which days their charter operates on the calendar view, and have a button to edit the operational schedule (scheduleType and operationalDays). Visual indicators will show non-operational days as grayed out or with different styling.

## Architecture

- **Data Model**: `CharterSchedule` (scheduleType: EVERYDAY|WEEKDAYS|WEEKENDS|CUSTOM, operationalDays: number[] 0-6)
- **UI Components**: Editor modal, sidebar display with badge, calendar visual indicators
- **Server Actions**: Fetch and update charter schedule
- **Visual Hierarchy**: Sidebar shows schedule type + quick access editor, calendar grays out non-operational days

## Phases

1. **Phase 1: Server Actions & Data Fetching** - **Assigned Agent:** backend-subagent
   - **Objective:** Create server actions for fetching and updating charter operational schedule
   - **Files/Functions to Create:**
     - `src/app/actions/schedule-actions.ts` (New) - `getCharterSchedule()`, `updateCharterSchedule()`
   - **Steps:**
     1. Create `getCharterSchedule(charterId)` server action that fetches current CharterSchedule from database
     2. Create `updateCharterSchedule(charterId, scheduleType, operationalDays)` server action that updates database and validates input
     3. Both actions must check captain auth (compare session captainId with charter owner)
     4. Add error handling and return typed responses

2. **Phase 2: OperationalScheduleEditor Component** - **Assigned Agent:** frontend-subagent
   - **Objective:** Build a modal dialog for editing operational schedule
   - **Files/Functions to Create:**
     - `src/components/captain/new-calendar/OperationalScheduleEditor.tsx` (New)
   - **Steps:**
     1. Create a form with `scheduleType` select (EVERYDAY, WEEKDAYS, WEEKENDS, CUSTOM)
     2. If CUSTOM, show a grid of 7 day checkboxes (Sunday-Saturday)
     3. Add Save/Cancel buttons
     4. On save, call `updateCharterSchedule()` action and show toast notification
     5. Include loading state during API call
     6. Pass current schedule data via props

3. **Phase 3: Sidebar Integration** - **Assigned Agent:** frontend-subagent
   - **Objective:** Display operational schedule info in sidebar with edit trigger
   - **Files/Functions to Modify:**
     - `src/components/captain/new-calendar/CalendarSidebar.tsx` (Modify)
     - `src/components/captain/new-calendar/CalendarShell.tsx` (Modify)
   - **Steps:**
     1. Update CalendarSidebar to accept `selectedCharter` prop with schedule data
     2. Add "Operational Schedule" section showing current scheduleType + day badges (if CUSTOM)
     3. Add "Edit Schedule" button that opens OperationalScheduleEditor modal
     4. Pass schedule data to editor component
     5. On successful update, refresh calendar data (revalidatePath)
     6. Update CalendarShell to pass schedule info down to sidebar

4. **Phase 4: Calendar Data Loading** - **Assigned Agent:** backend-subagent
   - **Objective:** Fetch operational schedule data alongside charters on page load
   - **Files/Functions to Modify:**
     - `src/app/(portal)/captain/new-calendar/page.tsx` (Modify)
   - **Steps:**
     1. Update charter query to include `schedule` relation
     2. Pass schedule data to CalendarShell component
     3. Make schedule data accessible to all calendar views via props

5. **Phase 5: Visual Indicators in Views** - **Assigned Agent:** frontend-subagent
   - **Objective:** Add visual styling for non-operational days across calendar views
   - **Files/Functions to Modify:**
     - `src/components/captain/new-calendar/views/MonthView.tsx` (Modify)
     - `src/components/captain/new-calendar/views/WeekView.tsx` (Modify)
     - `src/components/captain/new-calendar/views/DayView.tsx` (Modify)
     - `src/lib/calendar/event-layout.ts` (New helper if needed)
   - **Steps:**
     1. Create helper function `getOperationalDaysForDate(date, schedule)` to determine if a date is operational
     2. In MonthView: Add gray background or pattern to non-operational day cells
     3. In WeekView: Add gray background to non-operational day columns
     4. In DayView: Show indicator if day is non-operational
     5. Add clear visual distinction (opacity, pattern, or color) for disabled days

6. **Phase 6: Testing & Polish** - **Assigned Agent:** code-review-subagent
   - **Objective:** Verify complete flow and ensure no regressions
   - **Steps:**
     1. Test editing schedule from EVERYDAY to CUSTOM with specific days
     2. Verify calendar view updates after schedule change
     3. Verify visual indicators appear correctly for all views
     4. Test edge cases (all days selected, no days selected, etc.)
     5. Verify auth checks prevent unauthorized schedule edits
     6. Check TypeScript compilation and linting passes

## Open Questions

1. **Visual Style for Non-Operational Days**: Should we use gray background, opacity reduction, diagonal stripes, or a different approach?
2. **Real-time Updates**: Should the calendar auto-refresh after schedule edit, or require page reload? (Recommendation: auto-refresh via revalidatePath)
3. **Day-Level Blocking**: Should captains also be able to block individual days from the calendar view, or only via the schedule editor?
4. **Multi-Charter Display**: When viewing multiple charters, how should operational days be shown? (Recommendation: only for selected charter)

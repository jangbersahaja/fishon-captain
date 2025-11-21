# Plan: System Messages Display on Captain Dashboard

Implement a comprehensive system announcement banner framework for displaying critical captain notifications: KYC verification status, missing bank information, government ID requirements, compliance deadlines, and charter-related warnings. Messages will be contextual, severity-based (critical=red, warning=amber, info=blue), and integrated into the existing dashboard structure using the established admin banner pattern.

## Phases

### Phase 1: Data Layer - Verification & Message Generation Service

- **Objective:** Create backend service to fetch verification status and generate system messages
- **Files/Functions to Modify/Create:**
  - Create `src/lib/services/system-messages.ts` - Message generation engine
  - Modify `src/lib/dashboard-service.ts` - Include verification data fetching
  - Create `src/lib/services/verification-status.ts` - Query verification state
  - Create database migration for `MessageDismissal` table

- **Tests to Write:**
  - `src/lib/services/__tests__/system-messages.test.ts` - Test message generation rules
  - `src/lib/services/__tests__/verification-status.test.ts` - Test verification queries
  - `src/server/__tests__/dismiss-message.test.ts` - Test message dismissal endpoint

- **Steps:**
  1. Write test: Test message generation for missing government ID (should generate RED critical message)
  2. Write test: Test message generation for missing bank info (should generate AMBER warning message)
  3. Write test: Test message generation for verification APPROVED status (should not generate message)
  4. Write test: Test message generation for verification REJECTED with rejection reason (should generate RED with details)
  5. Write test: Test dismissed message filtering (if message dismissed and condition unchanged, should not show)
  6. Write test: Test auto-hide for success messages (autoHideSecs property set)
  7. Create Prisma migration: Add `MessageDismissal` model with fields: id, userId, messageId, dismissedAt
  8. Implement `getVerificationStatus(userId)` - Query CaptainVerification model
  9. Implement `generateSystemMessages(verification, charterCount)` - Business logic (skip if charterCount === 0)
  10. Implement message types: `SystemMessage { id, type, severity, title, description, actionUrl?, cta?, autoHideSecs?, isDismissible }`
  11. Implement `getDismissedMessages(userId)` - Query MessageDismissal table
  12. Implement `filterOutDismissedMessages(messages, dismissed)` - Filter dismissed messages
  13. Create server action: `dismissMessage(messageId)` - POST endpoint at `/api/captain/messages/dismiss`
  14. Update `getDashboardData()` to include `systemMessages` array (with dismissals filtered)
  15. Run all tests to confirm they pass

### Phase 2: Component Layer - Reusable SystemMessagesAlert Component

- **Objective:** Build React component to display system messages using established design patterns
- **Files/Functions to Modify/Create:**
  - Create `src/components/captain/SystemMessagesAlert.tsx` - Collapsible alert container
  - Create `src/components/captain/SystemMessage.tsx` - Individual message item
  - Create `src/components/__tests__/system-messages-alert.test.tsx` - Component tests

- **Tests to Write:**
  - `src/components/__tests__/system-messages-alert.test.tsx` - Render empty state, single message, multiple messages with collapse/expand
  - Test severity styling (red for critical, amber for warning, blue for info)
  - Test action button rendering and links
  - Test dismiss functionality (POST to `/api/captain/messages/dismiss`)
  - Test auto-hide timer for success messages (3 second delay)
  - Test collapse/expand toggle behavior

- **Steps:**
  1. Write test: SystemMessagesAlert should render nothing when messages array is empty
  2. Write test: SystemMessagesAlert should render first message expanded, rest collapsed
  3. Write test: Critical severity should use red (border-red-200 bg-red-50 text-red-800)
  4. Write test: Warning severity should use amber (border-amber-200 bg-amber-50 text-amber-800)
  5. Write test: Success severity should use green (border-green-200 bg-green-50 text-green-800)
  6. Write test: Auto-hide messages should disappear after 3 seconds
  7. Write test: Dismiss button should call dismissMessage(messageId) action
  8. Write test: Expand/collapse toggle should work on message group
  9. Implement `SystemMessagesAlert` component with:
     - First message expanded by default
     - Additional messages in collapsed state with count badge
     - Click to toggle collapse/expand
     - Smooth animations (Tailwind transition)
  10. Implement `SystemMessage` item component with:
      - Severity-based styling (red/amber/blue/green)
      - Icon indicators (AlertCircle, CheckCircle, Info)
      - Title + description
      - Optional action button with link/styling
      - Dismiss button (if isDismissible)
      - Auto-hide timer (setTimeout for autoHideSecs)
  11. Implement dismiss button handler: calls dismissMessage() action, removes from DOM
  12. Run tests to confirm component renders correctly

### Phase 3: Dashboard Integration - Add SystemMessagesAlert to Captain Dashboard

- **Objective:** Integrate system messages alert into captain page above metrics grid
- **Files/Functions to Modify/Create:**
  - Modify `src/app/(portal)/captain/page.tsx` - Add system messages section

- **Tests to Write:**
  - `src/app/__tests__/captain-page-system-messages.test.tsx` - Integration test

- **Steps:**
  1. Write test: Captain page should fetch dashboardData with systemMessages
  2. Write test: System messages should render before DashboardMetricsGrid
  3. Write test: When systemMessages is empty, SystemMessagesAlert should not be rendered
  4. Write test: System messages should not render for captains with 0 charters
  5. Modify `getCharter()` to fetch charter count early
  6. Modify `getCharter()` to skip verification check if charterCount === 0
  7. Add `SystemMessagesAlert` component import
  8. Add conditional rendering: `{dashboardData.systemMessages?.length > 0 && <SystemMessagesAlert messages={...} />}`
  9. Position after admin banner, before welcome section (visual hierarchy: critical items first)
  10. Run tests to confirm integration

### Phase 4: Message Templates & Business Rules Documentation

- **Objective:** Document all system message types and when they trigger
- **Files/Functions to Modify/Create:**
  - Create `docs/SYSTEM_MESSAGES_REFERENCE.md` - Configuration reference
  - Create `src/lib/services/message-rules.ts` - Constants for message definitions

- **Steps:**
  1. Document KYC messages: Missing ID Front, Missing ID Back, Missing License, Missing Boat Registration
  2. Document Financial messages: Missing Bank Name, Missing Account Number, Missing Account Holder, Missing Bank Branch
  3. Document Verification Status messages: PENDING (action required), REJECTED (reason displayed), APPROVED (success, hidden)
  4. Document Charter messages: Charter without trips, Charter without media, Charter incomplete
  5. Define severity levels and color mapping per message type
  6. Define which messages are dismissible vs. persistent
  7. Define CTA links and action text per message type

### Phase 5: Advanced Features (Future Enhancements)

- **Objective:** Optional features for production readiness and future scaling
- **Implementation Options:**
  - Message persistence dashboard: Admin view of all captains' system messages
  - Verification deadline countdown (e.g., "Complete verification within 7 days")
  - Email digest of pending system messages
  - Message priority sorting (critical first, then by date)
  - Admin capability to send custom system-wide announcements
  - Re-trigger dismissed messages if underlying condition changes (e.g., doc rejected)

## Decisions & Implementation Details

### Decision Summary

1. ✅ **Dismissal Persistence**: Database-backed (persistent across devices)
   - Track dismissed messages in new `MessageDismissal` table
   - Field: `userId`, `messageId`, `dismissedAt`
   - Messages re-appear if condition changes (e.g., doc uploaded)

2. ✅ **Multiple Messages Layout**: Collapsible/Expandable
   - Show first/highest priority message expanded
   - Additional messages in collapsed state
   - Click to expand/collapse group
   - Smooth animations for better UX

3. ✅ **Auto-hide Success**: Show briefly then auto-hide
   - Show "Submitted - pending review" for 3 seconds
   - Then fade out and hide from DOM
   - Use `setTimeout` for timed removal
   - Don't require manual dismissal

4. ✅ **Empty Charter State**: Show nothing
   - No system messages for captains with 0 charters
   - Messages appear after first charter created
   - Avoids overwhelming brand-new captains

5. ✅ **Testing Strategy**: Use vi.fn() mocks
   - Mock `prisma.captainVerification.findUnique()`
   - Mock `getDashboardData()` responses
   - Seed test data as fixtures for complex scenarios

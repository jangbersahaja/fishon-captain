---
type: plan
status: draft
updated: 2025-10-29
feature: toast-notification-migration
author: GitHub Copilot
---

# Toast System Migration Plan: Custom → Sonner

## Executive Summary

**Goal:** Complete notification system implementation for fishon-captain, including:

1. Migrate custom toast → Sonner (unified with fishon-market)
2. Implement full notification system (database, API, Pusher, preferences)
3. Build notification UI components (NotificationCenter, Settings, Toast integration)
4. Add notification sound support
5. Create dev tools (toast preview page)

**Scope:** This is a COMPLETE notification system implementation, not just toast migration.

**Status:** Custom toast system functional but scattered. Notification system does not exist yet.

**Risk Level:** 🟡 MEDIUM - Code is fragile per user warning, but we'll follow fishon-market's proven architecture.

---

## Current Implementation Analysis

### Custom Toast System

**Location:** `src/components/toast/`

- `ToastContext.tsx` (395 lines) - Context provider with complex logic
- `ToastTypes.ts` (22 lines) - Type definitions

**Current Features:**

```typescript
interface Toast {
  id: string;
  type: "success" | "error" | "info" | "progress";
  message: string;
  createdAt: number;
  autoDismiss?: number; // ms
  sticky?: boolean;
  actions?: ToastAction[];
  replace?: boolean;
  persist?: boolean; // persists across route changes
}
```

**Special Features in Custom Toast:**

1. ✅ SessionStorage persistence for error toasts
2. ✅ Bottom anchor registration (for dynamic offset calculation)
3. ✅ Haptic feedback on mobile (vibration)
4. ✅ De-duplication for rapid identical success toasts
5. ✅ Progress toast type
6. ✅ Replace mode (update existing toast with same ID)
7. ✅ Ephemeral error mode (auto-remove on route change)

**Visual Style:**

- Bottom-center positioning
- Fixed width max 380px
- Custom color tokens from `@/config/designTokens`
- Emoji icons (✓, ⚠, ℹ, …)

---

## Current Usage Analysis

### Files Using Custom Toast (4 files)

#### 1. **`src/features/charter-onboarding/components/ActionButtons.tsx`**

**Usage:**

```typescript
const toasts = useToasts();

toasts.push({
  type: "error",
  message: "Please upload at least 3 photos before continuing",
});
```

**Context:** Photo validation guard before advancing to next step

**Complexity:** ⭐ Simple - Single error toast

---

#### 2. **`src/features/charter-onboarding/components/ReviewBar.tsx`**

**Usage:**

```typescript
const { registerBottomAnchor } = useToasts();

useEffect(() => {
  const unregister = registerBottomAnchor(
    "review-bar",
    () => barRef.current?.offsetHeight || 0
  );
  return unregister;
}, [registerBottomAnchor]);
```

**Context:** Register bottom bar height to offset toasts above it

**Complexity:** ⭐⭐⭐ Advanced - Dynamic positioning feature

**Migration Challenge:** Sonner doesn't have built-in anchor registration. Need alternative approach.

---

#### 3. **`src/features/charter-onboarding/hooks/useCharterSubmission.ts`**

**Usage:**

```typescript
const { pushEphemeralError } = useToasts();

// Multiple usage patterns:
pushEphemeralError(CharterMessages.edit.notReady, { id: "charter-edit" });
pushEphemeralError(CharterMessages.edit.formUnhydrated, { id: "charter-edit" });
pushEphemeralError(CharterMessages.finalize.genericFail, {
  id: "finalize-error",
});
```

**Context:** Charter form submission error handling

**Complexity:** ⭐⭐ Moderate - Uses ephemeral mode (persist: false)

**Migration Strategy:** Use regular Sonner error toast with unique IDs

---

#### 4. **`src/components/captain/VideoUploader.tsx`** (DEPRECATED)

**Usage:**

```typescript
const toasts = useToasts();

toasts.push({
  type: "success",
  message: "Video uploaded",
  autoDismiss: 4000,
});
```

**Context:** Success message after video upload

**Complexity:** ⭐ Simple - Single success toast

**Status:** ⚠️ Component is deprecated, uses EnhancedVideoUploader instead

**Migration:** Can skip this file if EnhancedVideoUploader doesn't use toast

---

### Layout Integration

**Root Layout:** `src/app/layout.tsx`

```tsx
<ToastProvider>
  <Navbar />
  <OfflineBanner />
  <main className="flex-1">{children}</main>
  <Footer />
</ToastProvider>
```

**Integration:** Clean wrapping at root level

---

## Complete Implementation Strategy

### Phase 1: Database & Service Layer (Day 1-2)

**Objective:** Set up notification infrastructure (database, Pusma, service layer)

**Tasks:**

1. ⬜ Create database schema (Notification + NotificationPreferences models)
2. ⬜ Run Prisma migration
3. ⬜ Create notification-service.ts with all functions
4. ⬜ Set up Pusher (server + client utilities)
5. ⬜ Create API routes (GET, POST, PATCH, DELETE)
6. ⬜ Add notification sound utilities

**Files to Create:**

```
prisma/
  schema.prisma                                    # Add Notification + NotificationPreferences models

src/lib/
  notification-sound.ts                            # Sound utilities (from fishon-market)
  services/
    notification-service.ts                        # Core service layer
  pusher/
    server.ts                                      # Server-side Pusher utilities
    client.ts                                      # Client-side Pusher setup

src/app/api/
  notifications/
    route.ts                                       # GET all, POST create
    [id]/
      route.ts                                     # GET single
      read/route.ts                                # PATCH mark as read
    preferences/
      route.ts                                     # GET/PATCH preferences
    test/
      route.ts                                     # POST test notification (dev only)
  pusher/
    auth/route.ts                                  # Pusher auth endpoint
```

**Database Schema (from fishon-market):**

```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  type        NotificationType
  title       String
  message     String
  status      NotificationStatus @default(UNREAD)
  actionUrl   String?
  actionLabel String?
  charterId   String?
  bookingId   String?
  reviewId    String?
  metadata    Json?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  charter Charter? @relation(fields: [charterId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([charterId])
  @@index([status])
  @@index([createdAt])
}

enum NotificationType {
  CHARTER_APPROVED
  CHARTER_REJECTED
  BOOKING_CREATED
  BOOKING_CANCELLED
  REVIEW_SUBMITTED
  REVIEW_APPROVED
  REVIEW_REJECTED
  SYSTEM_ANNOUNCEMENT
  PAYMENT_RECEIVED
  CHARTER_UPDATE
}

enum NotificationStatus {
  UNREAD
  READ
  ARCHIVED
}

model NotificationPreferences {
  id        String   @id @default(cuid())
  userId    String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Email preferences (11 types)
  emailCharterApproved      Boolean @default(true)
  emailCharterRejected      Boolean @default(true)
  emailBookingCreated       Boolean @default(true)
  emailBookingCancelled     Boolean @default(true)
  emailReviewSubmitted      Boolean @default(true)
  emailReviewApproved       Boolean @default(true)
  emailReviewRejected       Boolean @default(true)
  emailSystemAnnouncement   Boolean @default(true)
  emailPaymentReceived      Boolean @default(true)
  emailCharterUpdate        Boolean @default(true)

  // Push preferences (11 types)
  pushCharterApproved       Boolean @default(true)
  pushCharterRejected       Boolean @default(true)
  pushBookingCreated        Boolean @default(true)
  pushBookingCancelled      Boolean @default(true)
  pushReviewSubmitted       Boolean @default(true)
  pushReviewApproved        Boolean @default(true)
  pushReviewRejected        Boolean @default(true)
  pushSystemAnnouncement    Boolean @default(true)
  pushPaymentReceived       Boolean @default(true)
  pushCharterUpdate         Boolean @default(true)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Key Service Functions:**

```typescript
// src/lib/services/notification-service.ts
export async function createNotification(params: CreateNotificationParams);
export async function getUserNotifications(userId: string, options?);
export async function getUnreadCount(userId: string);
export async function markNotificationRead(
  notificationId: string,
  userId: string
);
export async function markAllNotificationsRead(userId: string);
export async function deleteNotification(
  notificationId: string,
  userId: string
);
export async function getUserPreferences(userId: string);
export async function updateUserPreferences(
  userId: string,
  data: Partial<Preferences>
);
```

**Deliverable:** Complete backend infrastructure for notifications

---

### Phase 2: Toast Migration (Day 3)

**Objective:** Replace custom toast with Sonner

**Tasks:**

1. ⬜ Install Sonner: `npm install sonner`
2. ⬜ Add Toaster component to layout
3. ⬜ Migrate ActionButtons.tsx
4. ⬜ Migrate useCharterSubmission.ts
5. ⬜ Migrate ReviewBar.tsx (CSS variables for offset)
6. ⬜ Remove old ToastContext

**Files to Modify:**

```
src/app/layout.tsx                                # Add <Toaster /> component
src/features/charter-onboarding/components/
  ActionButtons.tsx                               # toast.error()
  ReviewBar.tsx                                   # CSS variable offset
src/features/charter-onboarding/hooks/
  useCharterSubmission.ts                         # toast.error()
```

**Files to Delete:**

```
src/components/toast/
  ToastContext.tsx                                # DELETE
  ToastTypes.ts                                   # DELETE
  __tests__/                                      # DELETE (if exists)
```

**Migration Pattern:**

```typescript
// OLD
const toasts = useToasts();
toasts.push({ type: "error", message: "Please upload at least 3 photos" });

// NEW
import { toast } from "sonner";
toast.error("Please upload at least 3 photos");
```

**Deliverable:** Unified toast system using Sonner

---

### Phase 3: Notification Hook & Integration (Day 4)

**Objective:** Create React hook for real-time notifications

**Tasks:**

1. ⬜ Create useNotifications hook (Pusher integration)
2. ⬜ Add toast integration (show toast on new notification)
3. ⬜ Add notification sound integration
4. ⬜ Implement toast deduplication (global singleton)
5. ⬜ Test real-time notification delivery

**Files to Create:**

```
src/hooks/
  useNotifications.ts                             # Main notification hook
```

**Hook Structure (from fishon-market):**

```typescript
export function useNotifications(options: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Pusher connection for real-time updates
  // Toast notifications with sound
  // Mark as read functionality
  // Fetch more pagination

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchMore,
    hasMore,
  };
}
```

**Deliverable:** Functional notification hook with real-time updates

---

### Phase 4: Notification UI Components (Day 5-6)

**Objective:** Build notification center and settings UI

**Tasks:**

1. ⬜ Create NotificationItem component
2. ⬜ Create NotificationList component
3. ⬜ Create NotificationDropdown (navbar bell icon)
4. ⬜ Create NotificationSettings page (all 20+ preferences)
5. ⬜ Create notifications page (full list view)
6. ⬜ Add notification badge (unread count)

**Files to Create:**

```
src/components/
  notifications/
    NotificationItem.tsx                          # Single notification card
    NotificationList.tsx                          # List with loading states
    NotificationDropdown.tsx                      # Navbar dropdown
    NotificationBadge.tsx                         # Unread count badge
    NotificationSettings.tsx                      # Preferences UI
    NotificationErrorBoundary.tsx                 # Error handling

src/app/(captain)/captain/
  notifications/
    page.tsx                                      # Full notifications page
    settings/
      page.tsx                                    # Settings page
```

**Component Structure:**

**NotificationItem.tsx:**

```tsx
interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  // Icon based on type
  // Title + message
  // Time ago
  // Action button (if actionUrl)
  // Mark read / Delete actions
  // Unread indicator
}
```

**NotificationDropdown.tsx:**

```tsx
export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications({ limit: 5 });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* Recent 5 notifications */}
        {/* "View all" link */}
        {/* "Mark all read" button */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**NotificationSettings.tsx:**

```tsx
export function NotificationSettings() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  const notificationTypes = [
    { key: "CharterApproved", label: "Charter approved" },
    { key: "CharterRejected", label: "Charter rejected" },
    { key: "BookingCreated", label: "Booking created" },
    // ... 10 types total
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {notificationTypes.map(({ key }) => (
          <div key={key} className="flex items-center justify-between">
            <Label>{label}</Label>
            <Switch
              checked={preferences[`email${key}`]}
              onCheckedChange={(checked) =>
                handleToggle(`email${key}`, checked)
              }
            />
          </div>
        ))}
      </CardContent>

      {/* Push Notifications section */}
      {/* Sound toggle */}
      {/* Enable/Disable all buttons */}
    </Card>
  );
}
```

**Deliverable:** Complete notification UI with preferences

---

### Phase 5: Dev Tools & Testing (Day 7)

**Objective:** Create development tools and test thoroughly

**Tasks:**

1. ⬜ Create toast preview page (copy from fishon-market)
2. ⬜ Create dev tools index page
3. ⬜ Add test notification endpoint
4. ⬜ Create notification test script
5. ⬜ Test all notification types
6. ⬜ Test preferences system end-to-end

**Files to Create:**

```
src/app/(dev)/dev/
  page.tsx                                        # Dev tools index
  toast-preview/
    page.tsx                                      # Toast preview (from fishon-market)
  README.md                                       # Dev tools documentation

scripts/
  test-notification.ts                            # CLI test script
  test-notification-preferences.ts                # Preferences test script
```

**Toast Preview Page:** (Copy from fishon-market)

- Sound controls
- Basic toast variants (success, error, info, warning, loading)
- Toasts with actions
- Duration variations
- Real app notifications
- Advanced features (promise toast, multiple toasts)

**Test Script:**

```typescript
// scripts/test-notification.ts
async function main() {
  const user = await prisma.user.findFirst();

  await createNotification({
    userId: user.id,
    type: "CHARTER_APPROVED",
    title: "Test: Charter Approved",
    message: "Your charter has been approved!",
    actionUrl: "/captain/charters",
    actionLabel: "View Charter",
  });

  console.log("✅ Test notification created");
}
```

**Deliverable:** Complete dev tools and verified system

---

### Phase 6: Integration & Polish (Day 8)

**Objective:** Integrate notifications into existing flows

**Tasks:**

1. ⬜ Add NotificationDropdown to Navbar
2. ⬜ Send notifications on charter approval/rejection (staff actions)
3. ⬜ Send notifications on booking events
4. ⬜ Send notifications on review events
5. ⬜ Test notification delivery in real scenarios
6. ⬜ Polish UI/UX (animations, loading states, empty states)

**Integration Points:**

**Charter Approval Flow:**

```typescript
// src/app/api/staff/charters/[id]/approve/route.ts
export async function POST(req: Request) {
  // ... approve charter logic

  // Send notification to captain
  await createNotification({
    userId: charter.captainId,
    type: "CHARTER_APPROVED",
    title: "🎉 Charter Approved!",
    message: `Your charter "${charter.name}" has been approved and is now live.`,
    actionUrl: `/captain/charters/${charter.id}`,
    actionLabel: "View Charter",
    charterId: charter.id,
  });
}
```

**Booking Created Flow:**

```typescript
// When angler creates booking
await createNotification({
  userId: charter.captainId,
  type: "BOOKING_CREATED",
  title: "🎣 New Booking Request",
  message: `${angler.name} requested to book "${charter.name}"`,
  actionUrl: `/captain/bookings/${booking.id}`,
  actionLabel: "View Booking",
  bookingId: booking.id,
  charterId: charter.id,
});
```

**Deliverable:** Fully integrated notification system

---

### Phase 7: Cleanup & Documentation (Day 9)

**Objective:** Final cleanup and create documentation

**Tasks:**

1. ⬜ Remove all old toast code
2. ⬜ Update copilot instructions
3. ⬜ Create feature documentation
4. ⬜ Update API documentation
5. ⬜ Code review and cleanup

**Documentation to Create:**

```
docs/
  feature-notification-system-complete.md         # Complete feature docs
  API_NOTIFICATION_ROUTES.md                      # API reference
```

**Deliverable:** Clean, documented, production-ready notification system

---

### Phase 2: Migration (Medium Risk)

**Approach:** Incremental file-by-file migration

#### 2.1 Simple Cases First (Low Risk)

**Order:**

1. `ActionButtons.tsx` - Single error toast
2. `VideoUploader.tsx` - Single success toast (if needed)

**Migration Pattern:**

```typescript
// OLD
const toasts = useToasts();
toasts.push({ type: "error", message: "..." });

// NEW
import { toast } from "sonner";
toast.error("...");
```

**Testing:** Manual testing in charter form flow

---

#### 2.2 Moderate Cases (Medium Risk)

**File:** `useCharterSubmission.ts`

**Migration Pattern:**

```typescript
// OLD
const { pushEphemeralError } = useToasts();
pushEphemeralError(message, { id: "charter-edit" });

// NEW
import { toast } from "sonner";
toast.error(message, { id: "charter-edit", duration: 5000 });
```

**Note:** Sonner auto-dismisses by default, no special "ephemeral" mode needed

**Testing:**

- Test charter submission errors
- Verify toasts don't persist after navigation
- Check error message clarity

---

#### 2.3 Advanced Cases (High Risk)

**File:** `ReviewBar.tsx`

**Challenge:** Bottom anchor registration for dynamic offset

**Current Logic:**

```typescript
// Toast offset = max(all registered anchor heights) + 24px breathing space
const computeDynamicOffset = () => {
  if (!anchorsRef.current.length) return defaultOffset;
  const h = Math.max(...anchorsRef.current.map((a) => a.getHeight()));
  return h + 24;
};
```

**Sonner Limitation:** No built-in anchor registration API

**Solutions (Pick One):**

**Option A: CSS Custom Properties** ⭐ RECOMMENDED

```tsx
// ReviewBar.tsx
useEffect(() => {
  const height = barRef.current?.offsetHeight || 0;
  document.documentElement.style.setProperty(
    "--review-bar-height",
    `${height}px`
  );
}, []);

// Toaster config
<Toaster
  position="bottom-center"
  offset="calc(var(--review-bar-height, 0px) + 24px)"
/>;
```

**Pros:** Clean, reactive, no context needed  
**Cons:** Global CSS variable

**Option B: Context + Toaster Offset**

```tsx
// Create ToastOffsetContext
const [offset, setOffset] = useState(16);

// ReviewBar registers height
useEffect(() => {
  setOffset(barRef.current?.offsetHeight + 24);
}, []);

// Pass to Toaster
<Toaster offset={offset} />;
```

**Pros:** Type-safe, contained  
**Cons:** Requires context provider, more code

**Option C: Drop Feature**

- Remove anchor registration entirely
- Use fixed offset (e.g., 80px for typical bar)
- Toasts may overlap bar on small screens

**Recommendation:** Start with Option A, fallback to Option C if issues

---

### Phase 3: Cleanup (Low Risk)

**Tasks:**

1. Remove custom toast files:
   - `src/components/toast/ToastContext.tsx`
   - `src/components/toast/ToastTypes.ts`
   - `src/components/toast/__tests__/`
2. Remove ToastProvider from layout
3. Add Toaster component to layout
4. Remove unused imports
5. Update type definitions if needed

**Testing:**

- Full regression test of charter onboarding flow
- Test all toast scenarios from preview page
- Mobile testing (haptic removed, but Sonner has good mobile UX)

---

## Feature Parity Matrix

| Feature                          | Custom Toast | Sonner       | Migration                            |
| -------------------------------- | ------------ | ------------ | ------------------------------------ |
| Basic types (success/error/info) | ✅           | ✅           | Direct mapping                       |
| Progress toast                   | ✅           | ✅ (loading) | Map to `toast.loading()`             |
| Auto-dismiss                     | ✅           | ✅           | `duration` prop                      |
| Sticky (no dismiss)              | ✅           | ✅           | `duration: Infinity`                 |
| Actions                          | ✅           | ✅           | `action` prop                        |
| Custom ID                        | ✅           | ✅           | `id` prop                            |
| Replace mode                     | ✅           | ✅           | Same ID auto-replaces                |
| SessionStorage persist           | ✅           | ❌           | **DROPPED** - Not needed with Sonner |
| Bottom anchor offset             | ✅           | ⚠️           | **CUSTOM** - Use CSS variables       |
| Haptic feedback                  | ✅           | ❌           | **DROPPED** - Nice to have           |
| De-duplication                   | ✅           | ✅           | Built-in                             |
| Ephemeral errors                 | ✅           | ✅           | Default behavior                     |
| Max toasts limit                 | ✅ (3)       | ✅           | `<Toaster visibleToasts={3} />`      |

**Lost Features (Acceptable):**

- SessionStorage persistence - Sonner's default UX is better (fresh start on reload)
- Haptic feedback - Progressive enhancement, not critical
- Custom emoji icons - Sonner has built-in icons (better accessibility)

**Gained Features:**

- Better animations
- Better mobile UX
- Promise-based toasts (`toast.promise()`)
- Accessibility improvements
- Active maintenance and updates
- Notification sound integration (already in fishon-market)

---

## Testing Plan

### Manual Test Cases

**1. Charter Onboarding Flow**

- [ ] Photo validation error shows when < 3 photos
- [ ] Error toasts auto-dismiss after duration
- [ ] Success toast shows after form save
- [ ] Toasts don't overlap ReviewBar on mobile

**2. Video Upload** (if not deprecated)

- [ ] Success toast after video upload completes
- [ ] Toast shows correct message

**3. Form Submission Errors**

- [ ] "Not ready" error shows
- [ ] "Form unhydrated" error shows
- [ ] "Generic fail" error shows
- [ ] Toasts don't persist after navigation

**4. General UX**

- [ ] Multiple toasts stack correctly
- [ ] Toast positioning on mobile (portrait/landscape)
- [ ] Keyboard accessibility (Esc to dismiss)
- [ ] Screen reader announces toasts

### Automated Tests

**Update existing toast tests:**

- `src/components/toast/__tests__/` (if exists)
- Convert to Sonner mocking pattern
- Or delete if integration tests cover usage

---

## Implementation Timeline

### Day 1-2: Database & Service Layer

- Set up Notification + NotificationPreferences models
- Create Prisma migration
- Build notification-service.ts (all CRUD functions)
- Set up Pusher (server + client)
- Create API routes
- Add notification sound utilities
- **Test:** API endpoints with Postman/curl

### Day 3: Toast Migration

- Install Sonner
- Migrate 4 files using toast
- Implement ReviewBar CSS variable offset
- Remove old ToastContext
- **Test:** Charter onboarding flow with new toasts

### Day 4: Notification Hook

- Create useNotifications hook
- Integrate Pusher real-time updates
- Add toast notifications on Pusher events
- Implement deduplication
- Add notification sound
- **Test:** Real-time notification delivery

### Day 5-6: UI Components

- Build NotificationItem component
- Build NotificationList component
- Build NotificationDropdown (navbar)
- Build NotificationSettings page (20+ preferences)
- Build full notifications page
- Add loading states, empty states, error boundaries
- **Test:** All UI components, preferences saving

### Day 7: Dev Tools & Testing

- Create toast preview page
- Create dev tools index
- Add test notification endpoint
- Create test scripts
- Test all notification types
- Test preferences end-to-end
- Mobile testing
- **Test:** Full system regression

### Day 8: Integration

- Add dropdown to Navbar
- Integrate charter approval notifications
- Integrate booking notifications
- Integrate review notifications
- Polish animations and UX
- **Test:** Real user flows with notifications

### Day 9: Cleanup & Documentation

- Remove old toast code
- Update copilot instructions
- Create feature documentation
- API documentation
- Code review
- Final testing
- **Deploy:** To staging/production

**Total Timeline:** 9 days (can overlap some tasks)

---

## Complete File Structure

### New Files to Create (45+ files)

```
prisma/
  schema.prisma                                   # ✅ Add models (2 models)
  migrations/
    YYYYMMDDHHMMSS_add_notifications/
      migration.sql                               # ✅ Auto-generated

src/
  lib/
    notification-sound.ts                         # ✅ Sound utilities
    services/
      notification-service.ts                     # ✅ Core service (400+ lines)
    pusher/
      server.ts                                   # ✅ Server utilities
      client.ts                                   # ✅ Client setup

  hooks/
    useNotifications.ts                           # ✅ Main React hook (400+ lines)

  components/
    notifications/
      NotificationItem.tsx                        # ✅ Single notification card
      NotificationList.tsx                        # ✅ List with pagination
      NotificationDropdown.tsx                    # ✅ Navbar dropdown
      NotificationBadge.tsx                       # ✅ Unread count badge
      NotificationSettings.tsx                    # ✅ Preferences UI (400+ lines)
      NotificationErrorBoundary.tsx               # ✅ Error handling
      index.ts                                    # ✅ Barrel export

  app/
    layout.tsx                                    # 🔄 Add Toaster component

    (captain)/captain/
      notifications/
        page.tsx                                  # ✅ Full notifications page
        settings/
          page.tsx                                # ✅ Settings page

    (dev)/dev/
      page.tsx                                    # ✅ Dev tools index
      toast-preview/
        page.tsx                                  # ✅ Toast preview (500+ lines)
      README.md                                   # ✅ Dev tools docs

    api/
      notifications/
        route.ts                                  # ✅ GET all, POST create
        [id]/
          route.ts                                # ✅ GET single
          read/
            route.ts                              # ✅ PATCH mark as read
        preferences/
          route.ts                                # ✅ GET/PATCH preferences
        test/
          route.ts                                # ✅ POST test (dev only)
      pusher/
        auth/
          route.ts                                # ✅ Pusher authentication

scripts/
  test-notification.ts                            # ✅ CLI test script
  test-notification-preferences.ts                # ✅ Preferences test script

docs/
  feature-notification-system-complete.md         # ✅ Complete docs
  API_NOTIFICATION_ROUTES.md                      # ✅ API reference
```

### Files to Modify (6 files)

```
src/
  components/
    Navbar.tsx                                    # 🔄 Add NotificationDropdown

  features/charter-onboarding/
    components/
      ActionButtons.tsx                           # 🔄 Replace useToasts with toast.error()
      ReviewBar.tsx                               # 🔄 CSS variable offset
    hooks/
      useCharterSubmission.ts                     # 🔄 Replace pushEphemeralError

  app/
    api/
      staff/charters/[id]/
        approve/route.ts                          # 🔄 Add notification
        reject/route.ts                           # 🔄 Add notification
```

### Files to Delete (3+ files)

```
src/components/toast/
  ToastContext.tsx                                # ❌ DELETE (395 lines)
  ToastTypes.ts                                   # ❌ DELETE (22 lines)
  __tests__/                                      # ❌ DELETE (if exists)
```

**Summary:**

- ✅ **45+ new files** (database, services, components, API, dev tools)
- 🔄 **6 files modified** (integration points)
- ❌ **3 files deleted** (old toast system)

---

## Component Architecture (Following fishon-market Pattern)

### Notification Components Hierarchy

```
NotificationErrorBoundary (root boundary)
├── NotificationDropdown (navbar)
│   ├── NotificationBadge (unread count)
│   └── NotificationList (recent 5)
│       └── NotificationItem (card)
│
└── Notifications Page (full list)
    └── NotificationList (paginated)
        └── NotificationItem (card)

Settings Page
└── NotificationSettings (preferences form)
    ├── Email Preferences Section
    ├── Push Preferences Section
    ├── Sound Toggle
    └── Bulk Action Buttons
```

### Component Responsibilities

**NotificationItem:**

- Display notification with icon (based on type)
- Show title, message, time ago
- Action button (if actionUrl exists)
- Mark read / Delete actions
- Unread indicator (colored border)
- Responsive design (mobile + desktop)

**NotificationList:**

- Render array of NotificationItem
- Loading skeletons
- Empty state ("No notifications")
- "Load more" button (if hasMore)
- Error state

**NotificationDropdown:**

- Bell icon with badge
- Dropdown menu (shadcn/ui DropdownMenu)
- Recent 5 notifications
- "View all" link to full page
- "Mark all as read" button
- Empty state

**NotificationSettings:**

- 20+ toggle switches (11 email + 11 push - 2 not applicable for captain)
- Organized by notification type
- "Enable all email" / "Disable all email"
- "Enable all push" / "Disable all push"
- Sound toggle
- Real-time saving (auto-save on toggle)
- Loading states
- Error handling with rollback

**NotificationBadge:**

- Red circle with count (1-99, 99+ for overflow)
- Positioned on bell icon
- Animated entrance/exit
- Accessible (ARIA label with count)

---

## Risk Mitigation

### High-Risk Areas

**1. ReviewBar Dynamic Offset**

- **Risk:** Toast overlap on small screens
- **Mitigation:**
  - Start with CSS variable approach
  - Test on smallest target screen (iPhone SE 375px)
  - Fallback to fixed offset if issues

**2. Charter Form Fragility**

- **Risk:** Breaking charter onboarding flow
- **Mitigation:**
  - Test after each file migration
  - Keep git commits small and atomic
  - Have rollback plan ready

**3. Error Toast Timing**

- **Risk:** Critical errors dismissed too quickly
- **Mitigation:**
  - Use longer duration for errors (8-10s)
  - Consider `duration: Infinity` for blocking errors
  - Add action button "Dismiss" for control

### Rollback Plan

If migration causes issues:

1. Revert commits in reverse order
2. Re-enable ToastProvider in layout
3. Document what broke for future attempt
4. Continue with notification system using custom toast (suboptimal but workable)

---

## Post-Migration Benefits

### Immediate

- ✅ Unified toast system with fishon-market
- ✅ Better accessibility
- ✅ Less maintenance burden
- ✅ Better mobile UX

### Future

- ✅ Ready for notification system integration
- ✅ Notification sound integration (already in lib)
- ✅ Toast preview dev tool for testing
- ✅ Consistent UX across Fishon apps

---

## Next Steps

**Before Starting Migration:**

1. Get user approval on plan
2. Confirm ReviewBar offset solution (CSS variables vs fixed)
3. Confirm acceptable to drop haptic feedback
4. Schedule migration window (avoid during active charter onboarding)

**After Approval:**

1. Create feature branch: `feat/migrate-toast-to-sonner`
2. Start with Day 1 preparation tasks
3. Test preview page thoroughly before migrating usage
4. Proceed incrementally with testing between each file

---

## Questions for User

1. **ReviewBar offset:** Prefer CSS variables or fixed offset approach?
2. **Haptic feedback:** Okay to drop, or should we add custom implementation?
3. **Migration timing:** Any charter onboarding campaigns active? (Avoid breaking during active use)
4. **Notification types:** Any captain-specific notification types to add beyond the 10 listed?
5. **Email integration:** Email service already set up? (Need for email notifications)
6. **Pusher account:** Existing Pusher app or create new one?
7. **Testing depth:** Manual testing sufficient, or need automated tests?

---

## Conclusion

**Recommendation:** ✅ PROCEED with FULL notification system implementation

**What We're Building:**

This is NOT just a toast migration - it's a **complete notification system** including:

1. ✅ **Database layer** - Notification + NotificationPreferences models (20+ preference fields)
2. ✅ **Service layer** - Complete CRUD operations with per-type preference checking
3. ✅ **Real-time delivery** - Pusher integration for instant notifications
4. ✅ **Toast system** - Sonner with sound, deduplication, and mobile support
5. ✅ **UI components** - Dropdown, full page, settings (all following fishon-market patterns)
6. ✅ **Dev tools** - Toast preview page for testing
7. ✅ **API routes** - Complete REST API for notifications
8. ✅ **Integration** - Charter approval, bookings, reviews

**Why This Approach:**

- **Proven architecture** - Directly from fishon-market (battle-tested)
- **Unified UX** - Consistent experience across Fishon ecosystem
- **Complete solution** - Not a half-measure, full production-ready system
- **Well-structured** - Following your own guidelines (job well done on fishon-market!)
- **Maintainable** - Clean separation of concerns, barrel exports, proper typing

**Scope:**

- 45+ new files
- 6 files modified
- 3 files deleted
- ~3000+ lines of new code (mostly copied/adapted from fishon-market)
- 9 days implementation timeline

**Confidence Level:** 🟢 HIGH

- We're following a proven pattern from fishon-market
- Clear migration path for toast (4 files only)
- Well-defined component architecture
- Comprehensive testing plan
- Risk mitigation strategies in place

**Ready to Start?** Just say the word and I'll begin with Phase 1 (Database & Service Layer)! 🎣

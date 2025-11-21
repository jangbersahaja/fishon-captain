# Phase 2 Quick Reference - System Messages Components

## Component Import

```typescript
import { SystemMessage } from "@/components/captain/SystemMessage";
import { SystemMessagesAlert } from "@/components/captain/SystemMessagesAlert";
import type { SystemMessage as ISystemMessage } from "@/lib/services/system-messages";
```

## Usage Example

```typescript
// From Phase 1 getDashboardData service
const { dashboardData } = await getCharter(userId);
const { systemMessages } = dashboardData;

// Render in JSX
<SystemMessagesAlert
  messages={systemMessages}
  onDismiss={(messageId) => {
    // Optional callback when message dismissed
    console.log("Message dismissed:", messageId);
  }}
/>
```

## Component Hierarchy

```
SystemMessagesAlert (container, collapsible)
  ├── SystemMessage (first message, always expanded)
  └── SystemMessage (collapsed messages, toggleable)
      ├── Individual message 1
      ├── Individual message 2
      └── ...
```

## File Locations

| File                                                              | Lines | Purpose                        |
| ----------------------------------------------------------------- | ----- | ------------------------------ |
| `src/components/captain/SystemMessage.tsx`                        | 187   | Individual message component   |
| `src/components/captain/SystemMessagesAlert.tsx`                  | 157   | Container with collapse/expand |
| `src/components/captain/__tests__/system-message.test.tsx`        | 373   | 22 unit tests                  |
| `src/components/captain/__tests__/system-messages-alert.test.tsx` | 564   | 26 integration tests           |

## Severity Types & Styling

| Severity     | Icon        | Title Color    | Text Color     | Action BG    | Uses                                  |
| ------------ | ----------- | -------------- | -------------- | ------------ | ------------------------------------- |
| **critical** | AlertCircle | text-red-800   | text-red-700   | bg-red-100   | Gov ID missing, verification failed   |
| **warning**  | AlertCircle | text-amber-800 | text-amber-700 | bg-amber-100 | Banking details, pending verification |
| **success**  | CheckCircle | text-green-800 | text-green-700 | bg-green-100 | Verification complete (rare)          |
| **info**     | Info        | text-blue-800  | text-blue-700  | bg-blue-100  | Informational alerts                  |

## API Integration

```typescript
// Called automatically by SystemMessage.dismiss
POST /api/captain/messages/dismiss

// Request body
{
  messageId: "missing-id-front-or-back"
}

// Response
{
  success: true,
  dismissal: {
    id: "uuid",
    messageId: "missing-id-front-or-back",
    dismissedAt: "2025-11-22T01:42:00Z"
  }
}
```

## Key Features

### SystemMessage Component

- **Rendering**: Title, description, icon, action button, dismiss button
- **Severity Styling**: Automatic colors based on severity prop
- **Auto-hide**: Optional `message.autoHideSecs` (e.g., for success messages)
- **Actions**: Optional link button to action URL
- **Dismissal**: Calls API and invokes callback
- **Animation**: Smooth fade-out + scale-down on dismiss

### SystemMessagesAlert Container

- **Empty State**: Renders null if no messages
- **Expand/Collapse**: First message always visible, rest toggleable
- **Badge**: Shows "+N more alerts" when collapsed
- **Animations**: Smooth chevron rotation, max-height transitions
- **Messaging**: Removes dismissed messages instantly from DOM
- **Styling**: Container color matches first message severity

## Vitest Configuration

Updated file: `vitest.config.ts`

```typescript
include: [
  // ... existing patterns ...
  "src/components/**/__tests__/**/*.test.{ts,tsx}", // NEW
];
```

## Acceptance Checklist

- ✅ 48 tests (22 + 26) covering all functionality
- ✅ TypeScript: 0 compilation errors
- ✅ Follows existing codebase patterns (Admin Banner, PriorityBookings)
- ✅ Collapsible behavior with smooth animations
- ✅ Auto-hide working with configurable timeouts
- ✅ Dismiss calls API and updates UI
- ✅ Severity-based styling (4 colors)
- ✅ Action buttons with proper linking
- ✅ Full WCAG accessibility support
- ✅ No external dependencies beyond lucide-react

## Phase 3 Integration Path

1. Open `src/app/(portal)/captain/page.tsx`
2. Import `SystemMessagesAlert` from `@/components/captain/SystemMessagesAlert`
3. Add after admin banner, before DashboardMetricsGrid:
   ```typescript
   {dashboardData.systemMessages.length > 0 && (
     <SystemMessagesAlert
       messages={dashboardData.systemMessages}
     />
   )}
   ```
4. Run tests to verify integration
5. Test with real data in browser

## Notes

- Components are "use client" (manage state)
- No CSS files needed (Tailwind utilities only)
- API errors logged but don't break UI
- All icons from lucide-react
- Tests use vitest + jsdom (matching project)
- Accessibility: role="alert", aria-labels, keyboard support included

---

**Created**: November 22, 2025  
**Status**: Ready for Phase 3 Integration

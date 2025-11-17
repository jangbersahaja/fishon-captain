# Chat Unread Count Fix - Analysis & Implementation

**Issue**: Unread count not being cleared when captain opens a conversation  
**Date**: 2025-11-17  
**Status**: In Progress

---

## Problem Analysis

### Root Cause

Captain app has incomplete "mark as read" implementation:

1. **Missing API Endpoint**: No `/api/captain/conversations/[id]/read` endpoint exists
2. **No-op Hook Function**: `useConversation().markAsRead()` is a no-op (does nothing)
3. **No Server-Side Logic**: No mechanism to update `captainUnreadCount` in database

### Current Flow (Broken)

```
Captain opens conversation
  → ChatDetail component renders
    → useConversation hook initializes
      → calls markAsRead() on mount (line 315)
        → markAsRead() is no-op: `return;` (line 223)
          ❌ No API call made
          ❌ Database not updated
          ❌ Unread count stays the same
```

### Expected Flow (Should Be)

```
Captain opens conversation
  → ChatDetail component renders
    → useConversation hook initializes
      → calls markAsRead() on mount
        → API call: PATCH /api/captain/conversations/:id/read
          → Verify captain owns this conversation
          → Update captainUnreadCount = 0
          → Mark received messages as READ
          → Trigger Pusher event for real-time sync
            ✅ Unread count cleared in database
            ✅ UI updates immediately
            ✅ Persists across refreshes
```

---

## Data Architecture

### Database Schema (fishon-market)

```prisma
model Conversation {
  id                  String   @id @default(cuid())
  bookingId           String   @unique
  charterId           String
  anglerId            String
  ownerId             String   // Captain userId
  status              ConversationStatus

  // Unread counts (per user)
  anglerUnreadCount   Int      @default(0)  // Angler's unread
  captainUnreadCount  Int      @default(0)  // Captain's unread ← FIX THIS

  lastMessageAt       DateTime?
  lastMessagePreview  String?
  lastMessageBy       String?

  @@index([ownerId, lastMessageAt])
}

model Message {
  id             String        @id @default(cuid())
  conversationId String
  senderId       String
  senderType     SenderType    // CAPTAIN | ANGLER | SYSTEM
  content        String        @db.Text
  status         MessageStatus // SENT | DELIVERED | READ
  readAt         DateTime?
  createdAt      DateTime      @default(now())
}
```

### Key Fields

- **`captainUnreadCount`**: Number of unread messages for captain
- **`anglerUnreadCount`**: Number of unread messages for angler
- **Message `status`**: Tracks if message is READ
- **`readAt`**: Timestamp when marked as read

---

## Existing Infrastructure

### fishon-market (Working)

✅ **API Endpoint**: `/api/conversations/:id/read`
✅ **Service Function**: `markAsRead(conversationId, userId)` in `message-service.ts`
✅ **Logic**:

```typescript
// Updates conversation
- Set anglerUnreadCount = 0 (if user is angler)
- Set captainUnreadCount = 0 (if user is owner)

// Updates messages
- Mark received messages as READ
- Set readAt timestamp

// Real-time sync
- Trigger Pusher event: message:read
```

### fishon-captain (Missing)

❌ **API Endpoint**: None - needs to be created
❌ **Hook Integration**: No-op function - needs implementation

---

## Implementation Plan

### Phase 1: Create API Endpoint

**File**: `/src/app/api/captain/conversations/[id]/read/route.ts`

**Requirements**:

1. Verify captain session (NextAuth)
2. Verify captain owns conversation (via charter ownership)
3. Call market DB directly via `prismaMarket` to update:
   - `captainUnreadCount = 0`
   - Mark received messages as `READ`
4. Trigger Pusher event for real-time sync
5. Return success response

**Pseudocode**:

```typescript
export async function PATCH(request, { params }) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return 401;

  const conversationId = params.id;

  // Fetch conversation
  const conversation = await prismaMarket.conversation.findUnique({
    where: { id: conversationId },
    include: { charter: true },
  });

  // Verify ownership
  if (conversation.charter.ownerId !== session.user.id) {
    return 403; // Forbidden
  }

  // Update conversation
  await prismaMarket.conversation.update({
    where: { id: conversationId },
    data: { captainUnreadCount: 0 },
  });

  // Mark messages as READ
  const readAt = new Date();
  await prismaMarket.message.updateMany({
    where: {
      conversationId,
      senderId: { not: session.user.id },
      status: { not: "READ" },
    },
    data: {
      status: "READ",
      readAt,
    },
  });

  // Trigger Pusher events
  // 1. message.read event for chat UI
  await pusher.trigger(
    `private-conversation.${conversationId}`,
    "message.read",
    {
      userId: session.user.id,
      readAt: readAt.toISOString(),
      conversationId,
    }
  );

  // 2. conversation.updated event for sidebar (CRITICAL for fixing unread count)
  await pusher.trigger(
    `private-user.${session.user.id}`,
    "conversation.updated",
    {
      conversationId,
      lastMessageAt: conversation.lastMessageAt?.toISOString(),
      lastMessagePreview: conversation.lastMessagePreview,
      captainUnreadCount: 0, // Reset to 0
    }
  );

  return NextResponse.json({ success: true });
}
```

**CRITICAL FIX**: The Pusher `conversation.updated` event is what updates the sidebar unread count in real-time. Without it, the sidebar shows stale data until page refresh.

### Phase 2: Update Hook

**File**: `/src/hooks/useConversation.ts`

**Changes**:

```typescript
// BEFORE (line 223):
const markAsRead = useCallback(async () => {
  // Captain app marks unread on conversation fetch server-side.
  // No-op here to avoid calling non-existent endpoints.
  return;
}, []);

// AFTER:
const markAsRead = useCallback(async () => {
  try {
    const response = await fetch(
      `/api/captain/conversations/${conversationId}/read`,
      { method: "PATCH" }
    );

    if (!response.ok) {
      console.error(
        "[useConversation] Failed to mark as read:",
        response.statusText
      );
      return;
    }

    console.log("[useConversation] Marked conversation as read");

    // Trigger router refresh to update unread counts in sidebar
    router.refresh();
  } catch (error) {
    console.error("[useConversation] Error marking as read:", error);
  }
}, [conversationId, router]);
```

### Phase 3: Verification

**Test Cases**:

1. ✅ Captain opens conversation with unread messages
2. ✅ Unread count badge disappears immediately
3. ✅ Refresh page - unread count still 0
4. ✅ Angler sends new message - unread count increments
5. ✅ Captain opens again - unread count clears
6. ✅ Multiple conversations - each tracks independently
7. ✅ Real-time sync via Pusher works correctly

---

## Security Considerations

### Authorization Checks

1. **Session validation**: Verify user is authenticated captain
2. **Ownership verification**: Ensure captain owns the charter for this conversation
3. **Rate limiting**: Apply rate limit (e.g., 30 requests/min)
4. **Error handling**: Don't leak sensitive info in error messages

### Database Access

- ✅ Captain has read-only access to market DB via `prismaMarket`
- ✅ Write operations limited to own conversations only
- ✅ Can't mark other captains' conversations as read

---

## Files to Modify

1. **CREATE**: `/src/app/api/captain/conversations/[id]/read/route.ts` (new endpoint)
2. **UPDATE**: `/src/hooks/useConversation.ts` (replace no-op markAsRead)
3. **UPDATE**: `/docs/config/CHAT_SYSTEM_CONFIGURATION.md` (mark issue #6 as fixed)

---

## References

- **Market API**: `/Users/jangbersahaja/Website/fishon-market/src/app/api/conversations/[id]/read/route.ts`
- **Market Service**: `/Users/jangbersahaja/Website/fishon-market/src/lib/services/message-service.ts` (line 337)
- **Captain Hook**: `/Users/jangbersahaja/Website/fishon-captain/src/hooks/useConversation.ts` (line 223)
- **Database Schema**: `/Users/jangbersahaja/Website/fishon-market/prisma/schema.prisma` (Conversation model)

---

## Expected Outcome

After implementation:

- ✅ Captain opens conversation → unread count immediately clears
- ✅ Unread count persists as 0 after page refresh
- ✅ Real-time updates work correctly
- ✅ Security: Only captain can mark their own conversations as read
- ✅ No impact on angler's unread counts (handled separately)

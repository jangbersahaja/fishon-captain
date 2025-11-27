# Staff Booking Management System - Implementation Plan

## Overview

This document outlines the plan to build a comprehensive booking management interface for staff/admin to monitor and manage all bookings across both fishon-market and fishon-captain applications.

## System Context

### Current Architecture

- **Booking Creation**: fishon-market (angler-facing app)
- **Booking Management**: fishon-captain (captain-facing app) via webhooks
- **Database**: Separate PostgreSQL databases (market + captain)
- **Synchronization**: Webhook-based sync between apps

### Booking System Features

- **Dual Flows**: MANUAL (approve-then-pay) and AUTO (pay-then-acknowledge)
- **Payment Methods**: CARD, FPX, EWALLET, MOCK
- **Payment Flows**: TOKENIZED (pre-auth) and DIRECT (immediate capture)
- **Statuses**: 8 states (PENDING, PAYMENT_AUTHORIZED, AWAITING_PAYMENT, PAID, REJECTED, CANCELLED, COMPLETED, EXPIRED, UNDER_REVIEW)
- **Guest Booking**: No authentication required
- **Auto Expiry**: Configurable timeouts per charter

## Goals

### Primary Objectives

1. **Unified View**: Single interface to view all bookings across the platform
2. **Efficient Filtering**: Quick access to bookings by status, flow type, date, charter, payment method
3. **Search Capability**: Find bookings by ID, guest name, or angler email
4. **Admin Actions**: Override/resolve booking issues, refunds, cancellations
5. **Audit Trail**: Track all admin interventions

### User Stories

- As a staff member, I want to see all pending bookings that require attention
- As an admin, I want to resolve payment issues manually
- As a staff member, I want to search for a specific booking by ID or guest name
- As an admin, I want to approve or reject bookings on behalf of captains in emergencies
- As a staff member, I want to see booking analytics and trends

## Database Schema Analysis

### Booking Model (fishon-market/prisma/schema.prisma)

```prisma
model Booking {
  // === MAIN DETAIL ===
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  expiresAt DateTime

  // === ANGLER'S DETAIL ===
  userId String // ANGLER or GUEST
  user   User   @relation(fields: [userId], references: [id])

  // === BOOKING DETAIL ===
  tripId    String
  charterId String
  date      DateTime
  days      Int
  startTime String?
  timeSlots Json?
  guests    Json // { adults, children, participants: [{name, phone, isBooker}] }

  // === PRICING BREAKDOWN ===
  tripPrice  Decimal
  discount   Json?
  tax        Json?
  finalPrice Decimal

  // === PROMO CODE ===
  promoCodeId String?
  promoCode   PromoCode?

  // === BOOKING STATUS ===
  status             BookingStatus @default(PENDING)
  cancellationReason String?
  rejectionReason    String?
  captainDecisionAt  DateTime?
  paidAt             DateTime?

  // === BOOKING FLOW ===
  bookingFlowType        BookingFlowType
  approvalDeadline       DateTime?
  paymentDeadline        DateTime?
  acknowledgmentDeadline DateTime?

  // === ADMIN REVIEW ===
  reviewRequestedBy      String?
  reviewRequestedAt      DateTime?
  reviewedBy             String?
  reviewedAt             DateTime?
  reviewNotes            String? @db.Text

  // === PAYMENT TRACKING ===
  paymentTransactionId String?
  paymentMethod        String?
  paymentFlow          String?
  paymentNote          String? @db.Text
  paymentIntentId      String?
  paymentAuthorizedAt  DateTime?
  paymentCapturedAt    DateTime?
  paymentReleasedAt    DateTime?

  // === FINANCIAL TRACKING ===
  platformFee      Decimal?
  serviceFee       Decimal?
  captainEarnings  Decimal?
  payoutStatus     PayoutStatus?
  payoutBatchId    String?

  // === REFUND TRACKING ===
  refundStatus         RefundStatus?
  refundAmount         Decimal?
  refundedAt           DateTime?
  refundReason         String? @db.Text
  refundedBy           String?
  refundTransactionId  String?
  cancellationPolicy   Json?

  // === CONVERSATION ===
  note            String?
  captainResponse String?
  chatId          String?
}
```

### Key Enums

```prisma
enum BookingStatus {
  PENDING              // Manual flow: awaiting captain approval
  AWAITING_PAYMENT     // Manual flow: approved, awaiting payment
  PAYMENT_AUTHORIZED   // Auto flow: payment held, awaiting acknowledgment
  PAID                 // Payment confirmed, trip confirmed
  UNDER_REVIEW         // Admin reviewing dispute
  COMPLETED            // Trip completed
  REJECTED             // Captain rejected
  CANCELLED            // Angler cancelled
  EXPIRED              // Deadline expired
}

enum BookingFlowType {
  MANUAL  // Request → Approval → Payment → Paid
  AUTO    // Payment → Acknowledgment → Paid
}

enum PayoutStatus {
  PENDING
  SCHEDULED
  PROCESSING
  COMPLETED
  FAILED
  ON_HOLD
}

enum RefundStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

## Implementation Plan

### Phase 1: Booking List Page (/staff/bookings)

#### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header: "Bookings" + Stats Summary                       │
├─────────────────────────────────────────────────────────┤
│ Filter Toolbar:                                          │
│ [Status ▼] [Flow Type ▼] [Date Range ▼]                │
│ [Charter ▼] [Payment Method ▼] [Search...]             │
├─────────────────────────────────────────────────────────┤
│ Booking Cards (or Table):                               │
│ ┌───────────────────────────────────────────────────┐  │
│ │ [Status Badge] Charter Name • Trip Name           │  │
│ │ Guest: John Doe • Date: Jan 15, 2025 • 3 days    │  │
│ │ RM 1,500 • CARD • Payment: PAID                   │  │
│ │ Booking ID: cm123abc • Created: 2 hours ago       │  │
│ │ [View Details]                                     │  │
│ └───────────────────────────────────────────────────┘  │
│ ... (more cards)                                         │
├─────────────────────────────────────────────────────────┤
│ Pagination: First «« 1 2 [3] 4 5 ... 20 »» Last        │
└─────────────────────────────────────────────────────────┘
```

#### Filter System

1. **Status Filter**: Dropdown with all BookingStatus values
   - All Bookings (default)
   - 🔴 Pending (requires action)
   - 🟡 Awaiting Payment
   - 🔵 Payment Authorized
   - 🟢 Paid
   - 📋 Under Review
   - ✅ Completed
   - ❌ Rejected
   - 🚫 Cancelled
   - ⏱️ Expired

2. **Flow Type Filter**: MANUAL, AUTO, All

3. **Date Range Filter**: Custom date picker or presets
   - Today
   - This Week
   - This Month
   - Last 30 Days
   - Last 90 Days
   - Custom Range

4. **Charter Filter**: Dropdown with all active charters (searchable)

5. **Payment Method Filter**: CARD, FPX, EWALLET, MOCK, All

6. **Search**: Text input for:
   - Booking ID (exact match)
   - Guest name (partial match)
   - Angler email (partial match)

#### Stats Summary (Top of Page)

```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
  <StatsCard title="Total Bookings" value={totalBookings} icon={Calendar} />
  <StatsCard
    title="Pending Actions"
    value={pendingCount}
    icon={AlertCircle}
    variant="warning"
  />
  <StatsCard
    title="Revenue (This Month)"
    value={`RM ${monthlyRevenue}`}
    icon={DollarSign}
    variant="success"
  />
  <StatsCard
    title="Completion Rate"
    value={`${completionRate}%`}
    icon={CheckCircle}
  />
</div>
```

#### Booking Card Component

```tsx
<Card>
  <CardHeader>
    <div className="flex items-start justify-between">
      <div>
        <BookingStatusBadge status={booking.status} />
        <h3 className="mt-2 font-semibold">{booking.charterName}</h3>
        <p className="text-sm text-muted-foreground">{booking.tripName}</p>
      </div>
      <Badge
        variant={booking.bookingFlowType === "MANUAL" ? "default" : "secondary"}
      >
        {booking.bookingFlowType}
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4" />
        <span>{booking.guestName || "Guest"}</span>
        {!booking.userId && (
          <Badge variant="outline" size="sm">
            Guest
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <span>
          {formatDate(booking.date)} • {booking.days} day(s)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4" />
        <span>
          RM {booking.finalPrice} • {booking.paymentMethod}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        ID: {booking.id} • Created: {formatRelativeTime(booking.createdAt)}
      </div>
    </div>
  </CardContent>
  <CardFooter>
    <Link href={`/staff/bookings/${booking.id}`}>
      <Button variant="outline" size="sm">
        View Details
      </Button>
    </Link>
    {booking.status === "PENDING" && <QuickActions bookingId={booking.id} />}
  </CardFooter>
</Card>
```

#### Pagination

Use the same comprehensive pagination pattern as `/staff/users`:

- First «« button
- Numbered pages (show current ± 2 pages)
- Ellipsis for gaps
- Last »» button
- All filters preserved in URL params

### Phase 2: Booking Detail Page (/staff/bookings/[id])

#### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Back to Bookings                                         │
├─────────────────────────────────────────────────────────┤
│ Header: Charter Name • [Status Badge] • [Flow Badge]    │
│ Booking ID: cm123abc • Created: Jan 15, 2025            │
├───────────────────────────────────┬─────────────────────┤
│ Left Column (2/3 width):          │ Right Column (1/3): │
│                                    │                     │
│ [Status Timeline Card]             │ [Admin Actions]     │
│ [Booking Details Card]             │ [Pricing Card]      │
│ [Guest Information Card]           │ [Customer Info]     │
│ [Trip Schedule Card]               │ [Payment Info]      │
│ [Payment Tracking Card]            │ [Audit Trail]       │
│ [Conversation Preview Card]        │                     │
│ [Admin Notes Card]                 │                     │
└───────────────────────────────────┴─────────────────────┘
```

#### Admin Actions Panel (Right Column)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Admin Actions</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* Context-aware actions based on status */}
    {status === "PENDING" && (
      <>
        <ForceApproveButton bookingId={id} />
        <ForceRejectButton bookingId={id} />
      </>
    )}

    {status === "PAYMENT_AUTHORIZED" && (
      <>
        <AcknowledgeButton bookingId={id} />
        <RefundButton bookingId={id} />
      </>
    )}

    {status === "AWAITING_PAYMENT" && (
      <>
        <MarkAsPaidButton bookingId={id} />
        <CancelBookingButton bookingId={id} />
      </>
    )}

    {status === "PAID" && (
      <>
        <MarkAsCompletedButton bookingId={id} />
        <InitiateRefundButton bookingId={id} />
      </>
    )}

    {/* Always available */}
    <Separator />
    <ForceStatusChange bookingId={id} currentStatus={status} />
    <ViewAuditLog bookingId={id} />
  </CardContent>
</Card>
```

#### Status Timeline Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Status Timeline</CardTitle>
  </CardHeader>
  <CardContent>
    <Timeline>
      <TimelineItem
        icon={CheckCircle}
        title="Booking Created"
        timestamp={booking.createdAt}
        description="Guest created booking request"
      />
      {booking.captainDecisionAt && (
        <TimelineItem
          icon={status === "REJECTED" ? XCircle : CheckCircle}
          title={status === "REJECTED" ? "Rejected" : "Approved"}
          timestamp={booking.captainDecisionAt}
          description={booking.rejectionReason || "Captain approved booking"}
        />
      )}
      {booking.paidAt && (
        <TimelineItem
          icon={DollarSign}
          title="Payment Confirmed"
          timestamp={booking.paidAt}
          description={`${booking.paymentMethod} - ${booking.paymentTransactionId}`}
        />
      )}
      {/* Admin interventions */}
      {booking.reviewedAt && (
        <TimelineItem
          icon={Shield}
          title="Admin Review"
          timestamp={booking.reviewedAt}
          description={booking.reviewNotes}
          isAdmin={true}
        />
      )}
    </Timeline>
  </CardContent>
</Card>
```

#### Booking Details Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Booking Details</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <DetailRow icon={Ship} label="Charter" value={booking.charterName} />
    <DetailRow icon={MapPin} label="Trip" value={booking.tripName} />
    <DetailRow icon={Calendar} label="Date" value={formatDate(booking.date)} />
    <DetailRow icon={Clock} label="Duration" value={`${booking.days} day(s)`} />
    {booking.timeSlots && (
      <div>
        <p className="text-sm font-medium">Trip Schedule</p>
        {booking.formattedTimeSlots.map((slot, i) => (
          <div key={i} className="text-sm text-muted-foreground">
            {slot}
          </div>
        ))}
      </div>
    )}
    <DetailRow
      icon={Users}
      label="Guests"
      value={`${booking.adults} adults, ${booking.children} children`}
    />
    {booking.allParticipants && (
      <div>
        <p className="text-sm font-medium">Participants</p>
        {booking.allParticipants.map((p, i) => (
          <div key={i} className="text-sm">
            {p.name} {p.phone && `• ${p.phone}`}{" "}
            {p.isBooker && <Badge>Booker</Badge>}
          </div>
        ))}
      </div>
    )}
    {booking.note && (
      <div>
        <p className="text-sm font-medium">Guest Note</p>
        <p className="text-sm text-muted-foreground">{booking.note}</p>
      </div>
    )}
  </CardContent>
</Card>
```

#### Payment Tracking Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Payment Tracking</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-muted-foreground">Method</p>
        <p className="font-medium">{booking.paymentMethod || "N/A"}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Flow</p>
        <p className="font-medium">{booking.paymentFlow || "N/A"}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Transaction ID</p>
        <p className="font-mono text-xs">
          {booking.paymentTransactionId || "N/A"}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Status</p>
        <Badge>{booking.status}</Badge>
      </div>
    </div>

    {booking.paymentAuthorizedAt && (
      <div className="p-3 border rounded-lg bg-muted/50">
        <p className="text-sm font-medium">Authorization Hold</p>
        <p className="text-xs text-muted-foreground">
          Authorized: {formatDateTime(booking.paymentAuthorizedAt)}
        </p>
      </div>
    )}

    {booking.paymentCapturedAt && (
      <div className="p-3 border rounded-lg bg-green-50">
        <p className="text-sm font-medium text-green-800">Payment Captured</p>
        <p className="text-xs text-green-600">
          Captured: {formatDateTime(booking.paymentCapturedAt)}
        </p>
      </div>
    )}

    {booking.refundStatus && (
      <div className="p-3 border rounded-lg bg-red-50">
        <p className="text-sm font-medium text-red-800">
          Refund: {booking.refundStatus}
        </p>
        <p className="text-xs text-red-600">
          Amount: RM {booking.refundAmount}
        </p>
        {booking.refundReason && (
          <p className="mt-1 text-xs text-red-600">{booking.refundReason}</p>
        )}
      </div>
    )}

    {booking.paymentNote && (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>Payment Note</AlertTitle>
        <AlertDescription>{booking.paymentNote}</AlertDescription>
      </Alert>
    )}
  </CardContent>
</Card>
```

#### Admin Notes Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Admin Notes</CardTitle>
  </CardHeader>
  <CardContent>
    <Textarea
      placeholder="Add internal notes about this booking..."
      value={adminNotes}
      onChange={(e) => setAdminNotes(e.target.value)}
    />
    <Button className="mt-3" onClick={saveAdminNotes}>
      Save Notes
    </Button>

    {booking.reviewNotes && (
      <div className="p-3 mt-4 border rounded-lg bg-muted/50">
        <p className="text-sm font-medium">Previous Review Notes</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.reviewNotes}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          By: {booking.reviewedBy} • {formatDateTime(booking.reviewedAt)}
        </p>
      </div>
    )}
  </CardContent>
</Card>
```

### Phase 3: Admin Actions (Server Actions)

#### Force Approve Booking

```typescript
"use server";

export async function forceApproveBooking(
  bookingId: string,
  adminPassword: string
) {
  // 1. Verify admin credentials
  const session = await getServerSession(authOptions);
  if (!session?.user || !["STAFF", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  // 2. Verify admin password
  const isValid = await verifyAdminPassword(session.user.id, adminPassword);
  if (!isValid) {
    throw new Error("Invalid admin password");
  }

  // 3. Call Market API to approve booking
  const response = await fetch(`${MARKET_API_URL}/api/bookings/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-captain-api-secret": process.env.CAPTAIN_API_SECRET,
      "x-admin-override": session.user.id,
    },
    body: JSON.stringify({ id: bookingId }),
  });

  if (!response.ok) {
    throw new Error("Failed to approve booking");
  }

  // 4. Log audit event
  await writeAuditLog({
    action: "FORCE_APPROVE_BOOKING",
    actorId: session.user.id,
    resourceType: "Booking",
    resourceId: bookingId,
    metadata: { timestamp: new Date().toISOString() },
  });

  revalidatePath(`/staff/bookings/${bookingId}`);
  return { success: true };
}
```

#### Force Reject Booking

```typescript
"use server";

export async function forceRejectBooking(
  bookingId: string,
  reason: string,
  adminPassword: string
) {
  // Similar structure to forceApproveBooking
  // 1. Verify admin credentials
  // 2. Verify admin password
  // 3. Call Market API with rejection reason
  // 4. Log audit event
  // 5. Revalidate path
}
```

#### Initiate Refund

```typescript
"use server";

export async function initiateRefund(
  bookingId: string,
  amount: number,
  reason: string,
  adminPassword: string
) {
  // 1. Verify admin credentials
  // 2. Verify admin password
  // 3. Call Market API refund endpoint
  // 4. Update booking with refund tracking
  // 5. Log audit event
  // 6. Send notification to customer
  // 7. Revalidate path
}
```

#### Mark As Completed

```typescript
"use server";

export async function markBookingCompleted(
  bookingId: string,
  adminPassword: string
) {
  // 1. Verify admin credentials
  // 2. Verify admin password
  // 3. Update booking status to COMPLETED
  // 4. Trigger payout processing (if configured)
  // 5. Log audit event
  // 6. Revalidate path
}
```

#### Force Status Change

```typescript
"use server";

export async function forceStatusChange(
  bookingId: string,
  newStatus: BookingStatus,
  reason: string,
  adminPassword: string
) {
  // Emergency override for any status change
  // 1. Verify admin credentials (ADMIN role only)
  // 2. Verify admin password
  // 3. Validate status transition
  // 4. Update booking status
  // 5. Log comprehensive audit event with reason
  // 6. Send notifications if needed
  // 7. Revalidate path
}
```

### Phase 4: Analytics Dashboard (Optional Enhancement)

#### Summary Cards

```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
  <StatsCard
    title="Total Bookings (30d)"
    value={stats.total}
    change={stats.totalChange}
    icon={Calendar}
  />
  <StatsCard
    title="Revenue (30d)"
    value={`RM ${stats.revenue.toFixed(2)}`}
    change={stats.revenueChange}
    icon={DollarSign}
    variant="success"
  />
  <StatsCard
    title="Pending Actions"
    value={stats.pending}
    icon={AlertCircle}
    variant="warning"
  />
  <StatsCard
    title="Completion Rate"
    value={`${stats.completionRate}%`}
    change={stats.completionRateChange}
    icon={CheckCircle}
  />
</div>
```

#### Charts

1. **Bookings Over Time** (Line Chart)
   - X-axis: Date
   - Y-axis: Booking count
   - Lines: Total, PAID, CANCELLED

2. **Status Distribution** (Pie Chart)
   - Segments: Each booking status
   - Show percentages

3. **Flow Type Breakdown** (Bar Chart)
   - MANUAL vs AUTO bookings
   - Grouped by week/month

4. **Payment Method Distribution** (Donut Chart)
   - CARD, FPX, EWALLET
   - Show amounts and percentages

#### Quick Filters for Urgent Actions

```tsx
<Card>
  <CardHeader>
    <CardTitle>Urgent Actions</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <UrgentActionLink
      label="Expiring Approvals"
      count={urgentStats.expiringApprovals}
      href="/staff/bookings?status=PENDING&expiring=true"
      icon={Clock}
    />
    <UrgentActionLink
      label="Payment Deadlines"
      count={urgentStats.paymentDeadlines}
      href="/staff/bookings?status=AWAITING_PAYMENT&deadline=soon"
      icon={CreditCard}
    />
    <UrgentActionLink
      label="Acknowledgment Pending"
      count={urgentStats.acknowledgmentPending}
      href="/staff/bookings?status=PAYMENT_AUTHORIZED"
      icon={CheckCircle}
    />
    <UrgentActionLink
      label="Under Review"
      count={urgentStats.underReview}
      href="/staff/bookings?status=UNDER_REVIEW"
      icon={AlertCircle}
    />
  </CardContent>
</Card>
```

## Technical Implementation Details

### Data Fetching Strategy

#### Market DB Access (fishon-captain reads fishon-market DB)

```typescript
// lib/market-db.ts - Already exists
export async function fetchAllBookings(filters: BookingFilters) {
  const { prismaMarket } = await import("@/lib/prisma-market");

  const where: Prisma.BookingWhereInput = {
    // Status filter
    ...(filters.status && { status: filters.status }),

    // Flow type filter
    ...(filters.flowType && { bookingFlowType: filters.flowType }),

    // Date range filter
    ...(filters.dateFrom && {
      date: { gte: filters.dateFrom },
    }),
    ...(filters.dateTo && {
      date: { lte: filters.dateTo },
    }),

    // Charter filter
    ...(filters.charterId && { charterId: filters.charterId }),

    // Payment method filter
    ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),

    // Search filter (booking ID, guest name)
    ...(filters.search && {
      OR: [
        { id: { contains: filters.search, mode: "insensitive" } },
        {
          guests: {
            path: ["participants"],
            array_contains: [{ name: { contains: filters.search } }],
          },
        },
      ],
    }),
  };

  const bookings = await prismaMarket.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit || 20,
    skip: filters.offset || 0,
  });

  return bookings;
}
```

### URL State Management

Use searchParams to preserve filter state:

```typescript
// Example URL:
// /staff/bookings?status=PENDING&flowType=MANUAL&dateFrom=2025-01-01&charterId=cm123&search=john&page=2

const searchParams = useSearchParams();
const status = searchParams.get("status");
const flowType = searchParams.get("flowType");
const dateFrom = searchParams.get("dateFrom");
const charterId = searchParams.get("charterId");
const search = searchParams.get("search");
const page = parseInt(searchParams.get("page") || "1");
```

### Pagination Implementation

```typescript
const ITEMS_PER_PAGE = 20;

export async function getBookingsWithPagination(
  filters: BookingFilters,
  page: number
) {
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const [bookings, totalCount] = await Promise.all([
    fetchAllBookings({ ...filters, limit: ITEMS_PER_PAGE, offset }),
    countBookings(filters),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return {
    bookings,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
```

### Admin Action Authorization

```typescript
// middleware.ts - Add booking routes to staff protection
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/staff/bookings")) {
    // Require STAFF or ADMIN role
    const session = await getServerSession(authOptions);
    if (!session?.user || !["STAFF", "ADMIN"].includes(session.user.role)) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }
}
```

### Admin Password Verification

```typescript
export async function verifyAdminPassword(
  userId: string,
  password: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user?.password) {
    return false;
  }

  return await bcrypt.compare(password, user.password);
}
```

### Audit Logging

```typescript
// Every admin action should log to AuditLog table
export async function writeAuditLog(params: {
  action: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      actorId: params.actorId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
      timestamp: new Date(),
    },
  });
}
```

## File Structure

```
fishon-captain/
├── src/
│   ├── app/
│   │   └── (admin)/
│   │       └── staff/
│   │           └── bookings/
│   │               ├── page.tsx                    # List page
│   │               ├── [id]/
│   │               │   └── page.tsx               # Detail page
│   │               └── _components/
│   │                   ├── BookingCard.tsx
│   │                   ├── BookingFilters.tsx
│   │                   ├── BookingSearch.tsx
│   │                   ├── BookingStatsCards.tsx
│   │                   ├── AdminActionsPanel.tsx
│   │                   ├── StatusTimeline.tsx
│   │                   ├── PaymentTracking.tsx
│   │                   ├── AdminNotesCard.tsx
│   │                   ├── ForceApproveButton.tsx
│   │                   ├── ForceRejectButton.tsx
│   │                   ├── InitiateRefundButton.tsx
│   │                   └── MarkCompletedButton.tsx
│   ├── lib/
│   │   ├── booking-service.ts                     # Existing service
│   │   ├── market-db.ts                           # Existing DB access
│   │   └── actions/
│   │       └── booking-admin-actions.ts           # Server actions
│   └── components/
│       └── staff/
│           └── bookings/
│               ├── BookingStatusBadge.tsx
│               └── BookingFlowBadge.tsx
└── docs/
    └── plan-staff-booking-management.md           # This file
```

## Migration Strategy

### Database Changes

No schema changes required! All necessary fields already exist in the Booking model:

- ✅ Admin review fields (reviewRequestedBy, reviewRequestedAt, reviewedBy, reviewedAt, reviewNotes)
- ✅ Payment tracking fields
- ✅ Refund tracking fields
- ✅ Financial tracking fields

### Navigation Update

Add "Bookings" link to staff navigation:

```tsx
// src/app/(admin)/staff/_components/StaffNav.tsx
const navItems = [
  { href: "/staff/overview", label: "Overview", icon: Home },
  { href: "/staff/users", label: "Users & Registrations", icon: Users },
  { href: "/staff/bookings", label: "Bookings", icon: Calendar }, // NEW
  { href: "/staff/charters", label: "Charters", icon: Ship },
  // ...
];
```

## Testing Checklist

### Unit Tests

- [ ] Booking filters work correctly (status, flow type, date range)
- [ ] Search functionality (ID, guest name, email)
- [ ] Pagination preserves filter state
- [ ] Admin action authorization checks
- [ ] Admin password verification
- [ ] Audit logging for all admin actions

### Integration Tests

- [ ] Staff can view all bookings
- [ ] Staff can filter and search bookings
- [ ] Admin can approve/reject bookings
- [ ] Admin can initiate refunds
- [ ] Admin can mark bookings as completed
- [ ] Admin actions trigger webhooks correctly
- [ ] Notifications sent to customers after admin actions
- [ ] Audit trail records all interventions

### UI/UX Tests

- [ ] Filters are intuitive and responsive
- [ ] Search provides instant feedback
- [ ] Pagination works smoothly
- [ ] Admin actions require confirmation
- [ ] Loading states display correctly
- [ ] Error messages are clear and helpful

## Future Enhancements

1. **Bulk Actions**: Select multiple bookings and perform batch operations
2. **Export**: Export booking data to CSV/Excel for reporting
3. **Advanced Analytics**: More detailed charts and metrics
4. **Automated Alerts**: Email/Slack notifications for urgent actions
5. **Dispute Resolution Workflow**: Structured process for handling disputes
6. **Integration with Support System**: Link bookings to support tickets
7. **Captain Communication**: Direct messaging with captains from booking detail page
8. **Review Management**: View and moderate reviews associated with bookings

## Success Metrics

- **Efficiency**: Staff can find any booking in < 10 seconds
- **Response Time**: Admin actions complete in < 2 seconds
- **Audit Coverage**: 100% of admin actions logged
- **Error Rate**: < 1% of admin actions fail
- **User Satisfaction**: Staff report improved booking management workflow

---

## Next Steps

1. ✅ **Plan Complete**: This document serves as the comprehensive plan
2. 🔄 **Phase 1**: Build booking list page with filters and search
3. ⏳ **Phase 2**: Build booking detail page with admin actions
4. ⏳ **Phase 3**: Implement server actions for admin operations
5. ⏳ **Phase 4**: Add analytics dashboard (optional)
6. ⏳ **Testing**: Comprehensive testing across all features
7. ⏳ **Documentation**: Update system docs with new admin tools

**Status**: Ready for implementation ✅

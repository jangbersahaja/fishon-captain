# Admin Finance Dashboard - Implementation Plan

**Created:** 2025-11-11  
**Status:** Planning  
**Apps Affected:** fishon-captain (admin UI), fishon-market (booking/payment data)

---

## Executive Summary

### Problem Statement

As the Fishon platform scales, manual financial management becomes unsustainable:

- **No centralized booking visibility:** Staff cannot see all bookings across captains
- **No revenue tracking:** Platform commission (10%) not calculated or tracked
- **No payout management:** Captain earnings paid manually without systematic tracking
- **No financial reporting:** Business metrics scattered across databases
- **No refund handling:** Cancellation refunds processed ad-hoc without audit trail

### Solution Overview

Build a **Staff Finance Dashboard** in the existing `/staff/*` admin area that provides:

1. **Booking Monitor** - Real-time view of all platform bookings with payment status
2. **Revenue Dashboard** - Platform metrics, commission tracking, earnings breakdown
3. **Payout System** - Automated payout calculations with approval workflow
4. **Refund Management** - Structured refund processing with audit logging

### Architecture Approach

- **Extend existing patterns:** Build on proven `/staff/*` infrastructure
- **Cross-database access:** Use established `prismaMarket` pattern for booking data
- **Role-based security:** ADMIN for write operations, STAFF for read-only
- **Audit everything:** Log all financial operations for compliance

---

## Phase 1: Admin Booking Monitor (Week 1-2)

### Goal

Give staff comprehensive visibility into all bookings across the platform with payment tracking.

### Database Schema Changes

**fishon-market DB** - Add financial tracking to Booking model:

```prisma
// prisma/schema.prisma
model Booking {
  // ... existing fields ...

  // Financial tracking (NEW)
  platformFee      Decimal?  @db.Decimal(10, 2)  // Fishon commission (10%)
  captainEarnings  Decimal?  @db.Decimal(10, 2)  // Captain net earnings (90%)

  // Payout tracking (NEW)
  payoutStatus     PayoutStatus?  @default(PENDING)
  payoutBatchId    String?                        // References Payout.batchId

  // Refund tracking (NEW)
  refundAmount     Decimal?  @db.Decimal(10, 2)
  refundedAt       DateTime?
  refundReason     String?   @db.Text
  refundedBy       String?   // Staff user ID
}

enum PayoutStatus {
  PENDING      // Payment received, payout not scheduled
  SCHEDULED    // Included in payout batch
  PROCESSING   // Bank transfer initiated
  COMPLETED    // Funds transferred
  FAILED       // Transfer failed
  ON_HOLD      // Flagged for review
}
```

**Migration:**

```bash
cd fishon-market
npx prisma migrate dev --name add_booking_financial_tracking
```

### Backend Implementation

#### 1. Finance Service Layer

**File:** `fishon-captain/src/lib/services/finance-service.ts`

```typescript
import { prismaMarket } from "@/lib/prisma-market";
import { Prisma } from "@prisma/client-market";

export type TimePeriod = "7d" | "30d" | "90d" | "1y" | "all";

export interface RevenueStats {
  totalRevenue: number; // Sum of finalPrice (PAID bookings)
  platformRevenue: number; // Sum of platformFee
  captainRevenue: number; // Sum of captainEarnings
  bookingCount: number; // Count of PAID bookings
  avgBookingValue: number; // Average finalPrice
  refundsIssued: number; // Sum of refundAmount
  pendingPayouts: number; // Sum where payoutStatus=PENDING
}

export interface BookingFinancial {
  id: string;
  charterId: string;
  charterName: string;
  ownerId: string;
  ownerName: string;
  anglerName: string;
  tripDate: Date;
  finalPrice: number;
  platformFee: number;
  captainEarnings: number;
  paymentMethod: string | null;
  paymentTransactionId: string | null;
  paidAt: Date | null;
  payoutStatus: string | null;
  refundAmount: number | null;
  createdAt: Date;
}

export async function getRevenueStats(
  period: TimePeriod
): Promise<RevenueStats> {
  const dateFilter = getPeriodFilter(period);

  const result = await prismaMarket.booking.aggregate({
    where: {
      status: "PAID",
      paidAt: dateFilter,
    },
    _sum: {
      finalPrice: true,
      platformFee: true,
      captainEarnings: true,
      refundAmount: true,
    },
    _count: true,
    _avg: {
      finalPrice: true,
    },
  });

  const pendingPayouts = await prismaMarket.booking.aggregate({
    where: {
      status: "PAID",
      payoutStatus: "PENDING",
    },
    _sum: {
      captainEarnings: true,
    },
  });

  return {
    totalRevenue: Number(result._sum.finalPrice || 0),
    platformRevenue: Number(result._sum.platformFee || 0),
    captainRevenue: Number(result._sum.captainEarnings || 0),
    bookingCount: result._count,
    avgBookingValue: Number(result._avg.finalPrice || 0),
    refundsIssued: Number(result._sum.refundAmount || 0),
    pendingPayouts: Number(pendingPayouts._sum.captainEarnings || 0),
  };
}

export async function getBookingsFinancial(filters?: {
  status?: string;
  payoutStatus?: string;
  ownerId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}): Promise<BookingFinancial[]> {
  // Build where clause
  const where: Prisma.BookingWhereInput = {};

  if (filters?.status) {
    where.status = filters.status as any;
  }

  if (filters?.payoutStatus) {
    where.payoutStatus = filters.payoutStatus as any;
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  // Fetch bookings from market DB
  const bookings = await prismaMarket.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100, // Paginate in production
  });

  // Extract unique charterIds and ownerIds
  const charterIds = [...new Set(bookings.map((b) => b.charterId))];
  const userIds = [
    ...new Set(bookings.map((b) => b.userId).filter(Boolean) as string[]),
  ];

  // Fetch charter data from captain DB
  const { prisma } = await import("@/lib/prisma");
  const charters = await prisma.charter.findMany({
    where: { id: { in: charterIds } },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Fetch angler data from market DB
  const anglers = await prismaMarket.marketUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });

  // Build lookup maps
  const charterMap = new Map(charters.map((c) => [c.id, c]));
  const anglerMap = new Map(anglers.map((a) => [a.id, a]));

  // Enrich bookings
  return bookings.map((booking) => {
    const charter = charterMap.get(booking.charterId);
    const angler = booking.userId ? anglerMap.get(booking.userId) : null;

    return {
      id: booking.id,
      charterId: booking.charterId,
      charterName: charter?.name || "Unknown Charter",
      ownerId: charter?.ownerId || "",
      ownerName: charter?.owner?.name || "Unknown Owner",
      anglerName:
        angler?.name || booking.guestFirstName
          ? `${booking.guestFirstName} ${booking.guestLastName}`.trim()
          : "Guest",
      tripDate: booking.date,
      finalPrice: Number(booking.finalPrice),
      platformFee: Number(booking.platformFee || 0),
      captainEarnings: Number(booking.captainEarnings || 0),
      paymentMethod: booking.paymentMethod,
      paymentTransactionId: booking.paymentTransactionId,
      paidAt: booking.paidAt,
      payoutStatus: booking.payoutStatus,
      refundAmount: booking.refundAmount ? Number(booking.refundAmount) : null,
      createdAt: booking.createdAt,
    };
  });
}

function getPeriodFilter(
  period: TimePeriod
): Prisma.DateTimeFilter | undefined {
  if (period === "all") return undefined;

  const now = new Date();
  const days =
    period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return { gte: startDate };
}

export async function calculateFinancials(booking: {
  finalPrice: number;
  charterId: string;
}): Promise<{ platformFee: number; captainEarnings: number }> {
  // Fetch charter pricing plan
  const { prisma } = await import("@/lib/prisma");
  const charter = await prisma.charter.findUnique({
    where: { id: booking.charterId },
    select: { pricingPlan: true },
  });

  // Commission rates by plan
  const commissionRate =
    charter?.pricingPlan === "GOLD"
      ? 0.05
      : charter?.pricingPlan === "SILVER"
        ? 0.08
        : 0.1; // BASIC

  const platformFee =
    Math.round(booking.finalPrice * commissionRate * 100) / 100;
  const captainEarnings = booking.finalPrice - platformFee;

  return { platformFee, captainEarnings };
}
```

#### 2. Update Payment Webhook to Calculate Financials

**File:** `fishon-market/src/app/api/payment/senangpay-callback/route.ts`

Add financial calculation when booking is marked PAID:

```typescript
// After verifying payment success
import { prismaCaptain } from "@/lib/database/prisma-captain";

// Fetch charter pricing plan
const charter = await prismaCaptain.charter.findUnique({
  where: { id: booking.charterId },
  select: { pricingPlan: true },
});

// Calculate financials
const commissionRate =
  charter?.pricingPlan === "GOLD"
    ? 0.05
    : charter?.pricingPlan === "SILVER"
      ? 0.08
      : 0.1; // BASIC

const finalPrice = Number(booking.finalPrice);
const platformFee = Math.round(finalPrice * commissionRate * 100) / 100;
const captainEarnings = finalPrice - platformFee;

// Update booking with financial data
const updated = await prisma.booking.update({
  where: { id: order_id },
  data: {
    status: "PAID",
    paidAt: new Date(),
    paymentTransactionId: transaction_id,
    paymentMethod: "SENANGPAY",
    paymentNote: msg,
    platformFee,
    captainEarnings,
    payoutStatus: "PENDING",
  },
});
```

### Frontend Implementation

#### 1. Staff Finance Dashboard

**File:** `fishon-captain/src/app/(admin)/staff/finance/page.tsx`

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import { getRevenueStats } from "@/lib/services/finance-service";
import { MetricCard } from "../_components/MetricCard";
import { RevenueChart } from "../_components/RevenueChart";

export const dynamic = "force-dynamic";

export default async function StaffFinancePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/finance");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  // Fetch revenue stats
  const stats30d = await getRevenueStats("30d");
  const stats7d = await getRevenueStats("7d");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Finance Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Platform revenue, commissions, and payout tracking
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue (30d)"
          value={`RM ${stats30d.totalRevenue.toLocaleString()}`}
          change={calculateChange(stats30d.totalRevenue, stats7d.totalRevenue)}
          icon="💰"
        />

        <MetricCard
          title="Platform Commission"
          value={`RM ${stats30d.platformRevenue.toLocaleString()}`}
          subtitle={`${((stats30d.platformRevenue / stats30d.totalRevenue) * 100).toFixed(1)}% avg rate`}
          icon="📊"
        />

        <MetricCard
          title="Pending Payouts"
          value={`RM ${stats30d.pendingPayouts.toLocaleString()}`}
          subtitle="Awaiting processing"
          icon="⏳"
          alert={stats30d.pendingPayouts > 10000}
        />

        <MetricCard
          title="Bookings (30d)"
          value={stats30d.bookingCount.toString()}
          subtitle={`RM ${stats30d.avgBookingValue.toFixed(0)} avg`}
          icon="📅"
        />
      </div>

      {/* Revenue Chart */}
      <RevenueChart period="30d" />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/staff/finance/bookings"
          className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <h3 className="font-semibold text-slate-900">All Bookings</h3>
          <p className="text-sm text-slate-600 mt-1">
            View and filter all platform bookings
          </p>
        </a>

        <a
          href="/staff/finance/payouts"
          className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <h3 className="font-semibold text-slate-900">Payout Queue</h3>
          <p className="text-sm text-slate-600 mt-1">
            Process captain earnings
          </p>
        </a>

        <a
          href="/staff/finance/reports"
          className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <h3 className="font-semibold text-slate-900">Reports</h3>
          <p className="text-sm text-slate-600 mt-1">Export financial data</p>
        </a>
      </div>
    </div>
  );
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
```

#### 2. Staff Bookings List

**File:** `fishon-captain/src/app/(admin)/staff/finance/bookings/page.tsx`

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import { getBookingsFinancial } from "@/lib/services/finance-service";
import { BookingTable } from "../../_components/BookingTable";
import { BookingFilters } from "../../_components/BookingFilters";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    payoutStatus?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function StaffBookingsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user)
    redirect("/auth?mode=signin&next=/staff/finance/bookings");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const params = await searchParams;

  // Parse filters
  const filters = {
    status: params.status,
    payoutStatus: params.payoutStatus,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
  };

  // Fetch bookings
  const bookings = await getBookingsFinancial(filters);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">All Bookings</h1>
        <p className="text-sm text-slate-600 mt-1">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <BookingFilters />

      <BookingTable bookings={bookings} />
    </div>
  );
}
```

#### 3. Reusable Components

**File:** `fishon-captain/src/app/(admin)/staff/_components/MetricCard.tsx`

```tsx
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon?: string;
  alert?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  alert,
}: MetricCardProps) {
  return (
    <div
      className={`p-4 border rounded-lg ${alert ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      {change !== undefined && (
        <div className="mt-2">
          <span
            className={`text-xs font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
```

**File:** `fishon-captain/src/app/(admin)/staff/_components/BookingTable.tsx`

```tsx
"use client";

import Link from "next/link";
import type { BookingFinancial } from "@/lib/services/finance-service";

interface BookingTableProps {
  bookings: BookingFinancial[];
}

export function BookingTable({ bookings }: BookingTableProps) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
              Booking ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
              Charter
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
              Angler
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
              Trip Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">
              Revenue
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">
              Commission
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">
              Captain
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-600">
              Payout
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-mono text-slate-600">
                {booking.id.substring(0, 8)}...
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {booking.charterName}
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {booking.anglerName}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {new Date(booking.tripDate).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                RM {booking.finalPrice.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-right text-slate-600">
                RM {booking.platformFee.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-right text-slate-600">
                RM {booking.captainEarnings.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-center">
                <PayoutStatusBadge status={booking.payoutStatus} />
              </td>
              <td className="px-4 py-3 text-center">
                <Link
                  href={`/staff/finance/bookings/${booking.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayoutStatusBadge({ status }: { status: string | null }) {
  const colors = {
    PENDING: "bg-amber-100 text-amber-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    ON_HOLD: "bg-slate-100 text-slate-800",
  };

  const color = status
    ? colors[status as keyof typeof colors]
    : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${color}`}
    >
      {status || "N/A"}
    </span>
  );
}
```

#### 4. Update Staff Navigation

**File:** `fishon-captain/src/app/(admin)/staff/_components/StaffNav.tsx`

Add Finance link:

```tsx
import { DollarSign } from "lucide-react";

const links = [
  { href: "/staff", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/staff/registrations", label: "Registrations", Icon: Users },
  { href: "/staff/verification", label: "Verification", Icon: IdCard },
  { href: "/staff/charters", label: "Charters", Icon: Anchor },
  { href: "/staff/finance", label: "Finance", Icon: DollarSign }, // NEW
  { href: "/staff/media", label: "Media", Icon: ImageIcon },
  { href: "/staff/security", label: "Security", Icon: Shield },
];
```

### API Endpoints

#### 1. Export Bookings CSV

**File:** `fishon-captain/src/app/api/admin/finance/bookings/export/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { getBookingsFinancial } from "@/lib/services/finance-service";
import { rateLimit } from "@/lib/rateLimiter";

export async function GET(req: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit
  const { allowed } = await rateLimit({
    key: `admin:finance:export:${session.user.id}`,
    windowMs: 60000,
    max: 3,
  });

  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Parse filters
  const { searchParams } = new URL(req.url);
  const filters = {
    status: searchParams.get("status") || undefined,
    payoutStatus: searchParams.get("payoutStatus") || undefined,
    startDate: searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined,
    endDate: searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined,
  };

  // Fetch bookings
  const bookings = await getBookingsFinancial(filters);

  // Generate CSV
  const csv = [
    "Booking ID,Charter,Owner,Angler,Trip Date,Revenue,Commission,Captain Earnings,Payout Status,Payment Method,Transaction ID,Paid At",
    ...bookings.map((b) =>
      [
        b.id,
        `"${b.charterName}"`,
        `"${b.ownerName}"`,
        `"${b.anglerName}"`,
        b.tripDate.toISOString().split("T")[0],
        b.finalPrice,
        b.platformFee,
        b.captainEarnings,
        b.payoutStatus || "",
        b.paymentMethod || "",
        b.paymentTransactionId || "",
        b.paidAt ? b.paidAt.toISOString() : "",
      ].join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="bookings-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
```

### Testing Checklist

- [ ] Revenue stats calculation matches manual sum
- [ ] Commission rates correct by pricing plan (BASIC 10%, SILVER 8%, GOLD 5%)
- [ ] Cross-database join returns correct charter/captain data
- [ ] Filters work correctly (status, date range, payout status)
- [ ] CSV export includes all bookings
- [ ] Rate limiting prevents abuse
- [ ] Staff role can access, Captain role cannot
- [ ] Mobile responsive layout

### Migration Commands

```bash
# 1. Add financial fields to Booking model
cd fishon-market
npx prisma migrate dev --name add_booking_financial_tracking
npx prisma generate

# 2. Backfill existing PAID bookings with financials
# Run script: scripts/backfill-booking-financials.ts

# 3. Deploy to staging
vercel --prod --scope=fishon-market
vercel --prod --scope=fishon-captain

# 4. Test in staging
# 5. Deploy to production
```

---

## Phase 2: Payout Management (Week 3-4)

### Goal

Automate payout calculations and provide approval workflow for transferring captain earnings.

### Database Schema Changes

**fishon-captain DB** - Add Payout model:

```prisma
// prisma/schema.prisma

model Payout {
  id            String        @id @default(cuid())
  batchId       String        @unique  // e.g., "2025-W46"

  // Owner (captain who receives payment)
  ownerId       String
  owner         User          @relation("OwnerPayouts", fields: [ownerId], references: [id])

  // Period
  periodStart   DateTime
  periodEnd     DateTime

  // Amounts
  totalEarnings Decimal       @db.Decimal(10, 2)  // Sum of captainEarnings
  deductions    Decimal       @db.Decimal(10, 2)  @default(0)  // Chargebacks, fees
  netPayout     Decimal       @db.Decimal(10, 2)  // totalEarnings - deductions

  // Bookings included
  bookingIds    String[]      // Array of booking IDs
  bookingCount  Int

  // Bank details (snapshot)
  bankName      String
  accountNumber String
  accountHolder String

  // Status
  status        PayoutStatus  @default(PENDING)

  // Processing
  scheduledAt   DateTime?
  processedAt   DateTime?
  completedAt   DateTime?
  failureReason String?
  transferReference String?     // Bank transaction ID

  // Audit
  createdBy     String        // Staff user ID
  approvedBy    String?       // Admin user ID
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([ownerId, status])
  @@index([batchId])
  @@index([status, scheduledAt])
}

enum PayoutStatus {
  PENDING      // Created, awaiting approval
  APPROVED     // Approved, awaiting processing
  PROCESSING   // Bank transfer initiated
  COMPLETED    // Funds transferred successfully
  FAILED       // Transfer failed
  CANCELLED    // Cancelled by admin
}

// Add relation to User model
model User {
  // ... existing fields ...
  payouts Payout[] @relation("OwnerPayouts")
}
```

**fishon-market DB** - Update Booking to reference payout:

```prisma
model Booking {
  // ... existing fields ...
  payoutBatchId String?  // References Payout.batchId in captain DB
}
```

**Migration:**

```bash
cd fishon-captain
npx prisma migrate dev --name add_payout_model

cd fishon-market
npx prisma migrate dev --name add_payout_batch_reference
```

### Backend Implementation

#### 1. Extend Finance Service

**File:** `fishon-captain/src/lib/services/finance-service.ts`

Add payout functions:

```typescript
import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";
import { writeAuditLog } from "@/server/audit";

export interface PayoutCalculation {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  totalEarnings: number;
  bookingCount: number;
  bookingIds: string[];
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
}

export async function calculatePendingPayouts(): Promise<PayoutCalculation[]> {
  // Fetch all PAID bookings with PENDING payout status
  const bookings = await prismaMarket.booking.findMany({
    where: {
      status: "PAID",
      payoutStatus: "PENDING",
      captainEarnings: { not: null },
    },
    select: {
      id: true,
      charterId: true,
      captainEarnings: true,
    },
  });

  if (bookings.length === 0) return [];

  // Extract unique charter IDs
  const charterIds = [...new Set(bookings.map((b) => b.charterId))];

  // Fetch charter owners from captain DB
  const charters = await prisma.charter.findMany({
    where: { id: { in: charterIds } },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          verification: {
            select: {
              bankName: true,
              bankAccountNumber: true,
              bankAccountHolder: true,
            },
          },
        },
      },
    },
  });

  // Build owner lookup
  const ownerMap = new Map(charters.map((c) => [c.id, c.owner]));

  // Group bookings by owner
  const ownerBookings = new Map<string, typeof bookings>();

  for (const booking of bookings) {
    const owner = ownerMap.get(booking.charterId);
    if (!owner) continue;

    if (!ownerBookings.has(owner.id)) {
      ownerBookings.set(owner.id, []);
    }
    ownerBookings.get(owner.id)!.push(booking);
  }

  // Calculate payouts
  const payouts: PayoutCalculation[] = [];

  for (const [ownerId, ownerBookingList] of ownerBookings) {
    const owner = charters.find((c) => c.owner?.id === ownerId)?.owner;
    if (!owner) continue;

    const totalEarnings = ownerBookingList.reduce(
      (sum, b) => sum + Number(b.captainEarnings || 0),
      0
    );

    payouts.push({
      ownerId,
      ownerName: owner.name || "Unknown",
      ownerEmail: owner.email,
      totalEarnings,
      bookingCount: ownerBookingList.length,
      bookingIds: ownerBookingList.map((b) => b.id),
      bankName: owner.verification?.bankName || null,
      accountNumber: owner.verification?.bankAccountNumber || null,
      accountHolder: owner.verification?.bankAccountHolder || null,
    });
  }

  // Sort by total earnings (highest first)
  return payouts.sort((a, b) => b.totalEarnings - a.totalEarnings);
}

export async function createPayoutBatch(
  calculations: PayoutCalculation[],
  createdBy: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ batchId: string; payouts: any[] }> {
  const batchId = generateBatchId(periodStart);
  const payouts = [];

  for (const calc of calculations) {
    // Validate bank details
    if (!calc.bankName || !calc.accountNumber || !calc.accountHolder) {
      throw new Error(`Missing bank details for owner ${calc.ownerId}`);
    }

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        batchId: `${batchId}-${calc.ownerId.substring(0, 8)}`,
        ownerId: calc.ownerId,
        periodStart,
        periodEnd,
        totalEarnings: calc.totalEarnings,
        deductions: 0,
        netPayout: calc.totalEarnings,
        bookingIds: calc.bookingIds,
        bookingCount: calc.bookingCount,
        bankName: calc.bankName,
        accountNumber: calc.accountNumber,
        accountHolder: calc.accountHolder,
        status: "PENDING",
        createdBy,
      },
    });

    // Update bookings to reference batch
    await prismaMarket.booking.updateMany({
      where: { id: { in: calc.bookingIds } },
      data: {
        payoutStatus: "SCHEDULED",
        payoutBatchId: payout.batchId,
      },
    });

    // Audit log
    await writeAuditLog({
      actorUserId: createdBy,
      entityType: "payout",
      entityId: payout.id,
      action: "payout_created",
      after: payout,
    });

    payouts.push(payout);
  }

  return { batchId, payouts };
}

export async function approvePayout(
  payoutId: string,
  approvedBy: string
): Promise<void> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    throw new Error("Payout not found");
  }

  if (payout.status !== "PENDING") {
    throw new Error(`Cannot approve payout with status ${payout.status}`);
  }

  // Update payout
  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "APPROVED",
      approvedBy,
      scheduledAt: new Date(),
    },
  });

  // Audit log
  await writeAuditLog({
    actorUserId: approvedBy,
    entityType: "payout",
    entityId: payoutId,
    action: "payout_approved",
    before: payout,
    after: updated,
  });
}

export async function markPayoutCompleted(
  payoutId: string,
  transferReference: string,
  completedBy: string
): Promise<void> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    throw new Error("Payout not found");
  }

  if (payout.status !== "APPROVED" && payout.status !== "PROCESSING") {
    throw new Error(`Cannot complete payout with status ${payout.status}`);
  }

  // Update payout
  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "COMPLETED",
      transferReference,
      processedAt:
        payout.status === "APPROVED" ? new Date() : payout.processedAt,
      completedAt: new Date(),
    },
  });

  // Update bookings
  await prismaMarket.booking.updateMany({
    where: { id: { in: payout.bookingIds } },
    data: { payoutStatus: "COMPLETED" },
  });

  // Audit log
  await writeAuditLog({
    actorUserId: completedBy,
    entityType: "payout",
    entityId: payoutId,
    action: "payout_completed",
    before: payout,
    after: updated,
  });
}

function generateBatchId(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
```

### Frontend Implementation

#### 1. Payout Queue Page

**File:** `fishon-captain/src/app/(admin)/staff/finance/payouts/page.tsx`

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import { calculatePendingPayouts } from "@/lib/services/finance-service";
import { PayoutTable } from "../../_components/PayoutTable";
import { CreatePayoutBatchButton } from "../../_components/CreatePayoutBatchButton";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/finance/payouts");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const pendingPayouts = await calculatePendingPayouts();
  const totalPending = pendingPayouts.reduce(
    (sum, p) => sum + p.totalEarnings,
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Payout Queue
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {pendingPayouts.length} captain
            {pendingPayouts.length !== 1 ? "s" : ""} awaiting payout · RM{" "}
            {totalPending.toLocaleString()} total
          </p>
        </div>

        {role === "ADMIN" && pendingPayouts.length > 0 && (
          <CreatePayoutBatchButton payouts={pendingPayouts} />
        )}
      </div>

      {pendingPayouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600">No pending payouts</p>
        </div>
      ) : (
        <PayoutTable payouts={pendingPayouts} />
      )}
    </div>
  );
}
```

#### 2. Create Payout Batch (Server Action)

**File:** `fishon-captain/src/app/(admin)/staff/finance/payouts/actions.ts`

```typescript
"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import authOptions from "@/lib/auth";
import {
  createPayoutBatch,
  type PayoutCalculation,
} from "@/lib/services/finance-service";

export async function createPayoutBatchAction(
  payouts: PayoutCalculation[],
  periodStart: string,
  periodEnd: string
): Promise<{ success: boolean; error?: string; batchId?: string }> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user?.id || role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const { batchId } = await createPayoutBatch(
      payouts,
      session.user.id,
      new Date(periodStart),
      new Date(periodEnd)
    );

    revalidatePath("/staff/finance/payouts");
    revalidatePath("/staff/finance");

    return { success: true, batchId };
  } catch (error) {
    console.error("Failed to create payout batch:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create payout batch",
    };
  }
}
```

### API Endpoints

#### 1. Approve Payout

**File:** `fishon-captain/src/app/api/admin/finance/payouts/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { approvePayout } from "@/lib/services/finance-service";
import { rateLimit } from "@/lib/rateLimiter";
import { applySecurityHeaders } from "@/lib/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return applySecurityHeaders(
      NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    );
  }

  const { allowed } = await rateLimit({
    key: `admin:payout:approve:${session.user.id}`,
    windowMs: 60000,
    max: 10,
  });

  if (!allowed) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
  }

  const { id } = await params;

  try {
    await approvePayout(id, session.user.id);

    return applySecurityHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("Failed to approve payout:", error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to approve payout",
        },
        { status: 500 }
      )
    );
  }
}
```

### Testing Checklist

- [ ] Pending payouts calculated correctly
- [ ] Payout batch creation updates booking statuses
- [ ] Only ADMIN can create/approve payouts
- [ ] Audit logs written for all payout actions
- [ ] Bank details validation prevents missing data
- [ ] CSV export for bank bulk transfer
- [ ] Idempotency prevents duplicate payouts

---

## Phase 3: Financial Reporting (Week 5-6)

### Goal

Provide comprehensive reports for accounting, tax compliance, and business insights.

### Implementation Summary

1. **Revenue Reports**
   - Daily/weekly/monthly/annual summaries
   - Commission breakdown by pricing plan
   - Top-performing charters
   - Payment method distribution

2. **Reconciliation Tool**
   - Upload Senang Pay settlement CSV
   - Auto-match transactions to bookings
   - Flag discrepancies for review

3. **Export Capabilities**
   - PDF reports for accounting
   - Excel exports with formulas
   - Email scheduled reports

_(Detailed implementation in separate document if needed)_

---

## Phase 4: Refund & Dispute Management (Week 7-8)

### Goal

Streamline refund processing and dispute resolution with full audit trails.

### Database Schema Changes

```prisma
// fishon-market DB
model RefundRequest {
  id              String        @id @default(cuid())
  bookingId       String        @unique
  booking         Booking       @relation(fields: [bookingId], references: [id])

  requestedBy     String        // User ID (angler or staff)
  requestReason   String
  requestedAmount Decimal       @db.Decimal(10, 2)
  approvedAmount  Decimal?      @db.Decimal(10, 2)

  status          RefundStatus  @default(PENDING)

  processedBy     String?       // Staff user ID
  processedAt     DateTime?
  refundReference String?       // Senang Pay refund ID

  anglerNote      String?       @db.Text
  captainNote     String?       @db.Text
  adminNotes      String?       @db.Text

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([bookingId])
  @@index([status])
}

enum RefundStatus {
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  REJECTED
  PARTIAL
}
```

### Implementation Summary

1. **Refund Request Form**
   - Angler can request refund from dashboard
   - Auto-approval for certain scenarios (captain cancellation, etc.)
   - Manual review for disputes

2. **Staff Refund Dashboard**
   - Queue of pending refund requests
   - Approve/reject with reason
   - Process refund via Senang Pay API

3. **Dispute Resolution**
   - Chat-like interface for angler-captain communication
   - Evidence upload (photos, screenshots)
   - Staff mediation workflow

_(Detailed implementation in separate document if needed)_

---

## Security Considerations

### Access Control

```typescript
// Role-based permissions matrix
const PERMISSIONS = {
  STAFF: {
    "finance:view": true,
    "finance:export": true,
    "payouts:view": true,
    "payouts:create": false,
    "payouts:approve": false,
    "refunds:view": true,
    "refunds:approve": false,
  },
  ADMIN: {
    "finance:view": true,
    "finance:export": true,
    "payouts:view": true,
    "payouts:create": true,
    "payouts:approve": true,
    "refunds:view": true,
    "refunds:approve": true,
  },
};
```

### Audit Requirements

All financial operations MUST be logged:

```typescript
// Before any mutation
await writeAuditLog({
  actorUserId: session.user.id,
  entityType: "payout" | "refund" | "booking",
  entityId: id,
  action: "created" | "approved" | "completed" | "rejected",
  before: originalState,
  after: newState,
  ip: req.headers.get("x-forwarded-for"),
  userAgent: req.headers.get("user-agent"),
});
```

### Rate Limiting

```typescript
// Financial endpoints have strict limits
const RATE_LIMITS = {
  "finance:export": { windowMs: 60000, max: 3 },
  "payout:create": { windowMs: 60000, max: 5 },
  "payout:approve": { windowMs: 60000, max: 10 },
  "refund:process": { windowMs: 60000, max: 10 },
};
```

---

## Deployment Strategy

### Staging Deployment (Week 1)

1. Deploy schema changes to staging databases
2. Run data backfill scripts
3. Deploy backend services
4. Deploy frontend UI
5. Test with production-like data
6. Performance testing (100+ concurrent requests)

### Production Rollout (Week 2)

1. **Phase 1a:** Deploy read-only dashboard (no write operations)
2. **Monitor:** 48 hours, check for performance issues
3. **Phase 1b:** Enable CSV exports
4. **Monitor:** 24 hours
5. **Phase 2a:** Deploy payout system (ADMIN-only)
6. **Manual Testing:** Process 1-2 test payouts
7. **Phase 2b:** Enable for all staff
8. **Monitor:** 1 week before next phase

### Monitoring & Alerts

```typescript
// Set up alerts for:
- Failed payout processing
- Discrepancy in revenue calculations
- Unusual refund volume
- API error rates > 1%
- Database query times > 5s
- Audit log write failures
```

---

## Success Metrics

### Phase 1 (Booking Monitor)

- [ ] Staff can view all bookings in < 2 seconds
- [ ] Commission calculations match manual audits (100% accuracy)
- [ ] CSV exports complete in < 30 seconds
- [ ] Zero unauthorized access attempts

### Phase 2 (Payouts)

- [ ] Payout creation time < 5 minutes for 50+ captains
- [ ] Zero duplicate payout processing
- [ ] 100% audit log coverage
- [ ] < 1% payout failures

### Phase 3 (Reporting)

- [ ] Reports generate in < 10 seconds
- [ ] Reconciliation matches 95%+ of transactions automatically
- [ ] Zero data export failures

### Phase 4 (Refunds)

- [ ] Average refund processing time < 24 hours
- [ ] 90%+ customer satisfaction with dispute resolution
- [ ] Zero payment processor disputes

---

## Future Enhancements

### Automated Payouts (Q1 2026)

- Integration with bank API for direct transfers
- Scheduled payout batches (weekly/bi-weekly)
- Split payments for multi-captain charters

### Advanced Analytics (Q2 2026)

- Revenue forecasting with ML
- Captain performance scoring
- Churn prediction

### Tax Compliance (Q2 2026)

- Automated 1099/tax form generation
- SST/VAT calculation and reporting
- Multi-currency support

---

## Appendix

### A. Database ERD

```
Booking (fishon-market)
├── id
├── finalPrice
├── platformFee ← NEW
├── captainEarnings ← NEW
├── payoutStatus ← NEW
├── payoutBatchId ← NEW (references Payout)
├── refundAmount ← NEW
└── refundedAt ← NEW

Payout (fishon-captain)
├── id
├── batchId
├── ownerId → User
├── totalEarnings
├── netPayout
├── bookingIds[]
├── status
└── createdBy → User
```

### B. API Endpoint Inventory

```
GET  /api/admin/finance/stats?period=30d
GET  /api/admin/finance/bookings?status=PAID&payoutStatus=PENDING
GET  /api/admin/finance/bookings/export
POST /api/admin/finance/payouts/create
POST /api/admin/finance/payouts/:id/approve
POST /api/admin/finance/payouts/:id/complete
GET  /api/admin/finance/reports/revenue
POST /api/admin/finance/refunds/:id/approve
```

### C. Environment Variables

```bash
# Required for Phase 1
MARKET_DATABASE_URL=postgresql://...   # Read-only connection to fishon-market DB

# Required for Phase 3 (Reporting)
SENANGPAY_MERCHANT_ID=xxx
SENANGPAY_SECRET_KEY=xxx

# Optional (for notifications)
SLACK_FINANCE_WEBHOOK=https://hooks.slack.com/...
EMAIL_FINANCE_ALERTS=finance@fishon.my
```

---

## Questions & Decisions

### Open Questions

1. **Payout Frequency:** Weekly or bi-weekly?
2. **Minimum Payout:** Threshold amount (e.g., RM 100) before processing?
3. **Commission Rates:** Finalize rates by pricing plan
4. **Bank Integration:** Which Malaysian bank API to use?
5. **Refund Policy:** Auto-approve under what conditions?

### Technical Decisions

1. ✅ **Use existing `prismaMarket` pattern** for cross-database access
2. ✅ **ADMIN-only for payout approval** (STAFF can view)
3. ✅ **Audit all financial mutations** with full before/after snapshots
4. ✅ **CSV export for bank transfers** (manual process initially)
5. ⏳ **Automated payout processing** - Phase 2 or future enhancement?

---

## Contact & Support

**Project Lead:** [Your Name]  
**Technical Lead:** [Developer Name]  
**Stakeholders:** Finance Team, Operations Team

**Documentation:** `/docs/finance-dashboard/`  
**Slack Channel:** `#project-finance-dashboard`  
**Issue Tracker:** GitHub Issues with `finance` label

---

_End of Implementation Plan_

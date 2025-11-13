# Captain Payout Page - Implementation Plan

**Created:** 2025-11-14  
**Status:** Planning  
**Apps Affected:** fishon-captain  
**Related:** admin-finance-dashboard-plan.md (Phase 2)

---

## Executive Summary

### Problem Statement

After implementing the admin finance dashboard with payout management, **captains have no visibility** into their earnings and payout status:

- **No earnings dashboard:** Captains cannot see how much they've earned
- **No payout tracking:** Captains don't know when they'll be paid or payout status
- **No transaction history:** No visibility into completed payouts
- **No bank verification:** Captains can't verify if their bank details are correct for payouts
- **Manual inquiries:** Captains must contact staff to ask about payment status

### Solution Overview

Build a **Captain Payout Page** at `/captain/payouts` that provides:

1. **Earnings Overview** - Total earnings, pending payouts, completed payouts
2. **Payout History** - List of all payouts with status tracking
3. **Booking Breakdown** - Which bookings are included in each payout
4. **Bank Account Info** - Display bank details (masked), link to documents page to update
5. **Payout Timeline** - Visual timeline of payout processing stages

### Key Principles

- **Read-only for captains:** Captains can view, not modify payouts (admin controls)
- **Transparency:** Clear explanation of commission rates and calculations
- **Reuse existing components:** Leverage admin finance components where possible
- **Mobile-first:** Optimized for mobile since captains use phones primarily

---

## Phase 1: Captain Earnings Dashboard (Week 1)

### Goal

Give captains visibility into their total earnings, pending payouts, and recent transactions.

### Backend Implementation

#### 1. Extend Finance Service for Captain View

**File:** `fishon-captain/src/lib/services/finance-service.ts`

Add captain-specific functions:

```typescript
/**
 * Get earnings summary for a specific captain/owner
 */
export interface CaptainEarningsSummary {
  totalEarnings: number; // All-time captain earnings
  totalEarningsThisMonth: number; // Current month
  totalEarningsLastMonth: number; // Previous month
  pendingPayout: number; // Earnings awaiting payout
  completedPayouts: number; // Total paid out
  nextPayoutDate: Date | null; // Estimated next payout
  bookingCount: number; // Total PAID bookings
  commissionRate: number; // Current commission rate (based on pricing plan)
}

export async function getCaptainEarningsSummary(
  ownerId: string
): Promise<CaptainEarningsSummary> {
  // Fetch captain's charters to determine pricing plan
  const charters = await prisma.charter.findMany({
    where: { ownerId },
    select: { pricingPlan: true },
  });

  // Determine lowest commission rate from all charters
  const commissionRate = charters.some((c) => c.pricingPlan === "GOLD")
    ? 0.05
    : charters.some((c) => c.pricingPlan === "SILVER")
      ? 0.08
      : 0.1; // BASIC

  // Fetch all bookings for this owner's charters
  const bookings = await getBookingsFinancial({
    ownerId,
    status: "PAID",
  });

  // Calculate current month boundaries
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Calculate metrics
  const totalEarnings = bookings.reduce((sum, b) => sum + b.captainEarnings, 0);

  const totalEarningsThisMonth = bookings
    .filter((b) => b.createdAt >= currentMonthStart)
    .reduce((sum, b) => sum + b.captainEarnings, 0);

  const totalEarningsLastMonth = bookings
    .filter((b) => b.createdAt >= lastMonthStart && b.createdAt <= lastMonthEnd)
    .reduce((sum, b) => sum + b.captainEarnings, 0);

  const pendingPayout = bookings
    .filter((b) => b.payoutStatus === "PENDING")
    .reduce((sum, b) => sum + b.captainEarnings, 0);

  // Fetch completed payouts
  const payouts = await prisma.payout.findMany({
    where: {
      ownerId,
      status: "COMPLETED",
    },
  });

  const completedPayouts = payouts.reduce(
    (sum, p) => sum + Number(p.netPayout),
    0
  );

  // Estimate next payout date (e.g., 1st of next month)
  const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    totalEarnings,
    totalEarningsThisMonth,
    totalEarningsLastMonth,
    pendingPayout,
    completedPayouts,
    nextPayoutDate: pendingPayout > 0 ? nextPayoutDate : null,
    bookingCount: bookings.length,
    commissionRate,
  };
}

/**
 * Get payout history for a captain
 */
export async function getCaptainPayoutHistory(ownerId: string) {
  return await prisma.payout.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get bookings for a specific captain with earnings data
 */
export async function getCaptainBookings(
  ownerId: string,
  filters?: {
    payoutStatus?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  return await getBookingsFinancial({
    ownerId,
    status: "PAID",
    ...filters,
  });
}
```

### Frontend Implementation

#### 1. Captain Payouts Page

**File:** `fishon-captain/src/app/(portal)/captain/payouts/page.tsx`

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import {
  getCaptainEarningsSummary,
  getCaptainPayoutHistory,
} from "@/lib/services/finance-service";
import { EarningsOverview } from "./_components/EarningsOverview";
import { PayoutHistoryList } from "./_components/PayoutHistoryList";
import { PendingEarningsCard } from "./_components/PendingEarningsCard";
import { BankInfoCard } from "./_components/BankInfoCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Earnings & Payouts | Fishon Captain",
  description: "Track your earnings and payout history",
};

export default async function CaptainPayoutsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/captain/payouts");
  }

  const userId = session.user.id;

  // Fetch earnings summary
  const earningsSummary = await getCaptainEarningsSummary(userId);

  // Fetch payout history (recent 10)
  const payoutHistory = await getCaptainPayoutHistory(userId);

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Earnings & Payouts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your earnings from bookings and manage payout details
        </p>
      </div>

      {/* Earnings Overview */}
      <EarningsOverview summary={earningsSummary} />

      {/* Pending Earnings Alert */}
      {earningsSummary.pendingPayout > 0 && (
        <PendingEarningsCard
          amount={earningsSummary.pendingPayout}
          nextPayoutDate={earningsSummary.nextPayoutDate}
        />
      )}

      {/* Bank Account Info */}
      <BankInfoCard userId={userId} />

      {/* Payout History */}
      <PayoutHistoryList payouts={payoutHistory} />
    </div>
  );
}
```

#### 2. Earnings Overview Component

**File:** `fishon-captain/src/app/(portal)/captain/payouts/_components/EarningsOverview.tsx`

```tsx
import { TrendingDown, TrendingUp } from "lucide-react";
import type { CaptainEarningsSummary } from "@/lib/services/finance-service";

interface EarningsOverviewProps {
  summary: CaptainEarningsSummary;
}

export function EarningsOverview({ summary }: EarningsOverviewProps) {
  const monthlyChange =
    summary.totalEarningsLastMonth > 0
      ? ((summary.totalEarningsThisMonth - summary.totalEarningsLastMonth) /
          summary.totalEarningsLastMonth) *
        100
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Earnings */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Total Earnings</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              RM {summary.totalEarnings.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
            <span className="text-2xl">💰</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          From {summary.bookingCount} booking
          {summary.bookingCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* This Month */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">This Month</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              RM {summary.totalEarningsThisMonth.toLocaleString()}
            </p>
          </div>
          {monthlyChange !== 0 && (
            <div
              className={`flex items-center gap-1 ${monthlyChange > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {monthlyChange > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {Math.abs(monthlyChange).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Last month: RM {summary.totalEarningsLastMonth.toLocaleString()}
        </p>
      </div>

      {/* Pending Payout */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Pending Payout</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">
              RM {summary.pendingPayout.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
            <span className="text-2xl">⏳</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {summary.nextPayoutDate
            ? `Next payout: ${summary.nextPayoutDate.toLocaleDateString("en-MY", { month: "short", day: "numeric" })}`
            : "No pending earnings"}
        </p>
      </div>

      {/* Completed Payouts */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Total Paid Out</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              RM {summary.completedPayouts.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
            <span className="text-2xl">✓</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Commission: {(summary.commissionRate * 100).toFixed(0)}% (
          {summary.commissionRate === 0.05
            ? "Gold"
            : summary.commissionRate === 0.08
              ? "Silver"
              : "Basic"}{" "}
          plan)
        </p>
      </div>
    </div>
  );
}
```

#### 3. Pending Earnings Card

**File:** `fishon-captain/src/app/(portal)/captain/payouts/_components/PendingEarningsCard.tsx`

```tsx
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface PendingEarningsCardProps {
  amount: number;
  nextPayoutDate: Date | null;
}

export function PendingEarningsCard({
  amount,
  nextPayoutDate,
}: PendingEarningsCardProps) {
  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg border-amber-200 bg-amber-50">
      <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-medium text-amber-900">
          RM {amount.toLocaleString()} pending payout
        </h3>
        <p className="mt-1 text-sm text-amber-700">
          {nextPayoutDate
            ? `Your earnings will be processed on ${nextPayoutDate.toLocaleDateString("en-MY", { month: "long", day: "numeric", year: "numeric" })}. `
            : "Your earnings are awaiting payout processing. "}
          Make sure your{" "}
          <Link
            href="/captain/documents"
            className="font-medium underline hover:text-amber-800"
          >
            bank details are up to date
          </Link>
          .
        </p>
        <div className="flex gap-2 mt-3">
          <Link
            href="/captain/payouts/pending"
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-md hover:bg-amber-50"
          >
            View Pending Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
```

#### 4. Bank Info Card

**File:** `fishon-captain/src/app/(portal)/captain/payouts/_components/BankInfoCard.tsx`

```tsx
import { Building2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface BankInfoCardProps {
  userId: string;
}

export async function BankInfoCard({ userId }: BankInfoCardProps) {
  const verification = await prisma.captainVerification.findUnique({
    where: { userId },
    select: {
      bankName: true,
      bankAccountNumber: true,
      bankAccountHolder: true,
    },
  });

  const hasBankDetails =
    verification?.bankName &&
    verification?.bankAccountNumber &&
    verification?.bankAccountHolder;

  return (
    <div
      className={`p-4 border rounded-lg ${hasBankDetails ? "border-slate-200 bg-white" : "border-red-200 bg-red-50"}`}
    >
      <div className="flex items-start gap-3">
        {hasBankDetails ? (
          <Building2 className="w-5 h-5 mt-0.5 text-slate-600 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h3
            className={`font-medium ${hasBankDetails ? "text-slate-900" : "text-red-900"}`}
          >
            {hasBankDetails ? "Bank Account Details" : "Bank Details Missing"}
          </h3>
          {hasBankDetails ? (
            <>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-medium">Bank:</span>{" "}
                  {verification.bankName}
                </p>
                <p>
                  <span className="font-medium">Account:</span>{" "}
                  {maskAccountNumber(verification.bankAccountNumber || "")}
                </p>
                <p>
                  <span className="font-medium">Holder:</span>{" "}
                  {verification.bankAccountHolder}
                </p>
              </div>
              <Link
                href="/captain/documents"
                className="inline-flex items-center mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Update Bank Details →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-red-700">
                You need to add your bank account details to receive payouts.
              </p>
              <Link
                href="/captain/documents"
                className="inline-flex items-center px-3 py-1.5 mt-3 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Add Bank Details
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  const masked = "*".repeat(accountNumber.length - 4);
  return `${masked}${last4}`;
}
```

#### 5. Payout History List

**File:** `fishon-captain/src/app/(portal)/captain/payouts/_components/PayoutHistoryList.tsx`

```tsx
import Link from "next/link";
import { format } from "date-fns";
import { Payout } from "@prisma/client";

interface PayoutHistoryListProps {
  payouts: Payout[];
}

export function PayoutHistoryList({ payouts }: PayoutHistoryListProps) {
  if (payouts.length === 0) {
    return (
      <div className="p-6 text-center bg-white border rounded-lg border-slate-200">
        <p className="text-slate-600">No payout history yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Your completed payouts will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Payout History</h2>
      <div className="overflow-hidden bg-white border rounded-lg border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                  Batch ID
                </th>
                <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                  Period
                </th>
                <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                  Amount
                </th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                  Bookings
                </th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm text-slate-600">
                    {payout.batchId}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {format(new Date(payout.periodStart), "MMM d")} -{" "}
                    {format(new Date(payout.periodEnd), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-slate-900">
                    RM {Number(payout.netPayout).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-slate-600">
                    {payout.bookingCount}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PayoutStatusBadge status={payout.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/captain/payouts/${payout.id}`}
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
      </div>
    </div>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const colors = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-slate-100 text-slate-800",
  };

  const labels = {
    PENDING: "Pending",
    APPROVED: "Approved",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
  };

  const color = colors[status as keyof typeof colors] || colors.PENDING;
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${color}`}
    >
      {label}
    </span>
  );
}
```

#### 6. Update Captain Navigation

**File:** `fishon-captain/src/app/(portal)/captain/nav.tsx`

Add Payouts link to Business section:

```tsx
import { DollarSign } from "lucide-react";

const navSections: NavSection[] = [
  // ... existing sections
  {
    label: "Business",
    links: [
      { href: "/captain/charters", label: "Charters", Icon: Ship },
      { href: "/captain/boats", label: "Boats", Icon: Ship },
      { href: "/captain/trips", label: "Trips", Icon: Calendar },
      { href: "/captain/bookings", label: "Bookings", Icon: Calendar },
      { href: "/captain/bookings/calendar", label: "Calendar", Icon: Calendar },
      { href: "/captain/payouts", label: "Payouts", Icon: DollarSign }, // NEW
      { href: "/captain/reviews", label: "Reviews", Icon: Star },
    ],
  },
  // ... rest of sections
];
```

---

## Phase 2: Payout Detail Page (Week 2)

### Goal

Provide detailed view of individual payouts with booking breakdown and timeline.

### Frontend Implementation

#### 1. Payout Detail Page

**File:** `fishon-captain/src/app/(portal)/captain/payouts/[id]/page.tsx`

```tsx
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import authOptions from "@/lib/auth";
import { getPayoutById } from "@/lib/services/finance-service";
import { PayoutTimeline } from "../_components/PayoutTimeline";
import { PayoutBookingList } from "../_components/PayoutBookingList";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayoutDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/auth?mode=signin&next=/captain/payouts/${id}`);
  }

  // Fetch payout details
  const payout = await getPayoutById(id);

  if (!payout) {
    notFound();
  }

  // Verify ownership
  if (payout.ownerId !== session.user.id) {
    redirect("/captain/payouts");
  }

  // Fetch bookings included in this payout
  const bookings = await getBookingsFinancial({
    ownerId: session.user.id,
  });

  const payoutBookings = bookings.filter((b) =>
    payout.bookingIds.includes(b.id)
  );

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Header */}
      <div>
        <Link
          href="/captain/payouts"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          ← Back to Payouts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Payout Details
        </h1>
        <p className="mt-1 font-mono text-sm text-slate-600">
          {payout.batchId}
        </p>
      </div>

      {/* Status & Amount */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-slate-600">Payout Amount</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              RM {Number(payout.netPayout).toLocaleString()}
            </p>
            {payout.deductions > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                (RM {Number(payout.totalEarnings).toLocaleString()} - RM{" "}
                {Number(payout.deductions).toLocaleString()} deductions)
              </p>
            )}
          </div>
          <PayoutStatusBadge status={payout.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-600">Period</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {format(new Date(payout.periodStart), "MMM d")} -{" "}
              {format(new Date(payout.periodEnd), "MMM d, yyyy")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Bookings</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {payout.bookingCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Bank</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {payout.bankName}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Account</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {maskAccountNumber(payout.accountNumber)}
            </p>
          </div>
        </div>

        {payout.transferReference && (
          <div className="pt-4 mt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600">Transfer Reference</p>
            <p className="mt-1 font-mono text-sm font-medium text-slate-900">
              {payout.transferReference}
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <PayoutTimeline payout={payout} />

      {/* Booking Breakdown */}
      <PayoutBookingList bookings={payoutBookings} />
    </div>
  );
}
```

#### 2. Payout Timeline Component

**File:** `fishon-captain/src/app/(portal)/captain/payouts/_components/PayoutTimeline.tsx`

```tsx
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Payout } from "@prisma/client";

interface PayoutTimelineProps {
  payout: Payout;
}

export function PayoutTimeline({ payout }: PayoutTimelineProps) {
  const steps = [
    {
      label: "Payout Created",
      date: payout.createdAt,
      completed: true,
    },
    {
      label: "Approved",
      date: payout.scheduledAt,
      completed: payout.status !== "PENDING",
    },
    {
      label: "Processing",
      date: payout.processedAt,
      completed:
        payout.status === "PROCESSING" || payout.status === "COMPLETED",
    },
    {
      label: "Completed",
      date: payout.completedAt,
      completed: payout.status === "COMPLETED",
    },
  ];

  const isFailed = payout.status === "FAILED";
  const isCancelled = payout.status === "CANCELLED";

  return (
    <div className="p-6 bg-white border rounded-lg border-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Payout Timeline
      </h2>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : isFailed || isCancelled ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={`font-medium ${step.completed ? "text-slate-900" : "text-slate-500"}`}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="mt-0.5 text-sm text-slate-600">
                  {format(new Date(step.date), "MMM d, yyyy h:mm a")}
                </p>
              )}
            </div>
          </div>
        ))}

        {isFailed && payout.failureReason && (
          <div className="p-3 mt-4 border rounded-lg border-red-200 bg-red-50">
            <p className="text-sm font-medium text-red-900">Failure Reason</p>
            <p className="mt-1 text-sm text-red-700">{payout.failureReason}</p>
          </div>
        )}

        {isCancelled && (
          <div className="p-3 mt-4 border rounded-lg border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-700">
              This payout was cancelled by an administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 3. Payout Booking List Component

**File:** `fishon-captain/src/app/(portal)/captain/payouts/_components/PayoutBookingList.tsx`

```tsx
import Link from "next/link";
import { format } from "date-fns";
import type { BookingFinancial } from "@/lib/services/finance-service";

interface PayoutBookingListProps {
  bookings: BookingFinancial[];
}

export function PayoutBookingList({ bookings }: PayoutBookingListProps) {
  const totalEarnings = bookings.reduce((sum, b) => sum + b.captainEarnings, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Included Bookings ({bookings.length})
        </h2>
        <p className="text-sm text-slate-600">
          Total: RM {totalEarnings.toLocaleString()}
        </p>
      </div>

      <div className="overflow-hidden bg-white border rounded-lg border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                  Charter
                </th>
                <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                  Angler
                </th>
                <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                  Trip Date
                </th>
                <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                  Total
                </th>
                <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                  Commission
                </th>
                <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                  Your Earnings
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    <Link
                      href={`/captain/charters/${booking.charterId}`}
                      className="hover:underline"
                    >
                      {booking.charterName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {booking.anglerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {format(new Date(booking.tripDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    RM {booking.finalPrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    -RM {booking.platformFee.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-green-600">
                    RM {booking.captainEarnings.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 3: Pending Bookings View (Week 3)

### Goal

Show captains which bookings are awaiting payout processing.

### Frontend Implementation

**File:** `fishon-captain/src/app/(portal)/captain/payouts/pending/page.tsx`

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import { getCaptainBookings } from "@/lib/services/finance-service";
import { PendingBookingsTable } from "../_components/PendingBookingsTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pending Earnings | Fishon Captain",
  description: "View bookings awaiting payout",
};

export default async function PendingPayoutsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/captain/payouts/pending");
  }

  // Fetch pending bookings
  const pendingBookings = await getCaptainBookings(session.user.id, {
    payoutStatus: "PENDING",
  });

  const totalPending = pendingBookings.reduce(
    (sum, b) => sum + b.captainEarnings,
    0
  );

  return (
    <div className="p-4 space-y-6 md:p-6">
      <div>
        <Link
          href="/captain/payouts"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          ← Back to Payouts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Pending Earnings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {pendingBookings.length} booking
          {pendingBookings.length !== 1 ? "s" : ""} awaiting payout · RM{" "}
          {totalPending.toLocaleString()} total
        </p>
      </div>

      <PendingBookingsTable bookings={pendingBookings} />
    </div>
  );
}
```

---

## Testing Checklist

### Phase 1 (Earnings Dashboard)

- [ ] Earnings summary calculates correctly for captain's charters
- [ ] Commission rate reflects correct pricing plan
- [ ] Monthly comparison shows accurate trends
- [ ] Pending payout alert displays when earnings > 0
- [ ] Bank info card shows/hides based on data presence
- [ ] Navigation link appears in sidebar
- [ ] Mobile responsive layout works

### Phase 2 (Payout Detail)

- [ ] Payout detail page shows correct data
- [ ] Timeline displays accurate processing stages
- [ ] Booking breakdown shows all included bookings
- [ ] Transfer reference displays when available
- [ ] Ownership verification prevents unauthorized access

### Phase 3 (Pending Bookings)

- [ ] Pending bookings filter works correctly
- [ ] Table shows accurate earnings data
- [ ] Links to charters work

---

## Security Considerations

### Access Control

- **Captain can only view own data:** Verify `ownerId === session.user.id` on all pages
- **No payout modification:** Captains have read-only access
- **Bank details masked:** Show only last 4 digits of account number

### Data Privacy

- **Mask sensitive info:** Account numbers partially hidden
- **No admin data exposure:** Don't show `createdBy`, `approvedBy` user IDs

---

## API Endpoints (No New Routes Needed)

All functionality uses existing finance service functions:

- `getCaptainEarningsSummary(ownerId)` - Server-side only
- `getCaptainPayoutHistory(ownerId)` - Server-side only
- `getCaptainBookings(ownerId, filters)` - Server-side only
- `getPayoutById(id)` - Server-side only (with ownership check)

---

## Migration & Deployment

### No Database Changes Required

- Payout model already exists from admin finance Phase 2
- All required fields present

### Deployment Steps

1. Deploy captain payout pages to staging
2. Test with real captain accounts
3. Verify bank details masking works
4. Check mobile responsiveness
5. Deploy to production

---

## Success Metrics

- [ ] Captains can view total earnings
- [ ] Captains can track payout status
- [ ] Captains can see booking breakdown
- [ ] Bank details display/update flow works
- [ ] Zero unauthorized data access
- [ ] Mobile-first design works smoothly

---

## Future Enhancements (Post-Launch)

### Q1 2026

- **Earnings Export:** CSV/PDF export of earnings history
- **Email Notifications:** Notify captains when payout is completed
- **In-app Chat:** Message admin about payout questions

### Q2 2026

- **Earnings Charts:** Visual graphs of monthly earnings trends
- **Tax Documents:** Generate annual earning statements
- **Commission Calculator:** Tool to estimate earnings before booking

---

## Questions & Decisions

### Open Questions

1. **Payout frequency communication:** Should we display "Next payout: 1st of month" or keep vague?
2. **Pending threshold display:** Show minimum payout amount (e.g., RM 100)?
3. **Commission breakdown:** Show detailed calculation or just final amount?

### Technical Decisions

1. ✅ **Reuse admin finance service** - No duplicate logic
2. ✅ **Server-side only** - No public API endpoints for captain earnings
3. ✅ **Mask bank details** - Show last 4 digits only
4. ✅ **Read-only access** - Captains cannot modify payouts

---

## Related Documentation

- `admin-finance-dashboard-plan.md` - Admin payout management
- `src/app/(portal)/captain/documents/page.tsx` - Bank account form
- `src/lib/services/finance-service.ts` - Finance service layer

---

_End of Implementation Plan_

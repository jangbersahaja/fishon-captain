# Charter Configuration Page - Implementation Plan

## Overview

This document outlines the detailed implementation strategy for transforming `/captain/charters` from a simple charter list into a comprehensive configuration dashboard.

**Proposal Reference**: `plans/charter-configuration-page-proposal.md`

---

## Phase 1: Enhanced Data Layer & Basic Configuration Display

**Timeline**: Week 1 (5 days)  
**Goal**: Fetch enhanced charter data and display configuration sections

### Task 1.1: Database Schema Review & Adjustments

**Estimated Time**: 2 hours

**Files**:

- `prisma/schema.prisma`

**Changes**:

1. **Verify existing relations**:

   ```prisma
   model Charter {
     // Verify these exist:
     crewAssignments    CharterCrew[]
     captainAssignments CharterCaptain[]
     boat               Boat?
     captain            CaptainProfile
     trips              Trip[]
   }
   ```

2. **Check if ChararCrew and CharterCaptain models exist**:
   - If not, we may need to infer crew from other sources
   - Document current crew management approach

**Deliverable**: Schema documentation with relation diagram

### Task 1.2: Create Enhanced Data Fetching Service

**Estimated Time**: 4 hours

**Files**:

- `src/lib/charter-service.ts` (NEW)
- `src/lib/market-db.ts` (existing, extend)

**Implementation**:

```typescript
// src/lib/charter-service.ts

import { prisma } from "@/lib/prisma";
import { prisma as marketPrisma } from "@/lib/market-db";

export interface EnhancedCharterConfig {
  // Basic info
  id: string;
  name: string;
  charterType: string;
  city: string;
  state: string;
  startingPoint: string;
  isActive: boolean;

  // Booking flow settings
  bookingFlowType: "MANUAL" | "AUTO";
  approvalTimeHours: number;
  instantBookingEnabled: boolean;

  // Configuration
  boat: {
    id: string;
    name: string;
    type: string;
    lengthFt: number;
    capacity: number;
    imageUrl: string | null;
  } | null;

  captain: {
    id: string;
    userId: string;
    name: string;
    email: string | null;
    phone: string | null;
  };

  crew: {
    count: number;
    members: Array<{
      id: string;
      name: string;
      role: string | null;
    }>;
  };

  trips: {
    count: number;
    active: Array<{
      id: string;
      name: string;
      type: string;
      price: number;
    }>;
  };

  media: {
    count: number;
  };

  // Booking activity
  lastBooking: {
    id: string;
    guestName: string;
    totalPrice: number;
    tripDate: Date;
    tripTime: string;
    status: string;
    adults: number;
    children: number;
    tripName: string;
    tripType: string;
    createdAt: Date;
  } | null;

  bookingStats: {
    total: number;
    thisMonth: number;
  };
}

export async function getEnhancedCharterConfig(
  charterId: string
): Promise<EnhancedCharterConfig> {
  // Fetch from captain DB
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    select: {
      id: true,
      name: true,
      charterType: true,
      city: true,
      state: true,
      startingPoint: true,
      isActive: true,
      bookingFlowType: true,
      approvalTimeHours: true,
      instantBookingEnabled: true,
      boat: {
        select: {
          id: true,
          name: true,
          type: true,
          lengthFt: true,
          capacity: true,
          imageUrl: true,
        },
      },
      captain: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      crewAssignments: {
        select: {
          id: true,
          crew: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
      trips: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
        },
      },
      _count: {
        select: {
          media: true,
        },
      },
    },
  });

  if (!charter) {
    throw new Error("Charter not found");
  }

  // Fetch booking data from market DB
  const lastBooking = await marketPrisma.booking.findFirst({
    where: { charterId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      primaryBooker: true,
      finalPrice: true,
      date: true,
      time: true,
      status: true,
      adults: true,
      children: true,
      trip: {
        select: {
          name: true,
          type: true,
        },
      },
      createdAt: true,
    },
  });

  const bookingStats = await marketPrisma.booking.aggregate({
    where: { charterId },
    _count: true,
  });

  const thisMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );
  const thisMonthCount = await marketPrisma.booking.count({
    where: {
      charterId,
      createdAt: { gte: thisMonth },
    },
  });

  // Transform data
  return {
    id: charter.id,
    name: charter.name,
    charterType: charter.charterType,
    city: charter.city,
    state: charter.state,
    startingPoint: charter.startingPoint,
    isActive: charter.isActive,
    bookingFlowType: charter.bookingFlowType,
    approvalTimeHours: charter.approvalTimeHours,
    instantBookingEnabled: charter.instantBookingEnabled,
    boat: charter.boat,
    captain: {
      id: charter.captain.id,
      userId: charter.captain.userId,
      name: charter.captain.user.name || "Captain",
      email: charter.captain.user.email,
      phone: charter.captain.user.phone,
    },
    crew: {
      count: charter.crewAssignments.length,
      members: charter.crewAssignments.map((ca) => ({
        id: ca.crew.id,
        name: ca.crew.name,
        role: ca.crew.role,
      })),
    },
    trips: {
      count: charter.trips.length,
      active: charter.trips,
    },
    media: {
      count: charter._count.media,
    },
    lastBooking: lastBooking
      ? {
          id: lastBooking.id,
          guestName: lastBooking.primaryBooker?.name || "Guest",
          totalPrice: Number(lastBooking.finalPrice),
          tripDate: new Date(lastBooking.date),
          tripTime: lastBooking.time,
          status: lastBooking.status,
          adults: lastBooking.adults,
          children: lastBooking.children,
          tripName: lastBooking.trip?.name || "Trip",
          tripType: lastBooking.trip?.type || "Unknown",
          createdAt: lastBooking.createdAt,
        }
      : null,
    bookingStats: {
      total: bookingStats._count || 0,
      thisMonth: thisMonthCount,
    },
  };
}

export async function getEnhancedChartersList(
  userId: string
): Promise<EnhancedCharterConfig[]> {
  const charters = await prisma.charter.findMany({
    where: { ownerId: userId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(charters.map((c) => getEnhancedCharterConfig(c.id)));
}
```

**Tests**:

- Unit tests for data transformation
- Integration test with mock data
- Error handling tests (charter not found, DB connection fail)

**Deliverable**: Tested service with full TypeScript types

### Task 1.3: Update Page Server Component

**Estimated Time**: 2 hours

**Files**:

- `src/app/(portal)/captain/charters/page.tsx`

**Changes**:

```typescript
import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { getEnhancedChartersList } from "@/lib/charter-service";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CharterConfigList } from "./CharterConfigList";

export const dynamic = "force-dynamic";

export default async function ChartersListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth?mode=signin");

  const resolvedParams = searchParams ? await searchParams : {};
  const adminUserId =
    typeof resolvedParams?.adminUserId === "string"
      ? resolvedParams.adminUserId
      : undefined;

  // ... existing admin override logic ...

  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) redirect("/auth?mode=signin");

  // Fetch enhanced charter data
  const charters = await getEnhancedChartersList(effectiveUserId);

  return (
    <div className="px-6 py-8 space-y-8">
      {targetUserInfo && (
        {/* ... existing admin override banner ... */}
      )}

      <div className="space-y-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Charter Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage your charter listings, configurations, and booking settings
          </p>
        </div>
      </div>

      <CharterConfigList
        charters={charters}
        userRole={role as "CAPTAIN" | "OPERATOR" | "CREW" | "STAFF" | "ADMIN"}
        adminUserId={adminUserId}
      />
    </div>
  );
}
```

### Task 1.4: Create Base Configuration Card Component

**Estimated Time**: 6 hours

**Files**:

- `src/app/(portal)/captain/charters/CharterConfigCard.tsx` (NEW)
- `src/app/(portal)/captain/charters/components/CharterHeader.tsx` (NEW)
- `src/app/(portal)/captain/charters/components/CharterConfiguration.tsx` (NEW)

**Implementation**:

```typescript
// CharterConfigCard.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { CharterConfiguration } from "./components/CharterConfiguration";
import { CharterHeader } from "./components/CharterHeader";

interface CharterConfigCardProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function CharterConfigCard({
  charter,
  adminUserId,
}: CharterConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <CharterHeader
        charter={charter}
        adminUserId={adminUserId}
      />

      {/* Collapsed Summary */}
      {!isExpanded && (
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex flex-wrap gap-3">
            {charter.boat && (
              <span className="flex items-center gap-1">
                ✓ Boat: {charter.boat.name}
              </span>
            )}
            {charter.trips.count > 0 && (
              <span className="flex items-center gap-1">
                ✓ {charter.trips.count} Trip{charter.trips.count !== 1 ? "s" : ""}
              </span>
            )}
            {charter.media.count > 0 && (
              <span className="flex items-center gap-1">
                ✓ {charter.media.count} Photo{charter.media.count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {charter.bookingFlowType === "MANUAL"
                ? `Manual Booking (${charter.approvalTimeHours}h)`
                : "Instant Booking"}
            </Badge>
          </div>

          {charter.lastBooking && (
            <div className="text-xs">
              📅 Last booking: {formatDistanceToNow(charter.lastBooking.createdAt)} ago
            </div>
          )}
        </div>
      )}

      {/* Expanded Configuration */}
      {isExpanded && (
        <div className="mt-6 space-y-6">
          <CharterConfiguration charter={charter} adminUserId={adminUserId} />

          {/* More sections to be added in Phase 2-4 */}
        </div>
      )}

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4 mr-2" />
            Collapse
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            View Details
          </>
        )}
      </Button>
    </Card>
  );
}
```

```typescript
// components/CharterConfiguration.tsx
"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { AlertTriangle, Ship, Users, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CharterConfigurationProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function CharterConfiguration({
  charter,
  adminUserId,
}: CharterConfigurationProps) {
  const editQuery = adminUserId ? `?adminUserId=${adminUserId}` : "";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">
        ⚙️ Configuration
      </h3>

      {/* Boat */}
      <div className="p-4 border rounded-lg border-slate-200 bg-slate-50">
        <div className="flex items-start gap-3">
          <Ship className="w-5 h-5 mt-1 text-slate-400" />
          <div className="flex-1">
            {charter.boat ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {charter.boat.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {charter.boat.type} • {charter.boat.lengthFt}ft •
                      {charter.boat.capacity} passengers
                    </p>
                  </div>
                  {charter.boat.imageUrl && (
                    <Image
                      src={charter.boat.imageUrl}
                      alt={charter.boat.name}
                      width={60}
                      height={60}
                      className="object-cover rounded"
                    />
                  )}
                </div>
                <Link
                  href={`/captain/boats${editQuery}`}
                  className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                >
                  Change Boat →
                </Link>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  No boat assigned
                  <Link
                    href={`/captain/boats${editQuery}`}
                    className="block mt-2 text-sm font-medium underline"
                  >
                    Assign Boat →
                  </Link>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {/* Captain & Crew */}
      <div className="p-4 border rounded-lg border-slate-200 bg-slate-50">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 mt-1 text-slate-400" />
          <div className="flex-1">
            <p className="font-medium text-slate-900">
              Captain: {charter.captain.name}
            </p>
            {charter.crew.count > 0 ? (
              <>
                <p className="mt-1 text-sm text-slate-600">
                  Crew: {charter.crew.count} member{charter.crew.count !== 1 ? "s" : ""} assigned
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {charter.crew.members.slice(0, 3).map((member) => (
                    <li key={member.id}>
                      • {member.name} {member.role && `(${member.role})`}
                    </li>
                  ))}
                  {charter.crew.count > 3 && (
                    <li className="text-slate-500">
                      +{charter.crew.count - 3} more
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                No crew assigned (optional)
              </p>
            )}
            <Link
              href={`/captain/crew${editQuery}`}
              className="inline-block mt-2 text-sm text-blue-600 hover:underline"
            >
              Manage Crew →
            </Link>
          </div>
        </div>
      </div>

      {/* Trips */}
      <div className="p-4 border rounded-lg border-slate-200 bg-slate-50">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 mt-1 text-slate-400" />
          <div className="flex-1">
            {charter.trips.count > 0 ? (
              <>
                <p className="font-medium text-slate-900">
                  {charter.trips.count} Active Trip{charter.trips.count !== 1 ? "s" : ""}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {charter.trips.active.slice(0, 3).map((trip) => (
                    <li key={trip.id}>
                      • {trip.name} - RM {trip.price.toLocaleString()}
                    </li>
                  ))}
                  {charter.trips.count > 3 && (
                    <li className="text-slate-500">
                      +{charter.trips.count - 3} more
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  No trips configured
                </AlertDescription>
              </Alert>
            )}
            <Link
              href={`/captain/trips${editQuery}`}
              className="inline-block mt-2 text-sm text-blue-600 hover:underline"
            >
              Manage Trips →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Deliverable**: Basic expandable card with configuration display

### Phase 1 Deliverables Summary

- ✅ Enhanced data fetching service with booking stats
- ✅ Server component with new data source
- ✅ Expandable charter configuration cards
- ✅ Empty states for missing configurations
- ✅ Links to related management pages

---

## Phase 2: Booking Flow Settings

**Timeline**: Week 2 (3 days)  
**Goal**: Enable booking flow type changes with validation

### Task 2.1: Create API Endpoints

**Estimated Time**: 4 hours

**Files**:

- `src/app/api/captain/charters/[id]/booking-flow/route.ts` (NEW)

**Implementation**:

```typescript
// route.ts
import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  bookingFlowType: z.enum(["MANUAL", "AUTO"]),
  approvalTimeHours: z.number().int().min(1).max(168).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: charterId } = await params;
    const body = await req.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error },
        { status: 400 }
      );
    }

    const { bookingFlowType, approvalTimeHours } = validation.data;

    // Verify ownership
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { ownerId: true },
    });

    if (!charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    const effectiveUserId = getEffectiveUserId({
      session,
      query: {
        adminUserId: req.nextUrl.searchParams.get("adminUserId") || undefined,
      },
    });

    if (charter.ownerId !== effectiveUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update charter
    const updated = await prisma.charter.update({
      where: { id: charterId },
      data: {
        bookingFlowType,
        approvalTimeHours:
          bookingFlowType === "MANUAL" ? approvalTimeHours || 24 : undefined,
        instantBookingEnabled: bookingFlowType === "AUTO",
      },
      select: {
        bookingFlowType: true,
        approvalTimeHours: true,
        instantBookingEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (error) {
    console.error("Error updating booking flow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Tests**:

- Authorization checks
- Validation tests
- Ownership verification
- Success cases for MANUAL and AUTO

### Task 2.2: Create Booking Flow Selector Component

**Estimated Time**: 6 hours

**Files**:

- `src/app/(portal)/captain/charters/components/BookingFlowSettings.tsx` (NEW)
- `src/app/(portal)/captain/charters/hooks/useUpdateBookingFlow.ts` (NEW)

**Implementation**:

```typescript
// hooks/useUpdateBookingFlow.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface UpdateBookingFlowParams {
  charterId: string;
  bookingFlowType: "MANUAL" | "AUTO";
  approvalTimeHours?: number;
  adminUserId?: string;
}

export function useUpdateBookingFlow() {
  return useMutation({
    mutationFn: async ({
      charterId,
      bookingFlowType,
      approvalTimeHours,
      adminUserId,
    }: UpdateBookingFlowParams) => {
      const query = adminUserId ? `?adminUserId=${adminUserId}` : "";
      const res = await fetch(
        `/api/captain/charters/${charterId}/booking-flow${query}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingFlowType, approvalTimeHours }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update booking flow");
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      toast.success(
        `Booking flow updated to ${variables.bookingFlowType === "MANUAL" ? "Manual Approval" : "Instant Booking"}`
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}
```

```typescript
// components/BookingFlowSettings.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUpdateBookingFlow } from "../hooks/useUpdateBookingFlow";

interface BookingFlowSettingsProps {
  charter: EnhancedCharterConfig;
  adminUserId?: string;
}

export function BookingFlowSettings({
  charter,
  adminUserId,
}: BookingFlowSettingsProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<"MANUAL" | "AUTO">(
    charter.bookingFlowType
  );
  const [approvalHours, setApprovalHours] = useState(
    String(charter.approvalTimeHours)
  );

  const updateMutation = useUpdateBookingFlow();

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      charterId: charter.id,
      bookingFlowType: selectedFlow,
      approvalTimeHours: selectedFlow === "MANUAL" ? Number(approvalHours) : undefined,
      adminUserId,
    });
    setShowModal(false);
    router.refresh();
  };

  return (
    <>
      <div className="p-4 border rounded-lg border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 mt-1 text-slate-400" />
            <div>
              <p className="font-medium text-slate-900">Booking Flow</p>
              <p className="mt-1 text-sm text-slate-600">
                {charter.bookingFlowType === "MANUAL" ? (
                  <>
                    Manual Approval • {charter.approvalTimeHours}h deadline
                    <br />
                    <span className="text-slate-500">
                      Review bookings before payment
                    </span>
                  </>
                ) : (
                  <>
                    Instant Booking • Auto-approved
                    <br />
                    <span className="text-slate-500">
                      Payment confirms booking immediately
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            Change
          </Button>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Booking Flow</DialogTitle>
            <DialogDescription>
              Choose how you want to handle booking requests for this charter.
              This only affects new bookings.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={selectedFlow} onValueChange={(v) => setSelectedFlow(v as "MANUAL" | "AUTO")}>
            <div className="space-y-4">
              <div className="flex items-start p-4 space-x-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="MANUAL" id="manual" />
                <Label htmlFor="manual" className="flex-1 cursor-pointer">
                  <div className="font-medium">Manual Approval</div>
                  <div className="text-sm text-slate-500">
                    Review each booking before angler pays. You have control
                    over every booking.
                  </div>
                  {selectedFlow === "MANUAL" && (
                    <div className="mt-3">
                      <Label htmlFor="approval-time" className="text-sm">
                        Approval Deadline
                      </Label>
                      <Select
                        value={approvalHours}
                        onValueChange={setApprovalHours}
                      >
                        <SelectTrigger id="approval-time" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours (Recommended)</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                          <SelectItem value="72">72 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </Label>
              </div>

              <div className="flex items-start p-4 space-x-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="AUTO" id="auto" />
                <Label htmlFor="auto" className="flex-1 cursor-pointer">
                  <div className="font-medium">Instant Booking</div>
                  <div className="text-sm text-slate-500">
                    Bookings are confirmed immediately upon payment. Faster
                    booking flow for anglers.
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Deliverable**: Working booking flow selector with API integration

### Phase 2 Deliverables Summary

- ✅ API endpoint for booking flow updates
- ✅ Booking flow selector component with modal
- ✅ Approval time configuration for MANUAL flow
- ✅ Optimistic UI updates with react-query

---

## Phase 3: Status Toggle & Validation

**Timeline**: Week 2 (2 days)  
**Goal**: Enable inline active/inactive toggle with validation

### Task 3.1: Create Status Toggle API

**Estimated Time**: 2 hours

**Files**:

- `src/app/api/captain/charters/[id]/toggle-status/route.ts` (NEW)

**Implementation**:

```typescript
import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const toggleSchema = z.object({
  isActive: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: charterId } = await params;
    const body = await req.json();
    const validation = toggleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { isActive } = validation.data;

    // Verify ownership
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: {
        ownerId: true,
        boat: true,
        trips: { where: { isActive: true } },
        _count: { select: { media: true } },
      },
    });

    if (!charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    const effectiveUserId = getEffectiveUserId({
      session,
      query: {
        adminUserId: req.nextUrl.searchParams.get("adminUserId") || undefined,
      },
    });

    if (charter.ownerId !== effectiveUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate activation requirements
    if (isActive) {
      const errors: string[] = [];

      if (!charter.boat) {
        errors.push("Boat not assigned");
      }

      if (charter.trips.length === 0) {
        errors.push("No trips configured");
      }

      if (charter._count.media === 0) {
        errors.push("No photos uploaded");
      }

      if (errors.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot activate charter",
            details: errors,
          },
          { status: 400 }
        );
      }
    }

    // Update status
    const updated = await prisma.charter.update({
      where: { id: charterId },
      data: { isActive },
      select: { id: true, isActive: true },
    });

    return NextResponse.json({
      success: true,
      charter: updated,
    });
  } catch (error) {
    console.error("Error toggling charter status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Task 3.2: Create Status Toggle Component

**Estimated Time**: 4 hours

**Files**:

- `src/app/(portal)/captain/charters/components/StatusToggle.tsx` (NEW)
- `src/app/(portal)/captain/charters/hooks/useToggleCharterStatus.ts` (NEW)

**Implementation** (similar pattern to booking flow, with validation checks)

**Deliverable**: Working status toggle with validation

### Phase 3 Deliverables Summary

- ✅ Status toggle API with validation
- ✅ StatusToggle component with confirmation modal
- ✅ Validation error display
- ✅ Optimistic UI updates

---

## Phase 4: Recent Bookings & Stats

**Timeline**: Week 3 (2 days)  
**Goal**: Display last booking and stats

### Task 4.1: Create Recent Bookings Component

**Estimated Time**: 4 hours

**Files**:

- `src/app/(portal)/captain/charters/components/RecentBookings.tsx` (NEW)

**Implementation**: Display last booking with link to booking detail page

**Deliverable**: Recent bookings section with empty state

### Phase 4 Deliverables Summary

- ✅ Recent bookings display
- ✅ Booking stats (total, this month)
- ✅ Link to booking details
- ✅ Empty state for no bookings

---

## Phase 5: Quick Actions & Polish

**Timeline**: Week 3 (3 days)  
**Goal**: Add quick action buttons and polish UX

### Task 5.1: Quick Actions Toolbar

**Estimated Time**: 3 hours

**Files**:

- `src/app/(portal)/captain/charters/components/QuickActions.tsx` (NEW)

**Implementation**: Grid of action buttons with proper links

### Task 5.2: Mobile Optimizations

**Estimated Time**: 3 hours

**Changes**: Responsive layout, touch-friendly buttons, bottom sheets

### Task 5.3: Loading States & Error Handling

**Estimated Time**: 2 hours

**Implementation**: Skeletons, error boundaries, retry logic

### Phase 5 Deliverables Summary

- ✅ Quick actions toolbar
- ✅ Mobile-responsive design
- ✅ Loading skeletons
- ✅ Error handling

---

## Testing Strategy

### Unit Tests

- Data transformation functions
- Validation logic
- Component rendering

### Integration Tests

- API endpoint flows
- Database queries
- Auth checks

### E2E Tests (Playwright)

- Toggle charter status
- Change booking flow
- Expand/collapse cards
- Mobile navigation

---

## Deployment Checklist

- [ ] Run all tests
- [ ] TypeScript strict mode compliance
- [ ] Accessibility audit (WAVE, axe)
- [ ] Performance audit (Lighthouse)
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Database migration (if schema changes)
- [ ] Feature flag (gradual rollout)
- [ ] Monitoring & alerts setup
- [ ] Documentation update

---

## Success Metrics (Post-Launch)

**Week 1**:

- [ ] 80% of captains view expanded configuration
- [ ] <5% error rate on status toggles
- [ ] <3s average page load time

**Month 1**:

- [ ] 50% of captains change booking flow setting
- [ ] 90% of active charters have complete configuration
- [ ] <1% support tickets related to charter settings

---

**Document Status**: Ready for Implementation  
**Estimated Total Effort**: 15 days (3 weeks, 1 developer)  
**Dependencies**: None (self-contained)

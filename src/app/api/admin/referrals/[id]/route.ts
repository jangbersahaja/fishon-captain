import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markReferralInvalid } from "@/lib/services/referral-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * PATCH /api/admin/referrals/[id]
 * Update a referral (mark as invalid, restore, etc.)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { action, reason } = body as { action: string; reason?: string };

    // Get current referral
    const referral = await prisma.referral.findUnique({
      where: { id },
      include: { earning: true },
    });

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "mark_invalid": {
        // Don't allow invalidating completed/paid referrals
        if (referral.status === "COMPLETED" || referral.status === "PAID") {
          return NextResponse.json(
            {
              error: "Cannot invalidate completed or paid referrals",
            },
            { status: 400 }
          );
        }

        const updated = await markReferralInvalid({
          referralId: id,
          reason: reason || "Marked as invalid by admin",
          flaggedBy: user.id,
        });

        return NextResponse.json({
          success: true,
          referral: {
            id: updated.id,
            status: updated.status,
            flagReason: updated.flagReason,
            flaggedAt: updated.flaggedAt,
          },
        });
      }

      case "restore": {
        // Only allow restoring INVALID referrals
        if (referral.status !== "INVALID") {
          return NextResponse.json(
            { error: "Can only restore invalid referrals" },
            { status: 400 }
          );
        }

        // Determine what status to restore to based on data
        let newStatus:
          | "PENDING"
          | "REGISTERED"
          | "CHARTER_CREATED"
          | "FIRST_BOOKING" = "PENDING";
        if (referral.firstBookingId) {
          newStatus = "FIRST_BOOKING";
        } else if (referral.firstCharterId) {
          newStatus = "CHARTER_CREATED";
        } else if (referral.inviteeId) {
          newStatus = "REGISTERED";
        }

        const restored = await prisma.referral.update({
          where: { id },
          data: {
            status: newStatus,
            flagReason: null,
            flaggedAt: null,
            flaggedBy: null,
          },
        });

        return NextResponse.json({
          success: true,
          referral: {
            id: restored.id,
            status: restored.status,
          },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Admin Referral PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/referrals/[id]
 * Get detailed referral information including fraud indicators
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        invitor: {
          select: { id: true, name: true, email: true },
        },
        invitee: {
          select: { id: true, name: true, email: true },
        },
        referralCode: {
          select: { code: true, clickCount: true, signupCount: true },
        },
        earning: true,
      },
    });

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // Get related referrals from same IP (if exists)
    let relatedFromSameIp: { id: string; status: string; clickedAt: Date }[] =
      [];
    if (referral.sourceIp) {
      relatedFromSameIp = await prisma.referral.findMany({
        where: {
          sourceIp: referral.sourceIp,
          id: { not: referral.id },
        },
        select: {
          id: true,
          status: true,
          clickedAt: true,
        },
        take: 10,
        orderBy: { clickedAt: "desc" },
      });
    }

    return NextResponse.json({
      referral: {
        ...referral,
        fraudIndicators: {
          sameIpCount: relatedFromSameIp.length,
          relatedReferrals: relatedFromSameIp,
        },
      },
    });
  } catch (error) {
    console.error("[Admin Referral GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

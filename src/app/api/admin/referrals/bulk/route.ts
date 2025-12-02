import authOptions from "@/lib/auth";
import {
  bulkMarkReferralsInvalid,
  getSuspiciousReferrals,
} from "@/lib/services/referral-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/referrals/bulk
 * Perform bulk operations on referrals
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, referralIds, reason } = body as {
      action: string;
      referralIds?: string[];
      reason?: string;
    };

    switch (action) {
      case "mark_invalid": {
        if (!referralIds || referralIds.length === 0) {
          return NextResponse.json(
            { error: "No referral IDs provided" },
            { status: 400 }
          );
        }

        if (referralIds.length > 100) {
          return NextResponse.json(
            { error: "Maximum 100 referrals per batch" },
            { status: 400 }
          );
        }

        const count = await bulkMarkReferralsInvalid({
          referralIds,
          reason: reason || "Bulk marked as invalid by admin",
          flaggedBy: user.id,
        });

        return NextResponse.json({
          success: true,
          updated: count,
          message: `${count} referrals marked as invalid`,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Admin Referrals Bulk] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/referrals/bulk
 * Get suspicious referrals for review
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const suspicious = await getSuspiciousReferrals();

    return NextResponse.json({
      suspicious,
      summary: {
        duplicateIpCases: suspicious.duplicateIps.length,
        rapidClickCases: suspicious.rapidClicks.length,
        totalSuspicious:
          suspicious.duplicateIps.reduce((sum, ip) => sum + ip.count, 0) +
          suspicious.rapidClicks.reduce((sum, rc) => sum + rc.clicksLastHour, 0),
      },
    });
  } catch (error) {
    console.error("[Admin Referrals Suspicious GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

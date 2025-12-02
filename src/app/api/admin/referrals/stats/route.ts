import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/referrals/stats
 * Get comprehensive referral programme statistics
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get date ranges
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);
  const thisMonth = new Date(today);
  thisMonth.setDate(thisMonth.getDate() - 30);

  const [
    // Overall stats
    totalReferrals,
    totalCodes,
    statusCounts,
    totalCommissions,
    pendingCommissions,
    paidCommissions,

    // Time-based stats
    referralsToday,
    referralsThisWeek,
    referralsThisMonth,
    completedThisMonth,

    // Conversion funnel
    conversionStats,
  ] = await Promise.all([
    // Total referrals
    prisma.referral.count(),

    // Total active codes
    prisma.referralCode.count({ where: { isActive: true } }),

    // Status breakdown
    prisma.referral.groupBy({
      by: ["status"],
      _count: { status: true },
    }),

    // Total commissions earned (from ReferralEarning)
    prisma.referralEarning.aggregate({
      _sum: { commissionAmount: true },
    }),

    // Pending commissions (not yet paid)
    prisma.referralEarning.aggregate({
      _sum: { commissionAmount: true },
      where: { status: "PENDING" },
    }),

    // Paid commissions
    prisma.referralEarning.aggregate({
      _sum: { commissionAmount: true },
      where: { status: "PAID" },
    }),

    // Today's signups
    prisma.referral.count({
      where: { createdAt: { gte: today } },
    }),

    // This week's signups
    prisma.referral.count({
      where: { createdAt: { gte: thisWeek } },
    }),

    // This month's signups
    prisma.referral.count({
      where: { createdAt: { gte: thisMonth } },
    }),

    // Completed this month
    prisma.referral.count({
      where: { status: "COMPLETED", completedAt: { gte: thisMonth } },
    }),

    // Conversion stats - total clicks from referral codes
    prisma.referralCode.aggregate({
      _sum: { clickCount: true },
    }),
  ]);

  // Top 10 referrers by completed referrals (separate query to get earnings)
  const topReferrersByCount = await prisma.referral.groupBy({
    by: ["invitorId"],
    where: { status: "COMPLETED" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  // Get user details and earnings for top referrers
  const topReferrerIds = topReferrersByCount.map((r) => r.invitorId);

  const [topReferrerUsers, topReferrerEarnings] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: topReferrerIds } },
      select: { id: true, name: true, email: true },
    }),
    prisma.referralEarning.groupBy({
      by: ["earnerId"],
      where: { earnerId: { in: topReferrerIds } },
      _sum: { commissionAmount: true },
    }),
  ]);

  const topReferrersWithNames = topReferrersByCount.map((r) => {
    const user = topReferrerUsers.find((u) => u.id === r.invitorId);
    const earnings = topReferrerEarnings.find(
      (e) => e.earnerId === r.invitorId
    );
    return {
      invitorId: r.invitorId,
      name: user?.name || "Unknown",
      email: user?.email || "",
      completedReferrals: r._count.id,
      totalEarnings: earnings?._sum.commissionAmount || 0,
    };
  });

  // Calculate conversion rates
  const totalClicks = conversionStats._sum.clickCount || 0;
  const signupRate =
    totalClicks > 0 ? ((totalReferrals / totalClicks) * 100).toFixed(1) : "0";

  const completedCount =
    statusCounts.find((s) => s.status === "COMPLETED")?._count.status || 0;
  const completionRate =
    totalReferrals > 0
      ? ((completedCount / totalReferrals) * 100).toFixed(1)
      : "0";

  return NextResponse.json({
    overview: {
      totalReferrals,
      totalActiveCodes: totalCodes,
      totalClicks,
      signupConversionRate: parseFloat(signupRate),
      completionRate: parseFloat(completionRate),
    },
    commissions: {
      total: totalCommissions._sum.commissionAmount || 0,
      pending: pendingCommissions._sum.commissionAmount || 0,
      paid: paidCommissions._sum.commissionAmount || 0,
    },
    statusBreakdown: Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    ),
    activity: {
      today: referralsToday,
      thisWeek: referralsThisWeek,
      thisMonth: referralsThisMonth,
      completedThisMonth,
    },
    topReferrers: topReferrersWithNames,
  });
}

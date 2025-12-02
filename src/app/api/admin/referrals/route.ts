import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ReferralStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/referrals
 * Fetch all referrals with stats for admin dashboard
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status") as ReferralStatus | null;
  const search = searchParams.get("search") || "";

  const skip = (page - 1) * limit;

  // Build where clause
  const where: {
    status?: ReferralStatus;
    OR?: Array<{
      invitor?: { name?: { contains: string; mode: "insensitive" } };
      invitee?: { name?: { contains: string; mode: "insensitive" } };
      referralCode?: { code?: { contains: string; mode: "insensitive" } };
    }>;
  } = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { invitor: { name: { contains: search, mode: "insensitive" } } },
      { invitee: { name: { contains: search, mode: "insensitive" } } },
      { referralCode: { code: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [referrals, total] = await Promise.all([
    prisma.referral.findMany({
      where,
      include: {
        invitor: { select: { id: true, name: true, email: true } },
        invitee: { select: { id: true, name: true, email: true } },
        referralCode: { select: { code: true } },
        earning: {
          select: {
            tripEarnings: true,
            commissionAmount: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.referral.count({ where }),
  ]);

  // Get aggregate stats from ReferralEarning
  const [statusCounts, totalEarnings] = await Promise.all([
    prisma.referral.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.referralEarning.aggregate({
      _sum: { commissionAmount: true },
    }),
  ]);

  const stats = {
    total,
    byStatus: Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    ),
    totalEarnings: totalEarnings._sum.commissionAmount || 0,
  };

  return NextResponse.json({
    referrals: referrals.map((r) => ({
      id: r.id,
      invitor: r.invitor,
      invitee: r.invitee,
      code: r.referralCode?.code,
      status: r.status,
      tripEarnings: r.earning?.tripEarnings || null,
      commissionAmount: r.earning?.commissionAmount || null,
      commissionPaidAt: r.earning?.paidAt || null,
      flagReason: r.flagReason,
      flaggedAt: r.flaggedAt,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      expiresAt: r.expiresAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats,
  });
}

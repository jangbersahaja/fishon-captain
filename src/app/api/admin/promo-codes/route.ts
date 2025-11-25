/**
 * Admin Promo Codes API
 *
 * Manages promo codes in fishon-market database
 *
 * GET    /api/admin/promo-codes       - List all promo codes with filters
 * POST   /api/admin/promo-codes       - Create new promo code
 */

import authOptions from "@/lib/auth";
import { prismaMarket } from "@/lib/prisma-market";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for promo code creation
const createPromoCodeSchema = z
  .object({
    code: z.string().min(3).max(50).toUpperCase(),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    percentage: z.coerce.number().min(1).max(100).optional(),
    fixedAmount: z.coerce.number().positive().optional(),
    scope: z.enum(["UNIVERSAL", "REGISTRATION"]),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    maxUses: z.coerce.number().int().positive().optional().nullable(),
    maxUsesPerUser: z.coerce.number().int().positive().default(1),
    minPurchase: z.coerce.number().positive().optional().nullable(),
    maxDiscount: z.coerce.number().positive().optional().nullable(),
    newUsersOnly: z.boolean().default(false),
    specificCharters: z.array(z.string()).default([]),
    status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).default("ACTIVE"),
  })
  .refine(
    (data) => {
      if (data.type === "PERCENTAGE") return data.percentage !== undefined;
      if (data.type === "FIXED") return data.fixedAmount !== undefined;
      return true;
    },
    {
      message: "percentage required for PERCENTAGE type, fixedAmount for FIXED",
    }
  );

interface PromoCodeCount {
  bookings: number;
  assignments: number;
}

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: "PERCENTAGE" | "FIXED";
  percentage?: number;
  fixedAmount?: number;
  scope: "UNIVERSAL" | "REGISTRATION";
  startDate: Date;
  endDate: Date;
  maxUses?: number;
  maxUsesPerUser: number;
  minPurchase?: number;
  maxDiscount?: number;
  newUsersOnly: boolean;
  specificCharters: string[];
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  _count: PromoCodeCount;
}

interface PromoCodeResponse {
  promoCodes: Array<
    PromoCode & {
      bookingsCount: number;
      assignmentsCount: number;
    }
  >;
}

/**
 * GET /api/admin/promo-codes
 * List all promo codes with optional filters
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const scope = searchParams.get("scope");
    const search = searchParams.get("search");

    // Build where clause with proper typing
    const where: any = {};

    if (status && ["ACTIVE", "INACTIVE", "EXPIRED"].includes(status)) {
      where.status = status;
    }

    if (scope && ["UNIVERSAL", "REGISTRATION"].includes(scope)) {
      where.scope = scope;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const promoCodes = await prismaMarket.promoCode.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      promoCodes: promoCodes.map((code: PromoCode) => ({
        ...code,
        bookingsCount: code._count.bookings,
        assignmentsCount: code._count.assignments,
      })),
    });
  } catch (error) {
    console.error("[PromoCodesAPI] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo codes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/promo-codes
 * Create new promo code
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createPromoCodeSchema.parse(body);

    // Check if code already exists
    const existing = await prismaMarket.promoCode.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Promo code already exists" },
        { status: 400 }
      );
    }

    // Create promo code
    const promoCode = await prismaMarket.promoCode.create({
      data: {
        code: validated.code,
        name: validated.name,
        description: validated.description,
        type: validated.type,
        percentage: validated.percentage,
        fixedAmount: validated.fixedAmount,
        scope: validated.scope,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        maxUses: validated.maxUses,
        maxUsesPerUser: validated.maxUsesPerUser,
        minPurchase: validated.minPurchase,
        maxDiscount: validated.maxDiscount,
        newUsersOnly: validated.newUsersOnly,
        specificCharters: validated.specificCharters,
        status: validated.status,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(
      { promoCode, message: "Promo code created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[PromoCodesAPI] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create promo code" },
      { status: 500 }
    );
  }
}

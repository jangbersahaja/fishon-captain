import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { CrewRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const crewCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  displayName: z.string().min(1, "Display name is required").max(100),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1, "Phone is required").max(20),
  primaryRole: z.nativeEnum(CrewRole),
  bio: z.string().max(1000).nullable().optional(),
  experienceYrs: z.number().int().min(0).max(99),
  avatarUrl: z.string().url().nullable().optional(),
  assignedCharters: z
    .array(
      z.object({
        charterId: z.string(),
        role: z.nativeEnum(CrewRole),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const adminUserId =
      req.nextUrl.searchParams.get("adminUserId") || undefined;
    const effectiveUserId = getEffectiveUserId({
      session,
      query: { adminUserId },
    });

    if (!effectiveUserId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Parse and validate body
    const body = await req.json();
    const validationResult = crewCreateSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Crew creation validation failed", {
        userId: effectiveUserId,
        errors: validationResult.error.issues,
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid input", details: validationResult.error.issues },
          { status: 400 }
        )
      );
    }

    const data = validationResult.data;

    // Verify user owns the charters they're assigning to
    if (data.assignedCharters && data.assignedCharters.length > 0) {
      const charterIds = data.assignedCharters.map((a) => a.charterId);
      const chartersCount = await prisma.charter.count({
        where: {
          id: { in: charterIds },
          ownerId: effectiveUserId,
        },
      });

      if (chartersCount !== charterIds.length) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "One or more charters not found or not owned by you" },
            { status: 403 }
          )
        );
      }
    }

    // Create crew member
    const crew = await prisma.crewMember.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName,
        email: data.email || null,
        phone: data.phone,
        primaryRole: data.primaryRole,
        bio: data.bio || null,
        experienceYrs: data.experienceYrs,
        avatarUrl: data.avatarUrl || null,
        isActive: true,
      },
    });

    // Create charter assignments if provided
    if (data.assignedCharters && data.assignedCharters.length > 0) {
      await prisma.charterCrew.createMany({
        data: data.assignedCharters.map((assignment) => ({
          charterId: assignment.charterId,
          crewId: crew.id,
          role: assignment.role,
          isActive: true,
        })),
      });
    }

    logger.info("Crew member created", {
      userId: effectiveUserId,
      crewId: crew.id,
      assignments: data.assignedCharters?.length || 0,
      ms: Date.now() - start,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        crew,
      })
    );
  } catch (error) {
    logger.error("Crew creation error", {
      error: error instanceof Error ? error.message : "Unknown error",
      ms: Date.now() - start,
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to create crew member" },
        { status: 500 }
      )
    );
  }
}

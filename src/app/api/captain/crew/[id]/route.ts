import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { CrewRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const crewUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1).max(20).optional(),
  primaryRole: z.nativeEnum(CrewRole).optional(),
  bio: z.string().max(1000).nullable().optional(),
  experienceYrs: z.number().int().min(0).max(99).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  const { id: crewId } = await params;

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

    // Verify crew exists and user has access (via charter ownership)
    const existingCrew = await prisma.crewMember.findUnique({
      where: { id: crewId },
      include: {
        charterAssignments: {
          include: {
            charter: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!existingCrew) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Crew member not found" }, { status: 404 })
      );
    }

    // Check if user owns at least one charter this crew is assigned to
    const hasAccess = existingCrew.charterAssignments.some(
      (assignment) => assignment.charter.ownerId === effectiveUserId
    );

    if (!hasAccess) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    // Parse and validate body
    const body = await req.json();
    const validationResult = crewUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Crew update validation failed", {
        userId: effectiveUserId,
        crewId,
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

    // Update crew member
    const updatedCrew = await prisma.crewMember.update({
      where: { id: crewId },
      data,
    });

    logger.info("Crew member updated", {
      userId: effectiveUserId,
      crewId,
      ms: Date.now() - start,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        crew: updatedCrew,
      })
    );
  } catch (error) {
    logger.error("Crew update error", {
      error: error instanceof Error ? error.message : "Unknown error",
      crewId,
      ms: Date.now() - start,
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to update crew member" },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  const { id: crewId } = await params;

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

    // Verify crew exists and user has access
    const existingCrew = await prisma.crewMember.findUnique({
      where: { id: crewId },
      include: {
        charterAssignments: {
          include: {
            charter: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!existingCrew) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Crew member not found" }, { status: 404 })
      );
    }

    // Check if user owns at least one charter this crew is assigned to
    const hasAccess = existingCrew.charterAssignments.some(
      (assignment) => assignment.charter.ownerId === effectiveUserId
    );

    if (!hasAccess) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    // Delete crew member (cascade will handle charter assignments)
    await prisma.crewMember.delete({
      where: { id: crewId },
    });

    logger.info("Crew member deleted", {
      userId: effectiveUserId,
      crewId,
      ms: Date.now() - start,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
      })
    );
  } catch (error) {
    logger.error("Crew deletion error", {
      error: error instanceof Error ? error.message : "Unknown error",
      crewId,
      ms: Date.now() - start,
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to delete crew member" },
        { status: 500 }
      )
    );
  }
}

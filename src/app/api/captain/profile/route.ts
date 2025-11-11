import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  displayName: z.string().min(1, "Display name is required").max(100),
  phone: z.string().min(1, "Phone is required").max(20),
  backupPhone: z.string().max(20).nullable().optional(),
  bio: z.string().max(1000, "Bio must be less than 1000 characters"),
  experienceYrs: z.number().int().min(0).max(99),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
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
    const validationResult = profileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Profile update validation failed", {
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

    // Check if profile exists
    const existingProfile = await prisma.captainProfile.findUnique({
      where: { userId: effectiveUserId },
    });

    if (!existingProfile) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Profile not found" }, { status: 404 })
      );
    }

    // Update profile
    const updatedProfile = await prisma.captainProfile.update({
      where: { userId: effectiveUserId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName,
        phone: data.phone,
        ...(data.backupPhone !== undefined && {
          backupPhone: data.backupPhone,
        }),
        bio: data.bio,
        experienceYrs: data.experienceYrs,
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    logger.info("Captain profile updated", {
      userId: effectiveUserId,
      profileId: updatedProfile.id,
      ms: Date.now() - start,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        profile: updatedProfile,
      })
    );
  } catch (error) {
    logger.error("Profile update error", {
      error: error instanceof Error ? error.message : "Unknown error",
      ms: Date.now() - start,
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    );
  }
}

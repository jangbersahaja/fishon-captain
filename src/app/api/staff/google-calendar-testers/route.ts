/**
 * Google Calendar Test Users Management API
 *
 * GET /api/staff/google-calendar-testers
 * - List all users with googleCalendarTestUser = true
 *
 * POST /api/staff/google-calendar-testers
 * - Add a user as a test user by email
 *
 * DELETE /api/staff/google-calendar-testers
 * - Remove a user from test users by userId
 */

import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Check if user is STAFF or ADMIN
async function requireStaffOrAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return { error: "Forbidden - Staff or Admin only", status: 403 };
  }

  return { userId: session.user.id, role: user.role };
}

// GET - List all test users
export async function GET() {
  try {
    const auth = await requireStaffOrAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const testUsers = await prisma.user.findMany({
      where: { googleCalendarTestUser: true },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        googleCalendarSettings: {
          select: {
            isConnected: true,
            connectedAt: true,
            googleEmail: true,
            lastSyncAt: true,
          },
        },
        captainProfile: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format response
    const formatted = testUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name:
        u.captainProfile?.displayName ||
        u.name ||
        `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
        u.email,
      role: u.role,
      createdAt: u.createdAt,
      googleCalendar: u.googleCalendarSettings
        ? {
            isConnected: u.googleCalendarSettings.isConnected,
            connectedAt: u.googleCalendarSettings.connectedAt,
            googleEmail: u.googleCalendarSettings.googleEmail,
            lastSyncAt: u.googleCalendarSettings.lastSyncAt,
          }
        : null,
    }));

    return NextResponse.json({ testUsers: formatted });
  } catch (error) {
    logger.error("[google-calendar-testers] GET error", { error });
    return NextResponse.json(
      { error: "Failed to fetch test users" },
      { status: 500 }
    );
  }
}

// POST - Add a test user
const AddTestUserSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffOrAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parseResult = AddTestUserSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        googleCalendarTestUser: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${email}` },
        { status: 404 }
      );
    }

    if (user.googleCalendarTestUser) {
      return NextResponse.json(
        { error: `User is already a test user: ${email}` },
        { status: 400 }
      );
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { googleCalendarTestUser: true },
    });

    logger.info("[google-calendar-testers] Added test user", {
      addedBy: auth.userId,
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      message: `Added ${email} as a Google Calendar test user`,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    logger.error("[google-calendar-testers] POST error", { error });
    return NextResponse.json(
      { error: "Failed to add test user" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a test user
const RemoveTestUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireStaffOrAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parseResult = RemoveTestUserSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { userId } = parseResult.data;

    // Find and update user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, googleCalendarTestUser: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.googleCalendarTestUser) {
      return NextResponse.json(
        { error: "User is not a test user" },
        { status: 400 }
      );
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { googleCalendarTestUser: false },
    });

    logger.info("[google-calendar-testers] Removed test user", {
      removedBy: auth.userId,
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      message: `Removed ${user.email} from Google Calendar test users`,
    });
  } catch (error) {
    logger.error("[google-calendar-testers] DELETE error", { error });
    return NextResponse.json(
      { error: "Failed to remove test user" },
      { status: 500 }
    );
  }
}

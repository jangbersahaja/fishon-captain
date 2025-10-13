/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 * Requires current password confirmation
 */

import { authOptions } from "@/lib/auth";
import { sendPasswordChangedNotification } from "@/lib/email";
import { applySecurityHeaders } from "@/lib/headers";
import { validatePassword, validatePasswordWithHistory } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;

    // Rate limiting: 3 attempts per hour per user
    const rateLimitResult = await rateLimit({
      key: `change-password:${userId}`,
      windowMs: 60 * 60 * 1000,
      max: 3,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Too many password change attempts. Please try again later.",
          },
          { status: 429 }
        )
      );
    }

    // Parse request body
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              "Missing required fields: currentPassword, newPassword, confirmPassword",
          },
          { status: 400 }
        )
      );
    }

    if (newPassword !== confirmPassword) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "New passwords do not match" },
          { status: 400 }
        )
      );
    }

    // Get user with password history
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        PasswordHistory: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { passwordHash: true },
        },
      },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    if (!user.passwordHash) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              'This account uses OAuth authentication only. Use "Set Password" to create a password.',
          },
          { status: 400 }
        )
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        )
      );
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "New password does not meet requirements",
            errors: passwordValidation.errors,
          },
          { status: 400 }
        )
      );
    }

    // Check password history
    const previousHashes = user.PasswordHistory.map((h) => h.passwordHash);
    const historyCheck = await validatePasswordWithHistory(
      newPassword,
      previousHashes
    );
    if (!historyCheck.valid) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Password validation failed",
            errors: historyCheck.errors,
          },
          { status: 400 }
        )
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
      },
    });

    // Add old password to history
    await prisma.passwordHistory.create({
      data: {
        id: `${userId}-${Date.now()}`,
        userId,
        passwordHash: user.passwordHash,
      },
    });

    // Send notification email
    if (user.email) {
      await sendPasswordChangedNotification(user.email, user.name || "User");
    }

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message: "Password changed successfully",
      })
    );
  } catch (error) {
    console.error("[change-password] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to change password" }, { status: 500 })
    );
  }
}

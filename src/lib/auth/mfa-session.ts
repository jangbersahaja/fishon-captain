/**
 * MFA Session Utilities
 * Handles temporary MFA session tokens for multi-step authentication
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const MFA_SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface MFAPendingSession {
  userId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Create a temporary MFA session token
 * Valid for 10 minutes to complete MFA challenge
 *
 * @param userId - User ID requiring MFA
 * @returns Session token to be sent to client
 */
export async function createMFAPendingSession(userId: string): Promise<string> {
  // Generate secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MFA_SESSION_EXPIRY_MS);

  // Store in database (using User model's OTP fields with purpose "MFA_CHALLENGE")
  await prisma.user.update({
    where: { id: userId },
    data: {
      otpCode: token, // Reusing OTP field for MFA token
      otpPurpose: "MFA_CHALLENGE", // MFA challenge purpose
      otpExpires: expiresAt,
      otpAttempts: 0,
    },
  });

  return token;
}

/**
 * Verify and consume an MFA session token
 *
 * @param token - Session token from client
 * @returns User ID if valid, null if invalid/expired
 */
export async function verifyMFAPendingSession(
  token: string
): Promise<string | null> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        otpCode: token,
        otpPurpose: "MFA_CHALLENGE",
        otpExpires: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    // Consume token (clear OTP fields after use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpPurpose: null,
        otpExpires: null,
        otpAttempts: 0,
      },
    });

    return user.id;
  } catch {
    return null;
  }
}

/**
 * Clean up expired MFA session tokens
 */
export async function cleanupExpiredMFASessions(): Promise<void> {
  try {
    await prisma.user.updateMany({
      where: {
        otpPurpose: "MFA_CHALLENGE",
        otpExpires: { lt: new Date() },
      },
      data: {
        otpCode: null,
        otpPurpose: null,
        otpExpires: null,
        otpAttempts: 0,
      },
    });
  } catch (error) {
    console.error("[mfa-session] Cleanup failed:", error);
  }
}

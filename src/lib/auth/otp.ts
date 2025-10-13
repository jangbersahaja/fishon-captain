/**
 * OTP/TAC Verification System
 * Unified system for email verification and password reset
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type OTPPurpose = "email_verification" | "password_reset";

export interface OTPGenerationResult {
  success: boolean;
  code?: string;
  error?: string;
  cooldownSeconds?: number;
}

export interface OTPValidationResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
  lockedUntilMinutes?: number;
}

export const OTP_LIMITS = {
  MAX_REQUESTS_PER_HOUR: 5,
  MAX_REQUESTS_PER_DAY: 10,
  COOLDOWN_BETWEEN_REQUESTS: 60,
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  CODE_EXPIRY_MINUTES: 5,
};

export function generateOTP(): string {
  const code = crypto.randomInt(100000, 999999);
  return code.toString();
}

export async function createOTP(
  email: string,
  purpose: OTPPurpose
): Promise<OTPGenerationResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        lastOtpSentAt: true,
        otpPurpose: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.lastOtpSentAt) {
      const secondsSinceLastOTP =
        (Date.now() - user.lastOtpSentAt.getTime()) / 1000;
      if (secondsSinceLastOTP < OTP_LIMITS.COOLDOWN_BETWEEN_REQUESTS) {
        const cooldownRemaining = Math.ceil(
          OTP_LIMITS.COOLDOWN_BETWEEN_REQUESTS - secondsSinceLastOTP
        );
        return {
          success: false,
          error: "Please wait before requesting another code",
          cooldownSeconds: cooldownRemaining,
        };
      }
    }

    const code = generateOTP();
    const expiresAt = new Date(
      Date.now() + OTP_LIMITS.CODE_EXPIRY_MINUTES * 60 * 1000
    );

    await prisma.user.update({
      where: { email },
      data: {
        otpCode: code,
        otpExpires: expiresAt,
        otpAttempts: 0,
        otpPurpose: purpose,
        lastOtpSentAt: new Date(),
      },
    });

    return { success: true, code };
  } catch (error) {
    console.error("[otp] Error generating OTP:", error);
    return {
      success: false,
      error: "Failed to generate verification code",
    };
  }
}

export async function validateOTP(
  email: string,
  code: string,
  purpose: OTPPurpose,
  consumeOnSuccess: boolean = true
): Promise<OTPValidationResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        otpCode: true,
        otpExpires: true,
        otpAttempts: true,
        otpPurpose: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLocked = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      return {
        success: false,
        error: "Account temporarily locked. Please try again later.",
        lockedUntilMinutes: minutesLocked,
      };
    }

    if (!user.otpCode || !user.otpExpires) {
      return {
        success: false,
        error: "No verification code found. Please request a new one.",
      };
    }

    if (user.otpPurpose !== purpose) {
      return {
        success: false,
        error: "Invalid verification code",
      };
    }

    if (user.otpExpires < new Date()) {
      await prisma.user.update({
        where: { email },
        data: {
          otpCode: null,
          otpExpires: null,
          otpAttempts: 0,
          otpPurpose: null,
        },
      });
      return {
        success: false,
        error: "Verification code expired. Please request a new one.",
      };
    }

    if (user.otpAttempts >= OTP_LIMITS.MAX_ATTEMPTS) {
      const lockUntil = new Date(
        Date.now() + OTP_LIMITS.LOCKOUT_DURATION_MINUTES * 60 * 1000
      );
      await prisma.user.update({
        where: { email },
        data: {
          lockedUntil: lockUntil,
          otpCode: null,
          otpExpires: null,
          otpAttempts: 0,
          otpPurpose: null,
        },
      });
      return {
        success: false,
        error: "Too many failed attempts. Account locked for 15 minutes.",
        lockedUntilMinutes: OTP_LIMITS.LOCKOUT_DURATION_MINUTES,
      };
    }

    if (user.otpCode !== code) {
      const newAttempts = user.otpAttempts + 1;
      await prisma.user.update({
        where: { email },
        data: { otpAttempts: newAttempts },
      });

      const attemptsRemaining = OTP_LIMITS.MAX_ATTEMPTS - newAttempts;
      return {
        success: false,
        error: "Invalid verification code",
        attemptsRemaining,
      };
    }

    // Only consume the OTP if requested (for email verification)
    // For password reset, we want to keep it available for the actual reset
    if (consumeOnSuccess) {
      await prisma.user.update({
        where: { email },
        data: {
          otpCode: null,
          otpExpires: null,
          otpAttempts: 0,
          otpPurpose: null,
        },
      });
    } else {
      // Just reset attempts but keep the OTP available
      await prisma.user.update({
        where: { email },
        data: {
          otpAttempts: 0,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[otp] Error validating OTP:", error);
    return {
      success: false,
      error: "Failed to verify code",
    };
  }
}

export async function canRequestOTP(email: string): Promise<{
  canRequest: boolean;
  cooldownSeconds?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { lastOtpSentAt: true },
  });

  if (!user || !user.lastOtpSentAt) {
    return { canRequest: true };
  }

  const secondsSinceLastOTP =
    (Date.now() - user.lastOtpSentAt.getTime()) / 1000;
  if (secondsSinceLastOTP < OTP_LIMITS.COOLDOWN_BETWEEN_REQUESTS) {
    const cooldownRemaining = Math.ceil(
      OTP_LIMITS.COOLDOWN_BETWEEN_REQUESTS - secondsSinceLastOTP
    );
    return { canRequest: false, cooldownSeconds: cooldownRemaining };
  }

  return { canRequest: true };
}

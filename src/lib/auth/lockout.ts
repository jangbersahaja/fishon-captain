/**
 * Account lockout utilities for preventing brute force attacks
 */

import { prisma } from "@/lib/prisma";

export interface LockoutConfig {
  maxAttempts: number;
  lockoutDurationMinutes: number;
  resetAttemptsAfterMinutes: number;
}

const DEFAULT_CONFIG: LockoutConfig = {
  maxAttempts: 5,
  lockoutDurationMinutes: 15,
  resetAttemptsAfterMinutes: 60,
};

export interface LockoutStatus {
  isLocked: boolean;
  attemptsRemaining: number;
  lockedUntil?: Date;
  minutesUntilUnlock?: number;
}

export async function checkLockoutStatus(
  userId: string,
  config: Partial<LockoutConfig> = {}
): Promise<LockoutStatus> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      loginAttempts: true,
      lockedUntil: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return {
      isLocked: false,
      attemptsRemaining: cfg.maxAttempts,
    };
  }

  const now = new Date();

  if (user.lockedUntil && user.lockedUntil > now) {
    const minutesUntilUnlock = Math.ceil(
      (user.lockedUntil.getTime() - now.getTime()) / 1000 / 60
    );

    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockedUntil: user.lockedUntil,
      minutesUntilUnlock,
    };
  }

  if (user.lockedUntil && user.lockedUntil <= now) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      isLocked: false,
      attemptsRemaining: cfg.maxAttempts,
    };
  }

  const minutesSinceLastAttempt =
    (now.getTime() - user.updatedAt.getTime()) / 1000 / 60;

  if (minutesSinceLastAttempt > cfg.resetAttemptsAfterMinutes) {
    await prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: 0 },
    });

    return {
      isLocked: false,
      attemptsRemaining: cfg.maxAttempts,
    };
  }

  return {
    isLocked: false,
    attemptsRemaining: Math.max(0, cfg.maxAttempts - user.loginAttempts),
  };
}

export async function recordFailedAttempt(
  userId: string,
  config: Partial<LockoutConfig> = {}
): Promise<LockoutStatus> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const status = await checkLockoutStatus(userId, cfg);

  if (status.isLocked) {
    return status;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      loginAttempts: {
        increment: 1,
      },
    },
    select: {
      loginAttempts: true,
    },
  });

  if (user.loginAttempts >= cfg.maxAttempts) {
    const lockedUntil = new Date(
      Date.now() + cfg.lockoutDurationMinutes * 60 * 1000
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil,
      },
    });

    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockedUntil,
      minutesUntilUnlock: cfg.lockoutDurationMinutes,
    };
  }

  return {
    isLocked: false,
    attemptsRemaining: cfg.maxAttempts - user.loginAttempts,
  };
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
    },
  });
}

export async function unlockAccount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
    },
  });
}

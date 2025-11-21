/**
 * Verification Status Service
 * Query and return verification status for a captain
 */

import { prisma } from "@/lib/prisma";
import type { CaptainVerification } from "@prisma/client";

/**
 * Get verification status for a captain user
 *
 * @param userId - Captain's user ID
 * @returns Verification record with all fields, or null if no verification exists
 */
export async function getVerificationStatus(
  userId: string
): Promise<CaptainVerification | null> {
  return prisma.captainVerification.findUnique({
    where: { userId },
  });
}

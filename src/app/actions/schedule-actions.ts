"use server";

import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { CharterSchedule } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

const VALID_SCHEDULE_TYPES = ["EVERYDAY", "WEEKDAYS", "WEEKENDS", "CUSTOM"];
const VALID_OPERATIONAL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday

/**
 * Response type for schedule actions
 */
export type ScheduleActionResponse<T = CharterSchedule> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Fetch the charter schedule for a specific charter
 *
 * - Verify user is authenticated
 * - Verify captain owns the charter
 * - Fetch and return CharterSchedule
 */
export async function getCharterSchedule(
  charterId: string
): Promise<ScheduleActionResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn("getCharterSchedule: Unauthorized attempt", { charterId });
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const userId = session.user.id;

    // Get the captain profile
    const captainProfile = await prisma.captainProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!captainProfile) {
      logger.warn("getCharterSchedule: User has no captain profile", {
        userId,
        charterId,
      });
      return {
        success: false,
        error: "Captain profile not found",
      };
    }

    // Verify captain owns the charter
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { captainId: true },
    });

    if (!charter) {
      logger.warn("getCharterSchedule: Charter not found", {
        charterId,
        userId,
      });
      return {
        success: false,
        error: "Charter not found",
      };
    }

    if (charter.captainId !== captainProfile.id) {
      logger.warn("getCharterSchedule: Unauthorized charter access", {
        charterId,
        userId,
        captainId: captainProfile.id,
      });
      return {
        success: false,
        error: "Forbidden: You don't own this charter",
      };
    }

    // Fetch the schedule
    const schedule = await prisma.charterSchedule.findUnique({
      where: { charterId },
    });

    if (!schedule) {
      logger.info("getCharterSchedule: No schedule found, returning null", {
        charterId,
        userId,
      });
      return {
        success: true,
        data: undefined,
      };
    }

    logger.info("getCharterSchedule: Schedule fetched successfully", {
      charterId,
      userId,
      scheduleId: schedule.id,
    });

    return {
      success: true,
      data: schedule,
    };
  } catch (error) {
    logger.error("getCharterSchedule: Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      charterId,
    });

    return {
      success: false,
      error: "Failed to fetch charter schedule",
    };
  }
}

/**
 * Update or create charter schedule
 *
 * - Verify user is authenticated
 * - Verify captain owns the charter
 * - Validate scheduleType is one of: EVERYDAY, WEEKDAYS, WEEKENDS, CUSTOM
 * - Validate operationalDays (if provided): must be array of numbers 0-6
 * - Use upsert to create if doesn't exist, update if exists
 * - Revalidate calendar page after successful update
 */
export async function updateCharterSchedule(
  charterId: string,
  scheduleType: string,
  operationalDays?: number[]
): Promise<ScheduleActionResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn("updateCharterSchedule: Unauthorized attempt", {
        charterId,
        scheduleType,
      });
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const userId = session.user.id;

    // Validate scheduleType
    if (!VALID_SCHEDULE_TYPES.includes(scheduleType)) {
      logger.warn("updateCharterSchedule: Invalid scheduleType", {
        charterId,
        userId,
        scheduleType,
        validTypes: VALID_SCHEDULE_TYPES,
      });
      return {
        success: false,
        error: `Invalid scheduleType. Must be one of: ${VALID_SCHEDULE_TYPES.join(", ")}`,
      };
    }

    // Validate operationalDays if provided
    if (operationalDays !== undefined) {
      if (!Array.isArray(operationalDays)) {
        logger.warn("updateCharterSchedule: operationalDays is not an array", {
          charterId,
          userId,
          operationalDays,
        });
        return {
          success: false,
          error: "operationalDays must be an array",
        };
      }

      // Check all values are valid day numbers (0-6)
      const invalidDays = operationalDays.filter(
        (day) => !VALID_OPERATIONAL_DAYS.includes(day)
      );
      if (invalidDays.length > 0) {
        logger.warn("updateCharterSchedule: Invalid days in operationalDays", {
          charterId,
          userId,
          invalidDays,
          validDays: VALID_OPERATIONAL_DAYS,
        });
        return {
          success: false,
          error:
            "operationalDays must be array of numbers 0-6 (Sunday=0 to Saturday=6)",
        };
      }

      // If CUSTOM, operationalDays should not be empty
      if (scheduleType === "CUSTOM" && operationalDays.length === 0) {
        logger.warn(
          "updateCharterSchedule: CUSTOM scheduleType requires operationalDays",
          { charterId, userId }
        );
        return {
          success: false,
          error: "CUSTOM scheduleType requires at least one operational day",
        };
      }
    }

    // Get the captain profile
    const captainProfile = await prisma.captainProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!captainProfile) {
      logger.warn("updateCharterSchedule: User has no captain profile", {
        userId,
        charterId,
      });
      return {
        success: false,
        error: "Captain profile not found",
      };
    }

    // Verify captain owns the charter
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { captainId: true },
    });

    if (!charter) {
      logger.warn("updateCharterSchedule: Charter not found", {
        charterId,
        userId,
      });
      return {
        success: false,
        error: "Charter not found",
      };
    }

    if (charter.captainId !== captainProfile.id) {
      logger.warn("updateCharterSchedule: Unauthorized charter access", {
        charterId,
        userId,
        captainId: captainProfile.id,
      });
      return {
        success: false,
        error: "Forbidden: You don't own this charter",
      };
    }

    // Prepare operational days data
    const finalOperationalDays =
      scheduleType === "CUSTOM" && operationalDays ? operationalDays : [];

    // Upsert the schedule (create if doesn't exist, update if exists)
    const schedule = await prisma.charterSchedule.upsert({
      where: { charterId },
      create: {
        charterId,
        scheduleType: scheduleType as
          | "EVERYDAY"
          | "WEEKDAYS"
          | "WEEKENDS"
          | "CUSTOM",
        operationalDays: finalOperationalDays,
      },
      update: {
        scheduleType: scheduleType as
          | "EVERYDAY"
          | "WEEKDAYS"
          | "WEEKENDS"
          | "CUSTOM",
        operationalDays: finalOperationalDays,
      },
    });

    logger.info("updateCharterSchedule: Schedule updated successfully", {
      charterId,
      userId,
      scheduleId: schedule.id,
      scheduleType,
      operationalDaysCount: finalOperationalDays.length,
    });

    // Revalidate calendar page
    revalidatePath("/captain/calendar");

    return {
      success: true,
      data: schedule,
    };
  } catch (error) {
    logger.error("updateCharterSchedule: Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      charterId,
      scheduleType,
    });

    return {
      success: false,
      error: "Failed to update charter schedule",
    };
  }
}

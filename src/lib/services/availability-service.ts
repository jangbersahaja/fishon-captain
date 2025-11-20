/**
 * Charter Availability Service
 *
 * Handles operational schedule and unavailability checks for charter bookings.
 *
 * @module availability-service
 */

import {
  CharterSchedule,
  CharterUnavailability,
  PrismaClient,
  ScheduleType,
} from "@prisma/client";
import { endOfDay, isWithinInterval, startOfDay } from "date-fns";

const prisma = new PrismaClient();

/**
 * Check if a date falls on an operational day based on charter schedule.
 *
 * @param date - Date to check
 * @param schedule - Charter schedule configuration
 * @returns true if charter operates on this day
 */
export function isOperationalDay(
  date: Date,
  schedule: CharterSchedule
): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  switch (schedule.scheduleType) {
    case ScheduleType.EVERYDAY:
      return true;

    case ScheduleType.WEEKDAYS:
      // Monday (1) to Friday (5)
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case ScheduleType.WEEKENDS:
      // Saturday (6) and Sunday (0)
      return dayOfWeek === 0 || dayOfWeek === 6;

    case ScheduleType.CUSTOM:
      // operationalDays is an array of day numbers [0-6]
      return schedule.operationalDays.includes(dayOfWeek);

    default:
      // Fallback: assume operational
      return true;
  }
}

/**
 * Check if a date falls within any unavailability range.
 *
 * @param date - Date to check
 * @param unavailability - Array of unavailability records
 * @returns The blocking unavailability record if found, null otherwise
 */
export function isUnavailable(
  date: Date,
  unavailability: CharterUnavailability[]
): CharterUnavailability | null {
  const checkDate = startOfDay(date);

  for (const block of unavailability) {
    const blockStart = startOfDay(block.startDate);
    const blockEnd = endOfDay(block.endDate);

    if (isWithinInterval(checkDate, { start: blockStart, end: blockEnd })) {
      return block;
    }
  }

  return null;
}

/**
 * Comprehensive availability check for a specific date.
 *
 * @param charterId - Charter ID
 * @param date - Date to check
 * @returns Object with availability status and reason if unavailable
 */
export async function checkDateAvailability(
  charterId: string,
  date: Date
): Promise<{ available: boolean; reason?: string; unavailabilityId?: string }> {
  // Fetch schedule and unavailability records
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      schedule: true,
      unavailability: {
        where: {
          startDate: { lte: endOfDay(date) },
          endDate: { gte: startOfDay(date) },
        },
      },
    },
  });

  if (!charter) {
    return { available: false, reason: "Charter not found" };
  }

  // Check if charter has a schedule (should always have one after seeding)
  if (!charter.schedule) {
    return { available: false, reason: "Charter schedule not configured" };
  }

  // Check operational schedule
  if (!isOperationalDay(date, charter.schedule)) {
    const scheduleTypeLabel = {
      [ScheduleType.EVERYDAY]: "operates every day",
      [ScheduleType.WEEKDAYS]: "only operates on weekdays (Mon-Fri)",
      [ScheduleType.WEEKENDS]: "only operates on weekends (Sat-Sun)",
      [ScheduleType.CUSTOM]: "does not operate on this day",
    }[charter.schedule.scheduleType];

    return { available: false, reason: `Charter ${scheduleTypeLabel}` };
  }

  // Check unavailability blocks
  const block = isUnavailable(date, charter.unavailability);
  if (block) {
    return {
      available: false,
      reason: block.reason || "Charter is unavailable on this date",
      unavailabilityId: block.id,
    };
  }

  return { available: true };
}

/**
 * Validate if an unavailability range can be created.
 *
 * NOTE: Booking conflict validation is handled by fishon-market's booking service.
 * This function checks for overlapping unavailability blocks only.
 *
 * @param charterId - Charter ID
 * @param startDate - Start date of unavailability
 * @param endDate - End date of unavailability
 * @param excludeId - Optional unavailability ID to exclude (for updates)
 * @returns Object with validation result
 */
export async function validateUnavailability(
  charterId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string
): Promise<{
  canCreate: boolean;
  message?: string;
  conflict?: CharterUnavailability;
}> {
  // Check for overlapping unavailability blocks
  const conflict = await prisma.charterUnavailability.findFirst({
    where: {
      charterId,
      id: excludeId ? { not: excludeId } : undefined,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    orderBy: { startDate: "asc" },
  });

  if (conflict) {
    return {
      canCreate: false,
      message: "Date range overlaps with existing unavailability block",
      conflict,
    };
  }

  return { canCreate: true };
}

/**
 * Get availability status for a date range (for calendar display).
 *
 * @param charterId - Charter ID
 * @param startDate - Start date of range
 * @param endDate - End date of range
 * @returns Array of date availability objects
 */
export async function getAvailabilityForRange(
  charterId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; available: boolean; reason?: string }>> {
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      schedule: true,
      unavailability: {
        where: {
          OR: [
            {
              startDate: { lte: endOfDay(endDate) },
              endDate: { gte: startOfDay(startDate) },
            },
          ],
        },
      },
    },
  });

  if (!charter || !charter.schedule) {
    return [];
  }

  const results: Array<{ date: Date; available: boolean; reason?: string }> =
    [];

  // Create date objects in local timezone to ensure consistent day-of-week calculation
  // This matches the approach used in fishon-market's availability-helpers.ts
  const currentDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const endDateLocal = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );

  while (currentDate <= endDateLocal) {
    // Create a clean copy for this iteration
    const dateToCheck = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );

    // Check operational schedule
    const isOperational = isOperationalDay(dateToCheck, charter.schedule);
    if (!isOperational) {
      results.push({
        date: dateToCheck,
        available: false,
        reason: "Not operational",
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check unavailability blocks
    const block = isUnavailable(dateToCheck, charter.unavailability);
    if (block) {
      results.push({
        date: dateToCheck,
        available: false,
        reason: block.reason || "Unavailable",
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Date is available
    results.push({
      date: dateToCheck,
      available: true,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
}

/**
 * Simulate schedule change to check which dates would become non-operational.
 *
 * Used by UI to show captain which dates would be affected before confirming change.
 *
 * @param charterId - Charter ID
 * @param newScheduleType - New schedule type to test
 * @param newOperationalDays - New operational days array (for CUSTOM type)
 * @param dateRange - Optional date range to check (defaults to next 90 days)
 * @returns Array of dates that would become non-operational
 */
export function getAffectedDatesByScheduleChange(
  newScheduleType: ScheduleType,
  newOperationalDays: number[],
  dateRange?: { start: Date; end: Date }
): Date[] {
  // Create a mock schedule object
  const mockSchedule: CharterSchedule = {
    id: "mock",
    charterId: "mock",
    scheduleType: newScheduleType,
    operationalDays: newOperationalDays,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Default to next 90 days if not provided
  const start = dateRange?.start || new Date();
  const end = dateRange?.end || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const affectedDates: Date[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dateToCheck = new Date(currentDate);
    if (!isOperationalDay(dateToCheck, mockSchedule)) {
      affectedDates.push(dateToCheck);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return affectedDates;
}

/**
 * Check if a date conflicts with schedule or unavailability.
 *
 * Simple wrapper for checkDateAvailability with standardized response format.
 *
 * @param charterId - Charter ID
 * @param bookingDate - Proposed booking date
 * @returns Object with conflict status and details
 */
export async function checkBookingConflict(
  charterId: string,
  bookingDate: Date
): Promise<{
  hasConflict: boolean;
  type?: "schedule" | "unavailability";
  message?: string;
}> {
  const availability = await checkDateAvailability(charterId, bookingDate);

  if (availability.available) {
    return { hasConflict: false };
  }

  // Determine conflict type
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: { schedule: true, unavailability: true },
  });

  if (!charter || !charter.schedule) {
    return {
      hasConflict: true,
      type: "schedule",
      message: "Charter schedule not configured",
    };
  }

  // Check if it's a schedule issue
  if (!isOperationalDay(bookingDate, charter.schedule)) {
    return {
      hasConflict: true,
      type: "schedule",
      message: availability.reason,
    };
  }

  // Must be an unavailability block
  return {
    hasConflict: true,
    type: "unavailability",
    message: availability.reason,
  };
}

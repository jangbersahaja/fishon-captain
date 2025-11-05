/**
 * Availability Helpers
 *
 * Calculate blocked dates from charter schedule and unavailability.
 * Client-side version for CharterCalendar component.
 */

export interface CharterSchedule {
  scheduleType: string;
  operationalDays: number[];
}

export interface UnavailabilityPeriod {
  startDate: string | Date;
  endDate: string | Date;
  reason?: string | null;
}

/**
 * Format Date object to YYYY-MM-DD string
 */
export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Check if a date falls on an operational day based on charter schedule
 */
export function isOperationalDay(
  date: Date,
  schedule: CharterSchedule | null
): boolean {
  if (!schedule) return true;

  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  switch (schedule.scheduleType) {
    case "EVERYDAY":
      return true;

    case "WEEKDAYS":
      // Monday (1) to Friday (5)
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case "WEEKENDS":
      // Saturday (6) and Sunday (0)
      return dayOfWeek === 0 || dayOfWeek === 6;

    case "CUSTOM":
      // operationalDays is an array of day numbers [0-6]
      return schedule.operationalDays.includes(dayOfWeek);

    default:
      // Fallback: assume operational
      return true;
  }
}

/**
 * Check if a date falls within any unavailability range
 */
export function isUnavailable(
  date: Date,
  unavailability: UnavailabilityPeriod[]
): { blocked: boolean; reason?: string } {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  for (const block of unavailability) {
    // Parse dates using local time
    const blockStartStr =
      typeof block.startDate === "string"
        ? block.startDate
        : formatDateYMD(block.startDate);
    const blockEndStr =
      typeof block.endDate === "string"
        ? block.endDate
        : formatDateYMD(block.endDate);

    // Extract just the YYYY-MM-DD part if ISO string
    const startDateOnly = blockStartStr.split("T")[0];
    const endDateOnly = blockEndStr.split("T")[0];

    // Parse YYYY-MM-DD strings to local dates
    const [sy, sm, sd] = startDateOnly.split("-").map(Number);
    const [ey, em, ed] = endDateOnly.split("-").map(Number);
    const blockStart = new Date(sy, sm - 1, sd);
    const blockEnd = new Date(ey, em - 1, ed);

    blockStart.setHours(0, 0, 0, 0);
    blockEnd.setHours(0, 0, 0, 0);

    if (checkDate >= blockStart && checkDate <= blockEnd) {
      return {
        blocked: true,
        reason: block.reason || "Unavailable",
      };
    }
  }

  return { blocked: false };
}

/**
 * Get availability status for a date range (for calendar display)
 */
export function getAvailabilityForRange(
  schedule: CharterSchedule | null,
  unavailability: UnavailabilityPeriod[],
  startDate: Date,
  endDate: Date
): Array<{ date: string; available: boolean; reason?: string }> {
  const results: Array<{ date: string; available: boolean; reason?: string }> =
    [];

  // Create date objects in local timezone
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
    const isOperational = isOperationalDay(dateToCheck, schedule);
    if (!isOperational) {
      results.push({
        date: formatDateYMD(dateToCheck),
        available: false,
        reason: "Not operational",
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check unavailability blocks
    const unavailableCheck = isUnavailable(dateToCheck, unavailability);
    if (unavailableCheck.blocked) {
      results.push({
        date: formatDateYMD(dateToCheck),
        available: false,
        reason: unavailableCheck.reason,
      });
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Date is available
    results.push({
      date: formatDateYMD(dateToCheck),
      available: true,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
}

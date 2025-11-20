/**
 * Helper functions for managing charter operational schedules
 */

/**
 * Get array of operational day numbers (0-6) based on schedule type
 * @param scheduleType - Type of schedule: EVERYDAY, WEEKDAYS, WEEKENDS, or CUSTOM
 * @param customDays - Array of operational day numbers (0-6) for CUSTOM schedule type
 * @returns Array of operational day numbers (0=Sunday, 6=Saturday)
 */
export function getOperationalDaysArray(
  scheduleType?: string,
  customDays?: number[]
): number[] {
  if (!scheduleType) return [];

  switch (scheduleType) {
    case "EVERYDAY":
      return [0, 1, 2, 3, 4, 5, 6];
    case "WEEKDAYS":
      return [1, 2, 3, 4, 5];
    case "WEEKENDS":
      return [0, 6];
    case "CUSTOM":
      return customDays && customDays.length > 0 ? customDays : [];
    default:
      return [];
  }
}

/**
 * Check if a specific date is an operational day
 * @param date - The date to check
 * @param scheduleType - Type of schedule: EVERYDAY, WEEKDAYS, WEEKENDS, or CUSTOM
 * @param customDays - Array of operational day numbers for CUSTOM schedule type
 * @returns true if the date is operational, false otherwise
 */
export function isOperationalDay(
  date: Date,
  scheduleType?: string,
  customDays?: number[]
): boolean {
  if (!scheduleType) return false;

  const dayOfWeek = date.getDay(); // 0-6 (0=Sunday)
  const operationalDays = getOperationalDaysArray(scheduleType, customDays);

  return operationalDays.includes(dayOfWeek);
}

/**
 * Get day name from day number
 * @param dayNum - Day number (0-6)
 * @returns Short day name (Sun, Mon, etc.)
 */
export function getDayName(dayNum: number): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dayNum] || "";
}

/**
 * Get full day name from day number
 * @param dayNum - Day number (0-6)
 * @returns Full day name (Sunday, Monday, etc.)
 */
export function getFullDayName(dayNum: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayNum] || "";
}

/**
 * Get list of operational day names for display
 * @param scheduleType - Type of schedule
 * @param customDays - Array of operational day numbers for CUSTOM schedule
 * @returns Array of day names
 */
export function getOperationalDayNames(
  scheduleType?: string,
  customDays?: number[]
): string[] {
  const operationalDays = getOperationalDaysArray(scheduleType, customDays);
  return operationalDays.map((day) => getFullDayName(day));
}

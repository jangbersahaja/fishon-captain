import {
  getDayName,
  getFullDayName,
  getOperationalDayNames,
  getOperationalDaysArray,
  isOperationalDay,
} from "../schedule-helpers";

describe("schedule-helpers", () => {
  describe("getOperationalDaysArray", () => {
    it("returns all days for EVERYDAY", () => {
      const result = getOperationalDaysArray("EVERYDAY");
      expect(result).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it("returns weekdays for WEEKDAYS", () => {
      const result = getOperationalDaysArray("WEEKDAYS");
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it("returns weekends for WEEKENDS", () => {
      const result = getOperationalDaysArray("WEEKENDS");
      expect(result).toEqual([0, 6]);
    });

    it("returns custom days for CUSTOM", () => {
      const customDays = [1, 3, 5];
      const result = getOperationalDaysArray("CUSTOM", customDays);
      expect(result).toEqual([1, 3, 5]);
    });

    it("returns empty array for CUSTOM without customDays", () => {
      const result = getOperationalDaysArray("CUSTOM");
      expect(result).toEqual([]);
    });

    it("returns empty array for unknown schedule type", () => {
      const result = getOperationalDaysArray("UNKNOWN");
      expect(result).toEqual([]);
    });

    it("returns empty array for undefined scheduleType", () => {
      const result = getOperationalDaysArray(undefined);
      expect(result).toEqual([]);
    });
  });

  describe("isOperationalDay", () => {
    // Sunday = 0, Monday = 1, ..., Saturday = 6
    const testDates = {
      sunday: new Date("2025-01-05"), // Sunday
      monday: new Date("2025-01-06"), // Monday
      tuesday: new Date("2025-01-07"), // Tuesday
      wednesday: new Date("2025-01-08"), // Wednesday
      thursday: new Date("2025-01-09"), // Thursday
      friday: new Date("2025-01-10"), // Friday
      saturday: new Date("2025-01-11"), // Saturday
    };

    it("returns true for any day with EVERYDAY", () => {
      expect(isOperationalDay(testDates.sunday, "EVERYDAY")).toBe(true);
      expect(isOperationalDay(testDates.monday, "EVERYDAY")).toBe(true);
      expect(isOperationalDay(testDates.saturday, "EVERYDAY")).toBe(true);
    });

    it("returns correct values for WEEKDAYS", () => {
      expect(isOperationalDay(testDates.sunday, "WEEKDAYS")).toBe(false);
      expect(isOperationalDay(testDates.monday, "WEEKDAYS")).toBe(true);
      expect(isOperationalDay(testDates.friday, "WEEKDAYS")).toBe(true);
      expect(isOperationalDay(testDates.saturday, "WEEKDAYS")).toBe(false);
    });

    it("returns correct values for WEEKENDS", () => {
      expect(isOperationalDay(testDates.sunday, "WEEKENDS")).toBe(true);
      expect(isOperationalDay(testDates.monday, "WEEKENDS")).toBe(false);
      expect(isOperationalDay(testDates.friday, "WEEKENDS")).toBe(false);
      expect(isOperationalDay(testDates.saturday, "WEEKENDS")).toBe(true);
    });

    it("returns correct values for CUSTOM", () => {
      const customDays = [1, 3, 5]; // Monday, Wednesday, Friday
      expect(isOperationalDay(testDates.sunday, "CUSTOM", customDays)).toBe(
        false
      );
      expect(isOperationalDay(testDates.monday, "CUSTOM", customDays)).toBe(
        true
      );
      expect(isOperationalDay(testDates.wednesday, "CUSTOM", customDays)).toBe(
        true
      );
      expect(isOperationalDay(testDates.friday, "CUSTOM", customDays)).toBe(
        true
      );
      expect(isOperationalDay(testDates.saturday, "CUSTOM", customDays)).toBe(
        false
      );
    });

    it("returns false for undefined scheduleType", () => {
      expect(isOperationalDay(testDates.monday, undefined)).toBe(false);
    });

    it("returns false for unknown schedule type", () => {
      expect(isOperationalDay(testDates.monday, "UNKNOWN")).toBe(false);
    });
  });

  describe("getDayName", () => {
    it("returns correct short day names", () => {
      expect(getDayName(0)).toBe("Sun");
      expect(getDayName(1)).toBe("Mon");
      expect(getDayName(2)).toBe("Tue");
      expect(getDayName(3)).toBe("Wed");
      expect(getDayName(4)).toBe("Thu");
      expect(getDayName(5)).toBe("Fri");
      expect(getDayName(6)).toBe("Sat");
    });

    it("returns empty string for invalid day number", () => {
      expect(getDayName(7)).toBe("");
      expect(getDayName(-1)).toBe("");
    });
  });

  describe("getFullDayName", () => {
    it("returns correct full day names", () => {
      expect(getFullDayName(0)).toBe("Sunday");
      expect(getFullDayName(1)).toBe("Monday");
      expect(getFullDayName(2)).toBe("Tuesday");
      expect(getFullDayName(3)).toBe("Wednesday");
      expect(getFullDayName(4)).toBe("Thursday");
      expect(getFullDayName(5)).toBe("Friday");
      expect(getFullDayName(6)).toBe("Saturday");
    });

    it("returns empty string for invalid day number", () => {
      expect(getFullDayName(7)).toBe("");
      expect(getFullDayName(-1)).toBe("");
    });
  });

  describe("getOperationalDayNames", () => {
    it("returns day names for EVERYDAY", () => {
      const result = getOperationalDayNames("EVERYDAY");
      expect(result).toEqual([
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ]);
    });

    it("returns day names for WEEKDAYS", () => {
      const result = getOperationalDayNames("WEEKDAYS");
      expect(result).toEqual([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ]);
    });

    it("returns day names for WEEKENDS", () => {
      const result = getOperationalDayNames("WEEKENDS");
      expect(result).toEqual(["Sunday", "Saturday"]);
    });

    it("returns day names for CUSTOM", () => {
      const result = getOperationalDayNames("CUSTOM", [1, 3, 5]);
      expect(result).toEqual(["Monday", "Wednesday", "Friday"]);
    });

    it("returns empty array for undefined scheduleType", () => {
      const result = getOperationalDayNames(undefined);
      expect(result).toEqual([]);
    });
  });
});

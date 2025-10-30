/**
 * Charter Availability System Unit Tests
 *
 * Tests the complete availability system logic:
 * - Schedule operations
 * - Unavailability blocks
 * - Availability checks
 * - Date range queries
 */

import {
  getAffectedDatesByScheduleChange,
  isOperationalDay,
  isUnavailable,
} from "@/lib/services/availability-service";
import { ScheduleType } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("Charter Availability System", () => {
  describe("Schedule Operations", () => {
    it("should check operational days for EVERYDAY schedule", () => {
      const schedule = {
        id: "test",
        charterId: "test",
        scheduleType: ScheduleType.EVERYDAY,
        operationalDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const monday = new Date("2025-01-20"); // Monday
      const sunday = new Date("2025-01-26"); // Sunday

      expect(isOperationalDay(monday, schedule)).toBe(true);
      expect(isOperationalDay(sunday, schedule)).toBe(true);
    });

    it("should check operational days for WEEKDAYS schedule", () => {
      const schedule = {
        id: "test",
        charterId: "test",
        scheduleType: ScheduleType.WEEKDAYS,
        operationalDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const monday = new Date("2025-01-20"); // Monday
      const saturday = new Date("2025-01-25"); // Saturday

      expect(isOperationalDay(monday, schedule)).toBe(true);
      expect(isOperationalDay(saturday, schedule)).toBe(false);
    });

    it("should check operational days for WEEKENDS schedule", () => {
      const schedule = {
        id: "test",
        charterId: "test",
        scheduleType: ScheduleType.WEEKENDS,
        operationalDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const friday = new Date("2025-01-24"); // Friday
      const saturday = new Date("2025-01-25"); // Saturday

      expect(isOperationalDay(friday, schedule)).toBe(false);
      expect(isOperationalDay(saturday, schedule)).toBe(true);
    });

    it("should check operational days for CUSTOM schedule", () => {
      const schedule = {
        id: "test",
        charterId: "test",
        scheduleType: ScheduleType.CUSTOM,
        operationalDays: [1, 3, 5], // Monday, Wednesday, Friday
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const monday = new Date("2025-01-20"); // Monday (1)
      const tuesday = new Date("2025-01-21"); // Tuesday (2)
      const wednesday = new Date("2025-01-22"); // Wednesday (3)

      expect(isOperationalDay(monday, schedule)).toBe(true);
      expect(isOperationalDay(tuesday, schedule)).toBe(false);
      expect(isOperationalDay(wednesday, schedule)).toBe(true);
    });

    it("should get affected dates by schedule change", () => {
      const startDate = new Date("2025-01-20"); // Monday
      const endDate = new Date("2025-01-26"); // Sunday

      // Change to WEEKENDS only
      const affectedDates = getAffectedDatesByScheduleChange(
        ScheduleType.WEEKENDS,
        [],
        { start: startDate, end: endDate }
      );

      // Should return Mon-Fri (5 days)
      expect(affectedDates.length).toBe(5);
    });
  });

  describe("Unavailability Blocks", () => {
    it("should detect unavailable dates", () => {
      const checkDate = new Date("2025-01-25");
      const unavailability = [
        {
          id: "test",
          charterId: "test",
          startDate: new Date("2025-01-24"),
          endDate: new Date("2025-01-26"),
          reason: "Boat maintenance",
          createdBy: "test",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = isUnavailable(checkDate, unavailability);
      expect(result).not.toBeNull();
      expect(result?.reason).toBe("Boat maintenance");
    });

    it("should return null for available dates", () => {
      const checkDate = new Date("2025-01-30");
      const unavailability = [
        {
          id: "test",
          charterId: "test",
          startDate: new Date("2025-01-24"),
          endDate: new Date("2025-01-26"),
          reason: "Boat maintenance",
          createdBy: "test",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = isUnavailable(checkDate, unavailability);
      expect(result).toBeNull();
    });

    it("should handle edge case: date on unavailability start boundary", () => {
      const checkDate = new Date("2025-01-24T00:00:00.000Z");
      const unavailability = [
        {
          id: "test",
          charterId: "test",
          startDate: new Date("2025-01-24"),
          endDate: new Date("2025-01-26"),
          reason: "Maintenance",
          createdBy: "test",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = isUnavailable(checkDate, unavailability);
      expect(result).not.toBeNull();
    });

    it("should handle edge case: date on unavailability end boundary", () => {
      const checkDate = new Date("2025-01-26T00:00:00.000Z");
      const unavailability = [
        {
          id: "test",
          charterId: "test",
          startDate: new Date("2025-01-24"),
          endDate: new Date("2025-01-26"),
          reason: "Maintenance",
          createdBy: "test",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = isUnavailable(checkDate, unavailability);
      expect(result).not.toBeNull();
    });

    it("should not match date after unavailability end", () => {
      const checkDate = new Date("2025-01-27T00:00:00.000Z");
      const unavailability = [
        {
          id: "test",
          charterId: "test",
          startDate: new Date("2025-01-24"),
          endDate: new Date("2025-01-26"),
          reason: "Maintenance",
          createdBy: "test",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = isUnavailable(checkDate, unavailability);
      expect(result).toBeNull();
    });
  });
});

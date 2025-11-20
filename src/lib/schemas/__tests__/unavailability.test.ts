import {
  buildDateRange,
  normalizeUnavailabilityPayload,
  shouldPersistTimes,
  UnavailabilityPayloadSchema,
} from "@/lib/schemas/unavailability";
import { describe, expect, it } from "vitest";

describe("Unavailability schema", () => {
  it("defaults to all-day when times are omitted", () => {
    const parsed = UnavailabilityPayloadSchema.parse({
      startDate: "2025-02-01T00:00:00.000Z",
      endDate: "2025-02-03T00:00:00.000Z",
    });

    const normalized = normalizeUnavailabilityPayload(parsed);
    expect(normalized.isAllDay).toBe(true);
  });

  it("requires startTime and endTime when not all-day", () => {
    const result = UnavailabilityPayloadSchema.safeParse({
      startDate: "2025-02-01T00:00:00.000Z",
      endDate: "2025-02-01T00:00:00.000Z",
      isAllDay: false,
      startTime: "09:00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("endTime is required when isAllDay is false");
    }
  });

  it("rejects invalid time order", () => {
    const result = UnavailabilityPayloadSchema.safeParse({
      startDate: "2025-02-01T00:00:00.000Z",
      endDate: "2025-02-01T00:00:00.000Z",
      isAllDay: false,
      startTime: "14:00",
      endTime: "10:00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("endTime must be after startTime");
    }
  });

  it("rejects malformed time strings", () => {
    const result = UnavailabilityPayloadSchema.safeParse({
      startDate: "2025-02-01T00:00:00.000Z",
      endDate: "2025-02-01T00:00:00.000Z",
      isAllDay: false,
      startTime: "9 AM",
      endTime: "17:00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Time must follow 24-hour HH:MM format");
    }
  });

  it("builds precise date range for time-based blocks", () => {
    const parsed = UnavailabilityPayloadSchema.parse({
      startDate: "2025-02-10T00:00:00.000Z",
      endDate: "2025-02-10T00:00:00.000Z",
      isAllDay: false,
      startTime: "06:30",
      endTime: "12:45",
    });

    const normalized = normalizeUnavailabilityPayload(parsed);
    const { start, end } = buildDateRange(normalized);

    expect(start.toISOString()).toBe("2025-02-10T06:30:00.000Z");
    expect(end.toISOString()).toBe("2025-02-10T12:45:00.000Z");
  });

  it("drops persisted times for all-day blocks", () => {
    const parsed = UnavailabilityPayloadSchema.parse({
      startDate: "2025-02-10T00:00:00.000Z",
      endDate: "2025-02-11T00:00:00.000Z",
    });

    const normalized = normalizeUnavailabilityPayload(parsed);
    const times = shouldPersistTimes(normalized);

    expect(times).toEqual({ startTime: null, endTime: null });
  });
});

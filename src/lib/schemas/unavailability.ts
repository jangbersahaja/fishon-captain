/**
 * Unavailability schema & helpers ensure consistent time-based validation
 * between the API layer and any future server actions.
 */

import { z } from "zod";

export const TIME_24H_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const dateStringSchema = z
  .string()
  .min(1, "Date value is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date value",
  });

const timeStringSchema = z
  .string()
  .regex(TIME_24H_REGEX, "Time must follow 24-hour HH:MM format");

const baseSchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  reason: z.string().optional(),
  isAllDay: z.boolean().optional(),
  startTime: timeStringSchema.optional(),
  endTime: timeStringSchema.optional(),
});

const buildTimeIssue = (path: (string | number)[], message: string) => ({
  code: z.ZodIssueCode.custom,
  path,
  message,
});

const parseDateValue = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mergeDateAndTime = (date: Date, time?: string | null): Date => {
  if (!time) {
    return new Date(date);
  }

  const [hours, minutes] = time.split(":").map(Number);
  const merged = new Date(date);
  merged.setUTCHours(hours, minutes, 0, 0);
  return merged;
};

export interface UnavailabilityValidationContext {
  isAllDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export const resolveIsAllDay = (
  input: UnavailabilityValidationContext
): boolean => {
  if (typeof input.isAllDay === "boolean") {
    return input.isAllDay;
  }

  return !(input.startTime || input.endTime);
};

/**
 * Ensures conditional validation on the base schema:
 * - Times must follow HH:MM format (handled by regex)
 * - Partial times are not allowed
 * - endTime must be after startTime when provided
 * - When not all day, both times are required
 * - When all day, time fields must be omitted
 */
const unavailabilityRefinement = baseSchema.superRefine((data, ctx) => {
  const normalizedIsAllDay = resolveIsAllDay(data);

  const startDate = parseDateValue(data.startDate);
  const endDate = parseDateValue(data.endDate);

  if (!startDate || !endDate) {
    ctx.addIssue(
      buildTimeIssue([!startDate ? "startDate" : "endDate"], "Invalid date")
    );
    return;
  }

  if (startDate > endDate) {
    ctx.addIssue(
      buildTimeIssue(["endDate"], "endDate must be on or after startDate")
    );
  }

  if (normalizedIsAllDay) {
    if (data.startTime || data.endTime) {
      ctx.addIssue(
        buildTimeIssue(
          [data.startTime ? "startTime" : "endTime"],
          "Remove time fields for all-day blocks"
        )
      );
    }
    return;
  }

  if (!data.startTime) {
    ctx.addIssue(
      buildTimeIssue(
        ["startTime"],
        "startTime is required when isAllDay is false"
      )
    );
  }

  if (!data.endTime) {
    ctx.addIssue(
      buildTimeIssue(["endTime"], "endTime is required when isAllDay is false")
    );
  }

  if (!data.startTime || !data.endTime) {
    return;
  }

  const normalizedStart = mergeDateAndTime(startDate, data.startTime);
  const normalizedEnd = mergeDateAndTime(endDate, data.endTime);

  if (normalizedEnd <= normalizedStart) {
    ctx.addIssue(
      buildTimeIssue(["endTime"], "endTime must be after startTime")
    );
  }
});

export const UnavailabilityPayloadSchema = unavailabilityRefinement;

export type UnavailabilityPayload = z.infer<typeof UnavailabilityPayloadSchema>;

export type NormalizedUnavailabilityPayload = Omit<
  UnavailabilityPayload,
  "isAllDay"
> & { isAllDay: boolean };

export const normalizeUnavailabilityPayload = (
  payload: UnavailabilityPayload
): NormalizedUnavailabilityPayload => ({
  ...payload,
  isAllDay: resolveIsAllDay(payload),
});

export const buildDateRange = (
  payload: NormalizedUnavailabilityPayload
): { start: Date; end: Date } => {
  const startDate = parseDateValue(payload.startDate);
  const endDate = parseDateValue(payload.endDate);

  if (!startDate || !endDate) {
    throw new Error("Invalid date range");
  }

  const shouldUseTimes = !payload.isAllDay;
  const start = mergeDateAndTime(
    startDate,
    shouldUseTimes ? payload.startTime : undefined
  );
  const end = mergeDateAndTime(
    endDate,
    shouldUseTimes ? payload.endTime : undefined
  );

  return { start, end };
};

export const shouldPersistTimes = (
  payload: NormalizedUnavailabilityPayload
): { startTime: string | null; endTime: string | null } => {
  if (payload.isAllDay) {
    return { startTime: null, endTime: null };
  }

  return {
    startTime: payload.startTime ?? null,
    endTime: payload.endTime ?? null,
  };
};

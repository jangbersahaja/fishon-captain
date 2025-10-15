import { z } from "zod";

/**
 * Schema for partial charter update (edit mode save)
 * Used in PATCH /api/charters/[id] route
 */
export const CharterUpdateSchema = z.object({
  charter: z
    .object({
      charterType: z.string().optional(),
      name: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      startingPoint: z.string().optional(),
      postcode: z.string().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      description: z.string().optional(),
      // "tone" is a client-only helper for description generation; accept & ignore.
      tone: z.string().optional(),
    })
    .optional(),
  captain: z
    .object({
      displayName: z.string().optional(),
      phone: z.string().optional(),
      bio: z.string().optional(),
      experienceYrs: z.number().int().optional(),
    })
    .optional(),
  boat: z
    .object({
      name: z.string().optional(),
      type: z.string().optional(),
      lengthFt: z.number().int().nullable().optional(),
      capacity: z.number().int().nullable().optional(),
      features: z.array(z.string()).optional(),
    })
    .optional(),
  amenities: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  policies: z
    .object({
      licenseProvided: z.boolean().optional(),
      catchAndKeep: z.boolean().optional(),
      catchAndRelease: z.boolean().optional(),
      childFriendly: z.boolean().optional(),
      liveBaitProvided: z.boolean().optional(),
      alcoholNotAllowed: z.boolean().optional(),
      smokingNotAllowed: z.boolean().optional(),
    })
    .optional(),
  pickup: z
    .object({
      available: z.boolean().optional(),
      fee: z.number().nullable().optional(),
      notes: z.string().optional(),
      areas: z.array(z.string()).optional(),
    })
    .optional(),
  trips: z
    .array(
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().optional(),
        tripType: z.string().optional(),
        price: z.number().nullable().optional(),
        durationHours: z.number().int().nullable().optional(),
        maxAnglers: z.number().int().nullable().optional(),
        style: z.string().optional(),
        description: z.string().nullable().optional(),
        startTimes: z.array(z.string()).optional(),
        species: z.array(z.string()).optional(),
        techniques: z.array(z.string()).optional(),
        _delete: z.boolean().optional(),
      })
    )
    .optional(),
});

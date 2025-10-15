import { z } from "zod";

const isClient = typeof window !== "undefined";

const fileSchema = z
  .any()
  .refine((file) => !isClient || file instanceof File, "Upload a valid file");

/**
 * Trip schema - represents a fishing trip offering
 */
export const tripSchema = z.object({
  name: z.string().min(1, "Trip name is required"),
  tripType: z.string().min(1, "Select a trip type"),
  price: z.number().min(0, { message: "Price must be zero or more" }),
  promoPrice: z
    .number()
    .min(0, { message: "Promo/low season price must be zero or more" })
    .optional(),
  durationHours: z
    .number()
    .int({ message: "Duration must be whole hours" })
    .min(1, { message: "At least 1 hour" }),
  startTimes: z
    .array(z.string().regex(/^\d{2}:\d{2}$/u, "Use 24 hour format, e.g. 07:00"))
    .min(1, "Add at least one start time"),
  maxAnglers: z
    .number()
    .int({ message: "Whole numbers only" })
    .min(1, { message: "At least 1 angler" }),
  charterStyle: z.enum(["private", "shared"], {
    error: "Select charter style",
  }),
  description: z.string().optional(),
  species: z.array(z.string()).default([]),
  techniques: z.array(z.string()).default([]),
});

/**
 * Policies schema - represents charter policies and rules
 */
export const policiesSchema = z.object({
  licenseProvided: z.boolean().optional().default(false),
  catchAndKeep: z.boolean().optional().default(false),
  catchAndRelease: z.boolean().optional().default(false),
  childFriendly: z.boolean().optional().default(false),
  liveBaitProvided: z.boolean().optional().default(false),
  alcoholNotAllowed: z.boolean().optional().default(false),
  smokingNotAllowed: z.boolean().optional().default(false),
});

/**
 * Main charter form schema
 * Comprehensive validation for charter registration/onboarding
 */
export const charterFormSchema = z.object({
  operator: z.object({
    // Names + email now sourced from account session (removed fields retained in DB via captainProfile when finalizing)
    displayName: z.string().min(1, "Preferred operator name is required"),
    experienceYears: z
      .number()
      .int({ message: "Whole numbers only" })
      .min(0, { message: "Years must be zero or more" }),
    bio: z.string().min(20, "Tell anglers about yourself (min 20 characters)"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^[+]?[-\d\s()]{6,}$/u, "Enter a valid phone number"),
    backupPhone: z
      .string()
      .min(1)
      .regex(/^[+]?[-\d\s()]{6,}$/u, "Enter a valid phone number")
      .optional()
      .or(z.literal("")),
    avatar: fileSchema.optional(),
    avatarUrl: z.string().url().optional(),
  }),
  charterType: z.string().min(1, "Select a charter type"),
  charterName: z.string().min(1, "Charter name is required"),
  state: z.string().min(1, "Select a state"),
  city: z.string().min(1, "Enter a city/town"),
  startingPoint: z.string().min(1, "Starting point is required"), // address full string from Places
  placeId: z.string().optional(), // Optionally later we could add placeId if we want to persist it
  postcode: z.string().regex(/^\d{5}$/u, "Use a 5 digit postcode"),
  latitude: z
    .number()
    .min(-90, { message: "Latitude must be between -90 and 90" })
    .max(90, { message: "Latitude must be between -90 and 90" }),
  longitude: z
    .number()
    .min(-180, { message: "Longitude must be between -180 and 180" })
    .max(180, { message: "Longitude must be between -180 and 180" }),
  // User editable final description (can start from auto-generated). Increase minimum length.
  description: z
    .string()
    .min(40, "Description should be at least 40 characters"),
  // Internal: last generated description baseline for personalization diff.
  generatedDescription: z.string().optional(),
  // Tone selection for generator.
  tone: z.enum(["friendly", "adventurous", "professional"]).default("friendly"),
  // Service without boat checkbox
  withoutBoat: z.boolean().optional().default(false),
  boat: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    lengthFeet: z
      .number()
      .positive({ message: "Length must be positive" })
      .optional(),
    capacity: z
      .number()
      .int({ message: "Whole numbers only" })
      .positive({ message: "Capacity must be positive" })
      .optional(),
    features: z.array(z.string()).optional().default([]),
  }),
  amenities: z.array(z.string()).optional().default([]).optional(),
  policies: policiesSchema,
  pickup: z
    .object({
      available: z.boolean(),
      fee: z.number().nullable(),
      areas: z.array(z.string()),
      notes: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      if (val.available && !Number.isFinite(val.fee ?? NaN)) {
        ctx.addIssue({
          path: ["fee"],
          code: z.ZodIssueCode.custom,
          message: "Enter pickup fee",
        });
      }
    }),
  trips: z.array(tripSchema).min(1, "Add at least one trip"),
  photos: z
    .array(fileSchema)
    .min(3, "Upload at least 3 photos")
    .max(15, "Maximum 15 photos"),
  videos: z
    .array(fileSchema)
    .max(10, "Maximum 10 videos")
    .optional()
    .default([]),
  // Persisted (already uploaded) media metadata for draft reload (NOT validated as user input fields)
  uploadedPhotos: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
      })
    )
    .optional()
    .default([]),
  uploadedVideos: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
      })
    )
    .optional()
    .default([]),
});

export type CharterFormValues = z.infer<typeof charterFormSchema>;

// Per-step (subset) schemas for more granular validation if needed client-side
export const basicsStepSchema = charterFormSchema.pick({
  operator: true,
  charterType: true,
  charterName: true,
  state: true,
  city: true,
  startingPoint: true,
  postcode: true,
  latitude: true,
  longitude: true,
});

export const experienceStepSchema = charterFormSchema.pick({
  boat: true,
  amenities: true,
  policies: true,
  pickup: true,
});

export const tripsStepSchema = charterFormSchema.pick({ trips: true });

export const mediaPricingStepSchema = charterFormSchema.pick({
  photos: true,
  videos: true,
});

// New dedicated description step schema (moved out of media step)
export const descriptionStepSchema = charterFormSchema.pick({
  description: true,
  generatedDescription: true,
  tone: true,
});

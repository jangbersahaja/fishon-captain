import { z } from "zod";

const isClient = typeof window !== "undefined";

const fileSchema = z
  .any()
  .refine((file) => !isClient || file instanceof File, "Upload a valid file");

const tripSchema = z.object({
  name: z.string().min(1, "Trip name is required"),
  tripType: z.string().min(1, "Select a trip type"),
  price: z.number().min(0, { message: "Price must be zero or more" }),
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
  targetSpecies: z.array(z.string()).default([]),
  techniques: z.array(z.string()).default([]),
});

const policiesSchema = z.object({
  licenseProvided: z.boolean(),
  catchAndKeep: z.boolean(),
  catchAndRelease: z.boolean(),
  childFriendly: z.boolean(),
  liveBaitProvided: z.boolean(),
  alcoholNotAllowed: z.boolean(), // Updated key
  smokingNotAllowed: z.boolean(), // Updated key
});

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
    avatar: fileSchema.optional(),
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
  boat: z.object({
    name: z.string().min(1, "Boat name is required"),
    type: z.string().min(1, "Boat type is required"),
    lengthFeet: z.number().positive({ message: "Length must be positive" }),
    capacity: z
      .number()
      .int({ message: "Whole numbers only" })
      .min(1, { message: "At least 1 passenger" }),
    features: z.array(z.string()).min(1, "Select at least one feature"),
  }),
  amenities: z.array(z.string()).min(1, "Select at least one amenity"),
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
  videos: z.array(fileSchema).max(3, "Maximum 3 videos").optional().default([]),
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
  description: true,
  generatedDescription: true,
  tone: true,
});

export { policiesSchema, tripSchema };

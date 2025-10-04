/**
 * formSteps.ts
 * Phase 1 extraction: Central definition of step configuration used by the charter onboarding/edit form.
 * Keeping this isolated lets us (a) reuse in tests, (b) avoid re-creating arrays/functions on hot reload,
 * and (c) reduce cognitive load inside the already large FormSection component.
 */
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import {
  basicsStepSchema,
  descriptionStepSchema,
  experienceStepSchema,
  mediaPricingStepSchema,
  tripsStepSchema,
} from "@features/charter-onboarding/charterForm.schema";
import type { StepDefinition } from "@features/charter-onboarding/components/StepProgress";
import type { StepKey } from "@features/charter-onboarding/types";
import type { FieldPath } from "react-hook-form";

/**
 * Internal representation for a form step: extends the visual StepDefinition with id + the fields
 * that belong to that step. These field paths are used for per-step validation / completion tracking.
 */
export type FormStep = StepDefinition & {
  id: StepKey;
  fields: FieldPath<CharterFormValues>[];
};

/**
 * Ordered list of steps for the charter form. This MUST remain in sync with:
 *  - UI navigation (StepProgress)
 *  - Validation logic (handleNext uses index to pick schema)
 *  - Review step logic (REVIEW_STEP_INDEX)
 *
 * Changes here are intentionally centralized. To add / remove / reorder a step,
 * do it here and update any schema arrays referencing the order.
 */
export const STEP_SEQUENCE: FormStep[] = [
  {
    id: "basics",
    label: "Captain & Charter",
    fields: [
      "operator.displayName",
      "operator.experienceYears",
      "operator.bio",
      "operator.phone",
      "operator.avatar",
      "charterType",
      "charterName",
      "state",
      "city",
      "startingPoint",
      "postcode",
      "latitude",
      "longitude",
    ],
  },
  {
    id: "experience",
    label: "Boat & Amenities",
    fields: [
      "boat.name",
      "boat.type",
      "boat.lengthFeet",
      "boat.capacity",
      "boat.features",
      "amenities",
      // We include the whole policies object so partial validations don't fatally fail mid-process.
      "policies",
      "pickup",
    ],
  },
  { id: "trips", label: "Trips & Availability", fields: ["trips"] },
  {
    id: "description",
    label: "Description",
    fields: ["description", "generatedDescription", "tone"],
  },
  {
    id: "media",
    label: "Media Files",
    fields: ["photos", "videos"],
  },
  { id: "review", label: "Preview", fields: [] },
];

/** Index of the review step for quick reference in logic (avoids repeated search). */
export const REVIEW_STEP_INDEX = STEP_SEQUENCE.findIndex(
  (s) => s.id === "review"
);

// Map step id to its granular schema for per-step validation
export const STEP_SCHEMAS = {
  basics: basicsStepSchema,
  experience: experienceStepSchema,
  trips: tripsStepSchema,
  media: mediaPricingStepSchema,
  description: descriptionStepSchema,
  review: null, // no direct fields; review aggregates all
} as const;

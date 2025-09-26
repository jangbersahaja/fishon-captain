import type { DraftValues } from "../charterForm.draft";

export type FinalizeMediaPayload = {
  images: Array<{ name: string; url: string }>; // resized / uploaded already
  videos: Array<{ name: string; url: string }>;
  imagesOrder?: number[];
  videosOrder?: number[];
  imagesCoverIndex?: number; // optional cover selection
  videosCoverIndex?: number;
  avatar?: { name: string; url: string } | null;
};

export type FinalizeValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

/**
 * Feature-scoped validation for finalizing a draft charter.
 * Keeps legacy error keys (operatorFirstName/LastName) for test & API compatibility.
 */
export function validateDraftForFinalizeFeature(
  draft: DraftValues,
  media: FinalizeMediaPayload
): FinalizeValidationResult {
  const errors: Record<string, string> = {};
  const op: Record<string, unknown> =
    (draft as unknown as { operator?: Record<string, unknown> }).operator || {};
  const displayName =
    typeof op.displayName === "string" ? op.displayName.trim() : "";
  const firstRaw = typeof op.firstName === "string" ? op.firstName.trim() : "";
  const lastRaw = typeof op.lastName === "string" ? op.lastName.trim() : "";
  const hasDisplay = displayName.length > 0;
  const hasFirst = firstRaw.length > 0;
  const hasLast = lastRaw.length > 0;

  // New rule: displayName is sufficient. Only if displayName is missing do we require first + last.
  if (!hasDisplay) {
    if (!hasFirst) errors.operatorFirstName = "First name required"; // legacy key retained
    if (!hasLast) errors.operatorLastName = "Last name required"; // legacy key retained
    if (!hasFirst && !hasLast)
      errors.operatorDisplayName = "Display name required"; // guidance alternative
  }
  if (!draft.operator?.phone?.trim()) errors.operatorPhone = "Phone required";
  if (!draft.charterType?.trim()) errors.charterType = "Charter type required";
  if (!draft.charterName?.trim()) errors.charterName = "Charter name required";
  if (!draft.state?.trim()) errors.state = "State required";
  if (!draft.city?.trim()) errors.city = "City required";
  if (!draft.startingPoint?.trim())
    errors.startingPoint = "Starting point required";
  if (!draft.postcode?.toString()?.trim())
    errors.postcode = "Postcode required";
  if (!Array.isArray(draft.trips) || !draft.trips.length)
    errors.trips = "At least one trip";
  if (!Array.isArray(draft.amenities) || !draft.amenities.length)
    errors.amenities = "At least one amenity";
  if (!media.images || media.images.length < 3)
    errors.images = "At least 3 photos";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

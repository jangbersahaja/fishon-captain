import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  sanitizeForDraft,
  type DraftValues,
} from "@features/charter-onboarding/charterForm.draft";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import type { Prisma } from "@prisma/client";

// DEPRECATED: DraftPatchSchema moved to @fishon/schemas package
// Import from @fishon/schemas instead for consistency
export { DraftPatchSchema } from "@fishon/schemas";

// Merge helper: shallow object merge, arrays replace (with safety checks)
function deepMerge<T>(base: T, partial: unknown): T {
  if (partial === null || partial === undefined) return base;

  // CRITICAL SAFETY: Arrays are replaced, but protect against accidental data loss
  if (Array.isArray(partial)) {
    // If partial array is empty and base has data, preserve base
    // This prevents accidental deletion of arrays when client state is incomplete
    if (partial.length === 0 && Array.isArray(base) && base.length > 0) {
      logger.warn("[deepMerge] rejecting empty array that would delete data", {
        baseLength: base.length,
        partialLength: partial.length,
      });
      return base; // SAFE: don't wipe data with empty array
    }

    // Otherwise replace (user explicitly cleared or replaced)
    return partial.slice() as unknown as T;
  }

  if (typeof partial !== "object") return partial as T;
  if (typeof base !== "object" || base === null)
    return { ...(partial as object) } as T;

  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(partial as object)) {
    const val = (partial as Record<string, unknown>)[key];

    // IMPORTANT: Preserve existing nested data if partial is null/undefined
    if ((val === null || val === undefined) && out[key] !== undefined) {
      // Log but continue - this might be intentional deletion
      if (process.env.NODE_ENV === "development") {
        logger.debug(
          `[deepMerge] skipping null/undefined value for key: ${key}`
        );
      }
      continue; // Don't overwrite with null/undefined
    }

    out[key] = deepMerge(out[key] as unknown, val);
  }
  return out as T;
}

/**
 * Sanity check for draft data before merging (P0.2 + P1.3)
 * Validates critical fields and structure to prevent data corruption
 */
function isSaneDraft(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    logger.warn("[isSaneDraft] data is not an object");
    return false;
  }

  const draft = data as Record<string, unknown>;

  // P1.3: Check required fields for charter name and type
  // Charter name is critical - should be present and non-empty string
  if ("charterName" in draft) {
    const name = draft.charterName;
    if (typeof name === "string" && name.trim().length === 0) {
      logger.warn("[isSaneDraft] charterName is empty string");
      return false;
    }
    if (name !== undefined && name !== null && typeof name !== "string") {
      logger.warn("[isSaneDraft] charterName is not a string", {
        type: typeof name,
      });
      return false;
    }
  }

  // P1.3: Charter type validation (if present, should be valid)
  if ("charterType" in draft) {
    const type = draft.charterType;
    if (type !== undefined && type !== null && typeof type !== "string") {
      logger.warn("[isSaneDraft] charterType is not a string", {
        type: typeof type,
      });
      return false;
    }
  }

  // P0.2: Check critical string fields - should not have wrong type if present
  const criticalStrings = ["description", "city"];
  for (const key of criticalStrings) {
    if (key in draft) {
      const val = draft[key];
      if (val !== undefined && val !== null && typeof val !== "string") {
        logger.warn(`[isSaneDraft] ${key} is not a string`, {
          type: typeof val,
        });
        return false;
      }
    }
  }

  // P0.2: Location should be object if present
  if (
    "location" in draft &&
    draft.location !== null &&
    draft.location !== undefined
  ) {
    if (typeof draft.location !== "object") {
      logger.warn("[isSaneDraft] location is not an object");
      return false;
    }
  }

  // P0.2 + P1.3: Array fields should be arrays if present
  const arrayFields = [
    "uploadedPhotos",
    "uploadedVideos",
    "trips",
    "amenities",
    "techniques",
  ];
  for (const key of arrayFields) {
    if (key in draft && draft[key] !== null && draft[key] !== undefined) {
      if (!Array.isArray(draft[key])) {
        logger.warn(`[isSaneDraft] ${key} is not an array`, {
          type: typeof draft[key],
        });
        return false;
      }
    }
  }

  // P1.3: Validate nested objects have correct structure
  // Boat should be object if present
  if ("boat" in draft && draft.boat !== null && draft.boat !== undefined) {
    if (typeof draft.boat !== "object") {
      logger.warn("[isSaneDraft] boat is not an object", {
        type: typeof draft.boat,
      });
      return false;
    }
  }

  // Operator should be object if present
  if (
    "operator" in draft &&
    draft.operator !== null &&
    draft.operator !== undefined
  ) {
    if (typeof draft.operator !== "object") {
      logger.warn("[isSaneDraft] operator is not an object", {
        type: typeof draft.operator,
      });
      return false;
    }
  }

  // Pickup should be object if present
  if (
    "pickup" in draft &&
    draft.pickup !== null &&
    draft.pickup !== undefined
  ) {
    if (typeof draft.pickup !== "object") {
      logger.warn("[isSaneDraft] pickup is not an object", {
        type: typeof draft.pickup,
      });
      return false;
    }
  }

  // Policies should be object if present
  if (
    "policies" in draft &&
    draft.policies !== null &&
    draft.policies !== undefined
  ) {
    if (typeof draft.policies !== "object") {
      logger.warn("[isSaneDraft] policies is not an object", {
        type: typeof draft.policies,
      });
      return false;
    }
  }

  // P1.3: Trips array should have valid items if present and non-empty
  if (
    "trips" in draft &&
    Array.isArray(draft.trips) &&
    draft.trips.length > 0
  ) {
    for (let i = 0; i < draft.trips.length; i++) {
      const trip = draft.trips[i];
      if (typeof trip !== "object" || trip === null) {
        logger.warn(`[isSaneDraft] trips[${i}] is not an object`, {
          type: typeof trip,
        });
        return false;
      }
    }
  }

  return true;
}

export async function createDraft(params: {
  userId: string;
  initial?: CharterFormValues;
  step?: number;
}): Promise<{
  id: string;
  version: number;
  currentStep: number;
  data: DraftValues;
}> {
  const sanitized = sanitizeForDraft(
    (params.initial as CharterFormValues) || ({} as CharterFormValues)
  );
  // Enforce single active draft per user (application-level due to partial unique index not present)
  const existing = await prisma.charterDraft.findFirst({
    where: { userId: params.userId, status: "DRAFT" },
    select: { id: true },
  });

  // Phase 2: CaptainProfile creation removed from draft stage
  // Will be created during finalize if user indicates they will be a captain
  // This fixes the firstName="Captain" bug where automatic profile creation
  // was setting firstName to "Captain" and lastName to ""

  if (existing) {
    logger.info("draft_reuse_existing", {
      existingId: existing.id,
      userId: params.userId,
    });
    return {
      id: existing.id,
      version: 0, // caller should refetch; we don't have version here without full query
      currentStep: 0,
      data: sanitized,
    };
  }

  const draft = await prisma.charterDraft.create({
    data: {
      userId: params.userId,
      currentStep: params.step ?? 0,
      data: sanitized as unknown as Prisma.JsonObject,
      formVersion: 1,
    },
  });
  logger.info("draft_created", { draftId: draft.id, userId: params.userId });
  return {
    id: draft.id,
    version: draft.version,
    currentStep: draft.currentStep,
    data: sanitized,
  };
}

export async function getActiveDraft(userId: string) {
  return prisma.charterDraft.findFirst({
    where: { userId, status: "DRAFT" },
  });
}

export async function patchDraft(params: {
  id: string;
  userId: string;
  clientVersion: number;
  dataPartial: unknown;
  currentStep?: number;
}) {
  const draft = await prisma.charterDraft.findUnique({
    where: { id: params.id },
  });
  if (!draft || draft.userId !== params.userId) {
    logger.warn("draft_not_found_or_forbidden", {
      id: params.id,
      userId: params.userId,
    });
    throw new Error("not_found");
  }
  if (draft.status !== "DRAFT") {
    logger.warn("draft_invalid_status", {
      id: params.id,
      status: draft.status,
    });
    throw new Error("invalid_status");
  }
  if (draft.version !== params.clientVersion) {
    return { conflict: true, server: draft } as const;
  }

  // Backup current data before merge (for rollback if needed)
  const backupData = draft.data;

  // Perform merge with safety checks
  const merged = deepMerge(draft.data as unknown, params.dataPartial || {});

  // Sanity check merged data before persisting
  if (!isSaneDraft(merged)) {
    logger.error("draft_merge_sanity_failed", {
      id: params.id,
      userId: params.userId,
    });
    throw new Error("merge_sanity_check_failed");
  }

  try {
    const updated = await prisma.charterDraft.update({
      where: { id: draft.id },
      data: {
        data: merged as unknown as Prisma.JsonObject,
        currentStep: params.currentStep ?? draft.currentStep,
        version: { increment: 1 },
        lastTouchedAt: new Date(),
      },
    });
    logger.debug("draft_patched", { id: updated.id, version: updated.version });
    return { conflict: false, draft: updated } as const;
  } catch (error) {
    // Attempt rollback on merge failure
    logger.error("draft_patch_failed", {
      id: draft.id,
      error: error instanceof Error ? error.message : "unknown",
    });

    try {
      await prisma.charterDraft.update({
        where: { id: draft.id },
        data: { data: backupData as Prisma.JsonObject },
      });
      logger.info("draft_rollback_success", { id: draft.id });
    } catch (rollbackError) {
      logger.error("draft_rollback_failed", {
        id: draft.id,
        error:
          rollbackError instanceof Error ? rollbackError.message : "unknown",
      });
    }

    throw error;
  }
}

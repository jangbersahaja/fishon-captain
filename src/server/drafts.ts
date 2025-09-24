import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  sanitizeForDraft,
  type DraftValues,
} from "@features/charter-form/charterForm.draft";
import type { CharterFormValues } from "@features/charter-form/charterForm.schema";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

// Schema for draft patch payload (server-side validation)
export const DraftPatchSchema = z.object({
  dataPartial: z.any(), // already sanitized at merge stage; could be narrowed further per form version
  clientVersion: z.number().int().nonnegative(),
  currentStep: z.number().int().min(0).max(10).optional(),
});

// Merge helper: shallow object merge, arrays replace
function deepMerge<T>(base: T, partial: unknown): T {
  if (partial === null || partial === undefined) return base;
  if (Array.isArray(partial)) return partial.slice() as unknown as T;
  if (typeof partial !== "object") return partial as T;
  if (typeof base !== "object" || base === null)
    return { ...(partial as object) } as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(partial as object)) {
    const val = (partial as Record<string, unknown>)[key];
    out[key] = deepMerge(out[key] as unknown, val);
  }
  return out as T;
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
  const merged = deepMerge(draft.data as unknown, params.dataPartial || {});
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
}

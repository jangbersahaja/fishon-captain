import { z } from "zod";

/**
 * Schema for draft patch payload (server-side validation)
 * Used when updating a charter draft with partial data
 */
export const DraftPatchSchema = z.object({
  dataPartial: z.any(), // already sanitized at merge stage; could be narrowed further per form version
  clientVersion: z.number().int().nonnegative(),
  currentStep: z.number().int().min(0).max(10).optional(),
});

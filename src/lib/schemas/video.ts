import { z } from "zod";

export const ProcessStatusEnum = z.enum([
  "queued",
  "processing",
  "ready",
  "failed",
]);

export const CreateUploadSchema = z.object({
  fileName: z.string().min(1).max(256),
  fileType: z.string().regex(/^video\//, "Must be a video MIME type"),
});

export const FinishFormSchema = z.object({
  videoUrl: z.string().url(),
  startSec: z.number().min(0).max(86400),
  ownerId: z.string().min(1),
  didFallback: z.boolean().optional(),
  fallbackReason: z.string().max(300).optional(),
});

export const TranscodePayloadSchema = z.object({
  videoUrl: z.string().url(),
  startSec: z.number().min(0).max(86400),
  videoId: z.string().min(1),
});

export const ListQuerySchema = z.object({
  ownerId: z.string().min(1),
});

export function validateThumbFile(file: File) {
  const allowed = ["image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(file.type)) return false;
  if (file.size > 2 * 1024 * 1024) return false; // 2MB
  return true;
}

export type ProcessStatus = z.infer<typeof ProcessStatusEnum>;

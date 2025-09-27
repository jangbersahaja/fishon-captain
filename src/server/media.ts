import { z } from "zod";

// Shared Zod schema for finalize media payload (public subset)
// Generic media file (image or video). Optional metadata supports future
// validation or optimizations (dimensions, MIME, size). We keep type-agnostic
// here; route-level logic can apply image/video specific checks.
export const MediaFileSchema = z.object({
  // 'name' is used as a storage key; allow longer keys to accommodate
  // directory prefixes (e.g., charters/<id>/media/<file>). Keep generous cap.
  name: z
    .string()
    .min(1)
    .max(512)
    .refine(
      (val) => {
        // Allow avatar & verification docs to pass (they have other prefixes)
        if (val.startsWith("captains/") && val.includes("/avatar/"))
          return true;
        if (val.startsWith("verification/")) return true;
        // Enforce new pattern for charter media & videos: captains/<userId>/media/
        if (val.startsWith("captains/") && val.includes("/media/")) return true;
        // Temp upload video originals (legacy) begin with temp/<charterId>/original/ and are allowed only during processing
        if (val.startsWith("temp/") && val.includes("/original/")) return true;
        // Allow legacy existing stored media (charters/<id>/media/) for backward compatibility display, but discourage creation
        if (val.startsWith("charters/") && val.includes("/media/")) return true;
        return false;
      },
      { message: "Invalid storage key path pattern" }
    ),
  url: z.string().url(),
  mimeType: z.string().min(3).max(128).optional(),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(200 * 1024 * 1024)
    .optional(), // hard ceiling 200MB (videos)
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
});

export const FinalizeMediaSchema = z.object({
  media: z.object({
    // Allow zero images to support edit re-use of existing media. Create path still enforces >=1 later.
    images: z.array(MediaFileSchema).max(20),
    videos: z.array(MediaFileSchema).max(5),
    imagesOrder: z.array(z.number().int().nonnegative()).optional(),
    videosOrder: z.array(z.number().int().nonnegative()).optional(),
    imagesCoverIndex: z.number().int().nonnegative().nullish(),
    videosCoverIndex: z.number().int().nonnegative().nullish(),
    avatar: MediaFileSchema.nullable().optional(),
  }),
});

// Normalized shape consumed by charter creation logic
export interface NormalizedFinalizeMedia {
  images: { name: string; url: string }[];
  videos: { name: string; url: string }[];
  imagesOrder?: number[];
  videosOrder?: number[];
  imagesCoverIndex?: number;
  videosCoverIndex?: number;
  avatar: { name: string; url: string } | null;
}

export function normalizeFinalizeMedia(
  raw: unknown
): NormalizedFinalizeMedia | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  function pickArray<T = unknown>(key: string): T[] {
    const v = obj[key];
    return Array.isArray(v) ? (v as T[]) : [];
  }
  function pickNumberArray(key: string): number[] | undefined {
    const arr = pickArray<number>(key);
    return arr.length ? arr : undefined;
  }
  function pickNumber(key: string): number | undefined {
    const v = obj[key];
    return typeof v === "number" ? v : undefined;
  }
  function pickObj<T = unknown>(key: string): T | null {
    const v = obj[key];
    return v && typeof v === "object" ? (v as T) : null;
  }
  const images = pickArray<{ name: string; url: string }>("images");
  const videos = pickArray<{ name: string; url: string }>("videos");
  return {
    images,
    videos,
    imagesOrder: pickNumberArray("imagesOrder"),
    videosOrder: pickNumberArray("videosOrder"),
    imagesCoverIndex: pickNumber("imagesCoverIndex"),
    videosCoverIndex: pickNumber("videosCoverIndex"),
    avatar: pickObj<{ name: string; url: string }>("avatar"),
  };
}

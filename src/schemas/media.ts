import { z } from "zod";

/**
 * Media file schema - Generic media file (image or video)
 * Used for finalize media payload validation
 */
export const MediaFileSchema = z.object({
  // 'name' is used as a storage key; allow longer keys to accommodate
  // directory prefixes (e.g., charters/<id>/media/<file>). Keep generous cap.
  name: z
    .string()
    .min(1)
    .max(512)
    .refine(
      (val) => {
        // Accept legacy simple filenames (.jpg/.png/.webp) in tests & transitional flows.
        if (/^[\w.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(val)) return true;
        if (val.startsWith("captains/") && val.includes("/avatar/"))
          return true;
        if (val.startsWith("verification/")) return true;
        if (val.startsWith("captains/") && val.includes("/media/")) return true;
        if (val.startsWith("temp/") && val.includes("/original/")) return true;
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

/**
 * Finalize media schema - Used when finalizing charter with media
 * Includes images, videos, ordering, and cover indices
 */
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

/**
 * Normalized finalize media interface
 * Simplified shape consumed by charter creation logic
 */
export interface NormalizedFinalizeMedia {
  images: { name: string; url: string }[];
  videos: { name: string; url: string }[];
  imagesOrder?: number[];
  videosOrder?: number[];
  imagesCoverIndex?: number;
  videosCoverIndex?: number;
  avatar: { name: string; url: string } | null;
}

/**
 * Normalize finalize media payload
 * Extracts and validates media data from raw payload
 */
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

/**
 * Schema for incoming media update (edit mode)
 * Used when updating charter media in edit mode
 */
export const IncomingMediaSchema = z.object({
  media: z.object({
    images: z
      .array(
        z.object({
          name: z.string().min(1),
          url: z.string().url(),
          thumbnailUrl: z.string().url().optional(),
          durationSeconds: z.number().int().positive().optional(),
        })
      )
      .max(20),
    videos: z
      .array(
        z.object({
          name: z.string().min(1),
          url: z.string().url(),
          thumbnailUrl: z.string().url().optional(),
          durationSeconds: z.number().int().positive().optional(),
        })
      )
      .max(5),
    deleteKeys: z.array(z.string()).optional(),
  }),
  deleteKeys: z.array(z.string()).optional(),
  order: z
    .object({
      images: z.array(z.number().int().nonnegative()).optional(),
      videos: z.array(z.number().int().nonnegative()).optional(),
    })
    .optional(),
});

/**
 * Schema for media removal request
 */
export const MediaRemovalSchema = z.object({
  mediaId: z.string().optional(), // direct CharterMedia id
  storageKey: z.string().optional(), // fallback if id not known yet
});

/**
 * Schema for video thumbnail upload
 * Used when uploading a custom thumbnail for a video
 */
export const VideoThumbnailSchema = z.object({
  storageKey: z.string().min(1),
  dataUrl: z
    .string()
    .min(50)
    .refine((v) => v.startsWith("data:image/"), "must be data:image/* base64"),
  durationSeconds: z
    .number()
    .int()
    .positive()
    .max(60 * 60 * 6)
    .optional(),
});

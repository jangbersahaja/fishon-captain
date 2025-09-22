import { useEffect, useState } from "react";

import type { MediaPreview } from "../types";

// Accepts File[] or items that already carry { url, name }
// This makes the hook resilient when the caller passes pre-normalized media
// instead of raw File objects.
export function useMediaPreviews(
  files: Array<File | { url: string; name?: string }> | undefined | null
) {
  const [previews, setPreviews] = useState<MediaPreview[]>([]);

  useEffect(() => {
    if (!files?.length) {
      setPreviews([]);
      return;
    }

    const canObjectURL =
      typeof window !== "undefined" &&
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL === "function";
    const createdBlobUrls: string[] = [];

    const isFile = (v: unknown): v is File =>
      typeof File !== "undefined" && v instanceof File;

    const next: MediaPreview[] = files.map((item) => {
      if (isFile(item)) {
        if (canObjectURL) {
          const blobUrl = URL.createObjectURL(item);
          createdBlobUrls.push(blobUrl);
          return { name: item.name, url: blobUrl };
        }
        // Fallback when createObjectURL is unavailable (SSR or very old env)
        return { name: item.name, url: "" };
      }
      // Already has a URL (string). Ensure name exists.
      const name =
        item.name ??
        (typeof item.url === "string"
          ? item.url.split("/").pop() || "media"
          : "media");
      return { name, url: item.url };
    });

    setPreviews(next);

    return () => {
      // Revoke only URLs that we created in this effect
      createdBlobUrls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* noop */
        }
      });
    };
  }, [files]);

  return previews;
}

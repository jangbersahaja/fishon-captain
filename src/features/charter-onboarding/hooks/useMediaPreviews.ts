import type { MediaPreview } from "@features/charter-onboarding/types";
import { useEffect, useMemo, useState } from "react";

export function useMediaPreviews(
  files: Array<File | { url: string; name?: string }> | undefined | null
) {
  const [previews, setPreviews] = useState<MediaPreview[]>([]);

  const signature = useMemo(() => {
    if (!files || files.length === 0) return "__empty__";
    const isFile = (v: unknown): v is File =>
      typeof File !== "undefined" && v instanceof File;
    try {
      return files
        .map((item) =>
          isFile(item)
            ? `F:${item.name}:${item.size}:${item.lastModified}`
            : `U:${item.name ?? ""}:$${(item as { url: string }).url}`
        )
        .join("|")
        .slice(0, 5000);
    } catch {
      return `len:${files.length}`;
    }
  }, [files]);

  useEffect(() => {
    if (!files?.length) {
      setPreviews([]);
      return;
    }
    const canBlob =
      typeof window !== "undefined" &&
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL === "function";
    const created: string[] = [];
    const isFile = (v: unknown): v is File =>
      typeof File !== "undefined" && v instanceof File;
    const next: MediaPreview[] = files.map((item) => {
      if (isFile(item)) {
        if (canBlob) {
          const blobUrl = URL.createObjectURL(item);
          created.push(blobUrl);
          return { name: item.name, url: blobUrl };
        }
        return { name: item.name, url: "" };
      }
      const name =
        item.name ??
        (typeof item.url === "string"
          ? item.url.split("/").pop() || "media"
          : "media");
      return { name, url: item.url };
    });
    setPreviews(next);
    return () => {
      created.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    };
  }, [signature, files]);

  return previews;
}

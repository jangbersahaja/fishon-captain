"use client";
import type { Charter } from "@/dummy/charter";
import { PreviewPanel } from "@features/charter-onboarding/preview";
import { useEffect, useState } from "react";

type ReviewStepProps = {
  charter: Charter;
  videos?: { url: string; name?: string; thumbnailUrl?: string | null }[];
};

export function ReviewStep({ charter, videos }: ReviewStepProps) {
  const [dbVideos, setDbVideos] = useState<
    { url: string; name?: string; thumbnailUrl?: string | null }[]
  >(videos || []);

  // Fetch authoritative CaptainVideo list for the signed-in user to avoid duplicates and ensure thumbnails
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/videos/list-self", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          videos?: Array<{
            originalUrl: string;
            ready720pUrl?: string | null;
            thumbnailUrl?: string | null;
          }>;
        };
        const mapped = (json.videos || []).map((v) => ({
          url: v.ready720pUrl || v.originalUrl,
          thumbnailUrl: v.thumbnailUrl || null,
        }));
        if (!cancelled) setDbVideos(mapped);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <PreviewPanel charter={charter} videos={dbVideos} />;
}

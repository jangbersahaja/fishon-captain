"use client";
import type { Charter } from "@/dummy/charter";
import { PreviewPanel } from "@features/charter-onboarding/preview";
import { useEffect, useState } from "react";

type ReviewStepProps = {
  charter: Charter;
  ownerId: string;
};

interface VideoRecord {
  id: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  processStatus: string;
  ready720pUrl?: string | null;
  processedDurationSec?: number | null;
}

export function ReviewStep({ charter, ownerId }: ReviewStepProps) {
  const [videos, setVideos] = useState<
    { url: string; name?: string; thumbnailUrl?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch(`/api/videos/list?ownerId=${ownerId}`);
        if (res.ok) {
          const data = await res.json();
          const videoRecords: VideoRecord[] = data.videos || [];

          // Transform to preview format, only include ready videos
          const previewVideos = videoRecords
            .filter((v) => v.processStatus === "ready")
            .map((v, index) => ({
              url: v.ready720pUrl || v.originalUrl,
              name: `video-${index + 1}`,
              thumbnailUrl: v.thumbnailUrl,
              durationSeconds: v.processedDurationSec ?? undefined,
            }))
            .filter((v) => !!v.url);

          console.log("[ReviewStep] Fetched videos:", {
            total: videoRecords.length,
            ready: previewVideos.length,
            sample: previewVideos[0],
          });

          setVideos(previewVideos);
        }
      } catch (error) {
        console.error("[ReviewStep] Failed to fetch videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [ownerId]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-slate-400">Loading preview...</div>
        </div>
      </div>
    );
  }

  return <PreviewPanel charter={charter} videos={videos} />;
}

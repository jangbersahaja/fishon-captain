"use client";
import type { Charter } from "@/dummy/charter";
import { PreviewPanel } from "@features/charter-onboarding/preview";
import { useEffect, useState } from "react";

type ReviewStepProps = {
  charter: Charter;
  ownerId: string;
  charterId?: string | null; // For edit mode: fetch from CharterVideo junction
  draftId?: string | null; // For new charter: fetch from temp draft links
  existingVideos?: { name: string; url: string }[]; // For new charter: videos from form state
};

interface VideoRecord {
  id: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  processStatus: string;
  ready720pUrl?: string | null;
  processedDurationSec?: number | null;
}

export function ReviewStep({
  charter,
  ownerId,
  charterId,
  draftId,
  existingVideos,
}: ReviewStepProps) {
  const [videos, setVideos] = useState<
    { url: string; name?: string; thumbnailUrl?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // Priority 1: Use existing videos from form state (new charter mode)
        if (!charterId && existingVideos && existingVideos.length > 0) {
          console.log(
            "[ReviewStep] Using existing videos from form state:",
            existingVideos.length
          );
          setVideos(existingVideos);
          setLoading(false);
          return;
        }

        // Priority 2: Edit mode - fetch from CharterVideo junction by charterId
        if (charterId) {
          const res = await fetch(`/api/videos/list?charterId=${charterId}`);
          if (res.ok) {
            const data = await res.json();
            const videoRecords: VideoRecord[] = data.videos || [];

            const previewVideos = videoRecords
              .filter((v) => v.processStatus === "ready")
              .map((v, index) => ({
                url: v.ready720pUrl || v.originalUrl,
                name: `video-${index + 1}`,
                thumbnailUrl: v.thumbnailUrl,
                durationSeconds: v.processedDurationSec ?? undefined,
              }))
              .filter((v) => !!v.url);

            console.log(
              "[ReviewStep] Fetched videos for charter (edit mode):",
              {
                charterId,
                total: videoRecords.length,
                ready: previewVideos.length,
              }
            );

            setVideos(previewVideos);
            setLoading(false);
            return;
          }
        }

        // Priority 2: New charter with draft - fetch from CharterVideo junction by draftId
        if (draftId) {
          const res = await fetch(`/api/videos/list?charterId=${draftId}`);
          if (res.ok) {
            const data = await res.json();
            const videoRecords: VideoRecord[] = data.videos || [];

            const previewVideos = videoRecords
              .filter((v) => v.processStatus === "ready")
              .map((v, index) => ({
                url: v.ready720pUrl || v.originalUrl,
                name: `video-${index + 1}`,
                thumbnailUrl: v.thumbnailUrl,
                durationSeconds: v.processedDurationSec ?? undefined,
              }))
              .filter((v) => !!v.url);

            console.log(
              "[ReviewStep] Fetched videos for draft (new charter mode):",
              {
                draftId,
                total: videoRecords.length,
                ready: previewVideos.length,
              }
            );

            setVideos(previewVideos);
            setLoading(false);
            return;
          }
        }

        // Priority 3: Fallback - fetch all captain's videos (legacy behavior)
        const res = await fetch(`/api/videos/list?ownerId=${ownerId}`);
        if (res.ok) {
          const data = await res.json();
          const videoRecords: VideoRecord[] = data.videos || [];

          const previewVideos = videoRecords
            .filter((v) => v.processStatus === "ready")
            .map((v, index) => ({
              url: v.ready720pUrl || v.originalUrl,
              name: `video-${index + 1}`,
              thumbnailUrl: v.thumbnailUrl,
              durationSeconds: v.processedDurationSec ?? undefined,
            }))
            .filter((v) => !!v.url);

          console.log("[ReviewStep] Fetched all captain videos (fallback):", {
            total: videoRecords.length,
            ready: previewVideos.length,
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
  }, [ownerId, charterId, draftId, existingVideos]);

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

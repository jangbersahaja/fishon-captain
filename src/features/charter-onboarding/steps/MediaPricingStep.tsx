"use client";

import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { PhotoGrid } from "@features/charter-onboarding/components";
// Enhanced video upload system with queue management, retry, and persistence
import { EnhancedVideoUploader } from "@/components/captain/EnhancedVideoUploader";
import { VideoGalleryModal } from "@/components/captain/VideoGalleryModal";
import { VideoManager } from "@/components/captain/VideoManager";
import { useSession } from "next-auth/react";
import React, { useCallback, useMemo, useState, type ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

// (User type extension moved to src/types/next-auth.d.ts)

type MediaPreview = {
  url: string;
  name: string;
  alt?: string;
  isCover?: boolean;
};

type VideoPreview = MediaPreview & {
  thumbnailUrl?: string;
  status?: "queued" | "transcoding" | "ready" | "failed";
  durationSeconds?: number;
};

// Function props renamed with *Action suffix per Next.js serializable prop rule.
type MediaPricingStepProps = {
  form: UseFormReturn<CharterFormValues>;
  photoPreviews: MediaPreview[];
  videoPreviews?: VideoPreview[]; // legacy (ignored by new video uploader)
  onPhotoChangeAction?: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddPhotoFilesAction?: (files: File[]) => void;
  onRemovePhotoAction: (index: number) => void;
  onReorderPhotosAction?: (from: number, to: number) => void;
  currentCharterId?: string | null;
  onVideoBlockingChangeAction?: (blocking: boolean) => void;
  onReadyVideosChangeAction?: (videos: { name: string; url: string }[]) => void;
  seedVideos?: { name: string; url: string }[];
  // seedVideos removed: legacy video ingestion path deprecated
};

export function MediaPricingStep({
  form,
  photoPreviews,
  onPhotoChangeAction,
  onAddPhotoFilesAction,
  onRemovePhotoAction,
  onReorderPhotosAction,
  currentCharterId,
  onReadyVideosChangeAction,
}: MediaPricingStepProps) {
  const { watch, setValue } = form;
  const [draggingPhotos, setDraggingPhotos] = useState(false);

  const watchedPhotosAlt = watch("photosAlt" as keyof CharterFormValues);
  const photosAlt: string[] = useMemo(
    () => (Array.isArray(watchedPhotosAlt) ? watchedPhotosAlt : []) as string[],
    [watchedPhotosAlt]
  );
  const photoCoverIndex = 0; // first photo acts as cover

  const handleRemovePhoto = (index: number) => onRemovePhotoAction(index);

  const handleMovePhoto = (from: number, to: number) => {
    if (onReorderPhotosAction) onReorderPhotosAction(from, to);
  };

  const handlePhotoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (typeof onPhotoChangeAction === "function") {
      onPhotoChangeAction(e);
      return;
    }
    const list = Array.from(e.target.files || []);
    if (list.length) {
      const filtered = list.filter((f) => f.type.startsWith("image/"));
      onAddPhotoFilesAction?.(filtered);
    }
    e.target.value = "";
  };

  const handleFilesDrop = (
    e: React.DragEvent<HTMLDivElement>,
    kind: "photo"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    const filtered = files.filter((f) => f.type.startsWith("image/"));
    if (!filtered.length) return;
    if (kind === "photo") onAddPhotoFilesAction?.(filtered);
    if (kind === "photo") setDraggingPhotos(false);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    kind: "photo"
  ) => {
    e.preventDefault();
    if (kind === "photo") setDraggingPhotos(true);
  };

  const handleDragLeave = (kind: "photo") => {
    if (kind === "photo") setDraggingPhotos(false);
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLDivElement>,
    kind: "photo"
  ) => {
    const items = e.clipboardData?.files
      ? Array.from(e.clipboardData.files)
      : [];
    if (!items.length) return;
    const filtered = items.filter((f) => f.type.startsWith("image/"));
    if (!filtered.length) return;
    if (kind === "photo") onAddPhotoFilesAction?.(filtered);
  };

  const photoCount = photoPreviews?.length ?? 0;
  const PHOTO_MAX = 15;
  // Legacy constant retained for potential future display; new pipeline enforces its own limit server-side
  // const VIDEO_MAX = 10;

  const photoItems = useMemo(
    () =>
      (photoPreviews || []).map((p, i) => ({
        ...p,
        alt: photosAlt[i] ?? p.alt,
        isCover: i === photoCoverIndex,
      })),
    [photoPreviews, photosAlt]
  );

  // --- New short-form video integration ---
  // Use next-auth session user id as ownerId for video grid/upload
  const { data: session } = useSession();
  // Type assertion to include 'id' on user
  const ownerId = (
    session?.user as typeof session extends { user: infer U }
      ? U & { id?: string }
      : { id?: string }
  )?.id;
  const [refreshToken, setRefreshToken] = useState(0);

  const handleVideoSet = useCallback(
    (
      list: {
        id: string;
        originalUrl: string;
        processStatus: string;
        normalizedBlobKey?: string | null;
        blobKey?: string | null;
        thumbnailUrl?: string | null;
        processedDurationSec?: number | null;
      }[]
    ) => {
      const ready = list
        .filter((v) => v.processStatus === "ready")
        .map((v) => ({
          name: v.normalizedBlobKey || v.blobKey || v.id,
          url: v.originalUrl,
          thumbnailUrl: v.thumbnailUrl ?? undefined,
          durationSeconds: v.processedDurationSec ?? undefined,
        }));
      setValue("uploadedVideos", ready, { shouldValidate: false });
      onReadyVideosChangeAction?.(ready);
    },
    [setValue, onReadyVideosChangeAction]
  );

  // Video gallery modal state
  const [showVideoGallery, setShowVideoGallery] = useState(false);

  const handleVideosLinked = useCallback(() => {
    // Refresh video manager to show updated links
    setRefreshToken((t) => t + 1);
  }, []);

  return (
    <section className="p-6 bg-white border shadow-sm rounded-3xl border-neutral-200">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Photos & videos
        </h2>
        <p className="text-sm text-slate-500">
          Clear visuals help anglers trust your charter. Aim for bright shots of
          the boat, crew, and catches.
        </p>
      </header>

      <hr className="my-6 border-t border-neutral-200" />
      <div className="space-y-6">
        <div
          className={`rounded-2xl border p-4 ${
            draggingPhotos
              ? "border-slate-400 bg-slate-50"
              : "border-neutral-200"
          }`}
          onDragOver={(e) => handleDragOver(e, "photo")}
          onDrop={(e) => handleFilesDrop(e, "photo")}
          onDragLeave={() => handleDragLeave("photo")}
          onPaste={(e) => handlePaste(e, "photo")}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Photos{" "}
              <span className="ml-1 text-xs text-slate-500">
                ({photoCount}/{PHOTO_MAX})
              </span>
            </h3>
            <label
              htmlFor="photo-upload"
              className="cursor-pointer rounded border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
              aria-disabled={photoCount >= PHOTO_MAX}
              data-disabled={photoCount >= PHOTO_MAX}
            >
              Add photos
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoInputChange}
              disabled={photoCount >= PHOTO_MAX}
            />
          </div>

          <PhotoGrid
            items={photoItems}
            emptyLabel="No photos uploaded"
            onRemove={handleRemovePhoto}
            onUpdateAlt={(i, alt) => {
              const next = [...photosAlt];
              next[i] = alt;
              setValue("photosAlt" as keyof CharterFormValues, next, {
                shouldValidate: false,
              });
            }}
            onMove={handleMovePhoto}
          />
        </div>

        <div className="p-4 space-y-6 border rounded-2xl border-neutral-200">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Short videos
            </h3>
            {!ownerId && (
              <div className="text-xs text-amber-600">
                Save earlier steps to unlock video uploads.
              </div>
            )}
            {ownerId && (
              <div className="flex flex-col gap-3">
                {/* Video action buttons - unified styling */}
                <div className="flex flex-wrap items-start gap-3">
                  {/* Select from existing videos */}
                  {currentCharterId && (
                    <button
                      type="button"
                      onClick={() => setShowVideoGallery(true)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-blue-600 transition-colors border border-blue-200 rounded-lg w-fit bg-blue-50 hover:bg-blue-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      Select from Gallery
                    </button>
                  )}
                  {/* Upload new videos */}
                  <EnhancedVideoUploader
                    onUploaded={handleVideosLinked}
                    maxFiles={5}
                    allowMultiple={true}
                    autoStart={true}
                    showQueue={true}
                    charterId={currentCharterId || null}
                  />
                </div>
              </div>
            )}
          </div>
          {ownerId && (
            <VideoManager
              ownerId={ownerId}
              charterId={currentCharterId || null}
              refreshToken={refreshToken}
              onVideosChange={handleVideoSet}
              // Do NOT pass onPendingChange here - server-side transcoding should not block
            />
          )}
        </div>

        {/* Video Gallery Modal */}
        {ownerId && (
          <VideoGalleryModal
            open={showVideoGallery}
            onClose={() => setShowVideoGallery(false)}
            charterId={currentCharterId || null}
            ownerId={ownerId}
            onVideosLinked={handleVideosLinked}
          />
        )}
      </div>
    </section>
  );
}

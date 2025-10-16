"use client";

import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { PhotoGrid } from "@features/charter-onboarding/components";
// Enhanced video upload system with queue management, retry, and persistence
import { EnhancedVideoUploader } from "@/components/captain/EnhancedVideoUploader";
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
  onVideoBlockingChangeAction,
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
    (list: { id: string; originalUrl: string; processStatus: string }[]) => {
      const ready = list
        .filter((v) => v.processStatus === "ready")
        .map((v) => ({ name: v.id, url: v.originalUrl }));
      setValue("uploadedVideos", ready, { shouldValidate: false });
      onReadyVideosChangeAction?.(ready);
    },
    [setValue, onReadyVideosChangeAction]
  );

  // Debounce refreshToken updates to batch multiple uploads within 2s
  const refreshDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleVideoUploaded = useCallback(() => {
    // Clear any pending refresh
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }
    // Schedule new refresh after 2s of inactivity
    refreshDebounceRef.current = setTimeout(() => {
      setRefreshToken((t) => t + 1);
      refreshDebounceRef.current = null;
    }, 2000);
  }, []);

  // Track client-side queue blocking separately from server-side processing
  const handleQueueBlockingChange = useCallback(
    (blocking: boolean) => {
      // Only block submit/save during client-side upload to queue (uploading/processing in queue)
      // Server-side transcoding (queued/processing in DB) is async and should NOT block
      onVideoBlockingChangeAction?.(blocking);
    },
    [onVideoBlockingChangeAction]
  );

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Photos & videos
        </h2>
        <p className="text-sm text-slate-500">
          Clear visuals help anglers trust your charter. Aim for bright shots of
          the boat, crew, and catches.
        </p>
      </header>

      <hr className="border-t my-6 border-neutral-200" />
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
          <div className="mb-3 flex items-center justify-between">
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

        <div className="rounded-2xl border p-4 border-neutral-200 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              Short videos
            </h3>
            {!ownerId && (
              <div className="text-xs text-amber-600 mb-3">
                Save earlier steps to unlock video uploads.
              </div>
            )}
            {ownerId && (
              <EnhancedVideoUploader
                onUploaded={handleVideoUploaded}
                onQueueBlockingChange={handleQueueBlockingChange}
                maxFiles={5}
                allowMultiple={true}
                autoStart={true}
                showQueue={true}
              />
            )}
          </div>
          {ownerId && (
            <VideoManager
              ownerId={ownerId}
              refreshToken={refreshToken}
              onVideosChange={handleVideoSet}
              // Do NOT pass onPendingChange here - server-side transcoding should not block
            />
          )}
        </div>
      </div>
    </section>
  );
}

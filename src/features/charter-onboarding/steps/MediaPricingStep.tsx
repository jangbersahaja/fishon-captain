"use client";

import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { PhotoGrid } from "@features/charter-onboarding/components";
import { VideoUploadSection } from "@features/charter-onboarding/components/VideoUploadSection";
import { useMemo, useState, type ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

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

type MediaPricingStepProps = {
  form: UseFormReturn<CharterFormValues>;
  photoPreviews: MediaPreview[];
  videoPreviews?: VideoPreview[]; // legacy (ignored by new video uploader)
  onPhotoChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  // onVideoChange?: (e: ChangeEvent<HTMLInputElement>) => void; // removed
  onAddPhotoFiles?: (files: File[]) => void;
  onAddVideoFiles?: (files: File[]) => void; // legacy
  onRemovePhoto: (index: number) => void;
  onRemoveVideo?: (index: number) => void; // legacy optional
  onReorderPhotos?: (from: number, to: number) => void; // still supported externally
  onRetryVideo?: (index: number) => void;
  currentCharterId?: string | null;
  onVideoBlockingChange?: (blocking: boolean) => void;
  onReadyVideosChange?: (videos: { name: string; url: string }[]) => void;
  seedVideos?: { name: string; url: string; thumbnailUrl?: string }[]; // new: hydrate existing DB videos
};

export function MediaPricingStep({
  form,
  photoPreviews,
  onPhotoChange,
  onAddPhotoFiles,
  onRemovePhoto,
  onReorderPhotos,
  currentCharterId,
  onVideoBlockingChange,
  onReadyVideosChange,
  seedVideos,
}: MediaPricingStepProps) {
  const { watch, setValue } = form;
  const [draggingPhotos, setDraggingPhotos] = useState(false);
  // Legacy draggingVideos state removed (video uploader handles its own UX)

  const watchedPhotosAlt = watch("photosAlt" as keyof CharterFormValues);
  // const watchedVideosAlt = watch("videosAlt" as keyof CharterFormValues); // reserved for future video alt feature

  const photosAlt = useMemo(() => watchedPhotosAlt || [], [watchedPhotosAlt]);
  // Video alt currently unused (reserved for future enhancement)
  // const videosAlt = useMemo(() => (watchedVideosAlt as string[]) || [], [watchedVideosAlt]);

  // Cover logic: first item is always cover; no explicit controls.
  const photoCoverIndex = 0;

  const handleRemovePhoto = (index: number) => onRemovePhoto(index);

  // handleRemoveVideo no longer used; removal handled inside new VideoUploadSection

  const handleMovePhoto = (from: number, to: number) => {
    if (onReorderPhotos) onReorderPhotos(from, to);
  };

  const handleUpdatePhotoAlt = (i: number, alt: string) => {
    const arr = Array.isArray(photosAlt) ? [...photosAlt] : [];
    arr[i] = alt;
    setValue("photosAlt" as keyof CharterFormValues, arr, {
      shouldValidate: false,
    });
  };

  // Video alt editing not supported in dedicated grid

  const photoItems = useMemo(
    () =>
      (photoPreviews || []).map((p, i) => ({
        ...p,
        alt: Array.isArray(photosAlt) ? photosAlt[i] ?? p.alt : p.alt,
        isCover: i === photoCoverIndex,
      })),
    [photoPreviews, photosAlt]
  );
  // Legacy videoItems computation retained for fallback but replaced by new VideoUploadSection below.
  // Legacy videoItems removed.

  const photoCount = photoPreviews?.length ?? 0;
  // videoCount unused after migration.
  const PHOTO_MAX = 15;
  const VIDEO_MAX = 10;

  // Fallback input change handlers: if parent didn't provide onPhotoChange/onVideoChange,
  // call the addFiles delegates directly so "Add" buttons work.
  const handlePhotoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (typeof onPhotoChange === "function") {
      onPhotoChange(e);
      return;
    }
    const list = Array.from(e.target.files || []);
    if (list.length) {
      const filtered = list.filter((f) => f.type.startsWith("image/"));
      onAddPhotoFiles?.(filtered);
    }
    // allow selecting same file again
    e.target.value = "";
  };
  // Legacy file input change handler for videos removed.

  // Drop/paste handlers
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
    if (kind === "photo") onAddPhotoFiles?.(filtered);
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
    if (kind === "photo") onAddPhotoFiles?.(filtered);
  };

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
        {/* Photos */}
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
            onUpdateAlt={handleUpdatePhotoAlt}
            onMove={handleMovePhoto}
            // Retry removed; image uploads are atomic
          />
        </div>

        {/* Videos - new minimal uploader section */}
        <div className="rounded-2xl border p-4 border-neutral-200">
          <VideoUploadSection
            charterId={currentCharterId || null}
            max={VIDEO_MAX}
            onBlockingChange={onVideoBlockingChange}
            onItemsChange={(items) => {
              if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
                console.log("[VideoUploadSection bridge] items update", items);
              }
              // Derive ready videos (finalUrl present)
              const ready = items
                .filter((i) => i.status === "ready" && i.finalUrl)
                .map((i) => {
                  const candidate = i.finalUrl || i.previewUrl || i.name;
                  let display = i.name;
                  if (candidate) {
                    try {
                      const clean = candidate.split("?")[0];
                      const segs = clean.split("/");
                      display = decodeURIComponent(
                        segs[segs.length - 1] || i.name
                      );
                    } catch {}
                  }
                  return { name: display, url: i.finalUrl as string };
                });
              onReadyVideosChange?.(ready);
            }}
            seedVideos={seedVideos}
          />
        </div>
      </div>
    </section>
  );
}

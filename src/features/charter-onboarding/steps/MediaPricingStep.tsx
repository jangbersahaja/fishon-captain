"use client";

import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { MediaGrid } from "@features/charter-onboarding/components";
import { useMemo, useState, type ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

type MediaPreview = {
  url: string;
  name: string;
  alt?: string;
  isCover?: boolean;
};

type MediaPricingStepProps = {
  form: UseFormReturn<CharterFormValues>;
  photoPreviews: MediaPreview[];
  videoPreviews: MediaPreview[];
  onPhotoChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onVideoChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddPhotoFiles?: (files: File[]) => void; // drop/paste support
  onAddVideoFiles?: (files: File[]) => void; // drop/paste support
  onRemovePhoto: (index: number) => void;
  onRemoveVideo: (index: number) => void;
  videoProgress?: number[]; // NEW
  photoProgress?: number[]; // optional
  existingPhotosCount?: number;
  existingVideosCount?: number;
  onReorderPhotos?: (from: number, to: number) => void;
  onReorderVideos?: (from: number, to: number) => void;
  onRetryPhoto?: (index: number) => void;
  onRetryVideo?: (index: number) => void;
};

export function MediaPricingStep({
  form,
  photoPreviews,
  videoPreviews,
  onPhotoChange,
  onVideoChange,
  onAddPhotoFiles,
  onAddVideoFiles,
  onRemovePhoto,
  onRemoveVideo,
  existingPhotosCount = 0,
  existingVideosCount = 0,
  onReorderPhotos,
  onReorderVideos,
  photoProgress,
  videoProgress,
  onRetryPhoto,
  onRetryVideo,
}: MediaPricingStepProps) {
  const { watch, setValue } = form;
  const [draggingPhotos, setDraggingPhotos] = useState(false);
  const [draggingVideos, setDraggingVideos] = useState(false);

  const watchedPhotosAlt = watch("photosAlt" as keyof CharterFormValues);
  const watchedVideosAlt = watch("videosAlt" as keyof CharterFormValues);

  const photosAlt = useMemo(() => watchedPhotosAlt || [], [watchedPhotosAlt]);
  const videosAlt = useMemo(
    () => (watchedVideosAlt as string[]) || [],
    [watchedVideosAlt]
  );

  // Cover logic: first item is always cover; no explicit controls.
  const photoCoverIndex = 0;
  const videoCoverIndex = 0;

  const handleRemovePhoto = (index: number) => {
    onRemovePhoto(index);
  };

  const handleRemoveVideo = (index: number) => {
    onRemoveVideo(index);
  };

  const handleMovePhoto = (from: number, to: number) => {
    const current = [...(watch("photos") || [])];
    const total = existingPhotosCount + current.length;
    if (to < 0 || to >= total) return;
    if (typeof onReorderPhotos === "function") {
      // Let parent handle all cases, including cross-boundary and persistence.
      onReorderPhotos(from, to);
      return;
    }
    if (from < existingPhotosCount || to < existingPhotosCount) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setValue("photos", current, { shouldValidate: true });
  };

  const handleMoveVideo = (from: number, to: number) => {
    const current = [...(watch("videos") || [])];
    const total = existingVideosCount + current.length;
    if (to < 0 || to >= total) return;
    if (typeof onReorderVideos === "function") {
      onReorderVideos(from, to);
      return;
    }
    if (from < existingVideosCount || to < existingVideosCount) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setValue("videos", current, { shouldValidate: true });
  };

  const handleUpdatePhotoAlt = (i: number, alt: string) => {
    const arr = Array.isArray(photosAlt) ? [...photosAlt] : [];
    arr[i] = alt;
    setValue("photosAlt" as keyof CharterFormValues, arr, {
      shouldValidate: false,
    });
  };

  const handleUpdateVideoAlt = (i: number, alt: string) => {
    const arr = Array.isArray(videosAlt) ? [...videosAlt] : [];
    arr[i] = alt;
    setValue("videosAlt" as keyof CharterFormValues, arr, {
      shouldValidate: false,
    });
  };

  const photoItems = useMemo(() => {
    return (photoPreviews || []).map((p, i) => ({
      ...p,
      alt: Array.isArray(photosAlt) ? photosAlt[i] ?? p.alt : p.alt,
      isCover: i === photoCoverIndex,
      progress:
        typeof existingPhotosCount === "number" &&
        i >= existingPhotosCount &&
        Array.isArray(photoProgress)
          ? photoProgress[i - existingPhotosCount]
          : undefined,
    }));
  }, [
    photoPreviews,
    photoCoverIndex,
    photosAlt,
    existingPhotosCount,
    photoProgress,
  ]);
  const videoItems = useMemo(() => {
    return (videoPreviews || []).map((v, i) => ({
      ...v,
      alt: Array.isArray(videosAlt) ? videosAlt[i] ?? v.alt : v.alt,
      isCover: i === videoCoverIndex,
      progress:
        typeof existingVideosCount === "number" &&
        i >= existingVideosCount &&
        Array.isArray(videoProgress)
          ? videoProgress[i - existingVideosCount]
          : undefined,
    }));
  }, [
    videoPreviews,
    videoCoverIndex,
    videosAlt,
    existingVideosCount,
    videoProgress,
  ]);

  const photoCount = photoPreviews?.length ?? 0;
  const videoCount = videoPreviews?.length ?? 0;
  const PHOTO_MAX = 15;
  const VIDEO_MAX = 3;

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
  const handleVideoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (typeof onVideoChange === "function") {
      onVideoChange(e);
      return;
    }
    const list = Array.from(e.target.files || []);
    if (list.length) {
      const filtered = list.filter((f) => f.type.startsWith("video/"));
      onAddVideoFiles?.(filtered);
    }
    e.target.value = "";
  };

  // Drop/paste handlers
  const handleFilesDrop = (
    e: React.DragEvent<HTMLDivElement>,
    kind: "photo" | "video"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    const filtered = files.filter((f) =>
      kind === "photo"
        ? f.type.startsWith("image/")
        : f.type.startsWith("video/")
    );
    if (!filtered.length) return;
    if (kind === "photo") onAddPhotoFiles?.(filtered);
    else onAddVideoFiles?.(filtered);
    if (kind === "photo") setDraggingPhotos(false);
    else setDraggingVideos(false);
  };
  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    kind: "photo" | "video"
  ) => {
    e.preventDefault();
    if (kind === "photo") setDraggingPhotos(true);
    else setDraggingVideos(true);
  };
  const handleDragLeave = (kind: "photo" | "video") => {
    if (kind === "photo") setDraggingPhotos(false);
    else setDraggingVideos(false);
  };
  const handlePaste = (
    e: React.ClipboardEvent<HTMLDivElement>,
    kind: "photo" | "video"
  ) => {
    const items = e.clipboardData?.files
      ? Array.from(e.clipboardData.files)
      : [];
    if (!items.length) return;
    const filtered = items.filter((f) =>
      kind === "photo"
        ? f.type.startsWith("image/")
        : f.type.startsWith("video/")
    );
    if (!filtered.length) return;
    if (kind === "photo") onAddPhotoFiles?.(filtered);
    else onAddVideoFiles?.(filtered);
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

          <MediaGrid
            items={photoItems}
            emptyLabel="No photos uploaded"
            onRemove={handleRemovePhoto}
            onUpdateAlt={handleUpdatePhotoAlt}
            onMove={handleMovePhoto}
            onRetry={onRetryPhoto}
            kind="image"
          />
        </div>

        {/* Videos */}
        <div
          className={`rounded-2xl border p-4 ${
            draggingVideos
              ? "border-slate-400 bg-slate-50"
              : "border-neutral-200"
          }`}
          onDragOver={(e) => handleDragOver(e, "video")}
          onDrop={(e) => handleFilesDrop(e, "video")}
          onDragLeave={() => handleDragLeave("video")}
          onPaste={(e) => handlePaste(e, "video")}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Videos{" "}
              <span className="ml-1 text-xs text-slate-500">
                ({videoCount}/{VIDEO_MAX})
              </span>
            </h3>
            <label
              htmlFor="video-upload"
              className="cursor-pointer rounded border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
              aria-disabled={videoCount >= VIDEO_MAX}
              data-disabled={videoCount >= VIDEO_MAX}
            >
              Add videos
            </label>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={handleVideoInputChange}
              disabled={videoCount >= VIDEO_MAX}
            />
          </div>

          <MediaGrid
            items={videoItems}
            emptyLabel="No videos uploaded"
            onRemove={handleRemoveVideo}
            onUpdateAlt={handleUpdateVideoAlt}
            onMove={handleMoveVideo}
            onRetry={onRetryVideo}
            kind="video"
          />
        </div>

      </div>
    </section>
  );
}

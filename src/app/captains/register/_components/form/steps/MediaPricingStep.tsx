"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CharterFormValues } from "../charterForm.schema";
import { Field } from "../components/Field"; // adjust path if yours differs
import { MediaGrid } from "../components/MediaGrid";
import { ACCENT, ACCENT_TINT, pricingCards } from "../constants";

type MediaPreview = {
  url: string;
  name: string;
  alt?: string;
  isCover?: boolean;
};

type MediaPricingStepProps = {
  form: UseFormReturn<CharterFormValues>;
  fieldError?: (path?: string) => string | undefined;
  photoPreviews: MediaPreview[];
  videoPreviews: MediaPreview[];
  onPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onVideoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  onRemoveVideo: (index: number) => void;
  videoProgress?: number[]; // NEW
  photoProgress?: number[]; // optional
};

export function MediaPricingStep({
  form,
  fieldError, // not used here, but kept for parity
  photoPreviews,
  videoPreviews,
  onPhotoChange,
  onVideoChange,
  onRemovePhoto,
  onRemoveVideo,
}: MediaPricingStepProps) {
  const { watch, setValue, getValues } = form;

  const watchedPhotosAlt = watch("photosAlt" as keyof CharterFormValues);
  const watchedVideosAlt = watch("videosAlt" as keyof CharterFormValues);

  const photosAlt = useMemo(() => watchedPhotosAlt || [], [watchedPhotosAlt]);
  const videosAlt = useMemo(
    () => (watchedVideosAlt as string[]) || [],
    [watchedVideosAlt]
  );

  const [photoCoverIndex, setPhotoCoverIndex] = useState<number>(() => {
    const v = getValues("imagesCoverIndex" as keyof CharterFormValues);
    return typeof v === "number" && v >= 0 ? v : 0;
  });

  const [videoCoverIndex, setVideoCoverIndex] = useState<number>(() => {
    const v = getValues("videosCoverIndex" as keyof CharterFormValues);
    return typeof v === "number" && v >= 0 ? v : 0;
  });

  useEffect(() => {
    setValue("imagesCoverIndex" as keyof CharterFormValues, photoCoverIndex, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [photoCoverIndex, setValue]);

  useEffect(() => {
    setValue("videosCoverIndex" as keyof CharterFormValues, videoCoverIndex, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [videoCoverIndex, setValue]);

  const handleSetCoverPhoto = (index: number) => {
    const total = (watch("photos") || []).length;
    if (index < 0 || index >= total) return;
    setPhotoCoverIndex(index);
  };

  const handleSetCoverVideo = (index: number) => {
    const total = (watch("videos") || []).length;
    if (index < 0 || index >= total) return;
    setVideoCoverIndex(index);
  };

  const handleRemovePhoto = (index: number) => {
    onRemovePhoto(index);
    const current = watch("photos") || [];
    let next = photoCoverIndex;
    if (current.length === 0) next = 0;
    else if (index === photoCoverIndex) next = 0;
    else if (index < photoCoverIndex) next = Math.max(0, photoCoverIndex - 1);
    setPhotoCoverIndex(next);
  };

  const handleRemoveVideo = (index: number) => {
    onRemoveVideo(index);
    const current = watch("videos") || [];
    let next = videoCoverIndex;
    if (current.length === 0) next = 0;
    else if (index === videoCoverIndex) next = 0;
    else if (index < videoCoverIndex) next = Math.max(0, videoCoverIndex - 1);
    setVideoCoverIndex(next);
  };

  const handleMovePhoto = (from: number, to: number) => {
    const current = [...(watch("photos") || [])];
    if (to < 0 || to >= current.length) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setValue("photos", current, { shouldValidate: true });

    if (photoCoverIndex === from) setPhotoCoverIndex(to);
    else if (from < photoCoverIndex && to >= photoCoverIndex)
      setPhotoCoverIndex((x) => x - 1);
    else if (from > photoCoverIndex && to <= photoCoverIndex)
      setPhotoCoverIndex((x) => x + 1);
  };

  const handleMoveVideo = (from: number, to: number) => {
    const current = [...(watch("videos") || [])];
    if (to < 0 || to >= current.length) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setValue("videos", current, { shouldValidate: true });

    if (videoCoverIndex === from) setVideoCoverIndex(to);
    else if (from < videoCoverIndex && to >= videoCoverIndex)
      setVideoCoverIndex((x) => x - 1);
    else if (from > videoCoverIndex && to <= videoCoverIndex)
      setVideoCoverIndex((x) => x + 1);
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

  const photoItems = useMemo(
    () =>
      (photoPreviews || []).map((p, i) => ({
        ...p,
        alt: Array.isArray(photosAlt) ? photosAlt[i] ?? p.alt : p.alt,
        isCover: i === photoCoverIndex,
      })),
    [photoPreviews, photoCoverIndex, photosAlt]
  );
  const videoItems = useMemo(
    () =>
      (videoPreviews || []).map((v, i) => ({
        ...v,
        alt: Array.isArray(videosAlt) ? videosAlt[i] ?? v.alt : v.alt,
        isCover: i === videoCoverIndex,
      })),
    [videoPreviews, videoCoverIndex, videosAlt]
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
        {/* Photos */}
        <div className="rounded-2xl border border-neutral-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Photos</h3>
            <label
              htmlFor="photo-upload"
              className="cursor-pointer rounded border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
            >
              Add photos
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPhotoChange}
            />
          </div>

          <MediaGrid
            items={photoItems}
            emptyLabel="No photos uploaded"
            onRemove={handleRemovePhoto}
            onSetCover={handleSetCoverPhoto}
            onUpdateAlt={handleUpdatePhotoAlt}
            onMove={handleMovePhoto}
          />
        </div>

        {/* Videos */}
        <div className="rounded-2xl border border-neutral-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Videos</h3>
            <label
              htmlFor="video-upload"
              className="cursor-pointer rounded border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
            >
              Add videos
            </label>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={onVideoChange}
            />
          </div>

          <MediaGrid
            items={videoItems}
            emptyLabel="No videos uploaded"
            onRemove={handleRemoveVideo}
            onSetCover={handleSetCoverVideo}
            onUpdateAlt={handleUpdateVideoAlt}
            onMove={handleMoveVideo}
          />
        </div>

        <Field
          label="Select your pricing plan"
          error={fieldError?.("pricingModel")}
          className="mt-8"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {pricingCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  form.setValue(
                    "pricingModel",
                    card.id as "basic" | "silver" | "gold",
                    {
                      shouldValidate: true,
                    }
                  )
                }
                className={clsx(
                  "flex h-full flex-col justify-between rounded-2xl border px-5 py-4 text-left transition",
                  form.watch("pricingModel") === card.id
                    ? "border-transparent text-white"
                    : "border-neutral-200 bg-white text-slate-700 hover:border-slate-300"
                )}
                style={
                  form.watch("pricingModel") === card.id
                    ? { borderColor: ACCENT, backgroundColor: ACCENT_TINT }
                    : undefined
                }
              >
                <div>
                  <span className="text-3xl font-bold text-slate-900">
                    {card.percentage}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-slate-800">
                    {card.title}
                  </h3>
                  <ul className="mt-3 space-y-1 text-sm text-slate-700">
                    {card.features.map((feature) => (
                      <li key={`${card.id}-${feature}`}>• {feature}</li>
                    ))}
                  </ul>
                </div>
                <span
                  className={clsx(
                    "mt-4 inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold",
                    form.watch("pricingModel") === card.id
                      ? "text-white"
                      : "border-neutral-200 text-slate-600"
                  )}
                  style={
                    form.watch("pricingModel") === card.id
                      ? { borderColor: ACCENT, backgroundColor: ACCENT }
                      : undefined
                  }
                >
                  {form.watch("pricingModel") === card.id
                    ? "Selected"
                    : "Select"}
                </span>
              </button>
            ))}
          </div>
        </Field>
      </div>
    </section>
  );
}

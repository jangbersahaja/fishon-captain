"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CharterFormValues } from "../charterForm.schema";
import { AutoResizeTextarea } from "../components/AutoResizeTextarea";
import { Field } from "../components/Field"; // adjust path if yours differs
import { MediaGrid } from "../components/MediaGrid";
import {
  generateCharterDescription,
  personalizationScore,
} from "../utils/descriptionGenerator";

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

  const generated = watch("generatedDescription" as keyof CharterFormValues) as
    | string
    | undefined;
  const descriptionValue = watch("description") as string;
  const tone = (watch("tone") as string) || "friendly";

  const score = useMemo(
    () => personalizationScore(generated, descriptionValue),
    [generated, descriptionValue]
  );

  const handleGenerate = useCallback(
    (mode: "new" | "refresh") => {
      const base = generateCharterDescription(form.getValues());
      // If mode refresh and user has edited beyond 40% keep their edits for paragraphs not placeholders
      if (mode === "refresh" && generated && descriptionValue && score > 40) {
        // naive strategy: only replace placeholder tokens [[...]] in current text
        const placeholders = descriptionValue.match(/\[\[[^\]]+\]\]/g) || [];
        let next = descriptionValue;
        const freshBlocks = base.split(/\n\n+/);
        placeholders.forEach((ph, i) => {
          const replacement = freshBlocks[i] || ph;
          next = next.replace(
            ph,
            replacement.includes("[[") ? replacement : replacement
          );
        });
        setValue("description", next, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } else {
        setValue("generatedDescription", base, { shouldDirty: true });
        setValue("description", base, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    [form, generated, descriptionValue, score, setValue]
  );

  const handleToneChange = (t: string) => {
    setValue("tone", t as "friendly" | "adventurous" | "professional", {
      shouldDirty: true,
    });
    handleGenerate("new");
  };

  useEffect(() => {
    // First mount: if no description yet, auto-generate
    if (!descriptionValue) {
      handleGenerate("new");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        <div className="mt-8 space-y-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { id: "friendly", label: "Friendly & Welcoming" },
              { id: "adventurous", label: "Adventurous & Energetic" },
              { id: "professional", label: "Professional & Informative" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleToneChange(opt.id)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  tone === opt.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-neutral-300 bg-white text-slate-600 hover:border-slate-400"
                }`}
                aria-pressed={tone === opt.id}
              >
                {opt.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium">Personalization:</span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  score >= 60
                    ? "bg-emerald-100 text-emerald-700"
                    : score >= 30
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {score}%
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            We generated a starter description based on what you&apos;ve filled
            in. Add your personality—stories, local insight, memorable catches.
            Anglers want to feel the day, not just read a list. Placeholders
            like{" "}
            <code className="rounded bg-white px-1">
              [[Add a sentence about your captain’s style]]
            </code>{" "}
            are prompts you can replace.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleGenerate("new")}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => handleGenerate("refresh")}
              className="rounded-full border border-slate-900 bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Refresh Placeholders
            </button>
          </div>
          <Field
            label="Charter description"
            error={fieldError?.("description")}
            className="mt-2"
          >
            <AutoResizeTextarea
              {...form.register("description")}
              rows={10}
              className="font-normal"
              placeholder="We’ll generate something here once you pick a tone."
            />
          </Field>
        </div>
      </div>
    </section>
  );
}

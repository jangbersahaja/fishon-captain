/**
 * useCharterMediaManager
 * Phase 3 extraction: Centralizes all media-related client logic previously embedded in FormSection.
 * This includes:
 *  - Local state for existing (server) vs new (local) images/videos
 *  - Upload flows with progress tracking (photo & video)
 *  - Avatar selection / upload (immediate when editing)
 *  - Reordering & removal (persisting order / deletions to server in edit mode)
 *  - Validation helpers (canSubmitMedia, isMediaUploading)
 *  - Preview derivation (image/video previews, video thumbnails, avatar preview)
 *
 * Intent: Shrink FormSection responsibilities to orchestration (steps, submit) and
 * decouple complex side-effects, easing future test coverage and maintenance.
 */
"use client";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import {
  useMediaPreviews,
  useVideoThumbnails,
} from "@features/charter-onboarding/hooks";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import type { UseFormReturn } from "react-hook-form";

export interface UseCharterMediaManagerArgs {
  form: UseFormReturn<CharterFormValues>;
  isEditing: boolean;
  currentCharterId: string | null;
  // Optional callback if avatar save should record a timestamp etc.
  onAvatarUploaded?: (url: string) => void;
}

export interface UseCharterMediaManagerResult {
  // Avatar
  captainAvatarPreview: string | null;
  handleAvatarChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearAvatar: () => void;
  // Existing (server) media collections
  existingImages: Array<{ name: string; url: string }>;
  existingVideos: Array<{ name: string; url: string }>;
  setExistingImages: React.Dispatch<
    React.SetStateAction<Array<{ name: string; url: string }>>
  >;
  setExistingVideos: React.Dispatch<
    React.SetStateAction<Array<{ name: string; url: string }>>
  >;
  // Upload progress arrays (0-100, -1 error)
  photoProgress: number[];
  videoProgress: number[];
  // Derived previews
  photoPreviews: Array<{ url: string; name?: string }>;
  videoPreviews: Array<{ url: string; name?: string; thumbnailUrl?: string }>;
  // Actions for adding media
  addPhotoFiles: (files: File[]) => Promise<void>;
  addVideoFiles: (files: File[]) => Promise<void>;
  // Reorder + removal + retry
  reorderExistingPhotos: (from: number, to: number) => void;
  reorderExistingVideos: (from: number, to: number) => void;
  removePhoto: (index: number) => void;
  removeVideo: (index: number) => void;
  retryPhoto: (index: number) => void;
  retryVideo: (index: number) => void;
  // Uploading / validation flags
  isMediaUploading: boolean;
  canSubmitMedia: boolean;
  combinedPhotoCount: number;
}

export function useCharterMediaManager({
  form,
  isEditing,
  currentCharterId,
  onAvatarUploaded,
}: UseCharterMediaManagerArgs): UseCharterMediaManagerResult {
  const { watch, setValue } = form;
  // Progress & persistent media
  const [photoProgress, setPhotoProgress] = useState<number[]>([]);
  const [videoProgress, setVideoProgress] = useState<number[]>([]);
  const [existingImages, setExistingImages] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [existingVideos, setExistingVideos] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [captainAvatarPreview, setCaptainAvatarPreview] = useState<
    string | null
  >(null);

  // Form watched fields
  const photos = watch("photos");
  const videos = watch("videos");
  const captainAvatarFile = watch("operator.avatar");

  // Merge existing (server) + new (local) for previews
  const mergedPhotos = useMemo(() => {
    const existing = Array.isArray(existingImages) ? existingImages : [];
    const current = Array.isArray(photos) ? photos : [];
    return [...existing, ...current];
  }, [existingImages, photos]);
  const mergedVideos = useMemo(() => {
    const existing = Array.isArray(existingVideos) ? existingVideos : [];
    const current = Array.isArray(videos) ? videos : [];
    return [...existing, ...current];
  }, [existingVideos, videos]);

  const photoPreviews = useMediaPreviews(mergedPhotos);
  const videoPreviewsBase = useMediaPreviews(mergedVideos);
  const { getThumbnailUrl } = useVideoThumbnails(currentCharterId);
  const videoPreviews = useMemo(
    () =>
      videoPreviewsBase.map((v) => ({
        ...v,
        // Normalize null to undefined to align with optional field typing
        thumbnailUrl: getThumbnailUrl(v.url) || undefined,
      })),
    [videoPreviewsBase, getThumbnailUrl]
  );

  const combinedPhotoCount = useMemo(() => {
    const localCount = Array.isArray(photos) ? photos.length : 0;
    return (existingImages?.length || 0) + localCount;
  }, [photos, existingImages]);

  // Hydrate persisted uploaded media metadata (create flow draft restore)
  useEffect(() => {
    if (existingImages.length === 0) {
      const persisted = form.getValues("uploadedPhotos") as
        | Array<{ name: string; url: string }>
        | undefined;
      if (persisted && persisted.length) {
        setExistingImages(persisted);
      }
    }
    if (existingVideos.length === 0) {
      const persistedV = form.getValues("uploadedVideos") as
        | Array<{ name: string; url: string }>
        | undefined;
      if (persistedV && persistedV.length) {
        setExistingVideos(persistedV);
      }
    }
    const avatarUrl = form.getValues("operator.avatarUrl");
    if (avatarUrl && !isEditing) {
      setCaptainAvatarPreview(avatarUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMediaUploading = useMemo(() => {
    if (!isEditing) return false;
    const pBusy = photoProgress.some((p) => p >= 0 && p < 100);
    const vBusy = videoProgress.some((p) => p >= 0 && p < 100);
    return pBusy || vBusy;
  }, [photoProgress, videoProgress, isEditing]);
  const canSubmitMedia = combinedPhotoCount >= 3;

  // Avatar handling (includes immediate upload when editing)
  const handleAvatarChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (!file.type.startsWith("image/")) {
          setValue("operator.avatar", file, { shouldValidate: true });
          return;
        }
        const { resizeImageFile } = await import("@/utils/resizeImage");
        const resized = await resizeImageFile(file, {
          square: true,
          maxWidth: 512,
          mimeType: "image/webp",
          nameSuffix: "-avatar",
        });
        setValue("operator.avatar", resized, { shouldValidate: true });
        if (isEditing) {
          const fd = new FormData();
          fd.set("file", resized);
          fd.set("docType", "charter_avatar");
          const up = await fetch("/api/blob/upload", {
            method: "POST",
            body: fd,
          });
          if (up.ok) {
            const { url } = await up.json();
            await fetch("/api/captain/avatar", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url, deleteKey: null }),
            });
            onAvatarUploaded?.(url);
          }
        }
      } catch {
        // fallback: keep original file
        setValue("operator.avatar", file, { shouldValidate: true });
      } finally {
        event.target.value = "";
      }
    },
    [isEditing, onAvatarUploaded, setValue]
  );

  const clearAvatar = useCallback(() => {
    setValue("operator.avatar", undefined, { shouldValidate: true });
    setCaptainAvatarPreview(null);
    const input = document.getElementById(
      "captain-avatar-upload"
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  }, [setValue]);

  // Sync avatar preview with file or keep existing when editing
  useEffect(() => {
    if (captainAvatarFile instanceof File) {
      const url = URL.createObjectURL(captainAvatarFile);
      setCaptainAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (!isEditing) setCaptainAvatarPreview(null);
  }, [captainAvatarFile, isEditing]);

  // Generic helper to perform xhr upload with progress callback
  const uploadWithProgress = useCallback(
    (fd: FormData, onProgress: (p: number) => void) =>
      new Promise<{ key: string; url: string }>((resolve, reject) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/blob/upload");
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              onProgress(Math.round((evt.loaded / evt.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText) as {
                  key?: string;
                  url?: string;
                };
                if (json.key && json.url)
                  resolve({ key: json.key, url: json.url });
                else reject(new Error("Upload response missing key/url"));
              } catch (e) {
                reject(
                  e instanceof Error ? e : new Error("Upload parse error")
                );
              }
            } else reject(new Error(`Upload failed: ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.send(fd);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Upload error"));
        }
      }),
    []
  );

  const addPhotoFiles = useCallback(
    async (fileList: File[]) => {
      if (!fileList.length) return;
      try {
        const { resizeImageFile } = await import("@/utils/resizeImage");
        const current = (watch("photos") ?? []) as File[];
        const incoming = await Promise.all(
          fileList.map((f) =>
            f.type.startsWith("image/")
              ? resizeImageFile(f, {
                  square: false,
                  maxWidth: 1280,
                  maxHeight: 720,
                  mimeType: "image/webp",
                  nameSuffix: "-gallery",
                })
              : Promise.resolve(f)
          )
        );
        const next = [...current, ...incoming].slice(0, 15);
        setValue("photos", next, { shouldValidate: true });
        setPhotoProgress((prev) => {
          const base = current.length;
          const addCount = Math.min(incoming.length, 15 - base);
          return [...prev, ...Array(addCount).fill(0)];
        });
        if (isEditing && currentCharterId) {
          const uploaded: Array<{ name: string; url: string }> = [];
          const base = current.length;
          for (let idx = 0; idx < incoming.length; idx++) {
            const f = incoming[idx];
            const fd = new FormData();
            fd.set("file", f);
            fd.set("docType", "charter_media");
            fd.set("charterId", currentCharterId);
            try {
              const { key, url } = await uploadWithProgress(fd, (p) => {
                setPhotoProgress((prev) => {
                  const arr = [...prev];
                  const pos = base + idx;
                  if (pos >= 0 && pos < arr.length) arr[pos] = p;
                  return arr;
                });
              });
              uploaded.push({ name: key, url });
              setPhotoProgress((prev) => {
                const arr = [...prev];
                const pos = base + idx;
                if (pos >= 0 && pos < arr.length) arr[pos] = 100;
                return arr;
              });
            } catch {
              setPhotoProgress((prev) => {
                const arr = [...prev];
                const pos = base + idx;
                if (pos >= 0 && pos < arr.length) arr[pos] = -1;
                return arr;
              });
            }
          }
          if (uploaded.length) {
            await fetch(`/api/charters/${currentCharterId}/media`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                media: {
                  images: [...existingImages, ...uploaded],
                  videos: existingVideos,
                },
              }),
            });
            setExistingImages((prev) => [...prev, ...uploaded]);
            setValue("photos", [], { shouldValidate: true });
            setPhotoProgress([]);
          }
        }
      } catch {
        const current = (watch("photos") ?? []) as File[];
        const next = [...current, ...fileList].slice(0, 15);
        setValue("photos", next, { shouldValidate: true });
      }
    },
    [
      watch,
      setValue,
      isEditing,
      currentCharterId,
      uploadWithProgress,
      existingImages,
      existingVideos,
    ]
  );

  const addVideoFiles = useCallback(
    async (fileList: File[]) => {
      if (!fileList.length) return;
      const current = (watch("videos") ?? []) as File[];
      const room = Math.max(0, 3 - current.length);
      const picked = fileList
        .filter((f) => f.type.startsWith("video/"))
        .slice(0, room);
      const MAX_BYTES = 200 * 1024 * 1024;
      const MAX_SECONDS = 90;
      const within: File[] = [];
      for (const f of picked) {
        if (f.size > MAX_BYTES) continue;
        const ok = await new Promise<boolean>((resolve) => {
          const url = URL.createObjectURL(f);
          const el = document.createElement("video");
          el.preload = "metadata";
          el.onloadedmetadata = () => {
            const d = Number.isFinite(el.duration) ? el.duration : 0;
            URL.revokeObjectURL(url);
            resolve(d <= MAX_SECONDS || d === 0);
          };
          el.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(true);
          };
          el.src = url;
        });
        if (ok) within.push(f);
      }
      setValue("videos", [...current, ...within].slice(0, 3), {
        shouldValidate: true,
      });
      setVideoProgress((prev) => {
        const base = current.length;
        const addCount = Math.min(within.length, 3 - base);
        return [...prev, ...Array(addCount).fill(0)];
      });
      if (isEditing && currentCharterId && within.length) {
        const uploaded: Array<{ name: string; url: string }> = [];
        const base = current.length;
        for (let idx = 0; idx < within.length; idx++) {
          const f = within[idx];
          const fd = new FormData();
          fd.set("file", f);
          fd.set("docType", "charter_media");
          fd.set("charterId", currentCharterId);
          try {
            const { key, url } = await uploadWithProgress(fd, (p) => {
              setVideoProgress((prev) => {
                const arr = [...prev];
                const pos = base + idx;
                if (pos >= 0 && pos < arr.length) arr[pos] = p;
                return arr;
              });
            });
            uploaded.push({ name: key, url });
            setVideoProgress((prev) => {
              const arr = [...prev];
              const pos = base + idx;
              if (pos >= 0 && pos < arr.length) arr[pos] = 100;
              return arr;
            });
          } catch {
            setVideoProgress((prev) => {
              const arr = [...prev];
              const pos = base + idx;
              if (pos >= 0 && pos < arr.length) arr[pos] = -1;
              return arr;
            });
          }
        }
        if (uploaded.length) {
          await fetch(`/api/charters/${currentCharterId}/media`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media: {
                images: existingImages,
                videos: [...existingVideos, ...uploaded],
              },
            }),
          });
          setExistingVideos((prev) => [...prev, ...uploaded]);
          setValue("videos", [], { shouldValidate: true });
          setVideoProgress([]);
        }
      }
    },
    [
      watch,
      setValue,
      isEditing,
      currentCharterId,
      uploadWithProgress,
      existingImages,
      existingVideos,
    ]
  );

  const reorderExistingPhotos = useCallback(
    (from: number, to: number) => {
      const existingCount = existingImages.length;
      if (from < 0 || to < 0) return;
      if (from >= existingCount || to >= existingCount) return;
      if (from === to) return;
      const next = [...existingImages];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setExistingImages(next);
      if (isEditing && currentCharterId) {
        fetch(`/api/charters/${currentCharterId}/media`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media: { images: next, videos: existingVideos },
          }),
        }).catch(() => {});
      }
    },
    [existingImages, existingVideos, isEditing, currentCharterId]
  );

  const reorderExistingVideos = useCallback(
    (from: number, to: number) => {
      const existingCount = existingVideos.length;
      if (from < 0 || to < 0) return;
      if (from >= existingCount || to >= existingCount) return;
      if (from === to) return;
      const next = [...existingVideos];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setExistingVideos(next);
      if (isEditing && currentCharterId) {
        fetch(`/api/charters/${currentCharterId}/media`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media: { images: existingImages, videos: next },
          }),
        }).catch(() => {});
      }
    },
    [existingImages, existingVideos, isEditing, currentCharterId]
  );

  const removePhoto = useCallback(
    (i: number) => {
      if (i < existingImages.length) {
        const removed = existingImages[i];
        const next = existingImages.filter((_, idx) => idx !== i);
        setExistingImages(next);
        if (isEditing && currentCharterId) {
          fetch(`/api/charters/${currentCharterId}/media`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media: { images: next, videos: existingVideos },
              deleteKeys: [removed.name],
            }),
          }).catch(() => {});
        }
        return;
      }
      const current = watch("photos") ?? [];
      const offset = i - existingImages.length;
      setValue(
        "photos",
        current.filter((_: unknown, idx: number) => idx !== offset),
        { shouldValidate: true }
      );
    },
    [
      existingImages,
      existingVideos,
      isEditing,
      currentCharterId,
      watch,
      setValue,
    ]
  );

  const removeVideo = useCallback(
    (i: number) => {
      if (i < existingVideos.length) {
        const removed = existingVideos[i];
        const next = existingVideos.filter((_, idx) => idx !== i);
        setExistingVideos(next);
        if (isEditing && currentCharterId) {
          fetch(`/api/charters/${currentCharterId}/media`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media: { images: existingImages, videos: next },
              deleteKeys: [removed.name],
            }),
          }).catch(() => {});
        }
        return;
      }
      const current = watch("videos") ?? [];
      const offset = i - existingVideos.length;
      setValue(
        "videos",
        current.filter((_: unknown, idx: number) => idx !== offset),
        { shouldValidate: true }
      );
    },
    [
      existingVideos,
      existingImages,
      isEditing,
      currentCharterId,
      watch,
      setValue,
    ]
  );

  const retryPhoto = useCallback(
    (i: number) => {
      setPhotoProgress((prev) => {
        const arr = [...prev];
        if (
          i - existingImages.length >= 0 &&
          i - existingImages.length < arr.length
        ) {
          arr[i - existingImages.length] = 0;
        }
        return arr;
      });
    },
    [existingImages.length]
  );

  const retryVideo = useCallback(
    (i: number) => {
      setVideoProgress((prev) => {
        const arr = [...prev];
        if (
          i - existingVideos.length >= 0 &&
          i - existingVideos.length < arr.length
        ) {
          arr[i - existingVideos.length] = 0;
        }
        return arr;
      });
    },
    [existingVideos.length]
  );

  return {
    captainAvatarPreview,
    handleAvatarChange,
    clearAvatar,
    existingImages,
    existingVideos,
    setExistingImages,
    setExistingVideos,
    photoProgress,
    videoProgress,
    photoPreviews,
    videoPreviews,
    addPhotoFiles,
    addVideoFiles,
    reorderExistingPhotos,
    reorderExistingVideos,
    removePhoto,
    removeVideo,
    retryPhoto,
    retryVideo,
    isMediaUploading,
    canSubmitMedia,
    combinedPhotoCount,
  };
}

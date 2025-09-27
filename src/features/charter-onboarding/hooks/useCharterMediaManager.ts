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
  useRef,
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
  avatarUploading: boolean;
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [existingImages, setExistingImages] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [existingVideos, setExistingVideos] = useState<
    Array<{
      name: string;
      url: string;
      thumbnailUrl?: string;
      durationSeconds?: number;
    }>
  >([]);
  const [captainAvatarPreview, setCaptainAvatarPreview] = useState<
    string | null
  >(null);

  // Form watched fields
  const photos = watch("photos");
  const videos = watch("videos");
  const captainAvatarFile = watch("operator.avatar");
  const avatarUrl = watch("operator.avatarUrl");

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
  const videoPreviews = useMemo(() => {
    return videoPreviewsBase.map((v) => {
      // If existing video already has persisted thumbnailUrl, prefer it
      const existingMatch = existingVideos.find((ev) => ev.url === v.url);
      return {
        ...v,
        thumbnailUrl:
          existingMatch?.thumbnailUrl || getThumbnailUrl(v.url) || undefined,
        durationSeconds: existingMatch?.durationSeconds,
      };
    });
  }, [videoPreviewsBase, getThumbnailUrl, existingVideos]);

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
    // Initialize avatar preview from saved avatarUrl (both editing and new drafts)
    const avatarUrl = form.getValues("operator.avatarUrl");
    if (avatarUrl) {
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
  // Relax minimum photo requirement when editing: existing listing can be saved with any current photo count.
  const canSubmitMedia = isEditing ? true : combinedPhotoCount >= 3;

  // Avatar handling - now includes immediate upload and draft save for both editing and new drafts
  const handleAvatarChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setAvatarUploading(true);
      try {
        if (!file.type.startsWith("image/")) {
          setValue("operator.avatar", file, { shouldValidate: true });
          return;
        }

        console.log("[avatar] processing upload", {
          name: file.name,
          size: file.size,
        });

        const { resizeImageFile } = await import("@/utils/resizeImage");
        const resized = await resizeImageFile(file, {
          square: true,
          maxWidth: 512,
          mimeType: "image/webp",
          nameSuffix: "-avatar",
        });

        // Store the file object for form validation
        setValue("operator.avatar", resized, { shouldValidate: true });

        // Immediately upload to blob storage for both editing and new drafts
        console.log("[avatar] uploading to blob storage");
        const fd = new FormData();
        fd.set("file", resized);
        fd.set("docType", "charter_avatar");

        const up = await fetch("/api/blob/upload", {
          method: "POST",
          body: fd,
        });

        if (up.ok) {
          const { url } = await up.json();
          console.log("[avatar] upload successful", { url });

          // Update avatarUrl in form state for draft persistence
          setValue("operator.avatarUrl", url, {
            shouldDirty: true,
            shouldValidate: false,
          });

          if (isEditing) {
            // For editing mode, also update the captain profile directly
            await fetch("/api/captain/avatar", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url, deleteKey: null }),
            });
          }

          // Notify parent component to trigger draft save
          onAvatarUploaded?.(url);
        } else {
          console.error("[avatar] upload failed", { status: up.status });
          // Keep the file object for form submission upload as fallback
        }
      } catch (error) {
        console.error("[avatar] processing failed:", error);
        // fallback: keep original file
        setValue("operator.avatar", file, { shouldValidate: true });
      } finally {
        setAvatarUploading(false);
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

  // Sync avatar preview with saved avatarUrl (from draft or server)
  useEffect(() => {
    // Only set preview from URL if there's no file selected
    if (!captainAvatarFile && avatarUrl) {
      setCaptainAvatarPreview(avatarUrl);
    } else if (!captainAvatarFile && !avatarUrl) {
      setCaptainAvatarPreview(null);
    }
  }, [avatarUrl, captainAvatarFile]);

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

  // Throttle progress updates to avoid rapid re-renders for tiny files
  const lastPhotoProgressRef = useRef<Record<number, number>>({});
  const lastVideoProgressRef = useRef<Record<number, number>>({});
  const shouldUpdateProgress = (
    ref: React.MutableRefObject<Record<number, number>>,
    idx: number,
    _p: number
  ) => {
    const now = performance.now();
    const last = ref.current[idx] ?? 0;
    if (now - last > 70 || _p === 0 || _p === 100) {
      ref.current[idx] = now;
      return true;
    }
    return false;
  };

  const HOLD_MS = 250; // time to allow 100% state to visually settle before switching collections

  const addPhotoFiles = useCallback(
    async (fileList: File[]) => {
      if (!fileList.length) return;
      if (isEditing && !currentCharterId) {
        console.warn(
          "[media] blocked video upload until charterId is available to ensure temp->transcode pipeline"
        );
        return;
      }
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
                if (!shouldUpdateProgress(lastPhotoProgressRef, base + idx, p))
                  return;
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
            setTimeout(() => {
              setExistingImages((prev) => [...prev, ...uploaded]);
              setValue("photos", [], { shouldValidate: true });
              setPhotoProgress([]);
            }, HOLD_MS);
          }
        } else if (isEditing && !currentCharterId) {
          // Edge case: editing flag true but charterId not yet available (hydration race). Fallback to draft-style immediate blob upload
          // to avoid blocking user with perpetual 0% progress entries.
          if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
            console.warn(
              "[media] editing without charterId – falling back to immediate upload path"
            );
          }
          const uploaded: Array<{ name: string; url: string }> = [];
          const base = current.length;
          for (let idx = 0; idx < incoming.length; idx++) {
            const f = incoming[idx];
            const fd = new FormData();
            fd.set("file", f);
            fd.set("docType", "charter_media");
            try {
              const { key, url } = await uploadWithProgress(fd, (p) => {
                if (!shouldUpdateProgress(lastPhotoProgressRef, base + idx, p))
                  return;
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
            setTimeout(() => {
              setExistingImages((prev) => [...prev, ...uploaded]);
              const prevPersisted = form.getValues("uploadedPhotos") || [];
              setValue("uploadedPhotos", [...prevPersisted, ...uploaded], {
                shouldDirty: true,
                shouldValidate: false,
              });
              setValue("photos", [], { shouldValidate: true });
              setPhotoProgress([]);
            }, HOLD_MS);
          }
        } else if (!isEditing) {
          // Create flow: upload immediately with progress even without charterId so UI isn't stuck.
          const uploaded: Array<{ name: string; url: string }> = [];
          const base = current.length;
          for (let idx = 0; idx < incoming.length; idx++) {
            const f = incoming[idx];
            const fd = new FormData();
            fd.set("file", f);
            fd.set("docType", "charter_media");
            try {
              const { key, url } = await uploadWithProgress(fd, (p) => {
                if (!shouldUpdateProgress(lastPhotoProgressRef, base + idx, p))
                  return;
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
            setTimeout(() => {
              setExistingImages((prev) => [...prev, ...uploaded]);
              const prevPersisted = form.getValues("uploadedPhotos") || [];
              setValue("uploadedPhotos", [...prevPersisted, ...uploaded], {
                shouldDirty: true,
                shouldValidate: false,
              });
              setValue("photos", [], { shouldValidate: true });
              setPhotoProgress([]);
            }, HOLD_MS);
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
      form,
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
              if (!shouldUpdateProgress(lastVideoProgressRef, base + idx, p))
                return;
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
          setTimeout(() => {
            setExistingVideos((prev) => [...prev, ...uploaded]);
            setValue("videos", [], { shouldValidate: true });
            setVideoProgress([]);
          }, HOLD_MS);
        }
      } else if (isEditing && !currentCharterId && within.length) {
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.warn(
            "[media] editing without charterId (videos) – immediate upload fallback"
          );
        }
        const uploaded: Array<{ name: string; url: string }> = [];
        const base = current.length;
        for (let idx = 0; idx < within.length; idx++) {
          const f = within[idx];
          const fd = new FormData();
          fd.set("file", f);
          fd.set("docType", "charter_media");
          try {
            const { key, url } = await uploadWithProgress(fd, (p) => {
              if (!shouldUpdateProgress(lastVideoProgressRef, base + idx, p))
                return;
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
          setTimeout(() => {
            setExistingVideos((prev) => [...prev, ...uploaded]);
            const prevPersistedV = form.getValues("uploadedVideos") || [];
            setValue("uploadedVideos", [...prevPersistedV, ...uploaded], {
              shouldDirty: true,
              shouldValidate: false,
            });
            setValue("videos", [], { shouldValidate: true });
            setVideoProgress([]);
          }, HOLD_MS);
        }
      } else if (!isEditing && within.length) {
        const uploaded: Array<{ name: string; url: string }> = [];
        const base = current.length;
        for (let idx = 0; idx < within.length; idx++) {
          const f = within[idx];
          const fd = new FormData();
          fd.set("file", f);
          fd.set("docType", "charter_media");
          try {
            const { key, url } = await uploadWithProgress(fd, (p) => {
              if (!shouldUpdateProgress(lastVideoProgressRef, base + idx, p))
                return;
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
          setTimeout(() => {
            setExistingVideos((prev) => [...prev, ...uploaded]);
            const prevPersistedV = form.getValues("uploadedVideos") || [];
            setValue("uploadedVideos", [...prevPersistedV, ...uploaded], {
              shouldDirty: true,
              shouldValidate: false,
            });
            setValue("videos", [], { shouldValidate: true });
            setVideoProgress([]);
          }, HOLD_MS);
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
      form,
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
    async (i: number) => {
      const offset = i - existingImages.length;
      const current = (watch("photos") ?? []) as File[];
      if (offset < 0 || offset >= current.length) return;
      setPhotoProgress((prev) => {
        const arr = [...prev];
        if (offset >= 0 && offset < arr.length) arr[offset] = 0;
        return arr;
      });
      const file = current[offset];
      const fd = new FormData();
      fd.set("file", file);
      fd.set("docType", "charter_media");
      if (isEditing && currentCharterId) fd.set("charterId", currentCharterId);
      try {
        const { key, url } = await uploadWithProgress(fd, (p) => {
          if (!shouldUpdateProgress(lastPhotoProgressRef, offset, p)) return;
          setPhotoProgress((prev) => {
            const arr = [...prev];
            if (offset >= 0 && offset < arr.length) arr[offset] = p;
            return arr;
          });
        });
        setPhotoProgress((prev) => {
          const arr = [...prev];
          if (offset >= 0 && offset < arr.length) arr[offset] = 100;
          return arr;
        });
        if (isEditing && currentCharterId) {
          await fetch(`/api/charters/${currentCharterId}/media`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media: {
                images: [...existingImages, { name: key, url }],
                videos: existingVideos,
              },
            }),
          });
          setTimeout(() => {
            setExistingImages((prev) => [...prev, { name: key, url }]);
            const nextLocal = current.filter((_, idx) => idx !== offset);
            setValue("photos", nextLocal, { shouldValidate: true });
            setPhotoProgress([]);
          }, HOLD_MS);
        } else if (!isEditing) {
          setTimeout(() => {
            setExistingImages((prev) => [...prev, { name: key, url }]);
            const prevPersisted = form.getValues("uploadedPhotos") || [];
            setValue("uploadedPhotos", [...prevPersisted, { name: key, url }], {
              shouldDirty: true,
              shouldValidate: false,
            });
            const nextLocal = current.filter((_, idx) => idx !== offset);
            setValue("photos", nextLocal, { shouldValidate: true });
            setPhotoProgress([]);
          }, HOLD_MS);
        }
      } catch {
        setPhotoProgress((prev) => {
          const arr = [...prev];
          if (offset >= 0 && offset < arr.length) arr[offset] = -1;
          return arr;
        });
      }
    },
    [
      watch,
      existingImages,
      existingVideos,
      isEditing,
      currentCharterId,
      uploadWithProgress,
      form,
      setValue,
    ]
  );

  const retryVideo = useCallback(
    async (i: number) => {
      const offset = i - existingVideos.length;
      const current = (watch("videos") ?? []) as File[];
      if (offset < 0 || offset >= current.length) return;
      setVideoProgress((prev) => {
        const arr = [...prev];
        if (offset >= 0 && offset < arr.length) arr[offset] = 0;
        return arr;
      });
      const file = current[offset];
      const fd = new FormData();
      fd.set("file", file);
      fd.set("docType", "charter_media");
      if (isEditing && currentCharterId) fd.set("charterId", currentCharterId);
      try {
        const { key, url } = await uploadWithProgress(fd, (p) => {
          if (!shouldUpdateProgress(lastVideoProgressRef, offset, p)) return;
          setVideoProgress((prev) => {
            const arr = [...prev];
            if (offset >= 0 && offset < arr.length) arr[offset] = p;
            return arr;
          });
        });
        setVideoProgress((prev) => {
          const arr = [...prev];
          if (offset >= 0 && offset < arr.length) arr[offset] = 100;
          return arr;
        });
        if (isEditing && currentCharterId) {
          await fetch(`/api/charters/${currentCharterId}/media`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media: {
                images: existingImages,
                videos: [...existingVideos, { name: key, url }],
              },
            }),
          });
          setTimeout(() => {
            setExistingVideos((prev) => [...prev, { name: key, url }]);
            const nextLocal = current.filter((_, idx) => idx !== offset);
            setValue("videos", nextLocal, { shouldValidate: true });
            setVideoProgress([]);
          }, HOLD_MS);
        } else if (!isEditing) {
          setTimeout(() => {
            setExistingVideos((prev) => [...prev, { name: key, url }]);
            const prevPersistedV = form.getValues("uploadedVideos") || [];
            setValue(
              "uploadedVideos",
              [...prevPersistedV, { name: key, url }],
              { shouldDirty: true, shouldValidate: false }
            );
            const nextLocal = current.filter((_, idx) => idx !== offset);
            setValue("videos", nextLocal, { shouldValidate: true });
            setVideoProgress([]);
          }, HOLD_MS);
        }
      } catch {
        setVideoProgress((prev) => {
          const arr = [...prev];
          if (offset >= 0 && offset < arr.length) arr[offset] = -1;
          return arr;
        });
      }
    },
    [
      watch,
      existingImages,
      existingVideos,
      isEditing,
      currentCharterId,
      uploadWithProgress,
      form,
      setValue,
    ]
  );

  return {
    captainAvatarPreview,
    handleAvatarChange,
    clearAvatar,
    avatarUploading,
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

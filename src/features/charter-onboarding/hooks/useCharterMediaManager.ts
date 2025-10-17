"use client";
/**
 * Charter media manager (photos + videos) aligned to CaptainVideo-only pipeline.
 * Legacy PendingMedia staging and video-upload logic removed; videos are handled by EnhancedVideoUploader.
 */
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { isFormDebug } from "@features/charter-onboarding/debug";
import { useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import { useMediaPreviews } from "./useMediaPreviews";
import { useVideoThumbnails } from "./useVideoThumbnails";

export interface UseCharterMediaManagerArgs {
  form: UseFormReturn<CharterFormValues>;
  isEditing: boolean;
  currentCharterId: string | null;
  onAvatarUploaded?: (url: string) => void;
}

export interface UseCharterMediaManagerResult {
  captainAvatarPreview: string | null;
  handleAvatarChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearAvatar: () => void;
  avatarUploading: boolean;
  existingImages: Array<{ name: string; url: string }>;
  existingVideos: Array<{
    name: string;
    url: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    // Status fields from legacy PendingMedia removed; Enhanced flow updates
    // via VideoManager. Keep only thumbnail/duration for display.
  }>;
  setExistingImages: React.Dispatch<
    React.SetStateAction<Array<{ name: string; url: string }>>
  >;
  setExistingVideos: React.Dispatch<
    React.SetStateAction<
      Array<{
        name: string;
        url: string;
        thumbnailUrl?: string;
        durationSeconds?: number;
        // No legacy status/pendingId in new flow
      }>
    >
  >;
  photoPreviews: Array<{ url: string; name?: string }>;
  videoPreviews: Array<{ url: string; name?: string; thumbnailUrl?: string }>;
  addPhotoFiles: (files: File[]) => Promise<void>;
  addVideoFiles: (files: File[]) => Promise<void>;
  reorderExistingPhotos: (from: number, to: number) => void;
  reorderExistingVideos: (from: number, to: number) => void;
  removePhoto: (index: number) => void;
  removeVideo: (index: number) => void;
  isMediaUploading: boolean;
  canSubmitMedia: boolean;
  combinedPhotoCount: number;
  isVideoTranscoding: boolean;
  hasBlockingMedia: boolean; // queued or transcoding videos present
}

export function useCharterMediaManager({
  form,
  isEditing,
  currentCharterId,
  onAvatarUploaded,
}: UseCharterMediaManagerArgs): UseCharterMediaManagerResult {
  const debugEnabled = useCallback(
    () =>
      (typeof window !== "undefined" && isFormDebug()) ||
      process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1",
    []
  );
  const dlog = useCallback(
    (label: string, payload?: Record<string, unknown>) => {
      if (!debugEnabled()) return;
      console.log(`[mediaManager] ${label}`, payload || {});
    },
    [debugEnabled]
  );

  const { setValue } = form;
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [captainAvatarPreview, setCaptainAvatarPreview] = useState<
    string | null
  >(null);
  const [existingImages, setExistingImages] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [existingVideos, setExistingVideos] = useState<
    Array<{
      name: string;
      url: string;
      thumbnailUrl?: string;
      durationSeconds?: number;
      status?: "queued" | "transcoding" | "processing" | "ready" | "failed";
      pendingId?: string;
    }>
  >([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [deleteKeys, setDeleteKeys] = useState<Set<string>>(new Set());
  const processedDeleteKeysRef = useRef<Set<string>>(new Set());

  // Log deleteKeys changes when debugging
  useEffect(() => {
    if (deleteKeys.size && debugEnabled()) {
      dlog("delete_keys_updated", { count: deleteKeys.size });
    }
  }, [deleteKeys, dlog, debugEnabled]);

  // Process any queued deletions once we have a charterId (for cases where user removed media before id was ready)
  useEffect(() => {
    if (!currentCharterId || deleteKeys.size === 0) return;
    const toProcess: string[] = [];
    deleteKeys.forEach((k) => {
      if (!processedDeleteKeysRef.current.has(k)) toProcess.push(k);
    });
    if (!toProcess.length) return;
    dlog("deferred_delete_process", { count: toProcess.length });
    toProcess.forEach((storageKey) => {
      fetch(`/api/charters/${currentCharterId}/media/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey }),
      })
        .then((r) => {
          if (!r.ok) {
            dlog("deferred_delete_fail_status", {
              storageKey,
              status: r.status,
            });
            return;
          }
          processedDeleteKeysRef.current.add(storageKey);
          dlog("deferred_delete_ok", { storageKey });
        })
        .catch((e) =>
          dlog("deferred_delete_error", { storageKey, error: String(e) })
        );
    });
  }, [currentCharterId, deleteKeys, dlog]);
  // PendingMedia removed: no polling

  // Previews
  const photoPreviews = useMediaPreviews(existingImages);
  const videoPreviewBase = useMediaPreviews(existingVideos);
  const { getThumbnailUrl } = useVideoThumbnails(currentCharterId);
  const videoPreviews = useMemo(
    () =>
      videoPreviewBase.map((v) => {
        const match = existingVideos.find((ev) => ev.url === v.url);
        return {
          ...v,
          thumbnailUrl:
            match?.thumbnailUrl || getThumbnailUrl(v.url) || undefined,
          durationSeconds: match?.durationSeconds,
        };
      }),
    [videoPreviewBase, existingVideos, getThumbnailUrl]
  );

  // Fetch captain's CharterMedia photos as canonical source
  const { data: session } = useSession();
  useEffect(() => {
    let ignore = false;
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return;
    async function fetchCaptainPhotos() {
      try {
        const res = await fetch(`/api/captain/photos?userId=${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && Array.isArray(data.photos)) {
          setExistingImages(
            data.photos.map((p: { storageKey: string; url: string }) => ({
              name: p.storageKey,
              url: p.url,
            }))
          );
        }
      } catch (e) {
        dlog("fetch_captain_photos_error", { error: String(e) });
      }
    }
    fetchCaptainPhotos();
    return () => {
      ignore = true;
    };
  }, [session, dlog]);
    const photos = form.getValues("uploadedPhotos") as
      | Array<{ name: string; url: string }>
      | undefined;
    if (photos?.length) setExistingImages(photos);
    const vids = form.getValues("uploadedVideos") as
      | Array<{
          name: string;
          url: string;
          thumbnailUrl?: string | null;
          durationSeconds?: number;
        }>
      | undefined;
    if (vids?.length) {
      // Normalize null to undefined for thumbnailUrl
      const normalized = vids.map((v) => ({
        ...v,
        thumbnailUrl: v.thumbnailUrl ?? undefined,
      }));
      setExistingVideos(normalized);
    }
    const avatarUrl = form.getValues("operator.avatarUrl");
    if (avatarUrl) setCaptainAvatarPreview(avatarUrl);
    dlog("hydrate_from_form", {
      photos: photos?.length || 0,
      videos: vids?.length || 0,
      videosWithThumbs: vids?.filter((v) => v.thumbnailUrl).length || 0,
      hasAvatar: !!avatarUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Late hydration watcher: handles case where draft reset happens AFTER initial mount (common on reload)
  useEffect(() => {
    const subscription = form.watch(() => {
      // Only hydrate if we don't already have local state
      if (existingImages.length === 0) {
        const photos = form.getValues("uploadedPhotos") as
          | Array<{ name: string; url: string }>
          | undefined;
        if (Array.isArray(photos) && photos.length) {
          setExistingImages(photos);
          dlog("late_photos_hydration", { count: photos.length });
        }
      }
      if (existingVideos.length === 0) {
        const vids = form.getValues("uploadedVideos") as
          | Array<{
              name: string;
              url: string;
              thumbnailUrl?: string | null;
              durationSeconds?: number;
            }>
          | undefined;
        if (Array.isArray(vids) && vids.length) {
          const normalized = vids.map((v) => ({
            ...v,
            thumbnailUrl: v.thumbnailUrl ?? undefined,
          }));
          setExistingVideos(normalized);
          dlog("late_videos_hydration", {
            count: vids.length,
            withThumbs: vids.filter((v) => v.thumbnailUrl).length,
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, existingImages.length, existingVideos.length, dlog]);

  // Keep avatar preview in sync when operator.avatarUrl is populated later (e.g. async edit hydration)
  useEffect(() => {
    // react-hook-form watch subscription
    const subscription = form.watch((value, info) => {
      if (!info.name || info.name === "operator.avatarUrl") {
        const next = (value as unknown as { operator?: { avatarUrl?: string } })
          .operator?.avatarUrl;
        setCaptainAvatarPreview((prev) =>
          next && next !== prev
            ? next
            : next
            ? next
            : prev && !next
            ? null
            : prev
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Persist to form for draft autosave compatibility
  useEffect(() => {
    setValue(
      "uploadedPhotos",
      existingImages as unknown as CharterFormValues["uploadedPhotos"],
      { shouldDirty: true, shouldValidate: false }
    );
  }, [existingImages, setValue]);
  useEffect(() => {
    const sanitized = existingVideos.map((video) => ({
      name: video.name,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      durationSeconds: video.durationSeconds,
    }));
    setValue(
      "uploadedVideos",
      sanitized as unknown as CharterFormValues["uploadedVideos"],
      { shouldDirty: true, shouldValidate: false }
    );
  }, [existingVideos, setValue]);

  const combinedPhotoCount = existingImages.length; // photos only
  // Videos handled by EnhancedVideoUploader; this hook no longer tracks transcoding

  // Block submission if:
  // 1. Images are still uploading (fast process)
  // 2. Videos are still transcoding AND we want to enforce waiting
  const isMediaUploading = isUploadingPhotos;
  const isVideoTranscoding = false;
  const hasBlockingMedia = false; // Enhanced flow handles queue status separately

  // Debounced server-side persistence of ordering (fires on any structural change)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignatureRef = useRef<string>("__init");
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!currentCharterId) return; // can't persist without an id
    // Prevent wiping existing media on initial edit load before hydration populated state
    if (!hydratedRef.current) {
      if (existingImages.length === 0 && existingVideos.length === 0) {
        return; // still awaiting hydration
      }
      hydratedRef.current = true;
    }
    // Only persist when not actively uploading images; allow video transcoding items to be excluded until READY
    const imagesPayload = existingImages.map((m) => ({
      name: m.name,
      url: m.url,
    }));
    const videosPayload = existingVideos
      .filter(
        (v) => !v.status || v.status === "ready" // only finalized items
      )
      .map((v) => ({
        name: v.name,
        url: v.url,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
      }));
    const signature = JSON.stringify({ imagesPayload, videosPayload });
    if (signature === lastSignatureRef.current) return; // no change
    lastSignatureRef.current = signature;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const deleteKeysArr = Array.from(deleteKeys);
      fetch(`/api/charters/${currentCharterId}/media`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media: { images: imagesPayload, videos: videosPayload },
          deleteKeys: deleteKeysArr,
          order: {
            images: imagesPayload.map((_, i) => i),
            videos: videosPayload.map((_, i) => i),
          },
        }),
      })
        .then((r) => {
          if (r.ok)
            dlog("media_order_persist_ok", {
              images: imagesPayload.length,
              videos: videosPayload.length,
              deleted: deleteKeysArr.length,
            });
          else dlog("media_order_persist_fail_status", { status: r.status });
        })
        .catch((e) => dlog("media_order_persist_error", { error: String(e) }));
    }, 700); // debounce 700ms
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [existingImages, existingVideos, currentCharterId, deleteKeys, dlog]);

  // For now, allow submission even during video transcoding to not block users
  // Video will be attached once transcoding completes
  const canSubmitMedia = isEditing ? true : combinedPhotoCount >= 3;

  // New split endpoints: /api/media/photo
  const uploadPhoto = useCallback(
    async (file: File, charterId: string | null) => {
      dlog("photo_upload_start", {
        name: file.name,
        size: file.size,
        charterId,
      });
      const fd = new FormData();
      fd.set("file", file);
      if (charterId) fd.set("charterId", charterId);
      const res = await fetch("/api/media/photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error("photo_upload_failed");
      const json = (await res.json()) as {
        url: string;
        key: string;
        charterMediaId?: string;
      };
      dlog("photo_upload_success", {
        key: json.key,
        charterMediaId: json.charterMediaId,
      });
      return json;
    },
    [dlog]
  );

  // Video uploads are handled by EnhancedVideoUploader; this hook does not upload videos directly anymore.

  const addPhotoFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      // In edit mode we expect a charterId; if not yet available, block to avoid orphan pending media
      if (isEditing && !currentCharterId) {
        console.warn(
          "[mediaManager] Blocking photo upload until charterId loads",
          {
            isEditing,
            currentCharterId,
            fileCount: files.length,
          }
        );
        return;
      }
      try {
        setIsUploadingPhotos(true);
        const { resizeImageFile } = await import("@/utils/resizeImage");
        dlog("photo_batch_start", { count: files.length });
        const processed = await Promise.all(
          files.map((f) =>
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
        for (const f of processed) {
          try {
            const resp = await uploadPhoto(f, currentCharterId);
            setExistingImages((prev) => [
              ...prev,
              {
                name: resp.key,
                url: resp.url,
                ...(resp.charterMediaId
                  ? { charterMediaId: resp.charterMediaId }
                  : {}),
              },
            ]);
          } catch (e) {
            console.error("photo pending upload failed", e);
            dlog("photo_upload_error", {
              name: f.name,
              message: (e as Error).message,
            });
          }
        }
        dlog("photo_batch_complete", { added: processed.length });
      } catch (e) {
        console.error("photo resize failed", e);
        dlog("photo_batch_resize_failed", { message: (e as Error).message });
      } finally {
        setIsUploadingPhotos(false);
      }
    },
    [uploadPhoto, currentCharterId, isEditing, dlog]
  );

  const addVideoFiles = useCallback(
    async (_files: File[]) => {
      // Deprecated in favor of EnhancedVideoUploader; no-op here
      void _files?.length; // mark used to satisfy no-unused-vars
      dlog("video_add_ignored_use_enhanced_uploader");
    },
    [dlog]
  );

  // Cleanup no longer needed in new flow

  const handleAvatarChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAvatarUploading(true);
      try {
        const objUrl = URL.createObjectURL(file);
        setCaptainAvatarPreview(objUrl);
        if (file.type.startsWith("image/")) {
          const { resizeImageFile } = await import("@/utils/resizeImage");
          const resized = await resizeImageFile(file, {
            square: true,
            maxWidth: 512,
            mimeType: "image/webp",
            nameSuffix: "-avatar",
          });
          setValue("operator.avatar", resized, { shouldValidate: true });
          const fd = new FormData();
          fd.set("file", resized);
          fd.set("docType", "charter_avatar");
          const resp = await fetch("/api/blob/upload", {
            method: "POST",
            body: fd,
          });
          if (resp.ok) {
            const { url } = await resp.json();
            setValue("operator.avatarUrl", url, {
              shouldDirty: true,
              shouldValidate: false,
            });
            if (isEditing) {
              await fetch("/api/captain/avatar", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, deleteKey: null }),
              });
            }
            onAvatarUploaded?.(url);
          }
        } else {
          setValue("operator.avatar", file, { shouldValidate: true });
        }
      } catch (err) {
        console.error("avatar upload failed", err);
        setValue("operator.avatar", file, { shouldValidate: true });
      } finally {
        setAvatarUploading(false);
        e.target.value = "";
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

  // Removal handlers
  const removePhoto = useCallback(
    (index: number) => {
      setExistingImages((prev) => {
        const target = prev[index] as
          | ((typeof prev)[number] & { storageKey?: string })
          | undefined;
        const key = target?.storageKey || target?.name;
        if (key && currentCharterId) {
          setDeleteKeys((s) => new Set(s).add(key));
          // Fire-and-forget server removal
          fetch(`/api/charters/${currentCharterId}/media/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storageKey: key }),
          }).catch((e) =>
            console.warn("[mediaManager] photo_remove_api_failed", e)
          );
        }
        return prev.filter((_, i) => i !== index);
      });
      dlog("photo_removed", { index });
    },
    [dlog, currentCharterId]
  );
  const removeVideo = useCallback(
    (index: number) => {
      setExistingVideos((prev) => {
        const target = prev[index] as
          | ((typeof prev)[number] & { storageKey?: string })
          | undefined;
        const key = target?.storageKey || target?.name;
        if (key && currentCharterId) {
          setDeleteKeys((s) => new Set(s).add(key));
          fetch(`/api/charters/${currentCharterId}/media/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storageKey: key }),
          }).catch((e) =>
            console.warn("[mediaManager] video_remove_api_failed", e)
          );
        }
        return prev.filter((_, i) => i !== index);
      });
      dlog("video_removed", { index });
    },
    [dlog, currentCharterId]
  );

  // Retry handlers removed (legacy) – videos/photos upload atomically now

  return {
    captainAvatarPreview,
    handleAvatarChange,
    clearAvatar,
    avatarUploading,
    existingImages,
    existingVideos,
    setExistingImages,
    setExistingVideos,
    photoPreviews,
    videoPreviews,
    addPhotoFiles,
    addVideoFiles,
    reorderExistingPhotos: useCallback(
      (from: number, to: number) => {
        if (from === to) return;
        setExistingImages((prev) => {
          if (from < 0 || to < 0 || from >= prev.length || to >= prev.length)
            return prev;
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          dlog("photos_reordered", { from, to });
          return next;
        });
      },
      [dlog]
    ),
    reorderExistingVideos: useCallback(
      (from: number, to: number) => {
        if (from === to) return;
        setExistingVideos((prev) => {
          if (from < 0 || to < 0 || from >= prev.length || to >= prev.length)
            return prev;
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          dlog("videos_reordered", { from, to });
          return next;
        });
      },
      [dlog]
    ),
    removePhoto,
    removeVideo,
    isMediaUploading,
    canSubmitMedia,
    combinedPhotoCount,
    isVideoTranscoding,
    hasBlockingMedia,
    // expose for save layer integration (not yet consumed here)
    // @ts-expect-error internal field for persistence layer
    deleteKeys: Array.from(deleteKeys),
  };
}

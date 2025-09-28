"use client";
/**
 * Simplified Charter media manager using PendingMedia staging.
 * Legacy progress/reorder/remove logic replaced with no-op stubs to keep API surface stable.
 */
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { isFormDebug } from "@features/charter-onboarding/debug";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import type { UseFormReturn } from "react-hook-form";
import { useMediaPreviews } from "./useMediaPreviews";
import { usePendingMediaPoll } from "./usePendingMediaPoll";
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
    /**
     * queued: upload done, waiting for worker to start
     * transcoding: worker actively processing
     * processing: legacy alias retained (maps to queued or transcoding visually)
     * ready: final asset prepared
     * failed: terminal error (worker failed)
     */
    status?: "queued" | "transcoding" | "processing" | "ready" | "failed";
    pendingId?: string;
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
        status?: "queued" | "transcoding" | "processing" | "ready" | "failed";
        pendingId?: string;
      }>
    >
  >;
  photoProgress: number[];
  videoProgress: number[];
  photoPreviews: Array<{ url: string; name?: string }>;
  videoPreviews: Array<{ url: string; name?: string; thumbnailUrl?: string }>;
  addPhotoFiles: (files: File[]) => Promise<void>;
  addVideoFiles: (files: File[]) => Promise<void>;
  reorderExistingPhotos: (from: number, to: number) => void;
  reorderExistingVideos: (from: number, to: number) => void;
  removePhoto: (index: number) => void;
  removeVideo: (index: number) => void;
  retryPhoto: (index: number) => void;
  retryVideo: (index: number) => void;
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
  const [pendingImageIds, setPendingImageIds] = useState<string[]>([]);
  const [pendingVideoIds, setPendingVideoIds] = useState<string[]>([]);
  const [deleteKeys, setDeleteKeys] = useState<Set<string>>(new Set());

  // Log deleteKeys changes when debugging
  useEffect(() => {
    if (deleteKeys.size && debugEnabled()) {
      dlog("delete_keys_updated", { count: deleteKeys.size });
    }
  }, [deleteKeys, dlog, debugEnabled]);
  const pendingAllIds = useMemo(
    () => [...pendingImageIds, ...pendingVideoIds],
    [pendingImageIds, pendingVideoIds]
  );

  const { items: pendingItems } = usePendingMediaPoll({
    ids: pendingAllIds,
    enabled: pendingAllIds.length > 0,
  });

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
          processing: match?.status === "processing",
        };
      }),
    [videoPreviewBase, existingVideos, getThumbnailUrl]
  );

  // Hydrate from form once (draft restore/edit)
  useEffect(() => {
    const photos = form.getValues("uploadedPhotos") as
      | Array<{ name: string; url: string }>
      | undefined;
    if (photos?.length) setExistingImages(photos);
    const vids = form.getValues("uploadedVideos") as
      | Array<{ name: string; url: string }>
      | undefined;
    if (vids?.length) setExistingVideos(vids);
    const avatarUrl = form.getValues("operator.avatarUrl");
    if (avatarUrl) setCaptainAvatarPreview(avatarUrl);
    dlog("hydrate_from_form", {
      photos: photos?.length || 0,
      videos: vids?.length || 0,
      hasAvatar: !!avatarUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    }));
    setValue(
      "uploadedVideos",
      sanitized as unknown as CharterFormValues["uploadedVideos"],
      { shouldDirty: true, shouldValidate: false }
    );
  }, [existingVideos, setValue]);

  const combinedPhotoCount = existingImages.length; // photos only
  // Videos that are still transcoding (have pendingId but status !== "ready")
  const transcodingVideoCount = existingVideos.filter(
    (v) =>
      (v.status === "processing" ||
        v.status === "queued" ||
        v.status === "transcoding") &&
      v.pendingId
  ).length;

  // Block submission if:
  // 1. Images are still uploading (fast process)
  // 2. Videos are still transcoding AND we want to enforce waiting
  const isMediaUploading = pendingImageIds.length > 0;
  const isVideoTranscoding = transcodingVideoCount > 0;
  const hasBlockingMedia = transcodingVideoCount > 0; // simple gate: any non-ready video blocks

  // For now, allow submission even during video transcoding to not block users
  // Video will be attached once transcoding completes
  const canSubmitMedia = isEditing ? true : combinedPhotoCount >= 3;

  // New split endpoints: /api/media/photo and /api/media/video
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

  const uploadVideo = useCallback(
    async (file: File, charterId: string | null) => {
      dlog("video_upload_start", {
        name: file.name,
        size: file.size,
        charterId,
      });
      const fd = new FormData();
      fd.set("file", file);
      if (charterId) fd.set("charterId", charterId);
      const res = await fetch("/api/media/video", { method: "POST", body: fd });
      if (!res.ok) throw new Error("video_upload_failed");
      const json = (await res.json()) as {
        pendingMediaId: string;
        status: string;
        previewUrl: string;
      };
      dlog("video_upload_enqueued", {
        pendingMediaId: json.pendingMediaId,
        status: json.status,
        previewUrl: json.previewUrl,
      });
      return json;
    },
    [dlog]
  );

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
              { name: resp.key, url: resp.url },
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
      }
    },
    [uploadPhoto, currentCharterId, isEditing, dlog]
  );

  const addVideoFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      if (isEditing && !currentCharterId) {
        console.warn(
          "[mediaManager] Blocking video upload until charterId loads",
          {
            isEditing,
            currentCharterId,
            fileCount: files.length,
          }
        );
        return;
      }
      const allowed = files.filter((f) => f.type.startsWith("video/"));
      const remainingSlots = 3 - existingVideos.length - pendingVideoIds.length;
      const picked = allowed.slice(0, Math.max(0, remainingSlots));

      // Helper to capture first frame (at ~1s or earliest) into data URL
      const captureFirstFrame = (file: File): Promise<string | null> => {
        return new Promise((resolve) => {
          try {
            const videoEl = document.createElement("video");
            videoEl.preload = "metadata";
            videoEl.muted = true;
            videoEl.playsInline = true;
            const revoke = () => {
              try {
                URL.revokeObjectURL(videoEl.src);
              } catch {}
            };
            videoEl.onloadeddata = async () => {
              try {
                const targetTime =
                  videoEl.duration && videoEl.duration > 1 ? 1 : 0.1;
                const seekHandler = () => {
                  try {
                    const canvas = document.createElement("canvas");
                    canvas.width = videoEl.videoWidth || 320;
                    canvas.height = videoEl.videoHeight || 180;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                      revoke();
                      resolve(null);
                      return;
                    }
                    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    revoke();
                    resolve(dataUrl);
                  } catch {
                    revoke();
                    resolve(null);
                  }
                };
                if (Math.abs(videoEl.currentTime - targetTime) < 0.05) {
                  seekHandler();
                } else {
                  videoEl.onseeked = seekHandler;
                  try {
                    videoEl.currentTime = targetTime;
                  } catch {
                    seekHandler();
                  }
                }
              } catch {
                revoke();
                resolve(null);
              }
            };
            videoEl.onerror = () => {
              revoke();
              resolve(null);
            };
            videoEl.src = URL.createObjectURL(file);
          } catch {
            resolve(null);
          }
        });
      };

      for (const f of picked) {
        let tempId: string | null = null;
        let objectUrl: string | null = null;
        try {
          tempId = `temp-video-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`;
          objectUrl = URL.createObjectURL(f);
          // Start client-side frame capture without blocking upload
          const framePromise = captureFirstFrame(f);
          if (tempId && objectUrl) {
            const placeholderName = tempId;
            const placeholderUrl = objectUrl;
            setExistingVideos((prev) => [
              ...prev,
              {
                name: placeholderName,
                url: placeholderUrl,
                status: "queued", // initial local placeholder state
                pendingId: undefined,
              },
            ]);
            dlog("video_placeholder_added", { tempId, size: f.size });
          }

          const resp = await uploadVideo(f, currentCharterId);
          // Apply captured frame (if succeeded) to placeholder before promoting
          framePromise
            .then((thumb) => {
              if (!thumb) return;
              setExistingVideos((prev) => {
                const idx = prev.findIndex((v) => v.name === tempId);
                if (idx === -1) return prev;
                const next = [...prev];
                next[idx] = { ...next[idx], thumbnailUrl: thumb };
                return next;
              });
            })
            .catch(() => {});
          setExistingVideos((prev) => {
            if (!tempId) return prev;
            const idx = prev.findIndex((v) => v.name === tempId);
            if (idx === -1) return prev;
            const next = [...prev];
            const before = next[idx];
            next[idx] = {
              name: resp.pendingMediaId,
              url: resp.previewUrl,
              status: resp.status === "READY" ? "ready" : "queued",
              pendingId: resp.pendingMediaId,
              // carry over any captured client-side frame thumbnail
              thumbnailUrl:
                before && typeof before === "object"
                  ? before.thumbnailUrl
                  : undefined,
            };
            try {
              if (objectUrl) URL.revokeObjectURL(objectUrl);
            } catch {}
            if (before.pendingId !== resp.pendingMediaId) {
              dlog("video_pending_created", {
                tempId,
                pendingMediaId: resp.pendingMediaId,
                status: resp.status,
              });
            }
            return next;
          });
          setPendingVideoIds((prev) => [...prev, resp.pendingMediaId]);
        } catch (e) {
          console.error("video pending upload failed", e);
          dlog("video_upload_error", { tempId, message: (e as Error).message });
          if (tempId) {
            setExistingVideos((prev) => prev.filter((v) => v.name !== tempId));
          }
          try {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
          } catch {}
        }
      }
    },
    [
      uploadVideo,
      currentCharterId,
      existingVideos.length,
      pendingVideoIds.length,
      isEditing,
      dlog,
    ]
  );

  // Promote READY items
  useEffect(() => {
    if (!pendingItems.length) return;
    const readyImages = pendingItems.filter(
      (p) => p.kind === "IMAGE" && p.status === "READY"
    );
    if (readyImages.length) {
      setExistingImages((prev) => {
        let next = [...prev];
        for (const r of readyImages) {
          if (!r.finalKey || !r.finalUrl) continue;
          if (!next.some((e) => e.name === r.finalKey)) {
            next = [...next, { name: r.finalKey, url: r.finalUrl }];
          }
        }
        return next;
      });
      setPendingImageIds((ids) =>
        ids.filter((id) => !readyImages.some((r) => r.id === id))
      );
    }

    const readyVideos = pendingItems.filter(
      (p) => p.kind === "VIDEO" && p.status === "READY"
    );
    const readyVideosWithFinal = readyVideos.filter(
      (r): r is typeof r & { finalKey: string; finalUrl: string } =>
        Boolean(r.finalKey && r.finalUrl)
    );
    if (readyVideosWithFinal.length) {
      dlog("video_ready_promote", { count: readyVideosWithFinal.length });
      setExistingVideos((prev) => {
        let next = [...prev];
        for (const r of readyVideosWithFinal) {
          const idx = next.findIndex(
            (e) =>
              e.pendingId === r.id ||
              e.url === r.originalUrl ||
              e.name === r.id ||
              e.name === r.finalKey
          );
          const replacement = {
            name: r.finalKey,
            url: r.finalUrl,
            thumbnailUrl: r.thumbnailUrl || undefined,
            durationSeconds: r.durationSeconds || undefined,
            status: "ready" as const,
            pendingId: undefined,
          };
          if (idx !== -1) {
            next[idx] = replacement;
            continue;
          }
          if (!next.some((e) => e.name === r.finalKey)) {
            next = [...next, replacement];
          }
        }
        return next;
      });
      setPendingVideoIds((ids) =>
        ids.filter((id) => !readyVideosWithFinal.some((r) => r.id === id))
      );
    }
  }, [pendingItems, dlog]);

  // Update intermediate video statuses (QUEUED / TRANSCODING) for better UX.
  useEffect(() => {
    if (!pendingItems.length) return;
    setExistingVideos((prev) => {
      let changed = false;
      const map = new Map(prev.map((v) => [v.pendingId, v] as const));
      for (const p of pendingItems) {
        if (p.kind !== "VIDEO") continue;
        const existing = Array.from(map.values()).find(
          (v) =>
            v.pendingId === p.id || v.name === p.id || v.name === p.finalKey
        );
        if (!existing) continue;
        const desiredStatus =
          p.status === "FAILED"
            ? "failed"
            : p.status === "TRANSCODING"
            ? "transcoding"
            : p.status === "QUEUED"
            ? "queued"
            : existing.status;
        if (desiredStatus && existing.status !== desiredStatus) {
          dlog("video_status_update", {
            pendingId: p.id,
            from: existing.status,
            to: desiredStatus,
          });
          existing.status = desiredStatus;
          changed = true;
        }
        // Opportunistically update thumbnail if worker has produced one early
        if (p.thumbnailUrl && !existing.thumbnailUrl) {
          existing.thumbnailUrl = p.thumbnailUrl;
          changed = true;
        }
      }
      return changed ? [...map.values()] : prev;
    });
  }, [pendingItems, dlog]);

  // Cleanup: ensure we don't retain processing/queued placeholders once their pending ID is cleared.
  useEffect(() => {
    if (pendingVideoIds.length === 0) {
      setExistingVideos((prev) =>
        prev.filter(
          (item) =>
            item.status !== "processing" &&
            item.status !== "queued" &&
            item.status !== "transcoding"
        )
      );
      return;
    }
    const pendingSet = new Set(pendingVideoIds);
    setExistingVideos((prev) =>
      prev.filter((item) => {
        if (item.status === "ready") return true;
        if (!item.pendingId) return true;
        return pendingSet.has(item.pendingId);
      })
    );
  }, [pendingVideoIds]);

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

  const noop = () => {};
  const empty: number[] = [];

  // Removal handlers
  const removePhoto = useCallback(
    (index: number) => {
      setExistingImages((prev) => {
        const target = prev[index];
        if (target && currentCharterId) {
          setDeleteKeys((s) => new Set(s).add(target.name));
          // Fire-and-forget server removal
          fetch(`/api/charters/${currentCharterId}/media/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storageKey: target.name }),
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
        const target = prev[index];
        if (target && currentCharterId && target.status === "ready") {
          setDeleteKeys((s) => new Set(s).add(target.name));
          fetch(`/api/charters/${currentCharterId}/media/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storageKey: target.name }),
          }).catch((e) =>
            console.warn("[mediaManager] video_remove_api_failed", e)
          );
        }
        // If still pending (queued/transcoding) attempt pending removal via pendingId
        if (
          target &&
          currentCharterId &&
          target.pendingId &&
          target.status !== "ready"
        ) {
          fetch(`/api/charters/${currentCharterId}/media/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pendingId: target.pendingId }),
          }).catch((e) =>
            console.warn("[mediaManager] video_pending_remove_api_failed", e)
          );
        }
        return prev.filter((_, i) => i !== index);
      });
      dlog("video_removed", { index });
    },
    [dlog, currentCharterId]
  );

  // Retry stubs – future: re-initiate upload flow for failed items
  const retryPhoto = useCallback(() => {
    dlog("photo_retry_requested");
    // No-op: photos upload atomically currently
  }, [dlog]);
  const retryVideo = useCallback(
    (index: number) => {
      setExistingVideos((prev) => {
        const next = [...prev];
        const target = next[index];
        if (target && target.status === "failed") {
          // For now just remove failed item; user can add again.
          next.splice(index, 1);
        }
        return next;
      });
      dlog("video_retry_placeholder", { index });
    },
    [dlog]
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
    photoProgress: empty,
    videoProgress: empty,
    photoPreviews,
    videoPreviews,
    addPhotoFiles,
    addVideoFiles,
    reorderExistingPhotos: noop,
    reorderExistingVideos: noop,
    removePhoto,
    removeVideo,
    retryPhoto,
    retryVideo,
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

"use client";
import { Tooltip } from "@/components/ui/Tooltip";
import { emitCharterFormEvent } from "@features/charter-onboarding/analytics";
import {
  charterFormOptions,
  createDefaultCharterFormValues,
} from "@features/charter-onboarding/charterForm.defaults";
import {
  hydrateDraftValues,
  sanitizeForDraft,
  type DraftValues,
} from "@features/charter-onboarding/charterForm.draft";
import {
  basicsStepSchema,
  charterFormSchema,
  experienceStepSchema,
  mediaPricingStepSchema,
  tripsStepSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import {
  StepProgress,
  type StepDefinition,
} from "@features/charter-onboarding/components/StepProgress";
import {
  FIELD_LABELS,
  friendlyFieldLabel,
} from "@features/charter-onboarding/fieldLabels";
import {
  useAutosaveDraft,
  useMediaPreviews,
  useVideoThumbnails,
} from "@features/charter-onboarding/hooks";
import { createPreviewCharter } from "@features/charter-onboarding/preview";
import {
  BasicsStep,
  ExperienceStep,
  MediaPricingStep,
  TripsStep,
} from "@features/charter-onboarding/steps";
import type { StepKey } from "@features/charter-onboarding/types";
import { getFieldError } from "@features/charter-onboarding/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type FormEventHandler,
} from "react";
import {
  useForm,
  type FieldPath,
  type Resolver,
  type SubmitHandler,
} from "react-hook-form";
import { useCharterDraft } from "./hooks/useCharterDraft";
const ReviewStep = dynamic(
  () =>
    import("@features/charter-onboarding/steps/ReviewStep").then(
      (m) => m.ReviewStep
    ),
  { ssr: false }
);

type FormStep = StepDefinition & {
  id: StepKey;
  fields: FieldPath<CharterFormValues>[];
};

const STEP_SEQUENCE: FormStep[] = [
  {
    id: "basics",
    label: "Captain & Charter",
    fields: [
      "operator.displayName",
      "operator.experienceYears",
      "operator.bio",
      "operator.phone",
      "operator.avatar",
      "charterType",
      "charterName",
      "state",
      "city",
      "startingPoint",
      "postcode",
      "latitude",
      "longitude",
    ],
  },
  {
    id: "experience",
    label: "Boat & Logistic",
    fields: [
      "boat.name",
      "boat.type",
      "boat.lengthFeet",
      "boat.capacity",
      "boat.features",
      "amenities",
      // Include entire policies object so per-step validation doesn't flag it missing
      "policies",
      "pickup",
    ],
  },
  { id: "trips", label: "Trips & Availability", fields: ["trips"] },
  {
    id: "media",
    label: "Media & Pricing",
    fields: ["photos", "videos", "description", "tone"],
  },
  { id: "review", label: "Preview", fields: [] },
];
const REVIEW_STEP_INDEX = STEP_SEQUENCE.findIndex((s) => s.id === "review");

export default function FormSection() {
  const router = useRouter();
  const search = useSearchParams();
  const editCharterId = search?.get("editCharterId") || null;
  const [isEditing, setIsEditing] = useState(false);
  const [submitState, setSubmitState] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [captainAvatarPreview, setCaptainAvatarPreview] = useState<
    string | null
  >(null);
  const { loadDraft, saveDraft, clearDraft } = useCharterDraft<DraftValues>();
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number[]>([]);
  const [photoProgress, setPhotoProgress] = useState<number[]>([]);
  const [existingImages, setExistingImages] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [existingVideos, setExistingVideos] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [currentCharterId, setCurrentCharterId] = useState<string | null>(null);
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<number | null>(null);
  const [serverSaving, setServerSaving] = useState(false);
  const [stepErrorSummary, setStepErrorSummary] = useState<string[] | null>(
    null
  );
  const [stepCompleted, setStepCompleted] = useState<boolean[]>(() =>
    Array(STEP_SEQUENCE.length).fill(false)
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const totalSteps = STEP_SEQUENCE.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isReviewStep = currentStep === REVIEW_STEP_INDEX;
  const [barVisible, setBarVisible] = useState(false);

  // Animate sticky bar appearance
  useEffect(() => {
    if (isReviewStep) {
      // delay a tick so initial transform/opacity classes apply
      const t = setTimeout(() => setBarVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setBarVisible(false);
    }
  }, [isReviewStep]);

  const defaultState = useMemo(createDefaultCharterFormValues, []);
  const form = useForm<CharterFormValues>({
    resolver: zodResolver(charterFormSchema) as Resolver<CharterFormValues>,
    mode: "onBlur",
    defaultValues: defaultState,
  });

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Local (browser) autosave still active for resilience; server saves now explicit only.
  const { setLastSavedAt, initializeDraftState } = useAutosaveDraft({
    values: watch(),
    draftLoaded,
    isRestoring: isRestoringDraft,
    sanitize: sanitizeForDraft,
    saveDraft,
  });

  // Hydrate from local draft first (skip entirely in edit mode to avoid stale unrelated drafts)
  useEffect(() => {
    if (editCharterId) {
      // In edit mode we ignore & clear any existing local draft (avoid cross-account / prior charter bleed)
      clearDraft();
      initializeDraftState(defaultState, null);
      setDraftLoaded(true);
      emitCharterFormEvent({
        type: "step_view",
        step: STEP_SEQUENCE[0].id,
        index: 0,
      });
      return;
    }
    setIsRestoringDraft(true);
    const snapshot = loadDraft();
    if (snapshot?.values) {
      const hydrated = hydrateDraftValues(defaultState, snapshot.values);
      reset(hydrated);
      initializeDraftState(hydrated, snapshot.savedAt ?? null);
      setCaptainAvatarPreview(null);
    } else {
      initializeDraftState(defaultState, null);
    }
    setDraftLoaded(true);
    setIsRestoringDraft(false);
    emitCharterFormEvent({
      type: "step_view",
      step: STEP_SEQUENCE[0].id,
      index: 0,
    });
  }, [
    defaultState,
    initializeDraftState,
    loadDraft,
    reset,
    editCharterId,
    clearDraft,
  ]);

  // Fetch or create server draft (authenticated only) OR seed from existing charter when editing
  useEffect(() => {
    if (!draftLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        if (editCharterId) {
          // EDIT MODE: load charter directly, no draft usage
          // NOTE: GET handler currently lives at /api/charters/[id]/get
          const res = await fetch(`/api/charters/${editCharterId}/get`, {
            method: "GET",
          });
          if (!res.ok) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                "Edit charter fetch failed",
                editCharterId,
                res.status
              );
            }
            return;
          }
          const json = await res.json();
          if (cancelled) return;
          if (json.charter) {
            const charter = json.charter;
            // Map charter to form values reusing existing mapping util dynamically (to avoid heavy import ahead of time)
            const { mapCharterToDraftValuesFeature } = await import(
              "@features/charter-onboarding/server/mapping"
            );
            const draftValues = mapCharterToDraftValuesFeature({
              charter,
              captainProfile: {
                displayName: charter.captain.displayName,
                phone: charter.captain.phone,
                bio: charter.captain.bio,
                experienceYrs: charter.captain.experienceYrs,
              },
            });
            // mapCharterToDraftValuesFeature returns DraftValues shape compatible with hydrateDraftValues
            const formLike = hydrateDraftValues(
              defaultState,
              draftValues as DraftValues
            );
            reset(formLike, { keepDirty: false });
            setIsEditing(true);
            setCurrentCharterId(editCharterId);
            type MediaItem = {
              kind: string;
              sortOrder: number | null;
              storageKey?: string | null;
              url: string;
            };
            const media: MediaItem[] = Array.isArray(charter.media)
              ? charter.media
              : [];
            const byKind = (kind: string) =>
              media
                .filter((m) => m.kind === kind)
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((m) => ({ name: m.storageKey || "media", url: m.url }));
            setExistingImages(byKind("CHARTER_PHOTO"));
            setExistingVideos(byKind("CHARTER_VIDEO"));
            if (charter.captain.avatarUrl) {
              setCaptainAvatarPreview(charter.captain.avatarUrl);
            }
            setLastSavedAt(new Date().toISOString());
          }
          return;
        }
        // NEW USER FLOW (draft-based)
        const existingRes = await fetch("/api/charter-drafts", {
          method: "GET",
        });
        if (existingRes.ok) {
          const existingJson = await existingRes.json();
          if (existingJson?.draft && !existingJson.draft.charterId) {
            const data = existingJson.draft.data as DraftValues;
            const hydrated = hydrateDraftValues(defaultState, data);
            reset(hydrated, { keepDirty: false });
            setServerDraftId(existingJson.draft.id);
            setServerVersion(existingJson.draft.version);
            setIsEditing(false);
            setLastSavedAt(new Date().toISOString());
            return;
          }
        }
        // Create blank draft for fresh registration
        const createRes = await fetch("/api/charter-drafts", {
          method: "POST",
        });
        if (createRes.ok) {
          const created = await createRes.json();
          if (created?.draft) {
            setServerDraftId(created.draft.id);
            setServerVersion(created.draft.version);
            setIsEditing(false);
            setLastSavedAt(new Date().toISOString());
          }
        }
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftLoaded, editCharterId, defaultState, reset, setLastSavedAt]);

  // Override saveServerDraftSnapshot: no-op in edit mode
  const saveServerDraftSnapshot = useCallback(async (): Promise<
    number | null
  > => {
    if (isEditing) return null; // skip in edit mode
    if (!serverDraftId || serverVersion === null) return null;
    try {
      setServerSaving(true);
      const sanitized = sanitizeForDraft(form.getValues());
      const res = await fetch(`/api/charter-drafts/${serverDraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataPartial: sanitized,
          clientVersion: serverVersion,
          currentStep,
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.draft) {
        const newVersion: number = json.draft.version;
        setServerVersion(newVersion);
        setLastSavedAt(new Date().toISOString());
        return newVersion;
      }
      return null;
    } catch {
      return null;
    } finally {
      setServerSaving(false);
    }
  }, [
    isEditing,
    serverDraftId,
    serverVersion,
    form,
    currentStep,
    setLastSavedAt,
  ]);

  // Explicit save handler for edit mode
  const [savingEdit, setSavingEdit] = useState(false); // will be used by explicit Save button in edit mode
  const saveEditChanges = useCallback(async () => {
    if (!isEditing || !currentCharterId) return;
    setSavingEdit(true);
    try {
      const values = form.getValues();
      const payload = {
        charter: {
          charterType: values.charterType,
          name: values.charterName, // Prisma field is 'name'
          state: values.state,
          city: values.city,
          startingPoint: values.startingPoint,
          postcode: values.postcode,
          latitude: values.latitude || null,
          longitude: values.longitude || null,
          description: values.description,
          tone: values.tone,
        },
        boat: values.boat
          ? {
              name: values.boat.name,
              type: values.boat.type,
              lengthFt: values.boat.lengthFeet ?? null, // Prisma field lengthFt
              capacity: values.boat.capacity ?? null,
              features: values.boat.features || [],
            }
          : undefined,
        amenities: values.amenities || [],
        features: values.boat?.features || [],
        policies: values.policies ? { ...values.policies } : undefined,
        pickup: values.pickup
          ? {
              available: values.pickup.available,
              fee: values.pickup.fee ?? null,
              notes: values.pickup.notes,
              // In refactored schema pickup.areas is already string[]
              areas: values.pickup.areas || [],
            }
          : undefined,
        trips:
          values.trips
            ?.map((t) => ({
              id: (t as unknown as { id?: string }).id || undefined,
              name: t.name,
              tripType: t.tripType,
              price: t.price ?? null,
              durationHours: t.durationHours ?? null,
              maxAnglers: t.maxAnglers ?? null,
              style: t.charterStyle?.toLowerCase(),
              description: t.description ?? null,
              // startTimes already an array of strings
              startTimes: t.startTimes || [],
              species: t.species || [],
              // techniques already string[]
              techniques: t.techniques || [],
            }))
            ?.filter(Boolean) || [],
      };
      const res = await fetch(`/api/charters/${currentCharterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setLastSavedAt(new Date().toISOString());
        setSubmitState({ type: "success", message: "Saved changes" });
      } else {
        setSubmitState({ type: "error", message: "Save failed" });
      }
    } catch {
      setSubmitState({ type: "error", message: "Save error" });
    } finally {
      setSavingEdit(false);
    }
  }, [isEditing, currentCharterId, form, setLastSavedAt]);

  const formValues = watch();
  const photos = watch("photos");
  const videos = watch("videos");
  const selectedState = watch("state");
  const cityValue = watch("city");
  const captainAvatarFile = watch("operator.avatar");
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
  const videoPreviews = useMediaPreviews(mergedVideos);
  const { getThumbnailUrl } = useVideoThumbnails(currentCharterId);

  // Enhance video previews with thumbnails
  const enhancedVideoPreviews = useMemo(() => {
    return videoPreviews.map((video) => ({
      ...video,
      thumbnailUrl: getThumbnailUrl(video.url),
    }));
  }, [videoPreviews, getThumbnailUrl]);

  // Combined counts and media uploading state
  const combinedPhotoCount = useMemo(() => {
    const localCount = Array.isArray(photos) ? photos.length : 0;
    return (existingImages?.length || 0) + localCount;
  }, [photos, existingImages]);
  const isMediaUploading = useMemo(() => {
    if (!isEditing) return false; // only track upload progress in edit mode; create uploads happen on finalize
    const pBusy = Array.isArray(photoProgress)
      ? photoProgress.some((p) => typeof p === "number" && p >= 0 && p < 100)
      : false;
    const vBusy = Array.isArray(videoProgress)
      ? videoProgress.some((p) => typeof p === "number" && p >= 0 && p < 100)
      : false;
    return pBusy || vBusy;
  }, [photoProgress, videoProgress, isEditing]);
  const canSubmitMedia = combinedPhotoCount >= 3;

  // Media helpers
  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
      // If editing, upload immediately and update captain avatar in DB
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
        }
      }
    } catch {
      setValue("operator.avatar", file, { shouldValidate: true });
    } finally {
      event.target.value = "";
    }
  };
  const clearAvatar = () => {
    setValue("operator.avatar", undefined, { shouldValidate: true });
    setCaptainAvatarPreview(null);
    const input = document.getElementById(
      "captain-avatar-upload"
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  };
  const addPhotoFiles = async (fileList: File[]) => {
    const filesArr = fileList;
    if (!filesArr.length) return;
    try {
      const { resizeImageFile } = await import("@/utils/resizeImage");
      const current = (watch("photos") ?? []) as File[];
      const incoming = await Promise.all(
        filesArr.map((f) =>
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
      // init progress for new items
      setPhotoProgress((prev) => {
        const base = current.length;
        const addCount = Math.min(incoming.length, 15 - base);
        return [...prev, ...Array(addCount).fill(0)];
      });
      // Helper: upload with real progress
      const uploadWithProgress = (
        fd: FormData,
        onProgress: (p: number) => void
      ) =>
        new Promise<{ key: string; url: string }>((resolve, reject) => {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/blob/upload");
            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable) {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                onProgress(pct);
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
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(fd);
          } catch (e) {
            reject(e instanceof Error ? e : new Error("Upload error"));
          }
        });

      // If editing, upload immediately with naming and persist media
      if (isEditing && currentCharterId) {
        const uploaded: Array<{ name: string; url: string }> = [];
        const base = current.length;
        for (let idx = 0; idx < incoming.length; idx++) {
          const f = incoming[idx];
          const fd = new FormData();
          // No need to rename - folder structure provides organization
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
            // Ensure 100%
            setPhotoProgress((prev) => {
              const arr = [...prev];
              const pos = base + idx;
              if (pos >= 0 && pos < arr.length) arr[pos] = 100;
              return arr;
            });
          } catch {
            // mark failed
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
      const next = [...current, ...filesArr].slice(0, 15);
      setValue("photos", next, { shouldValidate: true });
    } finally {
      // no-op
    }
  };
  // Deprecated: per-field change handlers replaced by combined chooser in MediaPricingStep
  const addVideoFiles = async (fileList: File[]) => {
    const filesArr = fileList;
    if (!filesArr.length) return;
    const current = (watch("videos") ?? []) as File[];
    const room = Math.max(0, 3 - current.length);
    const picked = filesArr
      .filter((f) => f.type.startsWith("video/"))
      .slice(0, room);
    const MAX_BYTES = 200 * 1024 * 1024;
    const MAX_SECONDS = 90;
    const within: File[] = [];
    for (const f of picked) {
      if (f.size > MAX_BYTES) {
        continue;
      }
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
    // init progress for new items
    setVideoProgress((prev) => {
      const base = current.length;
      const addCount = Math.min(within.length, 3 - base);
      return [...prev, ...Array(addCount).fill(0)];
    });
    // Helper: upload with real progress
    const uploadWithProgress = (
      fd: FormData,
      onProgress: (p: number) => void
    ) =>
      new Promise<{ key: string; url: string }>((resolve, reject) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/blob/upload");
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 100);
              onProgress(pct);
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
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.send(fd);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Upload error"));
        }
      });

    // If editing, upload immediately and persist
    if (isEditing && currentCharterId && within.length) {
      const uploaded: Array<{ name: string; url: string }> = [];
      const base = current.length;
      for (let idx = 0; idx < within.length; idx++) {
        const f = within[idx];
        const fd = new FormData();
        // No need to rename - folder structure provides organization
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
          // Transcoding is now automatic - no need to queue manually
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
  };
  // Deprecated: per-field change handlers replaced by combined chooser in MediaPricingStep
  // Reorder existing media (DB-backed) and persist order; ignore cross moves between existing and new
  const reorderExistingPhotos = (from: number, to: number) => {
    const existingCount = existingImages.length;
    if (from < 0 || to < 0) return;
    if (from >= existingCount || to >= existingCount) return; // only reorder within existing
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
  };
  const reorderExistingVideos = (from: number, to: number) => {
    const existingCount = existingVideos.length;
    if (from < 0 || to < 0) return;
    if (from >= existingCount || to >= existingCount) return; // only reorder within existing
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
  };
  const removePhoto = (i: number) => {
    if (i < existingImages.length) {
      const removed = existingImages[i];
      const next = existingImages.filter((_, idx) => idx !== i);
      setExistingImages(next);
      if (isEditing && currentCharterId) {
        // Persist removal and delete blob
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
      current.filter((_, idx) => idx !== offset),
      { shouldValidate: true }
    );
  };
  // Retry: best-effort; re-upload the last pending local photo/video isn't stored; noop here.
  const retryPhoto = (i: number) => {
    // Placeholder: If we later store failed Files, we can re-call addPhotoFiles([file]).
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
  };
  const retryVideo = (i: number) => {
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
  };
  const removeVideo = (i: number) => {
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
      current.filter((_, idx) => idx !== offset),
      { shouldValidate: true }
    );
  };

  // Derive preview charter object
  const previewCharter = useMemo(
    () => createPreviewCharter(formValues, photoPreviews, captainAvatarPreview),
    [formValues, photoPreviews, captainAvatarPreview]
  );

  // Sync avatar preview
  useEffect(() => {
    if (captainAvatarFile instanceof File) {
      const url = URL.createObjectURL(captainAvatarFile);
      setCaptainAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    // Don't clear the preview if we're editing and don't have a new file -
    // existing avatar URL might be loaded from the server
    if (!isEditing) {
      setCaptainAvatarPreview(null);
    }
  }, [captainAvatarFile, isEditing]);

  // Autofill first city if empty
  const { MALAYSIA_LOCATIONS } = charterFormOptions;
  useEffect(() => {
    const st = MALAYSIA_LOCATIONS.find((s) => s.state === selectedState);
    if (!st) return;
    if (!cityValue?.trim()) {
      const fallback = st.city[0] ?? "";
      if (fallback) setValue("city", fallback, { shouldValidate: true });
    }
  }, [MALAYSIA_LOCATIONS, selectedState, cityValue, setValue]);

  // Step navigation
  const scrollToTop = useCallback(() => {
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const handleNext = useCallback(async () => {
    const stepSchemas = [
      basicsStepSchema,
      experienceStepSchema,
      tripsStepSchema,
      mediaPricingStepSchema,
      charterFormSchema,
    ];
    const activeSchema = stepSchemas[currentStep] || charterFormSchema;
    const values = form.getValues();
    // We no longer build a narrowed object; Zod subset schemas (pick) will validate only relevant keys.
    const parseResult = activeSchema.safeParse(values);
    const canBypassMedia =
      STEP_SEQUENCE[currentStep].id === "media" &&
      isEditing &&
      existingImages.length >= 3;
    if (!parseResult.success && !canBypassMedia) {
      const errs: string[] = [];
      for (const issue of parseResult.error.issues) {
        const p = issue.path.join(".");
        if (p) errs.push(p);
      }
      const friendly = errs.map(friendlyFieldLabel);
      // Deduplicate friendly labels to avoid duplicate list keys / noise
      const friendlyUnique = Array.from(new Set(friendly));
      setStepErrorSummary(
        friendlyUnique.length
          ? friendlyUnique
          : ["Please correct the highlighted fields before continuing."]
      );
      emitCharterFormEvent({
        type: "validation_errors",
        step: STEP_SEQUENCE[currentStep].id,
        count: friendlyUnique.length || 1,
      });
      const first = errs[0];
      if (first) {
        const el = document.querySelector(
          `[name='${first.replace(/\\./g, ".")}']`
        ) as HTMLElement | null;
        if (el && typeof el.focus === "function") el.focus();
      }
      scrollToTop();
      return;
    }
    setStepErrorSummary(null);
    await saveServerDraftSnapshot();
    setStepCompleted((prev) => {
      const n = [...prev];
      n[currentStep] = true;
      return n;
    });
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, totalSteps - 1);
      if (next !== prev) {
        emitCharterFormEvent({
          type: "step_view",
          step: STEP_SEQUENCE[next].id,
          index: next,
        });
        emitCharterFormEvent({
          type: "step_complete",
          step: STEP_SEQUENCE[prev].id,
          index: prev,
        });
      }
      return next;
    });
    scrollToTop();
  }, [
    currentStep,
    totalSteps,
    form,
    scrollToTop,
    saveServerDraftSnapshot,
    isEditing,
    existingImages.length,
  ]);
  const handlePrev = useCallback(() => {
    setCurrentStep((p) => {
      const next = Math.max(p - 1, 0);
      if (next !== p)
        emitCharterFormEvent({
          type: "step_view",
          step: STEP_SEQUENCE[next].id,
          index: next,
        });
      return next;
    });
    scrollToTop();
  }, [scrollToTop]);

  // Submit handler
  const onSubmit = useCallback(
    async (values: CharterFormValues) => {
      setSubmitState(null);
      // In edit mode we no longer finalize via draft; buttons already call saveEditChanges.
      // Guard to avoid running legacy draft finalization path if invoked indirectly.
      if (isEditing) {
        await saveEditChanges();
        return;
      }
      // Upload media
      const uploadOriginalToBlob = async (
        file: File,
        opts?: { docType?: string; charterId?: string | null }
      ): Promise<{ key: string; url: string }> => {
        const fd = new FormData();
        // No need to rename - folder structure provides organization
        fd.set("file", file);
        if (opts?.docType) fd.set("docType", opts.docType);
        if (opts?.charterId) fd.set("charterId", opts.charterId);
        const res = await fetch("/api/blob/upload", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error("upload failed");
        const j = await res.json();
        return { key: j.key, url: j.url };
      };
      const photosUploaded = await Promise.all(
        (values.photos ?? []).map(async (f) => {
          try {
            const { key, url } = await uploadOriginalToBlob(f, {
              docType: "charter_media",
              charterId: currentCharterId,
            });
            return { name: key, url };
          } catch {
            return null;
          }
        })
      );
      const videosUploaded = await Promise.all(
        (values.videos ?? []).map(async (f) => {
          try {
            const { key, url } = await uploadOriginalToBlob(f, {
              docType: "charter_media",
              charterId: currentCharterId,
            });
            // Transcoding is now automatic
            return { name: key, url };
          } catch {
            return null;
          }
        })
      );
      const photosPayload = photosUploaded.filter(Boolean) as {
        name: string;
        url: string;
      }[];
      const videosPayload = videosUploaded.filter(Boolean) as {
        name: string;
        url: string;
      }[];
      const avatarFile = values.operator.avatar;
      // For edit path, avatar is already uploaded/persisted on change; skip sending in finalize.
      // For create path, upload avatar now to obtain a public URL.
      let avatarPayload: { name: string; url: string } | null | undefined =
        undefined;
      if (!isEditing && avatarFile instanceof File) {
        try {
          const { key, url } = await uploadOriginalToBlob(avatarFile, {
            docType: "charter_avatar",
          });
          avatarPayload = { name: key, url };
        } catch {
          avatarPayload = undefined; // ignore avatar if upload fails
        }
      } else if (isEditing) {
        avatarPayload = undefined;
      }
      // Cover is implicitly the first item; no explicit indices needed
      try {
        emitCharterFormEvent({ type: "finalize_attempt" });
        if (!serverDraftId) {
          setSubmitState({
            type: "error",
            message: "Please sign in before submitting.",
          });
          return;
        }
        const patchedVersion = await saveServerDraftSnapshot();
        const versionForFinalize =
          patchedVersion !== null ? patchedVersion : serverVersion;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (versionForFinalize !== null) {
          headers["x-draft-version"] = String(versionForFinalize);
        }
        // In edit mode, include existing media so server sees full set
        const imagesForFinalize = isEditing
          ? ([...existingImages, ...photosPayload] as {
              name: string;
              url: string;
            }[])
          : photosPayload;
        const videosForFinalize = isEditing
          ? ([...existingVideos, ...videosPayload] as {
              name: string;
              url: string;
            }[])
          : videosPayload;

        // No need for key normalization - server handles storage paths
        const finalizeRes = await fetch(
          `/api/charter-drafts/${serverDraftId}/finalize`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              media: {
                images: imagesForFinalize,
                videos: videosForFinalize,
                imagesOrder: imagesForFinalize.map((_, i) => i),
                videosOrder: videosForFinalize.map((_, i) => i),
                ...(avatarPayload !== undefined
                  ? { avatar: avatarPayload }
                  : {}),
              },
            }),
          }
        );
        if (finalizeRes.ok) {
          await finalizeRes.json().catch(() => ({}));
          emitCharterFormEvent({
            type: "finalize_success",
            charterId: currentCharterId || "unknown",
          });
          setSubmitState({
            type: "success",
            message: isEditing
              ? "Charter updated successfully."
              : "Thanks! We will be in touch shortly.",
          });
          reset(defaultState);
          clearDraft();
          initializeDraftState(defaultState, null);
          setLastSavedAt(null);
          setCaptainAvatarPreview(null);
          router.push(isEditing ? "/captain" : "/thank-you");
        } else {
          const err = await finalizeRes.json().catch(() => ({}));
          setSubmitState({
            type: "error",
            message:
              err?.error === "validation"
                ? "Please fix highlighted fields."
                : "Submission failed. Please try again.",
          });
        }
      } catch (e) {
        setSubmitState({
          type: "error",
          message: e instanceof Error ? e.message : "Something went wrong",
        });
      } finally {
        // no object URLs were created here anymore
      }
    },
    [
      serverDraftId,
      saveServerDraftSnapshot,
      serverVersion,
      isEditing,
      saveEditChanges,
      defaultState,
      clearDraft,
      initializeDraftState,
      setLastSavedAt,
      router,
      reset,
      existingImages,
      existingVideos,
      currentCharterId,
    ]
  );
  // Allow submission in edit mode even if no new photos were added, as long as existing images are available.
  const handleFormSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isEditing && existingImages.length >= 3) {
        // Bypass client-side photos min validation by calling submit handler directly
        // react-hook-form's handleSubmit prevents default for us; emulate similar behavior
        void onSubmit(form.getValues());
        return;
      }
      return handleSubmit(onSubmit as SubmitHandler<CharterFormValues>)(
        e as unknown as React.BaseSyntheticEvent<object, Event>
      ) as unknown as void;
    },
    [handleSubmit, onSubmit, form, isEditing, existingImages.length]
  );

  const triggerSubmit = useCallback(() => {
    if (isEditing && existingImages.length >= 3) {
      void onSubmit(form.getValues());
      return;
    }
    return handleSubmit(
      onSubmit as SubmitHandler<CharterFormValues>
    )() as unknown as void;
  }, [handleSubmit, onSubmit, form, isEditing, existingImages.length]);

  const fieldError = useCallback(
    (path: string | undefined) =>
      getFieldError(errors as Record<string, unknown>, path),
    [errors]
  );
  const activeStep = STEP_SEQUENCE[currentStep];

  // Deep link to a specific step via URL hash (#media, #trips, etc.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, number> = {
      basics: 0,
      experience: 1,
      trips: 2,
      media: 3,
      review: REVIEW_STEP_INDEX,
    };
    const applyHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (raw && map[raw] !== undefined) setCurrentStep(map[raw]);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const bottomPaddingClass = isReviewStep ? "pb-60" : "pb-16"; // reserve space so no content gets hidden by sticky bar
  return (
    <div
      className={`space-y-10 px-4 pt-6 max-w-5xl mx-auto ${bottomPaddingClass}`}
    >
      {isEditing && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-800">Editing live charter</p>
          <p className="mt-0.5">Submit again to apply your updates.</p>
        </div>
      )}
      {!serverDraftId && !isEditing && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <p className="font-semibold">Sign in required</p>
          <p>Sign in to save your progress on the server.</p>
        </div>
      )}
      <form onSubmit={handleFormSubmit} className="space-y-8">
        <StepProgress
          steps={STEP_SEQUENCE}
          currentStep={currentStep}
          completed={stepCompleted}
          clickable={isEditing}
          onStepClick={(idx) => {
            if (idx === currentStep) return;
            saveServerDraftSnapshot().finally(() => {
              setCurrentStep((cur) => {
                if (cur === idx) return cur;
                emitCharterFormEvent({
                  type: "step_view",
                  step: STEP_SEQUENCE[idx].id,
                  index: idx,
                });
                return idx;
              });
            });
          }}
        />
        {!isEditing && (
          <p className="text-[11px] text-slate-400">
            {serverDraftId
              ? "Progress saves when you click Next or Submit."
              : "Sign in to enable server saving."}
          </p>
        )}
        {stepErrorSummary && stepErrorSummary.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <p className="font-semibold mb-1">Please fix before continuing:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {stepErrorSummary.map((f, i) => (
                <li key={f + "-" + i}>
                  <button
                    type="button"
                    onClick={() => {
                      // naive attempt to focus by friendly label -> match input by aria-label or placeholder heuristic skipped for now
                      const fieldKey = Object.entries(FIELD_LABELS).find(
                        ([, label]) => label === f
                      )?.[0];
                      if (fieldKey) {
                        const name = fieldKey.replace(/\./g, ".");
                        const el = document.querySelector(
                          `[name='${name}']`
                        ) as HTMLElement | null;
                        if (el) {
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                          setTimeout(() => el.focus?.(), 300);
                        }
                      }
                    }}
                    className="underline hover:text-red-800 focus:outline-none"
                  >
                    {f}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {currentStep === 0 && (
          <BasicsStep
            form={form}
            fieldError={fieldError}
            captainAvatarPreview={captainAvatarPreview}
            onAvatarChange={handleAvatarChange}
            onAvatarClear={clearAvatar}
          />
        )}
        {currentStep === 1 && (
          <ExperienceStep form={form} fieldError={fieldError} />
        )}
        {currentStep === 2 && <TripsStep form={form} />}
        {currentStep === 3 && (
          <MediaPricingStep
            form={form}
            fieldError={fieldError}
            photoPreviews={photoPreviews}
            videoPreviews={enhancedVideoPreviews}
            onAddPhotoFiles={addPhotoFiles}
            onAddVideoFiles={addVideoFiles}
            onRemovePhoto={removePhoto}
            onRemoveVideo={removeVideo}
            videoProgress={videoProgress}
            photoProgress={photoProgress}
            existingPhotosCount={existingImages.length}
            existingVideosCount={existingVideos.length}
            onReorderPhotos={reorderExistingPhotos}
            onReorderVideos={reorderExistingVideos}
            onRetryPhoto={retryPhoto}
            onRetryVideo={retryVideo}
          />
        )}
        {isReviewStep && <ReviewStep charter={previewCharter} />}
        {submitState && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              submitState.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {submitState.message}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Step {currentStep + 1} of {totalSteps} · {activeStep.label}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {isEditing && (
              <Tooltip content="Cancel edit">
                <button
                  type="button"
                  onClick={() => {
                    router.push("/captain");
                  }}
                  aria-label="Cancel edit"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cancel edit</span>
                  <span
                    aria-hidden
                    className="hidden md:ml-2 md:inline text-[11px] font-medium"
                  >
                    Cancel
                  </span>
                </button>
              </Tooltip>
            )}
            {currentStep > 0 && (
              <Tooltip content="Back">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Back"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                  <span
                    aria-hidden
                    className="hidden md:ml-2 md:inline text-[11px] font-medium"
                  >
                    Back
                  </span>
                </button>
              </Tooltip>
            )}
            {!isLastStep ? (
              <Tooltip content={serverSaving ? "Saving…" : "Next"}>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={serverSaving}
                  aria-label={serverSaving ? "Saving" : "Next"}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 p-3 text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
                >
                  {serverSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {serverSaving ? "Saving" : "Next"}
                  </span>
                  <span
                    aria-hidden
                    className="hidden md:ml-2 md:inline text-[11px] font-medium"
                  >
                    {serverSaving ? "Saving" : "Next"}
                  </span>
                </button>
              </Tooltip>
            ) : null}
            {isEditing && !isLastStep && (
              <Tooltip content={isSubmitting ? "Saving…" : "Save"}>
                <button
                  type="button"
                  disabled={
                    savingEdit ||
                    serverSaving ||
                    isMediaUploading ||
                    !canSubmitMedia
                  }
                  aria-label="Save"
                  onClick={saveEditChanges}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 p-3 text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                >
                  {savingEdit ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="sr-only">Save</span>
                  <span
                    aria-hidden
                    className="hidden md:ml-2 md:inline text-[11px] font-medium"
                  >
                    {savingEdit ? "Saving…" : "Save"}
                  </span>
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </form>
      {isReviewStep && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
          <div className="pointer-events-auto mx-auto w-full max-w-xl px-4">
            <div
              className={`rounded-2xl bg-white/90 backdrop-blur border border-slate-200 shadow-lg p-4 flex flex-col gap-3 transform-gpu transition-all duration-300 ease-out ${
                barVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <div className="text-center text-sm text-slate-600">
                Review looks good? Submit to{" "}
                {isEditing ? "update" : "publish your draft for review"}.
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  disabled={
                    savingEdit ||
                    serverSaving ||
                    isMediaUploading ||
                    !canSubmitMedia
                  }
                  onClick={() => {
                    if (isEditing) {
                      void saveEditChanges();
                    } else {
                      setShowConfirm(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
                >
                  {savingEdit ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingEdit
                    ? "Saving…"
                    : isEditing
                    ? "Save"
                    : "Submit Charter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showConfirm && (
        <ConfirmDialog
          isEditing={isEditing}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
            triggerSubmit();
          }}
          busy={
            isSubmitting || serverSaving || isMediaUploading || !canSubmitMedia
          }
        />
      )}
    </div>
  );
}
// End clean explicit-save implementation

// Lightweight inline confirm dialog (no portal dep)
function ConfirmDialog({
  isEditing,
  onCancel,
  onConfirm,
  busy,
}: {
  isEditing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  // focus management
  const cancelRef = useCallback((el: HTMLButtonElement | null) => {
    if (el) setTimeout(() => el.focus(), 0);
  }, []);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  useEffect(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    return () => {
      if (lastFocusedRef.current) {
        try {
          lastFocusedRef.current.focus();
        } catch {
          /* noop */
        }
      }
    };
  }, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 animate-in fade-in zoom-in"
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold text-slate-900 mb-2"
        >
          {isEditing ? "Save changes?" : "Submit charter?"}
        </h2>
        <p id="confirm-dialog-desc" className="text-sm text-slate-600 mb-4">
          {isEditing
            ? "Your live charter will be updated. Media processing (videos) may continue in background. Continue?"
            : "We will review and reach out if anything else is needed. You can return later to make edits. Submit now?"}
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {busy ? "Saving…" : isEditing ? "Save changes" : "Confirm Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

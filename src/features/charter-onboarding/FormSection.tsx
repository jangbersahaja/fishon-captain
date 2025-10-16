"use client";
// Clean rebuilt FormSection with minimal context provider integration.
// Phase: context introduction (light) without losing behavior.

import { createDefaultCharterFormValues } from "@features/charter-onboarding/charterForm.defaults";
// DraftValues import removed; local storage draft removed in revised flow.
import {
  charterFormSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { ConfirmDialog } from "@features/charter-onboarding/components/ConfirmDialog";
import { StepProgress } from "@features/charter-onboarding/components/StepProgress";
import { CharterFormProvider } from "@features/charter-onboarding/context/CharterFormContext";
import {
  isFormDebug,
  logFormDebug,
  setFormDebug,
} from "@features/charter-onboarding/debug";
import { STEP_SEQUENCE } from "@features/charter-onboarding/formSteps";
import {
  useAutofillCity,
  useCharterDataLoad,
  useCharterFormMode,
  useCharterMediaManager,
  useCharterSubmission,
  useDraftSnapshot,
  usePreviewCharter,
  useStepNavigation,
} from "@features/charter-onboarding/hooks";
// Individual steps now rendered via StepSwitch
import { getFieldError } from "@features/charter-onboarding/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
// (Icons now handled in extracted components)
import { feedbackTokens } from "@/config/designTokens";
import { zIndexClasses } from "@/config/zIndex";
import { ActionButtons } from "@features/charter-onboarding/components/ActionButtons";
import { DraftDevPanel } from "@features/charter-onboarding/components/DraftDevPanel";
import { ErrorSummary } from "@features/charter-onboarding/components/ErrorSummary";
import { ReviewBar } from "@features/charter-onboarding/components/ReviewBar";
import { StepSwitch } from "@features/charter-onboarding/components/StepSwitch";
import { mergeReadyVideos } from "@features/charter-onboarding/utils/videoDedupe";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
// Local draft (localStorage) removed in revised flow – server draft only for new users.

const ReviewStep = dynamic(
  () =>
    import("@features/charter-onboarding/steps/ReviewStep").then(
      (m) => m.ReviewStep
    ),
  { ssr: false }
);

export default function FormSection() {
  const router = useRouter();
  const { data: session } = useSession();
  const { editCharterId, adminUserId } = useCharterFormMode();
  // Revised draft system:
  // - New user: server draft created immediately (status DRAFT)
  // - Any field changed first time: save server draft snapshot
  // - Next step navigation: save server draft snapshot
  // - Submit: finalize (status SUBMITTED)
  // - Editing existing charter: no draft usage
  // Local storage draft removed, keep stubs for submission strategy API surface.
  const clearDraft = () => {};
  const [isDraftLoading, setIsDraftLoading] = useState(!editCharterId); // Loading draft for new forms
  const defaultState = useMemo(createDefaultCharterFormValues, []);
  const form = useForm<CharterFormValues>({
    resolver: zodResolver(charterFormSchema) as Resolver<CharterFormValues>,
    mode: "onBlur",
    defaultValues: defaultState,
  });
  const {
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  // Track last server save timestamp (server draft only)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const initializeDraftState = useCallback(
    (values: unknown, savedAt: string | null) => {
      // For parity with previous interface; simply record timestamp.
      void values;
      setLastSavedAt(savedAt);
    },
    []
  );

  // Remote / edit seed
  const seed = useCharterDataLoad({
    editCharterId,
    adminUserId,
    reset,
    setLastSavedAt: (iso) => setLastSavedAt(iso),
    clearLocalDraft: clearDraft,
    initializeDraftState,
  });

  // Set draft loading state based on whether we're editing or have loaded draft data
  useEffect(() => {
    if (editCharterId) {
      setIsDraftLoading(false); // Edit mode doesn't need draft loading
    } else if (seed.serverDraftId) {
      // For draft loading, wait a bit to ensure form reset has completed
      const timer = setTimeout(() => {
        setIsDraftLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [editCharterId, seed.serverDraftId]);

  // Additional check: if we have a server draft but form is still empty, turn off loading state anyway
  // This prevents infinite loading if draft hydration fails for some reason
  useEffect(() => {
    if (!editCharterId && seed.serverDraftId && isDraftLoading) {
      const timer = setTimeout(() => {
        setIsDraftLoading(false); // Force loading to stop after 2 seconds
        console.log(
          "[FormSection] Forced draft loading to stop to prevent infinite loading"
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [editCharterId, seed.serverDraftId, isDraftLoading]);
  const {
    effectiveEditing: isEditing,
    currentCharterId,
    serverDraftId,
    serverVersion,
    setServerVersion,
    savedCurrentStep,
  } = seed;

  // Media manager
  const media = useCharterMediaManager({
    form,
    isEditing,
    currentCharterId,
    onAvatarUploaded: (url) => {
      console.log("[form] avatar uploaded, saving draft", { url });
      // Immediately save draft when avatar is uploaded to persist avatarUrl
      draftSnapshot.saveServerDraftSnapshot();
    },
  });
  const {
    captainAvatarPreview,
    handleAvatarChange,
    clearAvatar,
    avatarUploading,
    existingImages,
    existingVideos,
    setExistingImages,
    setExistingVideos,
    photoPreviews,
    videoPreviews: enhancedVideoPreviews,
    addPhotoFiles,
    reorderExistingPhotos,
    removePhoto,
    isMediaUploading,
    canSubmitMedia,
    hasBlockingMedia,
    // photoProgress,
    // videoProgress,
  } = media;
  // New video upload section dynamic blocking state (queued/transcoding)
  const [videoSectionBlocking, setVideoSectionBlocking] = useState(false);

  // Server draft snapshot (diff + redundancy) – bypassed in edit mode.
  const [serverSaving, setServerSaving] = useState(false);
  const rawDraftSnapshot = useDraftSnapshot({
    form,
    isEditing,
    serverDraftId,
    serverVersion,
    initialStep: 0,
    setServerVersion,
    setServerSaving,
    setLastSavedAt: (iso) => setLastSavedAt(iso),
  });

  const draftSnapshot = useMemo(
    () =>
      isEditing
        ? {
            saveServerDraftSnapshot: async () => null,
            saveServerDraftSnapshotRef: { current: async () => null },
            setCurrentStep: () => {},
          }
        : rawDraftSnapshot,
    [isEditing, rawDraftSnapshot]
  );

  const navigation = useStepNavigation({
    form,
    isEditing,
    existingImagesCount: existingImages.length,
    saveServerDraftSnapshot: () =>
      draftSnapshot.saveServerDraftSnapshotRef.current &&
      draftSnapshot.saveServerDraftSnapshotRef.current(),
    setSnapshotCurrentStep: (n) => draftSnapshot.setCurrentStep(n),
    avatarUploading,
  });

  const {
    currentStep,
    isLastStep,
    isReviewStep,
    activeStep,
    stepCompleted,
    stepErrorSummary,
    handleNext,
    handlePrev,
    gotoStep,
  } = navigation;

  // Rebind snapshot step each change
  useEffect(() => {
    if (isEditing) return;
    draftSnapshot.setCurrentStep(currentStep);
    draftSnapshot.saveServerDraftSnapshotRef.current = () =>
      draftSnapshot.saveServerDraftSnapshot();
    logFormDebug("step_change", { currentStep });
  }, [currentStep, draftSnapshot, isEditing]);

  // Restore previously saved step from draft once (create flow only)
  const restoredStepRef = useRef(false);
  useEffect(() => {
    if (restoredStepRef.current) return;
    if (isEditing) return;
    if (typeof savedCurrentStep === "number" && savedCurrentStep > 0) {
      gotoStep(savedCurrentStep, { force: true });
      draftSnapshot.setCurrentStep(savedCurrentStep);
      restoredStepRef.current = true;
    } else if (savedCurrentStep !== null) {
      restoredStepRef.current = true; // nothing to restore (0)
    }
  }, [savedCurrentStep, isEditing, gotoStep, draftSnapshot]);

  // First dirty change -> save draft snapshot (new user create flow only)
  const [initialDirtySaved, setInitialDirtySaved] = useState(false);
  // Force an initial sync once draft id/version are present to establish lastPayloadRef
  const initialServerSyncRef = useRef(false);
  useEffect(() => {
    if (initialServerSyncRef.current) return;
    if (!serverDraftId || serverVersion === null || isEditing) return;
    initialServerSyncRef.current = true;
    draftSnapshot.saveServerDraftSnapshot();
  }, [serverDraftId, serverVersion, isEditing, draftSnapshot]);
  const uploadedMediaMapRef = useRef<
    WeakMap<
      File,
      { name: string; url: string; kind: "photo" | "video" | "avatar" }
    >
  >(new WeakMap());
  const getUploadedMediaInfo = useCallback(
    (file: File, kind: "photo" | "video" | "avatar") => {
      const found = uploadedMediaMapRef.current.get(file);
      if (found && found.kind === kind)
        return { name: found.name, url: found.url };
      return null;
    },
    []
  );
  useEffect(() => {
    if (
      initialDirtySaved ||
      isEditing ||
      !isDirty ||
      !serverDraftId ||
      !draftSnapshot.saveServerDraftSnapshotRef?.current
    )
      return;
    draftSnapshot.saveServerDraftSnapshotRef
      .current()
      .then(() => setInitialDirtySaved(true));
  }, [initialDirtySaved, isEditing, isDirty, serverDraftId, draftSnapshot]);

  // Create-flow media hydration: if we have a server draft with previously uploaded media
  // (uploadedPhotos / uploadedVideos) but the form + media manager state are empty (e.g. page reload),
  // fetch the current draft once and hydrate media + avatarUrl into the form and manager.
  const createMediaHydratedRef = useRef(false);
  useEffect(() => {
    if (isEditing) return; // edit mode handled elsewhere
    if (!serverDraftId) return; // need a draft id
    if (createMediaHydratedRef.current) return; // already attempted
    // Avoid clobbering if user has already added media this session
    const existingPhotoCount = (form.getValues("uploadedPhotos") || []).length;
    const existingVideoCount = (form.getValues("uploadedVideos") || []).length;
    if (existingPhotoCount || existingVideoCount) {
      createMediaHydratedRef.current = true;
      return;
    }
    let cancelled = false;

    interface DraftMediaHydrationResponse {
      draft?: {
        id: string;
        data?: {
          uploadedPhotos?: Array<{ name: string; url: string }>;
          uploadedVideos?: Array<{ name: string; url: string }>;
          operator?: { avatarUrl?: string };
        };
      };
    }

    const hydrateOnce = async (attempt = 0): Promise<boolean> => {
      try {
        const res = await fetch(`/api/charter-drafts/${serverDraftId}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) {
          if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
            console.warn(
              "[create-media-hydration] draft fetch not ok",
              res.status
            );
          }
          return false;
        }
        const json: DraftMediaHydrationResponse | null = await res
          .json()
          .catch(() => null);
        const draft = json?.draft;
        const data = draft?.data;
        if (!data) return false;
        const photos = Array.isArray(data.uploadedPhotos)
          ? data.uploadedPhotos
          : [];
        const videos = Array.isArray(data.uploadedVideos)
          ? data.uploadedVideos
          : [];
        const avatarUrl = data?.operator?.avatarUrl;
        if (cancelled) return true; // stop retries silently
        if (photos.length) {
          form.setValue("uploadedPhotos", photos, {
            shouldDirty: false,
            shouldValidate: false,
          });
          setExistingImages(photos);
        }
        if (videos.length) {
          form.setValue("uploadedVideos", videos, {
            shouldDirty: false,
            shouldValidate: false,
          });
          setExistingVideos(videos);
        }
        if (avatarUrl) {
          form.setValue("operator.avatarUrl", avatarUrl, {
            shouldDirty: false,
            shouldValidate: false,
          });
        }
        const hydrated = photos.length > 0 || videos.length > 0 || !!avatarUrl;
        if (hydrated && process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.log("[create-media-hydration] success", {
            attempt,
            photos: photos.length,
            videos: videos.length,
            hasAvatar: !!avatarUrl,
          });
        }
        return hydrated;
      } catch (e) {
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.warn("[create-media-hydration] error", e);
        }
        return false;
      }
    };

    (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        const ok = await hydrateOnce(attempt);
        if (ok) break;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
      if (!cancelled) createMediaHydratedRef.current = true;
    })();

    if (typeof window !== "undefined") {
      // Expose manual debug helper for console testing
      (
        window as unknown as { __rehydrateDraftMedia?: () => Promise<boolean> }
      ).__rehydrateDraftMedia = () => hydrateOnce(999);
    }
    return () => {
      cancelled = true;
    };
  }, [isEditing, serverDraftId, form, setExistingImages, setExistingVideos]);

  // Auto-save draft when media counts change (create flow) so a reload hydrates them.
  const lastMediaSignatureRef = useRef<string>("__init");
  useEffect(() => {
    if (isEditing) return; // edit mode only uses live PATCH on order update elsewhere
    if (!serverDraftId) return;
    const sig = JSON.stringify({
      images: existingImages.map((m) => m.name),
      videos: existingVideos.map((m) => m.name),
    });
    if (sig === lastMediaSignatureRef.current) return;
    lastMediaSignatureRef.current = sig;
    if (existingImages.length === 0 && existingVideos.length === 0) return;
    const timer = setTimeout(() => {
      draftSnapshot
        .saveServerDraftSnapshot()
        .then(() => {
          if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
            console.log("[media-autosave] saved draft after media change", {
              images: existingImages.length,
              videos: existingVideos.length,
            });
          }
        })
        .catch(() => {});
    }, 500); // slight debounce to batch rapid additions
    return () => clearTimeout(timer);
  }, [existingImages, existingVideos, isEditing, serverDraftId, draftSnapshot]);

  // (ReviewBar now handles its own enter animation)

  // Submission logic
  const {
    submitState,
    savingEdit,
    saveEditChanges,
    handleFormSubmit,
    triggerSubmit,
    finalizing,
    setSubmitState,
  } = useCharterSubmission({
    form,
    isEditing,
    currentCharterId,
    fallbackEditCharterId: editCharterId,
    adminUserId,
    serverDraftId,
    serverVersion,
    saveServerDraftSnapshot: () => draftSnapshot.saveServerDraftSnapshot(),
    existingImages,
    existingVideos,
    defaultState,
    clearDraft,
    initializeDraftState,
    setLastSavedAt: (iso) => setLastSavedAt(iso),
    router,
    getUploadedMediaInfo,
  });

  // Derived preview & helpers
  const formValues = watch();
  const normalizedPhotoPreviews = useMemo(
    () => photoPreviews.map((p, i) => ({ ...p, name: p.name || `photo-${i}` })),
    [photoPreviews]
  );
  const normalizedVideoPreviews = useMemo(
    () =>
      enhancedVideoPreviews.map((p, i) => ({
        ...p,
        name: p.name || `video-${i}`,
      })),
    [enhancedVideoPreviews]
  );
  const previewCharter = usePreviewCharter(
    formValues,
    normalizedPhotoPreviews,
    captainAvatarPreview
  );

  // Auto-clear transient edit save success after brief delay (avoid lingering on screen)
  useEffect(() => {
    if (!isEditing) return;
    if (!submitState) return;
    if (submitState.type === "success") {
      const t = setTimeout(() => {
        // Only clear if still success (avoid wiping out a newer error)
        setSubmitState((cur) => (cur && cur.type === "success" ? null : cur));
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [isEditing, submitState, setSubmitState]);

  // Auto-fill city when empty on state change
  useAutofillCity(form);

  const fieldError = useCallback(
    (path?: string) => getFieldError(errors as Record<string, unknown>, path),
    [errors]
  );

  // Fallback hydration: if after initial render in edit mode core fields still blank, fetch & hydrate directly here.
  useEffect(() => {
    if (!isEditing) return;
    if (!editCharterId) return;
    const current = form.getValues();
    if (current.charterName) return; // already hydrated
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const still = form.getValues();
        if (still.charterName) return; // got hydrated meanwhile
        console.log(
          "[FormSection fallback] primary hydration did not complete, trying fallback",
          {
            editCharterId,
            adminUserId,
            currentCharterName: still.charterName,
          }
        );
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1" || adminUserId) {
          console.log(
            "[FormSection fallback] triggering direct fetch hydration",
            {
              editCharterId,
              adminUserId,
            }
          );
        }
        const adminParam = adminUserId
          ? `?adminUserId=${encodeURIComponent(adminUserId)}`
          : "";
        const res = await fetch(
          `/api/charters/${editCharterId}/get${adminParam}`,
          {
            cache: "no-store",
          }
        );
        if (!res.ok) {
          console.warn("[FormSection fallback] fetch failed", res.status);
          return;
        }
        const json = await res.json();
        if (!json?.charter) {
          console.warn("[FormSection fallback] no charter in response");
          return;
        }
        const { mapCharterToDraftValuesFeature } = await import(
          "@features/charter-onboarding/server/mapping"
        );
        const charter = json.charter;
        const media = json.media;
        const draftValues = mapCharterToDraftValuesFeature({
          charter: charter as unknown as never,
          captainProfile: {
            displayName: charter.captain?.displayName || "",
            phone: charter.captain?.phone || "",
            bio: charter.captain?.bio || "",
            experienceYrs: charter.captain?.experienceYrs || 0,
          },
          media: media,
        }) as unknown as CharterFormValues;
        if (cancelled) return;
        form.reset(draftValues, { keepDirty: false });
        // Also prime media manager state & avatar preview
        if (media?.images?.length) {
          setExistingImages(
            media.images as Array<{ name: string; url: string }>
          );
          form.setValue(
            "uploadedPhotos",
            media.images as Array<{ name: string; url: string }>,
            {
              shouldDirty: false,
              shouldValidate: false,
            }
          );
        }
        if (media?.videos?.length) {
          setExistingVideos(
            media.videos as Array<{ name: string; url: string }>
          );
          form.setValue(
            "uploadedVideos",
            media.videos as Array<{ name: string; url: string }>,
            {
              shouldDirty: false,
              shouldValidate: false,
            }
          );
        }
        if (media?.avatar) {
          form.setValue("operator.avatarUrl", media.avatar, {
            shouldDirty: false,
            shouldValidate: false,
          });
        }
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1" || adminUserId) {
          console.log("[FormSection fallback] applied reset", {
            charterName: draftValues.charterName,
            city: draftValues.city,
          });
        }
      } catch (e) {
        console.error("[FormSection fallback] error", e);
      }
    }, 800); // allow primary hook ~800ms to hydrate first (increased for admin override)
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isEditing,
    editCharterId,
    adminUserId,
    form,
    setExistingImages,
    setExistingVideos,
  ]);

  // Listen for diagnostic hydration patch events dispatched by useCharterDataLoad (edit mode)
  useEffect(() => {
    if (!isEditing) return; // only relevant in edit mode
    const handler = (e: Event) => {
      const custom = e as CustomEvent<Partial<CharterFormValues>>;
      const detail = custom.detail || {};
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.log(
          "[FormSection] received charter-edit-hydrated event",
          detail
        );
      }
      // Apply each field via setValue to avoid full reset side-effects (touched/dirty flags)
      (Object.entries(detail) as [keyof CharterFormValues, unknown][]).forEach(
        ([key, value]) => {
          try {
            // @ts-expect-error dynamic assignment – keys are top-level scalar fields provided by patch
            form.setValue(key, value, {
              shouldDirty: false,
              shouldValidate: false,
            });
          } catch (err) {
            console.warn(
              "[FormSection] failed to set field during hydration",
              key,
              err
            );
          }
        }
      );
      // Trigger a debug snapshot log
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        setTimeout(() => {
          const snap = form.getValues();
          console.log("[FormSection debug] post-hydration snapshot", {
            charterName: snap.charterName,
            city: snap.city,
            latitude: snap.latitude,
            longitude: snap.longitude,
          });
        }, 0);
      }
    };
    document.addEventListener(
      "charter-edit-hydrated",
      handler as EventListener
    );
    return () =>
      document.removeEventListener(
        "charter-edit-hydrated",
        handler as EventListener
      );
  }, [form, isEditing]);

  // Debug: log current core values shortly after any reset/hydration cycle in edit mode
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG !== "1") return;
    if (!isEditing) return;
    // Defer to end of event loop so RHF internal state settled
    const t = setTimeout(() => {
      const snapshot = form.getValues();
      console.log("[FormSection debug] snapshot", {
        charterName: snapshot.charterName,
        city: snapshot.city,
        latitude: snapshot.latitude,
        trip0: snapshot.trips?.[0]?.name,
        operatorDisplayName: snapshot.operator?.displayName,
      });
    }, 0);
    return () => clearTimeout(t);
  }, [
    isEditing,
    form,
    formValues.charterName,
    formValues.city,
    formValues.latitude,
  ]);

  const [showConfirm, setShowConfirm] = useState(false);
  // mediaUploadError removed with legacy deferred upload path – keep placeholder if future UI wants aggregate errors.
  const totalSteps = STEP_SEQUENCE.length; // kept local for display only
  const bottomPaddingClass = isReviewStep ? "pb-60" : "pb-16";

  // Upload newly added local media (create mode) after successfully advancing past media step.
  // Legacy deferred media upload removed. All media now uploads immediately via useCharterMediaManager.

  // Prepare callbacks for StepSwitch (must be outside conditional return)
  const onVideoBlockingChange = useCallback(
    (b: boolean) => setVideoSectionBlocking(b),
    [setVideoSectionBlocking]
  );

  const onReadyVideosChange = useCallback(
    (ready: { name: string; url: string }[]) => {
      if (!ready.length) return;
      setExistingVideos((prev) => mergeReadyVideos(prev, ready));
    },
    [setExistingVideos]
  );

  // Show loading state while draft data is being loaded
  if (isDraftLoading) {
    return (
      <div className="space-y-6 pt-6 mx-auto pb-16">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
            <p className="text-sm text-slate-500">Loading your draft...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CharterFormProvider
      value={{
        form,
        isEditing,
        currentCharterId,
        serverDraftId,
        serverVersion,
        setServerVersion,
        lastSavedAt,
        navigation: {
          currentStep,
          isLastStep,
          isReviewStep,
          activeStep,
          handleNext,
          handlePrev,
          gotoStep,
        },
        submission: {
          submitState,
          setSubmitState,
          savingEdit,
          serverSaving,
          saveEditChanges,
          triggerSubmit,
          finalizing,
        },
        media: {
          isMediaUploading,
          canSubmitMedia,
          existingImagesCount: existingImages.length,
          existingVideosCount: existingVideos.length,
          avatarUploading,
          hasBlockingMedia: hasBlockingMedia || videoSectionBlocking,
        },
      }}
    >
      <div
        className={`space-y-6 pt-6 mx-auto ${bottomPaddingClass}`}
        // Keyboard toggle: cmd+shift+D (mac) / ctrl+shift+D
        onKeyDown={(e) => {
          const mac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (
            (mac ? e.metaKey : e.ctrlKey) &&
            e.shiftKey &&
            e.key.toLowerCase() === "d"
          ) {
            e.preventDefault();
            const next = !isFormDebug();
            setFormDebug(next);
            if (next) {
              logFormDebug("toggled_on", { via: "keyboard" });
            } else {
              console.debug("[FormDebug] toggled_off");
            }
          }
        }}
        tabIndex={0}
      >
        {isFormDebug() && (
          <div
            className={`fixed top-2 right-2 ${zIndexClasses.debug} rounded bg-indigo-600/80 px-2 py-1 text-[10px] font-mono text-white shadow`}
          >
            FORM DEBUG
          </div>
        )}
        {isEditing && (
          <div
            className={`rounded-xl px-4 py-3 text-xs ${feedbackTokens.info.subtle}`}
          >
            <p className="font-semibold text-slate-800">Editing live charter</p>
            <p className="mt-0.5">Submit again to apply your updates.</p>
          </div>
        )}
        {!isEditing && !serverDraftId && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${feedbackTokens.warning.subtle}`}
          >
            <p className="font-semibold">Sign in required</p>
            <p>Sign in to save your progress on the server.</p>
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <StepProgress
            steps={STEP_SEQUENCE}
            currentStep={currentStep}
            completed={stepCompleted}
            clickable={isEditing || stepCompleted.some(Boolean)} // Enable if editing OR any step is completed
            isEditing={isEditing} // Pass editing mode to enable full navigation
            onStepClick={(idx) => {
              if (isEditing) {
                // Edit mode: can navigate to any step
                if (idx === currentStep) return;
                console.log("[FormSection] Edit mode: navigating to step", idx);
                // Persist intended target step first (empty diff save) so reload lands correctly.
                draftSnapshot.setCurrentStep(idx);
                draftSnapshot
                  .saveServerDraftSnapshot()
                  .finally(() => gotoStep(idx, { force: true }));
              } else {
                // Draft mode: can navigate to completed steps or any step up to current step
                const canNavigate = stepCompleted[idx] || idx <= currentStep; // Allow navigation up to current step
                console.log("[FormSection] Draft mode: step click", {
                  targetStep: idx,
                  currentStep,
                  stepCompleted: stepCompleted[idx],
                  canNavigate,
                });
                if (canNavigate && idx !== currentStep) {
                  // Save the step navigation in draft mode too
                  draftSnapshot.setCurrentStep(idx);
                  if (serverDraftId) {
                    draftSnapshot.saveServerDraftSnapshot();
                  }
                  gotoStep(idx, { force: true });
                }
              }
            }}
          />
          {!isEditing && (
            <p className="text-[11px] text-slate-400">
              {serverDraftId
                ? "Progress saves when you click Next or Submit."
                : "Sign in to enable server saving."}
            </p>
          )}
          <ErrorSummary errors={stepErrorSummary || []} />
          <StepSwitch
            currentStep={currentStep}
            form={form}
            fieldError={fieldError}
            captainAvatarPreview={captainAvatarPreview}
            onAvatarChange={handleAvatarChange}
            onAvatarClear={clearAvatar}
            normalizedPhotoPreviews={normalizedPhotoPreviews}
            normalizedVideoPreviews={normalizedVideoPreviews}
            addPhotoFiles={addPhotoFiles}
            removePhoto={removePhoto}
            existingImagesCount={existingImages.length}
            existingVideosCount={existingVideos.length}
            onReorderPhotos={reorderExistingPhotos}
            currentCharterId={currentCharterId}
            onVideoBlockingChange={onVideoBlockingChange}
            onReadyVideosChange={onReadyVideosChange}
            seedVideos={existingVideos}
          />
          {isReviewStep && (
            <ReviewStep
              charter={previewCharter}
              ownerId={
                (session?.user as { id?: string; role?: string } | undefined)
                  ?.id || ""
              }
            />
          )}
          {submitState?.type === "error" && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${feedbackTokens.error.subtle}`}
            >
              {submitState.message}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Step {currentStep + 1} of {totalSteps} · {activeStep.label}
            </div>
            <ActionButtons />
          </div>
          {lastSavedAt && !isEditing && (
            <p className="text-[10px] text-right text-slate-400">
              Last saved {new Date(lastSavedAt).toLocaleTimeString()}
            </p>
          )}
          {process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1" && (
            <DevRenderCounter label="FormSection" />
          )}
        </form>
        {isReviewStep && (
          <ReviewBar
            active={isReviewStep}
            onPrimary={() => {
              if (isEditing) {
                void saveEditChanges();
              } else {
                logFormDebug("open_confirm", {});
                setShowConfirm(true);
              }
            }}
          />
        )}
        {showConfirm && (
          <ConfirmDialog
            isEditing={isEditing}
            requireAgreements={!isEditing}
            onCancel={() => setShowConfirm(false)}
            onConfirm={() => {
              logFormDebug("confirm_submit", {});
              triggerSubmit();
            }}
            busy={
              finalizing ||
              isSubmitting ||
              serverSaving ||
              isMediaUploading ||
              !canSubmitMedia
            }
            errorMessage={
              submitState?.type === "error" ? submitState.message : null
            }
          />
        )}
        <DraftDevPanel draftId={serverDraftId} lastSavedAt={lastSavedAt} />
      </div>
    </CharterFormProvider>
  );
}

const DevRenderCounter: React.FC<{ label: string }> = ({ label }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount((c) => c + 1);
  }, []);
  return (
    <span className="ml-2 rounded bg-slate-100 px-2 py-1 text-[10px] font-mono text-slate-500">
      {label} renders: {count}
    </span>
  );
};

// Debugging aid: log form values on mount and after each render (hydration-safe)

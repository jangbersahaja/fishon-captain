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
import { logFormDebug } from "@features/charter-onboarding/debug";
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
import { ActionButtons } from "@features/charter-onboarding/components/ActionButtons";
import { ErrorSummary } from "@features/charter-onboarding/components/ErrorSummary";
import { ReviewBar } from "@features/charter-onboarding/components/ReviewBar";
import { StepSwitch } from "@features/charter-onboarding/components/StepSwitch";
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
  const { editCharterId } = useCharterFormMode();
  // Revised draft system:
  // - New user: server draft created immediately (status DRAFT)
  // - Any field changed first time: save server draft snapshot
  // - Next step navigation: save server draft snapshot
  // - Submit: finalize (status SUBMITTED)
  // - Editing existing charter: no draft usage
  // Local storage draft removed, keep stubs for submission strategy API surface.
  const clearDraft = () => {};
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
    reset,
    setLastSavedAt: (iso) => setLastSavedAt(iso),
    clearLocalDraft: clearDraft,
    initializeDraftState,
  });
  const {
    effectiveEditing: isEditing,
    currentCharterId,
    serverDraftId,
    serverVersion,
    setServerVersion,
    savedCurrentStep,
  } = seed;

  // Media manager
  const media = useCharterMediaManager({ form, isEditing, currentCharterId });
  const {
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
    videoPreviews: enhancedVideoPreviews,
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
  } = media;

  // Server draft snapshot (diff + redundancy) – editing mode bypass handled inside hook.
  const [serverSaving, setServerSaving] = useState(false);
  const draftSnapshot = useDraftSnapshot({
    form,
    isEditing,
    serverDraftId,
    serverVersion,
    initialStep: 0,
    setServerVersion,
    setServerSaving,
    setLastSavedAt: (iso) => setLastSavedAt(iso),
  });

  // Step navigation
  const navigation = useStepNavigation({
    form,
    isEditing,
    existingImagesCount: existingImages.length,
    saveServerDraftSnapshot: () =>
      draftSnapshot.saveServerDraftSnapshotRef.current(),
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
    draftSnapshot.setCurrentStep(currentStep);
    draftSnapshot.saveServerDraftSnapshotRef.current = () =>
      draftSnapshot.saveServerDraftSnapshot();
    logFormDebug("step_change", { currentStep });
  }, [currentStep, draftSnapshot]);

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
      !draftSnapshot.saveServerDraftSnapshotRef.current
    )
      return;
    draftSnapshot.saveServerDraftSnapshotRef
      .current()
      .then(() => setInitialDirtySaved(true));
  }, [initialDirtySaved, isEditing, isDirty, serverDraftId, draftSnapshot]);

  // (ReviewBar now handles its own enter animation)

  // Submission logic
  const {
    submitState,
    savingEdit,
    saveEditChanges,
    handleFormSubmit,
    triggerSubmit,
  } = useCharterSubmission({
    form,
    isEditing,
    currentCharterId,
    serverDraftId,
    serverVersion,
    saveServerDraftSnapshot: () => draftSnapshot.saveServerDraftSnapshot(),
    existingImages,
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

  // Auto-fill city when empty on state change
  useAutofillCity(form);

  const fieldError = useCallback(
    (path?: string) => getFieldError(errors as Record<string, unknown>, path),
    [errors]
  );

  const [showConfirm, setShowConfirm] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const totalSteps = STEP_SEQUENCE.length; // kept local for display only
  const bottomPaddingClass = isReviewStep ? "pb-60" : "pb-16";

  // Upload newly added local media (create mode) after successfully advancing past media step.
  const uploadMediaIfLeavingMediaStep = useCallback(
    async (prevStepId: string) => {
      if (isEditing) return;
      const values = form.getValues();
      const photos: File[] = Array.isArray(values.photos) ? values.photos : [];
      const videos: File[] = Array.isArray(values.videos) ? values.videos : [];
      const avatarFile = values.operator.avatar;
      const leavingMedia = prevStepId === "media";
      const shouldUploadAvatar = avatarFile instanceof File;
      const shouldUploadMedia =
        leavingMedia && (photos.length || videos.length);
      if (!shouldUploadAvatar && !shouldUploadMedia) return;
      setMediaUploadError(null);
      const uploadOne = async (
        file: File,
        kind: "photo" | "video" | "avatar"
      ) => {
        if (uploadedMediaMapRef.current.has(file))
          return uploadedMediaMapRef.current.get(file)!;
        const fd = new FormData();
        fd.set("file", file);
        fd.set(
          "docType",
          kind === "avatar" ? "charter_avatar" : "charter_media"
        );
        try {
          const res = await fetch("/api/blob/upload", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) return null;
          const { key, url } = (await res.json()) as {
            key: string;
            url: string;
          };
          const meta = { name: key, url, kind } as const;
          uploadedMediaMapRef.current.set(file, meta);
          return meta;
        } catch {
          return null;
        }
      };
      let avatarMeta: { name: string; url: string } | null = null;
      if (shouldUploadAvatar) {
        const up = await uploadOne(avatarFile as File, "avatar");
        if (up) {
          avatarMeta = { name: up.name, url: up.url };
          // Persist avatarUrl into form state so draft snapshot can keep preview across reloads
          const current = form.getValues("operator.avatarUrl");
          if (current !== up.url) {
            form.setValue("operator.avatarUrl", up.url, {
              shouldDirty: true,
              shouldValidate: false,
            });
          }
        }
      }
      if (shouldUploadMedia) {
        const photoResults = await Promise.all(
          photos.map((f) => uploadOne(f, "photo"))
        );
        const videoResults = await Promise.all(
          videos.map((f) => uploadOne(f, "video"))
        );
        const successfulPhotoMetas: { name: string; url: string }[] = [];
        const failedPhotos: File[] = [];
        photoResults.forEach((meta, idx) => {
          if (meta)
            successfulPhotoMetas.push({ name: meta.name, url: meta.url });
          else failedPhotos.push(photos[idx]);
        });
        const successfulVideoMetas: { name: string; url: string }[] = [];
        const failedVideos: File[] = [];
        videoResults.forEach((meta, idx) => {
          if (meta)
            successfulVideoMetas.push({ name: meta.name, url: meta.url });
          else failedVideos.push(videos[idx]);
        });
        if (successfulPhotoMetas.length)
          setExistingImages((prev) => [...prev, ...successfulPhotoMetas]);
        if (successfulVideoMetas.length)
          setExistingVideos((prev) => [...prev, ...successfulVideoMetas]);
        // Keep only failed files in form so user can retry
        if (
          successfulPhotoMetas.length ||
          failedPhotos.length !== photos.length
        )
          form.setValue("photos", failedPhotos, { shouldValidate: true });
        if (
          successfulVideoMetas.length ||
          failedVideos.length !== videos.length
        )
          form.setValue("videos", failedVideos, { shouldValidate: true });
        const failCount = failedPhotos.length + failedVideos.length;
        if (failCount > 0) {
          setMediaUploadError(
            `${failCount} media file${
              failCount === 1 ? "" : "s"
            } failed to upload. They remain selected for retry.`
          );
        }
      }
      void avatarMeta; // mapping retained for finalize
    },
    [form, isEditing, setExistingImages, setExistingVideos]
  );

  // Wrap original handleNext to inject post-step upload
  const handleNextWithUpload = useCallback(async () => {
    const prevStepId = activeStep.id;
    await handleNext();
    await uploadMediaIfLeavingMediaStep(prevStepId);
  }, [handleNext, uploadMediaIfLeavingMediaStep, activeStep.id]);

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
          handleNext: handleNextWithUpload,
          handlePrev,
          gotoStep,
        },
        submission: {
          submitState,
          savingEdit,
          serverSaving,
          saveEditChanges,
          triggerSubmit,
        },
        media: {
          isMediaUploading,
          canSubmitMedia,
          existingImagesCount: existingImages.length,
          existingVideosCount: existingVideos.length,
        },
      }}
    >
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
              if (!isEditing || idx === currentStep) return;
              draftSnapshot
                .saveServerDraftSnapshot()
                .finally(() => gotoStep(idx));
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
            addVideoFiles={addVideoFiles}
            removePhoto={removePhoto}
            removeVideo={removeVideo}
            videoProgress={videoProgress}
            photoProgress={photoProgress}
            existingImagesCount={existingImages.length}
            existingVideosCount={existingVideos.length}
            onReorderPhotos={reorderExistingPhotos}
            onReorderVideos={reorderExistingVideos}
            onRetryPhoto={retryPhoto}
            onRetryVideo={retryVideo}
          />
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
          {mediaUploadError && !isEditing && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-700">
              {mediaUploadError}
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
          {!isEditing && (
            <SaveStatusIndicator
              saving={serverSaving}
              lastSavedAt={lastSavedAt}
              dirty={isDirty && !serverSaving}
            />
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
            onCancel={() => setShowConfirm(false)}
            onConfirm={() => {
              setShowConfirm(false);
              logFormDebug("confirm_submit", {});
              triggerSubmit();
            }}
            busy={
              isSubmitting ||
              serverSaving ||
              isMediaUploading ||
              !canSubmitMedia
            }
          />
        )}
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
const SaveStatusIndicator: React.FC<{
  saving: boolean;
  lastSavedAt: string | null;
  dirty: boolean;
}> = ({ saving, lastSavedAt, dirty }) => {
  const text = saving
    ? "Saving…"
    : dirty
    ? "Unsaved changes"
    : lastSavedAt
    ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
    : "";
  if (!text) return null;
  return (
    <div className="mt-1 flex items-center justify-end text-[10px] font-medium text-slate-400">
      <span
        className={
          saving
            ? "animate-pulse text-amber-500"
            : dirty
            ? "text-amber-500"
            : "text-emerald-500"
        }
      >
        {text}
      </span>
    </div>
  );
};

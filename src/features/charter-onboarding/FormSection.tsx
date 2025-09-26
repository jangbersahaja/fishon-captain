"use client";
// Clean rebuilt FormSection with minimal context provider integration.
// Phase: context introduction (light) without losing behavior.

import { createDefaultCharterFormValues } from "@features/charter-onboarding/charterForm.defaults";
import { type DraftValues } from "@features/charter-onboarding/charterForm.draft";
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
  useAutosaveDraft,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useCharterDraft } from "./hooks/useCharterDraft";

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
  const { saveDraft, clearDraft } = useCharterDraft<DraftValues>();
  const defaultState = useMemo(createDefaultCharterFormValues, []);
  const form = useForm<CharterFormValues>({
    resolver: zodResolver(charterFormSchema) as Resolver<CharterFormValues>,
    mode: "onBlur",
    defaultValues: defaultState,
  });
  const {
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Local autosave draft (client) – draftLoaded toggled after remote seed.
  const { setLastSavedAt, initializeDraftState, lastSavedAt } =
    useAutosaveDraft({
      values: watch(),
      draftLoaded: false,
      isRestoring: false,
      sanitize: (v) => v,
      saveDraft,
    });

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
  } = seed;

  // Media manager
  const media = useCharterMediaManager({ form, isEditing, currentCharterId });
  const {
    captainAvatarPreview,
    handleAvatarChange,
    clearAvatar,
    existingImages,
    existingVideos,
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
  const totalSteps = STEP_SEQUENCE.length; // kept local for display only
  const bottomPaddingClass = isReviewStep ? "pb-60" : "pb-16";

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

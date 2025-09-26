"use client";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  charterFormOptions,
  createDefaultCharterFormValues,
} from "@features/charter-onboarding/charterForm.defaults";
import { type DraftValues } from "@features/charter-onboarding/charterForm.draft";
import {
  charterFormSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { ConfirmDialog } from "@features/charter-onboarding/components/ConfirmDialog";
import { StepProgress } from "@features/charter-onboarding/components/StepProgress";
import { FIELD_LABELS } from "@features/charter-onboarding/fieldLabels";
import { STEP_SEQUENCE } from "@features/charter-onboarding/formSteps";
import {
  useAutosaveDraft,
  useCharterMediaManager,
  useCharterSubmission,
  useDraftSnapshot,
  useStepNavigation,
} from "@features/charter-onboarding/hooks";
import { createPreviewCharter } from "@features/charter-onboarding/preview";
import {
  BasicsStep,
  ExperienceStep,
  MediaPricingStep,
  TripsStep,
} from "@features/charter-onboarding/steps";
import { getFieldError } from "@features/charter-onboarding/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useCharterDraft } from "./hooks/useCharterDraft";
import { useFormMode } from "./hooks/useFormMode";
import { useServerOrEditSeed } from "./hooks/useServerOrEditSeed";
// NOTE(phase1): STEP_SEQUENCE + REVIEW_STEP_INDEX moved to formSteps.ts for central management.
// NOTE(phase1): ConfirmDialog extracted to its own component for clarity and reuse.

const ReviewStep = dynamic(
  () =>
    import("@features/charter-onboarding/steps/ReviewStep").then(
      (m) => m.ReviewStep
    ),
  { ssr: false }
);

const totalSteps = STEP_SEQUENCE.length;

export default function FormSection() {
  const router = useRouter();
  const { editCharterId } = useFormMode();
  const { saveDraft, clearDraft } = useCharterDraft<DraftValues>();
  const [serverSaving, setServerSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [barVisible, setBarVisible] = useState(false);

  const defaultState = useMemo(createDefaultCharterFormValues, []);
  const form = useForm<CharterFormValues>({
    resolver: zodResolver(charterFormSchema) as Resolver<CharterFormValues>,
    mode: "onBlur",
    defaultValues: defaultState,
  });
  const {
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Autosave draft (local) integration
  const { setLastSavedAt, initializeDraftState } = useAutosaveDraft({
    values: watch(),
    draftLoaded: false, // replaced by seed values below after seed resolves
    isRestoring: false,
    sanitize: (v) => v, // sanitize handled in snapshot hook for server
    saveDraft,
  });

  // Seed (edit vs create + initial data)
  const seed = useServerOrEditSeed({
    editCharterId,
    reset,
    setLastSavedAt: (iso) => setLastSavedAt(iso),
    clearLocalDraft: clearDraft,
    initializeDraftState,
  });
  const {
    isEditing,
    draftLoaded,
    currentCharterId,
    serverDraftId,
    serverVersion,
    setServerVersion,
  } = seed;

  // Reconfigure autosave draft with real flags (cannot change args of hook; acceptable minor duplication)
  useEffect(() => {
    // When draftLoaded toggles true first time, we could trigger any side-effects if needed
  }, [draftLoaded]);

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

  const formValues = watch();
  const normalizedPhotoPreviews = useMemo(
    () =>
      photoPreviews.map((p, idx) => ({ ...p, name: p.name || `photo-${idx}` })),
    [photoPreviews]
  );
  const normalizedVideoPreviews = useMemo(
    () =>
      enhancedVideoPreviews.map((p, idx) => ({
        ...p,
        name: p.name || `video-${idx}`,
      })),
    [enhancedVideoPreviews]
  );
  const previewCharter = useMemo(
    () =>
      createPreviewCharter(
        formValues,
        normalizedPhotoPreviews,
        captainAvatarPreview
      ),
    [formValues, normalizedPhotoPreviews, captainAvatarPreview]
  );

  // Autofill city
  const selectedState = watch("state");
  const cityValue = watch("city");
  const { MALAYSIA_LOCATIONS } = charterFormOptions;
  useEffect(() => {
    const st = MALAYSIA_LOCATIONS.find((s) => s.state === selectedState);
    if (!st) return;
    if (!cityValue?.trim()) {
      const fallback = st.city[0] ?? "";
      if (fallback) setValue("city", fallback, { shouldValidate: true });
    }
  }, [MALAYSIA_LOCATIONS, selectedState, cityValue, setValue]);

  // Draft snapshot hook (initial currentStep placeholder; real step updates binding below)
  const draftSnapshot = useDraftSnapshot({
    form,
    isEditing,
    serverDraftId,
    serverVersion,
    initialStep: 0,
    setServerVersion,
    setLastSavedAt: (iso) => setLastSavedAt(iso),
    setServerSaving,
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

  // Rebind snapshot with real step each change (the hook reads currentStep from closure when called)
  useEffect(() => {
    draftSnapshot.setCurrentStep(currentStep);
    draftSnapshot.saveServerDraftSnapshotRef.current = () =>
      draftSnapshot.saveServerDraftSnapshot();
  }, [currentStep, draftSnapshot]);

  // Sticky bar animation
  useEffect(() => {
    if (isReviewStep) {
      const t = setTimeout(() => setBarVisible(true), 20);
      return () => clearTimeout(t);
    }
    setBarVisible(false);
  }, [isReviewStep]);

  // Submission hook
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

  const fieldError = useCallback(
    (path: string | undefined) =>
      getFieldError(errors as Record<string, unknown>, path),
    [errors]
  );

  const bottomPaddingClass = isReviewStep ? "pb-60" : "pb-16";

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
            if (!isEditing) return;
            if (idx === currentStep) return;
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
        {stepErrorSummary && stepErrorSummary.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <p className="font-semibold mb-1">Please fix before continuing:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {stepErrorSummary.map((f, i) => (
                <li key={f + "-" + i}>
                  <button
                    type="button"
                    onClick={() => {
                      const fieldKey = Object.entries(FIELD_LABELS).find(
                        ([, label]) => label === f
                      )?.[0];
                      if (fieldKey) {
                        const el = document.querySelector(
                          `[name='${fieldKey.replace(/\./g, ".")}']`
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
            photoPreviews={normalizedPhotoPreviews}
            videoPreviews={normalizedVideoPreviews}
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
                  onClick={handlePrev}
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

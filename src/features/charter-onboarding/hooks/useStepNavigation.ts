/**
 * useStepNavigation (Phase 4)
 * Extracts step navigation + per-step validation logic out of FormSection.
 * Responsibilities:
 *  - Track current step index and completion state
 *  - Validate current step against its schema before advancing
 *  - Maintain error summary list for the active step
 *  - Emit analytics events (step_view, step_complete, validation_errors)
 *  - Provide helpers to go next, previous, or jump to a specific step (editing only)
 */
"use client";
import { emitCharterFormEvent } from "@features/charter-onboarding/analytics";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import {
  basicsStepSchema,
  charterFormSchema,
  descriptionStepSchema,
  experienceStepSchema,
  mediaPricingStepSchema,
  tripsStepSchema,
} from "@features/charter-onboarding/charterForm.schema";
import { friendlyFieldLabel } from "@features/charter-onboarding/fieldLabels";
import {
  REVIEW_STEP_INDEX,
  STEP_SEQUENCE,
} from "@features/charter-onboarding/formSteps";
import { useCallback, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

export interface UseStepNavigationArgs {
  form: UseFormReturn<CharterFormValues>;
  isEditing: boolean;
  existingImagesCount: number; // used to bypass media step photo minimum when editing
  saveServerDraftSnapshot: () => Promise<number | null>;
  /** direct setter so we can update snapshot step before saving */
  setSnapshotCurrentStep: (n: number) => void;
  /** prevent navigation while avatar is uploading on basics step */
  avatarUploading?: boolean;
}

export interface UseStepNavigationResult {
  currentStep: number;
  isLastStep: boolean;
  isReviewStep: boolean;
  activeStep: (typeof STEP_SEQUENCE)[number];
  stepCompleted: boolean[];
  stepErrorSummary: string[] | null;
  handleNext: () => Promise<void>;
  handlePrev: () => void;
  gotoStep: (index: number, opts?: { force?: boolean }) => void;
  clearStepErrors: () => void;
  setCurrentStep: (updater: (s: number) => number) => void;
}

export function useStepNavigation({
  form,
  isEditing,
  existingImagesCount,
  saveServerDraftSnapshot,
  setSnapshotCurrentStep,
  avatarUploading = false,
}: UseStepNavigationArgs): UseStepNavigationResult {
  const totalSteps = STEP_SEQUENCE.length;
  const [currentStep, setCurrentStep] = useState(0);
  const [stepCompleted, setStepCompleted] = useState<boolean[]>(() =>
    Array(totalSteps).fill(false)
  );
  const [stepErrorSummary, setStepErrorSummary] = useState<string[] | null>(
    null
  );

  const activeStep = STEP_SEQUENCE[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const isReviewStep = currentStep === REVIEW_STEP_INDEX;

  // Hash deep-link support (#media, #trips, etc.) — once at mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, number> = Object.fromEntries(
      STEP_SEQUENCE.map((s, idx) => [s.id, idx])
    );
    const applyHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (raw && map[raw] !== undefined) gotoStep(map[raw], { force: true });
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearStepErrors = useCallback(() => setStepErrorSummary(null), []);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next !== prev) {
        emitCharterFormEvent({
          type: "step_view",
          step: STEP_SEQUENCE[next].id,
          index: next,
        });
      }
      return next;
    });
    // Swallow jsdom "Not implemented: window.scrollTo" errors in tests
    try {
      if (
        typeof window !== "undefined" &&
        typeof window.scrollTo === "function"
      ) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const gotoStep = useCallback(
    (index: number, opts?: { force?: boolean }) => {
      setCurrentStep((prev) => {
        if (!opts?.force && index === prev) return prev;
        const bounded = Math.min(Math.max(index, 0), totalSteps - 1);
        if (bounded !== prev) {
          emitCharterFormEvent({
            type: "step_view",
            step: STEP_SEQUENCE[bounded].id,
            index: bounded,
          });
        }
        return bounded;
      });
      try {
        if (
          typeof window !== "undefined" &&
          typeof window.scrollTo === "function"
        ) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch {
        /* ignore */
      }
    },
    [totalSteps]
  );

  const handleNext = useCallback(async () => {
    // Always log handleNext calls
    console.log("[navigation] handleNext called", {
      currentStep,
      isEditing,
      existingImagesCount,
      avatarUploading,
    });

    // Block navigation if avatar is uploading on basics step (step 0)
    if (currentStep === 0 && avatarUploading) {
      console.log("[navigation] blocking navigation - avatar is uploading");
      setStepErrorSummary(["Please wait for avatar upload to complete"]);
      return;
    }

    // Step schemas order must align with STEP_SEQUENCE
    const stepSchemas = [
      basicsStepSchema,
      experienceStepSchema,
      tripsStepSchema,
      descriptionStepSchema, // swapped order: description before media
      mediaPricingStepSchema,
      charterFormSchema, // full form for review/fallback
    ];
    const activeSchema = stepSchemas[currentStep] || charterFormSchema;
    const values = form.getValues();

    console.log("[navigation] validating with schema", {
      schemaIndex: currentStep,
      hasSchema: !!activeSchema,
      valueKeys: Object.keys(values || {}),
    });
    // Media step special handling: we now immediately upload media in create flow too.
    // Validation schema only sees form.photos (local, not yet persisted) but after upload
    // we move them into existingImages and clear photos -> causing false validation failures.
    // Treat existingImagesCount as satisfying the photo minimum in BOTH create & edit flows.
    const isMediaStep = STEP_SEQUENCE[currentStep].id === "media";
    const photosInForm = Array.isArray(values.photos)
      ? values.photos.length
      : 0;
    const effectivePhotoCount = existingImagesCount + photosInForm;
    const canBypassMedia = isMediaStep && effectivePhotoCount >= 3;
    const parseResult = activeSchema.safeParse(values);
    console.log("[navigation] validation result", {
      success: parseResult.success,
      errorCount: parseResult.success ? 0 : parseResult.error.issues.length,
      canBypassMedia,
    });

    if (!parseResult.success && !canBypassMedia) {
      const errs: string[] = [];
      for (const issue of parseResult.error.issues) {
        console.log("[navigation] validation error", {
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        });
        const p = issue.path.join(".");
        if (p) errs.push(p);
      }
      let friendly = Array.from(new Set(errs.map(friendlyFieldLabel)));
      // Provide richer, context-aware messages on media step
      if (isMediaStep) {
        const detailed: string[] = [];
        for (const issue of parseResult.error.issues) {
          const root = issue.path[0];
          if (root === "photos") {
            if (issue.code === "too_small") {
              detailed.push(
                `Add at least 3 photos (you currently have ${effectivePhotoCount}).`
              );
            } else if (issue.code === "too_big") {
              detailed.push(
                `Maximum 15 photos allowed (you have ${effectivePhotoCount}). Remove some before continuing.`
              );
            } else {
              detailed.push("One or more photos are invalid.");
            }
          } else if (root === "videos") {
            if (issue.code === "too_big") {
              const videosInForm = Array.isArray(values.videos)
                ? values.videos.length
                : 0;
              detailed.push(
                `Maximum 3 videos allowed (you selected ${videosInForm}). Remove extras before continuing.`
              );
            } else {
              detailed.push("One or more videos are invalid.");
            }
          }
        }
        if (detailed.length) friendly = detailed;
      }
      setStepErrorSummary(
        friendly.length
          ? friendly
          : ["Please correct the highlighted fields before continuing."]
      );
      emitCharterFormEvent({
        type: "validation_errors",
        step: STEP_SEQUENCE[currentStep].id,
        count: friendly.length || 1,
      });
      // Focus first invalid field
      const first = errs[0];
      if (first) {
        const el = document.querySelector(
          `[name='${first.replace(/\\./g, ".")}']`
        ) as HTMLElement | null;
        el?.focus?.();
      }
      try {
        if (
          typeof window !== "undefined" &&
          typeof window.scrollTo === "function"
        ) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch {
        /* ignore */
      }
      return;
    }
    setStepErrorSummary(null);
    const prevIndex = currentStep;
    const nextIndex = Math.min(prevIndex + 1, totalSteps - 1);
    if (nextIndex === prevIndex) return; // already at last
    if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
      console.log("[navigation] handleNext validated; preparing save", {
        prevIndex,
        nextIndex,
      });
    }
    // Persist BEFORE UI advance so user can see saving spinner; step index for snapshot is nextIndex
    setSnapshotCurrentStep(nextIndex);
    await saveServerDraftSnapshot();
    if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
      console.log("[navigation] save complete, advancing UI", { nextIndex });
    }
    // mark step complete
    setStepCompleted((prev) => {
      const n = [...prev];
      n[prevIndex] = true;
      return n;
    });
    emitCharterFormEvent({
      type: "step_complete",
      step: STEP_SEQUENCE[prevIndex].id,
      index: prevIndex,
    });
    emitCharterFormEvent({
      type: "step_view",
      step: STEP_SEQUENCE[nextIndex].id,
      index: nextIndex,
    });
    // advance react state AFTER save
    setCurrentStep(nextIndex);
    try {
      if (
        typeof window !== "undefined" &&
        typeof window.scrollTo === "function"
      ) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      /* ignore */
    }
  }, [
    currentStep,
    form,
    isEditing,
    existingImagesCount,
    saveServerDraftSnapshot,
    setSnapshotCurrentStep,
    totalSteps,
    avatarUploading,
  ]);

  return {
    currentStep,
    isLastStep,
    isReviewStep,
    activeStep,
    stepCompleted,
    stepErrorSummary,
    handleNext,
    handlePrev,
    gotoStep,
    clearStepErrors,
    setCurrentStep: (updater) => setCurrentStep((s) => updater(s)),
  };
}

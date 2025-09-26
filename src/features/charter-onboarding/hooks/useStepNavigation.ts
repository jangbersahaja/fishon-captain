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
    // Step schemas order must align with STEP_SEQUENCE
    const stepSchemas = [
      basicsStepSchema,
      experienceStepSchema,
      tripsStepSchema,
      mediaPricingStepSchema,
      charterFormSchema,
    ];
    const activeSchema = stepSchemas[currentStep] || charterFormSchema;
    const values = form.getValues();
    const canBypassMedia =
      STEP_SEQUENCE[currentStep].id === "media" &&
      isEditing &&
      existingImagesCount >= 3;
    const parseResult = activeSchema.safeParse(values);
    if (!parseResult.success && !canBypassMedia) {
      const errs: string[] = [];
      for (const issue of parseResult.error.issues) {
        const p = issue.path.join(".");
        if (p) errs.push(p);
      }
      const friendly = Array.from(new Set(errs.map(friendlyFieldLabel)));
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
    await saveServerDraftSnapshot();
    // Mark current as completed and advance
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
    totalSteps,
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

"use client";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import React, { createContext, useContext, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";

export interface CharterFormEnvironment {
  form: UseFormReturn<CharterFormValues>;
  isEditing: boolean;
  currentCharterId: string | null;
  serverDraftId: string | null;
  serverVersion: number | null;
  setServerVersion: (v: number | null) => void;
  lastSavedAt?: string | null;
  navigation?: {
    currentStep: number;
    isLastStep: boolean;
    isReviewStep: boolean;
    activeStep: { label: string };
    handleNext: () => void;
    handlePrev: () => void;
    gotoStep: (n: number) => void;
  };
  submission?: {
    submitState: { type: "success" | "error"; message: string } | null;
    setSubmitState?: (
      v: { type: "success" | "error"; message: string } | null
    ) => void;
    savingEdit: boolean;
    serverSaving: boolean;
    saveEditChanges: () => void | Promise<void>;
    triggerSubmit: () => void;
    finalizing?: boolean;
  };
  media?: {
    isMediaUploading: boolean;
    canSubmitMedia: boolean;
    existingImagesCount: number;
    existingVideosCount: number;
    avatarUploading: boolean;
  };
}

const CharterFormContext = createContext<CharterFormEnvironment | null>(null);

export function CharterFormProvider({
  value,
  children,
}: {
  value: CharterFormEnvironment;
  children: React.ReactNode;
}) {
  const memo = useMemo(() => value, [value]);
  return (
    <CharterFormContext.Provider value={memo}>
      {children}
    </CharterFormContext.Provider>
  );
}

export function useCharterForm() {
  const ctx = useContext(CharterFormContext);
  if (!ctx)
    throw new Error("useCharterForm must be used within CharterFormProvider");
  return ctx;
}

// Selector helper to reduce rerenders by picking a slice
export function useCharterFormSelectors<T>(
  selector: (env: CharterFormEnvironment) => T
): T {
  const env = useCharterForm();
  return selector(env);
}

// Convenience domain-specific hooks
export function useCharterNavigation() {
  return useCharterFormSelectors((s) => s.navigation!);
}
export function useCharterSubmissionState() {
  return useCharterFormSelectors((s) => s.submission!);
}
export function useCharterMediaState() {
  return useCharterFormSelectors((s) => s.media!);
}

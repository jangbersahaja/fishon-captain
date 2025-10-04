// Centralized charter onboarding error & success messaging utilities.
export const CharterMessages = {
  edit: {
    saving: "Saving…",
    saveSuccess: "Saved changes",
    saveFailed: "Could not save changes.",
    saveRetry: "Retry",
    formUnhydrated: "Loading charter details… please retry shortly.",
    notReady: "Charter not ready yet. Please try again in a moment.",
  },
  finalize: {
    submitting: "Submitting charter…",
    success: "Charter submitted",
    genericFail: "Submission failed. Please try again.",
    validationFail: "Please fix highlighted fields.",
    authRequired: "Please sign in before submitting.",
    networkError: "Failed to submit charter",
  },
};

export type CharterMessageKey = keyof typeof CharterMessages;

// Centralized toast id namespace to avoid collisions across modules.
export const CharterToastIds = {
  edit: "charter:edit", // reused for progress/success/error via replace
  finalize: {
    progress: "charter:finalize:progress",
    success: "charter:finalize:success",
    error: "charter:finalize:error",
  },
} as const;

export type CharterToastId =
  | typeof CharterToastIds.edit
  | (typeof CharterToastIds.finalize)[keyof typeof CharterToastIds.finalize];

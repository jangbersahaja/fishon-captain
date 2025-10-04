"use client";
/**
 * useCharterSubmission (Phase 5)
 * Extracts all submission & edit-save logic from FormSection.
 * Responsibilities:
 *  - Provide saveEditChanges for live charter editing
 *  - Provide onSubmit handler (finalize draft or route to edit save)
 *  - Provide handleFormSubmit (form element handler, with edit bypass)
 *  - Provide triggerSubmit (invoked by confirmation dialog)
 *  - Maintain submit state & saving flags
 */
import { useToasts } from "@/components/toast/ToastContext";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import {
  finalizeDraftSubmission,
  patchEditCharter,
} from "@features/charter-onboarding/submissionStrategies";
import {
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type FormEventHandler,
} from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import { CharterMessages } from "../errors";

export interface UseCharterSubmissionArgs {
  form: UseFormReturn<CharterFormValues>;
  isEditing: boolean;
  currentCharterId: string | null;
  /** Raw editCharterId from URL (fallback when currentCharterId not yet set by data loader). */
  fallbackEditCharterId?: string | null;
  serverDraftId: string | null;
  serverVersion: number | null; // used only for finalize headers
  saveServerDraftSnapshot: () => Promise<number | null>;
  existingImages: { name: string; url: string }[]; // for bypass logic & finalize merge
  existingVideos?: { name: string; url: string }[];
  defaultState: CharterFormValues;
  clearDraft: () => void;
  initializeDraftState: (
    values: CharterFormValues,
    draftId: string | null
  ) => void;
  setLastSavedAt: (iso: string | null) => void;
  router: { push: (href: string) => void };
  getUploadedMediaInfo?: (
    file: File,
    kind: "photo" | "video" | "avatar"
  ) => { name: string; url: string } | null;
}

export interface UseCharterSubmissionResult {
  submitState: { type: "success" | "error"; message: string } | null;
  savingEdit: boolean;
  finalizing: boolean;
  setSubmitState: React.Dispatch<
    React.SetStateAction<{ type: "success" | "error"; message: string } | null>
  >;
  /** Directly trigger a save of live charter edits (only meaningful when isEditing=true). */
  saveEditChanges: () => Promise<void>;
  onSubmit: (values: CharterFormValues) => Promise<void>;
  handleFormSubmit: FormEventHandler<HTMLFormElement>;
  triggerSubmit: () => void;
}

export function useCharterSubmission({
  form,
  isEditing,
  currentCharterId,
  fallbackEditCharterId = null,
  serverDraftId,
  serverVersion,
  saveServerDraftSnapshot,
  existingImages,
  existingVideos = [],
  defaultState,
  clearDraft,
  initializeDraftState,
  setLastSavedAt,
  router,
  getUploadedMediaInfo,
}: UseCharterSubmissionArgs): UseCharterSubmissionResult {
  const [submitState, setSubmitState] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  // Ref guard to block rapid double finalization clicks before state updates propagate.
  const finalizingRef = useRef(false);
  const {
    push: pushToast,
    dismiss: dismissToast,
    pushEphemeralError,
  } = useToasts();

  // Live charter edit PATCH
  const saveEditChanges: () => Promise<void> = useCallback(async () => {
    if (!isEditing) return; // not applicable
    // Prefer fully confirmed id but fall back to raw URL param if hydration succeeded elsewhere (fallback path) but hook didn't set currentCharterId.
    const effectiveId = currentCharterId || fallbackEditCharterId;
    if (!effectiveId) {
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.warn(
          "[submission] saveEditChanges aborted: no charter id available"
        );
      }
      pushEphemeralError(CharterMessages.edit.notReady, { id: "charter-edit" });
      return;
    }
    // Guard against overwriting live charter with mostly default values if hydration hasn't populated key fields yet.
    const vals = form.getValues();
    const sentinelPopulated = Boolean(
      vals.charterName || vals.city || vals.description
    );
    if (!currentCharterId && effectiveId && !sentinelPopulated) {
      // We only have fallback id but core fields look unhydrated -> still race, show same toast.
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.warn(
          "[submission] fallback id present but form appears unhydrated; blocking save to avoid clobber"
        );
      }
      pushEphemeralError(CharterMessages.edit.formUnhydrated, {
        id: "charter-edit",
      });
      return;
    }
    setSavingEdit(true);
    try {
      pushToast({
        id: "charter-edit",
        type: "progress",
        message: CharterMessages.edit.saving,
        replace: true,
      });
      const { ok } = await patchEditCharter({
        charterId: effectiveId,
        values: vals,
        setLastSavedAt: (iso) => setLastSavedAt(iso),
      });
      if (ok) {
        pushToast({
          id: "charter-edit",
          type: "success",
          message: CharterMessages.edit.saveSuccess,
          replace: true,
          autoDismiss: 2200,
        });
        // Maintain legacy behavior for tests & UI surfaces expecting submitState to reflect edit success
        setSubmitState({ type: "success", message: "Saved changes" });
      } else {
        pushToast({
          id: "charter-edit",
          type: "error",
          message: CharterMessages.edit.saveFailed,
          replace: true,
          actions: [
            {
              label: CharterMessages.edit.saveRetry,
              onClick: () => void saveEditChanges(),
            },
          ],
          persist: false,
        });
        setSubmitState({
          type: "error",
          message: CharterMessages.edit.saveFailed,
        });
      }
    } catch {
      pushToast({
        id: "charter-edit",
        type: "error",
        message: CharterMessages.edit.saveFailed,
        replace: true,
        actions: [
          {
            label: CharterMessages.edit.saveRetry,
            onClick: () => void saveEditChanges(),
          },
        ],
        persist: false,
      });
      setSubmitState({
        type: "error",
        message: CharterMessages.edit.saveFailed,
      });
    } finally {
      setSavingEdit(false);
    }
  }, [
    isEditing,
    currentCharterId,
    fallbackEditCharterId,
    form,
    setLastSavedAt,
    pushToast,
    pushEphemeralError,
  ]);

  // Finalize or edit save
  const onSubmit = useCallback(
    async (values: CharterFormValues) => {
      if (finalizing || finalizingRef.current) return; // guard duplicate
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.log("[submission] onSubmit invoked", {
          isEditing,
          haveDraft: !!serverDraftId,
          valuesKeys: Object.keys(values || {}),
        });
      }
      setSubmitState(null);
      if (isEditing) {
        await saveEditChanges();
        return;
      }
      try {
        setFinalizing(true);
        finalizingRef.current = true;
        pushToast({
          id: "charter-finalize",
          type: "progress",
          message: CharterMessages.finalize.submitting,
          replace: true,
        });
        const result = await finalizeDraftSubmission({
          values,
          isEditing,
          serverDraftId: serverDraftId!,
          currentCharterId,
          serverVersion,
          saveServerDraftSnapshot,
          setSubmitState: (s) => setSubmitState(s),
          defaultState,
          formReset: (v) => form.reset(v),
          clearDraft,
          initializeDraftState,
          setLastSavedAt: (iso) => setLastSavedAt(iso),
          router,
          getUploadedMediaInfo,
          existingImages,
          existingVideos,
        });
        // Explicitly remove progress toast to ensure animation resets for terminal state.
        dismissToast("charter-finalize");
        if (result.ok) {
          pushToast({
            id: "charter-finalize-success",
            type: "success",
            message: CharterMessages.finalize.success,
            autoDismiss: 3000,
          });
        } else {
          pushEphemeralError(CharterMessages.finalize.genericFail, {
            id: "charter-finalize-error",
            autoDismiss: 5000,
          });
        }
      } catch (e) {
        setSubmitState({
          type: "error",
          message: e instanceof Error ? e.message : "Something went wrong",
        });
        // Remove progress (if still present) then show error.
        dismissToast("charter-finalize");
        pushEphemeralError(
          e instanceof Error
            ? e.message
            : CharterMessages.finalize.networkError,
          { id: "charter-finalize-error" }
        );
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.error("[submission] finalize error", e);
        }
      } finally {
        setFinalizing(false);
        finalizingRef.current = false;
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.log("[submission] finalize end");
        }
      }
    },
    [
      finalizing,
      isEditing,
      serverDraftId,
      saveEditChanges,
      pushToast,
      dismissToast,
      currentCharterId,
      serverVersion,
      saveServerDraftSnapshot,
      defaultState,
      form,
      clearDraft,
      initializeDraftState,
      setLastSavedAt,
      router,
      getUploadedMediaInfo,
      existingImages,
      existingVideos,
      finalizingRef,
      pushEphemeralError,
    ]
  );

  // Form element submit handler (edit bypass for photos requirement)
  const handleFormSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const photosInForm = Array.isArray(form.getValues().photos)
        ? (form.getValues().photos as unknown[]).length
        : 0;
      const haveSufficientExisting = existingImages.length >= 3;
      // Bypass when editing OR when create flow already uploaded photos moved to existingImages
      if ((isEditing || haveSufficientExisting) && photosInForm < 3) {
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.log("[submission] bypass form.handleSubmit photo min", {
            isEditing,
            existingImages: existingImages.length,
            photosInForm,
          });
        }
        void onSubmit(form.getValues());
        return;
      }
      return form.handleSubmit(onSubmit as SubmitHandler<CharterFormValues>)(
        e as unknown as React.BaseSyntheticEvent<object, Event>
      ) as unknown as void;
    },
    [form, onSubmit, isEditing, existingImages.length]
  );

  const triggerSubmit = useCallback(() => {
    if (finalizing) {
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.log("[submission] triggerSubmit ignored (already finalizing)");
      }
      return;
    }
    if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
      console.log("[submission] triggerSubmit", {
        isEditing,
        existingImages: existingImages.length,
        draftId: serverDraftId,
      });
    }
    const photosInForm = Array.isArray(form.getValues().photos)
      ? (form.getValues().photos as unknown[]).length
      : 0;
    const haveSufficientExisting = existingImages.length >= 3;
    if ((isEditing || haveSufficientExisting) && photosInForm < 3) {
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.log("[submission] triggerSubmit bypass", {
          isEditing,
          existingImages: existingImages.length,
          photosInForm,
        });
      }
      void onSubmit(form.getValues());
      return;
    }
    return form.handleSubmit(
      onSubmit as SubmitHandler<CharterFormValues>
    )() as unknown as void;
  }, [
    form,
    onSubmit,
    isEditing,
    existingImages.length,
    serverDraftId,
    finalizing,
  ]);

  return {
    submitState,
    savingEdit,
    finalizing,
    setSubmitState,
    saveEditChanges,
    onSubmit,
    handleFormSubmit,
    triggerSubmit,
  };
}

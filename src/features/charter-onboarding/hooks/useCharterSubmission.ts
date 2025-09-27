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
  useState,
  type FormEvent,
  type FormEventHandler,
} from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";

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
  const { push: pushToast } = useToasts();

  // Live charter edit PATCH
  const saveEditChanges = useCallback(async () => {
    if (!isEditing) return; // not applicable
    // Prefer fully confirmed id but fall back to raw URL param if hydration succeeded elsewhere (fallback path) but hook didn't set currentCharterId.
    const effectiveId = currentCharterId || fallbackEditCharterId;
    if (!effectiveId) {
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.warn("[submission] saveEditChanges aborted: no charter id available");
      }
      pushToast({
        id: "charter-edit",
        type: "error",
        message: "Charter not ready yet. Please try again in a moment.",
        replace: true,
      });
      return;
    }
    // Guard against overwriting live charter with mostly default values if hydration hasn't populated key fields yet.
    const vals = form.getValues();
    const sentinelPopulated = Boolean(vals.charterName || vals.city || vals.description);
    if (!currentCharterId && effectiveId && !sentinelPopulated) {
      // We only have fallback id but core fields look unhydrated -> still race, show same toast.
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.warn("[submission] fallback id present but form appears unhydrated; blocking save to avoid clobber");
      }
      pushToast({
        id: "charter-edit",
        type: "error",
        message: "Loading charter details… please retry shortly.",
        replace: true,
      });
      return;
    }
    setSavingEdit(true);
    try {
      pushToast({
        id: "charter-edit",
        type: "progress",
        message: "Saving…",
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
          message: "Saved changes",
          replace: true,
          autoDismiss: 2200,
        });
      } else {
        pushToast({
          id: "charter-edit",
          type: "error",
          message: "Save failed",
          replace: true,
          actions: [
            {
              label: "Retry",
              onClick: () => {
                void saveEditChanges();
              },
            },
          ],
        });
      }
    } catch {
      pushToast({
        id: "charter-edit",
        type: "error",
        message: "Save error",
        replace: true,
        actions: [
          {
            label: "Retry",
            onClick: () => {
              void saveEditChanges();
            },
          },
        ],
      });
    } finally {
      setSavingEdit(false);
    }
  }, [isEditing, currentCharterId, fallbackEditCharterId, form, setLastSavedAt, pushToast]);

  // Finalize or edit save
  const onSubmit = useCallback(
    async (values: CharterFormValues) => {
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.log("[submission] onSubmit invoked", {
          isEditing,
          haveDraft: !!serverDraftId,
          valuesKeys: Object.keys(values || {}),
        });
      }
      setSubmitState(null);
      if (isEditing) {
        await saveEditChanges(); // toast handles feedback
        return;
      }
      try {
        setFinalizing(true);
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.log("[submission] starting finalize", {
            draftId: serverDraftId,
            haveServerVersion: serverVersion !== null,
          });
        }
        await finalizeDraftSubmission({
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
        // Show toast feedback (success)
        pushToast({
          id: "charter-finalize",
          type: "success",
          message: "Charter submitted",
          replace: true,
          autoDismiss: 3000,
        });
      } catch (e) {
        setSubmitState({
          type: "error",
          message: e instanceof Error ? e.message : "Something went wrong",
        });
        pushToast({
          id: "charter-finalize",
          type: "error",
          message: e instanceof Error ? e.message : "Failed to submit charter",
          replace: true,
        });
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.error("[submission] finalize error", e);
        }
      } finally {
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.log("[submission] finalize end");
        }
        setFinalizing(false);
      }
    },
    [
      form,
      isEditing,
      currentCharterId,
      serverDraftId,
      serverVersion,
      saveServerDraftSnapshot,
      defaultState,
      clearDraft,
      initializeDraftState,
      setLastSavedAt,
      router,
      saveEditChanges,
      getUploadedMediaInfo,
      existingImages,
      existingVideos,
      pushToast,
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
  }, [form, onSubmit, isEditing, existingImages.length, serverDraftId]);

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

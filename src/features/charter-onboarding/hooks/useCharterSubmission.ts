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
  serverDraftId: string | null;
  serverVersion: number | null; // used only for finalize headers
  saveServerDraftSnapshot: () => Promise<number | null>;
  existingImages: { name: string; url: string }[]; // for bypass logic & finalize merge
  defaultState: CharterFormValues;
  clearDraft: () => void;
  initializeDraftState: (
    values: CharterFormValues,
    draftId: string | null
  ) => void;
  setLastSavedAt: (iso: string | null) => void;
  router: { push: (href: string) => void };
}

export interface UseCharterSubmissionResult {
  submitState: { type: "success" | "error"; message: string } | null;
  savingEdit: boolean;
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
  serverDraftId,
  serverVersion,
  saveServerDraftSnapshot,
  existingImages,
  defaultState,
  clearDraft,
  initializeDraftState,
  setLastSavedAt,
  router,
}: UseCharterSubmissionArgs): UseCharterSubmissionResult {
  const [submitState, setSubmitState] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Live charter edit PATCH
  const saveEditChanges = useCallback(async () => {
    if (!isEditing || !currentCharterId) return;
    setSavingEdit(true);
    try {
      const { ok } = await patchEditCharter({
        charterId: currentCharterId,
        values: form.getValues(),
        setLastSavedAt: (iso) => setLastSavedAt(iso),
      });
      setSubmitState({
        type: ok ? "success" : "error",
        message: ok ? "Saved changes" : "Save failed",
      });
    } catch {
      setSubmitState({ type: "error", message: "Save error" });
    } finally {
      setSavingEdit(false);
    }
  }, [isEditing, currentCharterId, form, setLastSavedAt]);

  // Finalize or edit save
  const onSubmit = useCallback(
    async (values: CharterFormValues) => {
      setSubmitState(null);
      if (isEditing) {
        await saveEditChanges();
        return;
      }
      try {
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
        });
      } catch (e) {
        setSubmitState({
          type: "error",
          message: e instanceof Error ? e.message : "Something went wrong",
        });
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
    ]
  );

  // Form element submit handler (edit bypass for photos requirement)
  const handleFormSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isEditing && existingImages.length >= 3) {
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
    if (isEditing && existingImages.length >= 3) {
      void onSubmit(form.getValues());
      return;
    }
    return form.handleSubmit(
      onSubmit as SubmitHandler<CharterFormValues>
    )() as unknown as void;
  }, [form, onSubmit, isEditing, existingImages.length]);

  return {
    submitState,
    savingEdit,
    setSubmitState,
    saveEditChanges,
    onSubmit,
    handleFormSubmit,
    triggerSubmit,
  };
}

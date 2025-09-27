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
      } catch (e) {
        setSubmitState({
          type: "error",
          message: e instanceof Error ? e.message : "Something went wrong",
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

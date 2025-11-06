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
  useRef,
  useState,
  type FormEvent,
  type FormEventHandler,
} from "react";
import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { CharterMessages } from "../errors";

export interface UseCharterSubmissionArgs {
  form: UseFormReturn<CharterFormValues>;
  isEditing: boolean;
  currentCharterId: string | null;
  /** Raw editCharterId from URL (fallback when currentCharterId not yet set by data loader). */
  fallbackEditCharterId?: string | null;
  adminUserId?: string | null;
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
  /** Coordinated form reset to prevent race conditions */
  coordinatedReset: (values: CharterFormValues, source: string) => void;
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
  adminUserId = null,
  serverDraftId,
  serverVersion,
  saveServerDraftSnapshot,
  existingImages,
  existingVideos = [],
  defaultState,
  clearDraft,
  coordinatedReset,
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
      toast.error(CharterMessages.edit.notReady, { id: "charter-edit" });
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
      toast.error(CharterMessages.edit.formUnhydrated, {
        id: "charter-edit",
      });
      return;
    }
    setSavingEdit(true);
    try {
      toast.loading(CharterMessages.edit.saving, {
        id: "charter-edit",
      });
      const { ok } = await patchEditCharter({
        charterId: effectiveId,
        values: vals,
        adminUserId,
        setLastSavedAt: (iso) => setLastSavedAt(iso),
      });
      if (ok) {
        toast.success(CharterMessages.edit.saveSuccess, {
          id: "charter-edit",
          duration: 2200,
        });
        // Maintain legacy behavior for tests & UI surfaces expecting submitState to reflect edit success
        setSubmitState({ type: "success", message: "Saved changes" });
      } else {
        toast.error(CharterMessages.edit.saveFailed, {
          id: "charter-edit",
          action: {
            label: CharterMessages.edit.saveRetry,
            onClick: () => void saveEditChanges(),
          },
        });
        setSubmitState({
          type: "error",
          message: CharterMessages.edit.saveFailed,
        });
      }
    } catch {
      toast.error(CharterMessages.edit.saveFailed, {
        id: "charter-edit",
        action: {
          label: CharterMessages.edit.saveRetry,
          onClick: () => void saveEditChanges(),
        },
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
    adminUserId,
    form,
    setLastSavedAt,
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
        toast.loading(CharterMessages.finalize.submitting, {
          id: "charter-finalize",
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
          formReset: (v) => coordinatedReset(v, "finalize-draft-submission"),
          clearDraft,
          initializeDraftState,
          setLastSavedAt: (iso) => setLastSavedAt(iso),
          router,
          getUploadedMediaInfo,
          existingImages,
          existingVideos,
        });
        // Explicitly remove progress toast to ensure animation resets for terminal state.
        toast.dismiss("charter-finalize");
        if (result.ok) {
          toast.success(CharterMessages.finalize.success, {
            id: "charter-finalize-success",
            duration: 3000,
          });
        } else {
          toast.error(CharterMessages.finalize.genericFail, {
            id: "charter-finalize-error",
            duration: 5000,
          });
        }
      } catch (e) {
        setSubmitState({
          type: "error",
          message: e instanceof Error ? e.message : "Something went wrong",
        });
        // Remove progress (if still present) then show error.
        toast.dismiss("charter-finalize");
        toast.error(
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
      currentCharterId,
      serverVersion,
      saveServerDraftSnapshot,
      defaultState,
      clearDraft,
      initializeDraftState,
      setLastSavedAt,
      router,
      getUploadedMediaInfo,
      coordinatedReset,
      existingImages,
      existingVideos,
      finalizingRef,
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

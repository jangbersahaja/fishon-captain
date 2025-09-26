"use client";
import { sanitizeForDraft } from "@features/charter-onboarding/charterForm.draft";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { useCallback, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";

export interface UseDraftSnapshotArgs {
  form: UseFormReturn<CharterFormValues>;
  isEditing: boolean;
  serverDraftId: string | null;
  serverVersion: number | null;
  /** initial step (optional) */
  initialStep?: number;
  setServerVersion: (v: number | null) => void;
  setLastSavedAt: (iso: string | null) => void;
  setServerSaving: (b: boolean) => void;
  /** optional debounce ms for PATCH throttling (future enhancement) */
  debounceMs?: number;
}

export function useDraftSnapshot({
  form,
  isEditing,
  serverDraftId,
  serverVersion,
  initialStep = 0,
  setServerVersion,
  setLastSavedAt,
  setServerSaving,
}: UseDraftSnapshotArgs) {
  const saveServerDraftSnapshotRef = useRef<() => Promise<number | null>>(
    async () => null
  );
  const currentStepRef = useRef<number>(initialStep);
  const lastPayloadRef = useRef<string | null>(null);

  const setCurrentStep = (s: number) => {
    currentStepRef.current = s;
  };

  const saveServerDraftSnapshot = useCallback(async (): Promise<
    number | null
  > => {
    if (isEditing) return null;
    if (!serverDraftId || serverVersion === null) return null;
    try {
      setServerSaving(true);
      const sanitized = sanitizeForDraft(form.getValues());
      // Prepare stable payload for change detection
      const payloadObj = {
        dataPartial: sanitized,
        clientVersion: serverVersion,
        currentStep: currentStepRef.current,
      };
      const payloadStr = JSON.stringify(payloadObj);

      // Skip network call if nothing changed since last successful snapshot
      if (lastPayloadRef.current === payloadStr) {
        return serverVersion; // return current version (unchanged)
      }
      const res = await fetch(`/api/charter-drafts/${serverDraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payloadStr,
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.draft) {
        const newVersion: number = json.draft.version;
        setServerVersion(newVersion);
        setLastSavedAt(new Date().toISOString());
        lastPayloadRef.current = payloadStr;
        return newVersion;
      }
      return null;
    } catch {
      return null;
    } finally {
      setServerSaving(false);
    }
  }, [
    isEditing,
    serverDraftId,
    serverVersion,
    form,
    currentStepRef,
    setServerVersion,
    setLastSavedAt,
    setServerSaving,
  ]);

  saveServerDraftSnapshotRef.current = saveServerDraftSnapshot;

  return {
    saveServerDraftSnapshot,
    saveServerDraftSnapshotRef,
    setCurrentStep,
  };
}

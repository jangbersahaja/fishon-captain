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
  currentStep: number;
  setServerVersion: (v: number | null) => void;
  setLastSavedAt: (iso: string | null) => void;
  setServerSaving: (b: boolean) => void;
}

export function useDraftSnapshot({
  form,
  isEditing,
  serverDraftId,
  serverVersion,
  currentStep,
  setServerVersion,
  setLastSavedAt,
  setServerSaving,
}: UseDraftSnapshotArgs) {
  const saveServerDraftSnapshotRef = useRef<() => Promise<number | null>>(
    async () => null
  );

  const saveServerDraftSnapshot = useCallback(async (): Promise<
    number | null
  > => {
    if (isEditing) return null;
    if (!serverDraftId || serverVersion === null) return null;
    try {
      setServerSaving(true);
      const sanitized = sanitizeForDraft(form.getValues());
      const res = await fetch(`/api/charter-drafts/${serverDraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataPartial: sanitized,
          clientVersion: serverVersion,
          currentStep,
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.draft) {
        const newVersion: number = json.draft.version;
        setServerVersion(newVersion);
        setLastSavedAt(new Date().toISOString());
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
    currentStep,
    setServerVersion,
    setLastSavedAt,
    setServerSaving,
  ]);

  saveServerDraftSnapshotRef.current = saveServerDraftSnapshot;

  return { saveServerDraftSnapshot, saveServerDraftSnapshotRef };
}

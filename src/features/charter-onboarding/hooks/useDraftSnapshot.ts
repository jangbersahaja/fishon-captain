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

  // Build minimal diff object vs previous full snapshot
  const buildPartialDiff = useCallback(function buildPartialDiff(
    prev: unknown,
    next: unknown
  ): unknown {
    if (prev === next) return undefined;
    if (
      typeof prev !== "object" ||
      prev === null ||
      typeof next !== "object" ||
      next === null
    ) {
      return next;
    }
    if (Array.isArray(prev) || Array.isArray(next)) {
      if (JSON.stringify(prev) === JSON.stringify(next)) return undefined;
      return next;
    }
    const pRec = prev as Record<string, unknown>;
    const nRec = next as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let changed = false;
    for (const key of Object.keys(nRec)) {
      const diffChild = buildPartialDiff(pRec[key], nRec[key]);
      if (diffChild !== undefined) {
        out[key] = diffChild;
        changed = true;
      }
    }
    return changed ? out : undefined;
  },
  []);

  const saveServerDraftSnapshot = useCallback(async (): Promise<
    number | null
  > => {
    if (isEditing) return null;
    if (!serverDraftId || serverVersion === null) return null;
    try {
      setServerSaving(true);
      const sanitized = sanitizeForDraft(form.getValues());
      let previousFull: CharterFormValues | null = null;
      if (lastPayloadRef.current) {
        try {
          const parsed = JSON.parse(lastPayloadRef.current) as {
            __full?: CharterFormValues;
          };
          previousFull = parsed.__full || null;
        } catch {
          previousFull = null;
        }
      }
      const diff = previousFull
        ? buildPartialDiff(previousFull, sanitized)
        : sanitized;
      if (diff === undefined) {
        return serverVersion;
      }
      const payloadObj = {
        dataPartial: diff,
        clientVersion: serverVersion,
        currentStep: currentStepRef.current,
      };
      const res = await fetch(`/api/charter-drafts/${serverDraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadObj),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.draft) {
        const newVersion: number = json.draft.version;
        setServerVersion(newVersion);
        setLastSavedAt(new Date().toISOString());
        lastPayloadRef.current = JSON.stringify({
          ...payloadObj,
          __full: sanitized,
        });
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
    buildPartialDiff,
  ]);

  saveServerDraftSnapshotRef.current = saveServerDraftSnapshot;

  return {
    saveServerDraftSnapshot,
    saveServerDraftSnapshotRef,
    setCurrentStep,
  };
}

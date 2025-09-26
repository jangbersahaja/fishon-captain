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

  // Simple queue to avoid overlapping PATCHes (which cause version conflicts)
  const inFlightRef = useRef<Promise<number | null> | null>(null);

  const saveServerDraftSnapshot = useCallback(async (): Promise<number | null> => {
    if (isEditing) return null;
    if (!serverDraftId || serverVersion === null) return null;

    // If a save is already in flight, chain after it
    if (inFlightRef.current) {
      return (inFlightRef.current = inFlightRef.current.then(() =>
        saveServerDraftSnapshot()
      ));
    }

    const run = async (): Promise<number | null> => {
      setServerSaving(true);
      try {
        const sanitized = sanitizeForDraft(form.getValues());
        // Rehydrate previous full snapshot (last successful)
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
        const buildAndMaybePatch = async (
          baseFull: CharterFormValues | null,
          clientVer: number,
          attempt: number
        ): Promise<number | null> => {
          const diff = baseFull ? buildPartialDiff(baseFull, sanitized) : sanitized;
            if (diff === undefined) {
              return clientVer; // nothing to do
            }
            const payloadObj = {
              dataPartial: diff,
              clientVersion: clientVer,
              currentStep: currentStepRef.current,
            };
            const res = await fetch(`/api/charter-drafts/${serverDraftId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payloadObj),
            });
            if (res.status === 409) {
              // Version conflict: fetch server, merge, retry once
              if (attempt > 0) return null; // already retried
              interface ConflictResponse { server?: { version?: number; data?: CharterFormValues }; }
              let conflictJson: ConflictResponse | null = null;
              try {
                conflictJson = await res.json();
              } catch {
                return null;
              }
              if (conflictJson?.server?.version) {
                const serverDraft = conflictJson.server!;
                const serverVer: number = serverDraft.version;
                // Update version state so future saves align
                setServerVersion(serverVer);
                setLastSavedAt(new Date().toISOString());
                // Update previous snapshot reference with server full data
                if (serverDraft.data) {
                  lastPayloadRef.current = JSON.stringify({
                    __full: serverDraft.data,
                  });
                }
                return buildAndMaybePatch(
                  serverDraft.data as CharterFormValues,
                  serverVer,
                  attempt + 1
                );
              }
              return null;
            }
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
        };

        return await buildAndMaybePatch(previousFull, serverVersion, 0);
      } catch {
        return null;
      } finally {
        setServerSaving(false);
      }
    };

    const p = run();
    inFlightRef.current = p.finally(() => {
      if (inFlightRef.current === p) inFlightRef.current = null;
    });
    return inFlightRef.current;
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

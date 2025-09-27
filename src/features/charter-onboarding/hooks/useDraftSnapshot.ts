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
  // Keep stringified sanitized snapshot to detect unchanged payloads
  const lastPayloadRef = useRef<string | null>(null);
  const lastSavedStepRef = useRef<number>(initialStep);

  const setCurrentStep = (s: number) => {
    const oldStep = currentStepRef.current;
    currentStepRef.current = s;

    // Always log setCurrentStep calls regardless of debug flag
    console.log("[draftSnapshot] setCurrentStep", s, {
      debugFlag: process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG,
      serverDraftId,
      isEditing,
      oldStep,
    });

    if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
      console.log("[draftSnapshot] debug mode ON");
    }

    // If step changed and no save is in progress, immediately save the new step
    if (oldStep !== s && !inFlightRef.current) {
      console.log(
        "[draftSnapshot] step changed with no in-flight save, triggering immediate save",
        {
          oldStep,
          newStep: s,
          hasServerDraftId: !!serverDraftId,
          isEditing,
        }
      );
      // Schedule immediate save to persist step change
      Promise.resolve().then(() => saveServerDraftSnapshot());
    } else if (oldStep !== s && inFlightRef.current) {
      console.log(
        "[draftSnapshot] step changed but save is in-flight, will chain follow-up save",
        {
          oldStep,
          newStep: s,
        }
      );
      // Chain a follow-up save after the current one completes to ensure step is persisted
      const currentPromise = inFlightRef.current;
      currentPromise
        .then(() => {
          console.log(
            "[draftSnapshot] in-flight save completed, executing follow-up save for step change"
          );
          // Wait a small delay to reduce version conflicts and ensure inFlightRef is cleared
          return new Promise((resolve) => setTimeout(resolve, 100)).then(() => {
            console.log(
              "[draftSnapshot] follow-up save: inFlightRef cleared?",
              !inFlightRef.current
            );
            // Only save if step is still different from last saved step
            if (currentStepRef.current !== lastSavedStepRef.current) {
              console.log("[draftSnapshot] step still needs saving", {
                current: currentStepRef.current,
                lastSaved: lastSavedStepRef.current,
              });
              return saveServerDraftSnapshot();
            } else {
              console.log(
                "[draftSnapshot] step already saved, skipping follow-up save"
              );
              return null;
            }
          });
        })
        .catch((error) => {
          console.error(
            "[draftSnapshot] in-flight save failed, still executing follow-up save:",
            error
          );
          // Wait a small delay to reduce version conflicts and ensure inFlightRef is cleared
          return new Promise((resolve) => setTimeout(resolve, 100)).then(() => {
            console.log(
              "[draftSnapshot] follow-up save after error: inFlightRef cleared?",
              !inFlightRef.current
            );
            // Only save if step is still different from last saved step
            if (currentStepRef.current !== lastSavedStepRef.current) {
              console.log(
                "[draftSnapshot] step still needs saving after error",
                {
                  current: currentStepRef.current,
                  lastSaved: lastSavedStepRef.current,
                }
              );
              return saveServerDraftSnapshot();
            } else {
              console.log(
                "[draftSnapshot] step already saved, skipping follow-up save after error"
              );
              return null;
            }
          });
        });
    }
  };

  // Simple queue to avoid overlapping PATCHes (which cause version conflicts)
  const inFlightRef = useRef<Promise<number | null> | null>(null);

  const saveServerDraftSnapshot = useCallback(async (): Promise<
    number | null
  > => {
    // Always log save attempts regardless of debug flag
    console.log("[draftSnapshot] saveServerDraftSnapshot called", {
      isEditing,
      serverDraftId: !!serverDraftId,
      serverVersion,
      currentStep: currentStepRef.current,
    });

    if (isEditing) {
      console.log("[draftSnapshot] skip: editing mode");
      return null;
    }
    if (!serverDraftId) {
      console.log("[draftSnapshot] skip: no serverDraftId yet", {
        serverDraftId,
      });
      return null;
    }
    const effectiveVersion = serverVersion ?? 0; // 0 will intentionally provoke a conflict if server is at v1+

    // If a save is already in flight, chain after it
    if (inFlightRef.current) {
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.log("[draftSnapshot] reuse in-flight promise", {
          step: currentStepRef.current,
          serverVersion,
        });
      }
      return inFlightRef.current;
    }

    const run = async (): Promise<number | null> => {
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.log("[draftSnapshot] begin save", {
          serverDraftId,
          serverVersion,
          step: currentStepRef.current,
        });
      }
      setServerSaving(true);
      try {
        const sanitized = sanitizeForDraft(form.getValues());
        // Basic diff skip: if sanitized + currentStep unchanged from last successful save, skip network
        try {
          const currentSignature = JSON.stringify({
            data: sanitized,
            step: currentStepRef.current,
          });
          if (lastPayloadRef.current && lastPayloadRef.current === currentSignature) {
            console.log("[draftSnapshot] skip: no changes since last save", {
              step: currentStepRef.current,
            });
            return serverVersion ?? null; // Return existing version
          }
        } catch {
          // ignore diff errors; proceed with save
        }
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
          _baseFull: CharterFormValues | null,
          clientVer: number,
          attempt: number
        ): Promise<number | null> => {
          // DEBUG MODE: Always send full sanitized snapshot (no diff) to guarantee persistence of currentStep.
          const stepBeingSaved = currentStepRef.current; // Capture step at time of PATCH
          const payloadObj = {
            dataPartial: sanitized as unknown as Record<string, unknown>,
            clientVersion: clientVer,
            currentStep: stepBeingSaved,
          } as const;
          if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
            console.log("[draftSnapshot] prepared payload", {
              clientVersion: clientVer,
              step: stepBeingSaved,
              keys: Object.keys(sanitized || {}),
            });
          }
          const res = await fetch(`/api/charter-drafts/${serverDraftId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloadObj),
          });
          // Always log PATCH requests with currentStep regardless of debug flag to troubleshoot step persistence
          console.log("[draftSnapshot] PATCH REQUEST", {
            method: "PATCH",
            url: `/api/charter-drafts/${serverDraftId}`,
            currentStep: payloadObj.currentStep,
            clientVersion: payloadObj.clientVersion,
            status: res.status,
          });
          if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
            console.log("[draftSnapshot] PATCH", {
              status: res.status,
              payloadObj,
            });
          }
          if (res.status === 409) {
            // Version conflict: fetch server, merge, retry once
            if (attempt > 0) return null; // already retried
            interface ConflictResponse {
              server?: { version?: number; data?: CharterFormValues };
            }
            let conflictJson: ConflictResponse | null = null;
            try {
              conflictJson = await res.json();
            } catch {
              return null;
            }
            if (conflictJson?.server?.version) {
              const serverDraft = conflictJson.server!;
              const serverVer =
                typeof serverDraft.version === "number"
                  ? serverDraft.version
                  : clientVer;
              console.log(
                "[draftSnapshot] version conflict, retrying with server version",
                {
                  clientVer,
                  serverVer,
                  attempt: attempt + 1,
                }
              );
              // Update version state so future saves align (async)
              setServerVersion(serverVer);
              setLastSavedAt(new Date().toISOString());
              // Update previous snapshot reference with server full data
              if (serverDraft.data) {
                lastPayloadRef.current = JSON.stringify({
                  __full: serverDraft.data,
                });
              }
              // Use serverVer directly for retry, don't wait for state update
              return buildAndMaybePatch(null, serverVer, attempt + 1);
            }
            return null;
          }
          if (!res.ok) return null;
          const json = await res.json();
          if (json?.draft) {
            const newVersion: number = json.draft.version;
            if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
              console.log("[draftSnapshot] success", { newVersion });
            }
            // Record step actually sent in this payload as the last saved step
            lastSavedStepRef.current = stepBeingSaved;
            setServerVersion(newVersion);
            setLastSavedAt(new Date().toISOString());
            try {
              lastPayloadRef.current = JSON.stringify({
                data: sanitized,
                step: stepBeingSaved,
              });
            } catch {
              lastPayloadRef.current = null;
            }
            return newVersion;
          }
          return null;
        };

        return await buildAndMaybePatch(previousFull, effectiveVersion, 0);
      } catch {
        return null;
      } finally {
        if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
          console.log("[draftSnapshot] end save");
        }
        setServerSaving(false);
      }
    };

    const p = run();
    const pWithCleanup = p.finally(() => {
      // Clear the ref when this specific promise completes
      if (inFlightRef.current === pWithCleanup) {
        console.log(
          "[draftSnapshot] clearing inFlightRef after promise completion"
        );
        inFlightRef.current = null;
      }
    });
    inFlightRef.current = pWithCleanup;
    return pWithCleanup;
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

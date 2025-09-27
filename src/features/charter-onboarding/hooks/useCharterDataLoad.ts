"use client";
import { createDefaultCharterFormValues } from "@features/charter-onboarding/charterForm.defaults";
import {
  hydrateDraftValues,
  type DraftValues,
} from "@features/charter-onboarding/charterForm.draft";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { useEffect, useRef, useState } from "react";

export interface UseCharterDataLoadArgs {
  editCharterId: string | null;
  reset: (values: CharterFormValues, options?: { keepDirty?: boolean }) => void;
  setLastSavedAt: (iso: string | null) => void;
  initializeDraftState: (
    values: CharterFormValues,
    savedAt: string | null
  ) => void;
  clearLocalDraft: () => void;
}

export interface UseCharterDataLoadResult {
  effectiveEditing: boolean; // actual state after load
  currentCharterId: string | null;
  serverDraftId: string | null;
  serverVersion: number | null;
  draftLoaded: boolean;
  setServerVersion: (v: number | null) => void;
  savedCurrentStep: number | null;
}

export function useCharterDataLoad({
  editCharterId,
  reset,
  setLastSavedAt,
  initializeDraftState,
  clearLocalDraft,
}: UseCharterDataLoadArgs): UseCharterDataLoadResult {
  const [effectiveEditing, setEffectiveEditing] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [currentCharterId, setCurrentCharterId] = useState<string | null>(null);
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<number | null>(null);
  const [savedCurrentStep, setSavedCurrentStep] = useState<number | null>(null);
  const fetchedRef = useRef(false);

  // Initialize baseline state
  useEffect(() => {
    const defaults = createDefaultCharterFormValues();
    if (editCharterId) {
      // Immediately mark editing so UI can hide create-mode banners while fetch in flight.
      setEffectiveEditing(true);
      clearLocalDraft();
      initializeDraftState(defaults, null);
      setDraftLoaded(true);
    } else {
      initializeDraftState(defaults, null);
      setDraftLoaded(true);
    }
  }, [editCharterId, clearLocalDraft, initializeDraftState]);

  useEffect(() => {
    if (!draftLoaded || fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (editCharterId) {
          const res = await fetch(`/api/charters/${editCharterId}/get`);
          if (!res.ok) {
            if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
              console.warn("[charterDataLoad] edit fetch failed", {
                status: res.status,
                editCharterId,
              });
            }
            return;
          }
          const json = await res.json();
          if (cancelled) return;
          if (json.charter) {
            const charter = json.charter;
            const { mapCharterToDraftValuesFeature } = await import(
              "@features/charter-onboarding/server/mapping"
            );
            const draftValues = mapCharterToDraftValuesFeature({
              charter,
              captainProfile: {
                displayName: charter.captain.displayName,
                phone: charter.captain.phone,
                bio: charter.captain.bio,
                experienceYrs: charter.captain.experienceYrs,
              },
            });
            const hydrated = hydrateDraftValues(
              createDefaultCharterFormValues(),
              draftValues as DraftValues
            );
            reset(hydrated, { keepDirty: false });
            setCurrentCharterId(editCharterId);
            setLastSavedAt(new Date().toISOString());
          }
          return;
        }
        const existingRes = await fetch("/api/charter-drafts");
        if (existingRes.ok) {
          const existingJson = await existingRes.json();
          if (existingJson?.draft && !existingJson.draft.charterId) {
            setServerDraftId(existingJson.draft.id);
            setServerVersion(existingJson.draft.version);
            setLastSavedAt(new Date().toISOString());
            // Attempt to hydrate existing draft form data if present
            try {
              const draftData =
                existingJson.draft.data ||
                existingJson.draft.dataFull ||
                existingJson.draft.dataPartial ||
                null;
              if (draftData && typeof draftData === "object") {
                const defaults = createDefaultCharterFormValues();
                const hydrated = hydrateDraftValues(defaults, draftData);
                reset(hydrated, { keepDirty: false });
                // Fire-and-forget event so FormSection media manager can pick up persisted uploaded media via form values
              }
              if (
                typeof existingJson.draft.currentStep === "number" &&
                existingJson.draft.currentStep >= 0
              ) {
                setSavedCurrentStep(existingJson.draft.currentStep);
              }
            } catch {
              /* ignore hydration problems */
            }
            return;
          }
        }
        const createRes = await fetch("/api/charter-drafts", {
          method: "POST",
        });
        if (createRes.ok) {
          const created = await createRes.json();
          if (created?.draft) {
            setServerDraftId(created.draft.id);
            setServerVersion(created.draft.version);
            setLastSavedAt(new Date().toISOString());
          }
        }
      } catch {
        /* ignore network errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftLoaded, editCharterId, reset, setLastSavedAt]);

  return {
    effectiveEditing,
    currentCharterId,
    serverDraftId,
    serverVersion,
    draftLoaded,
    setServerVersion,
    savedCurrentStep,
  };
}

/**
 * useServerOrEditSeed
 * Phase 2 extraction: Encapsulates the side-effect that either (a) loads existing charter data
 * for edit mode or (b) loads/creates a server draft for new onboarding. It keeps internal state
 * needed by the FormSection but exposes a clean contract.
 *
 * Responsibilities moved out of FormSection:
 *  - Fetch charter when `editCharterId` present
 *  - Map charter -> DraftValues form shape
 *  - Load existing server draft or create a new one (when not editing)
 *  - Maintain serverDraftId, version, and initial form reset
 *
 * The hook intentionally avoids referencing react-hook-form generics externally; caller passes
 * the form API subset it needs (reset/getValues).
 */
"use client";
import { emitCharterFormEvent } from "@features/charter-onboarding/analytics";
import { createDefaultCharterFormValues } from "@features/charter-onboarding/charterForm.defaults";
import {
  hydrateDraftValues,
  type DraftValues,
} from "@features/charter-onboarding/charterForm.draft";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { STEP_SEQUENCE } from "@features/charter-onboarding/formSteps";
import { useEffect, useRef, useState } from "react";

export interface UseServerOrEditSeedArgs {
  editCharterId: string | null;
  reset: (values: CharterFormValues, options?: { keepDirty?: boolean }) => void;
  setLastSavedAt: (iso: string | null) => void;
  clearLocalDraft: () => void;
  initializeDraftState: (
    values: CharterFormValues,
    savedAt: string | null
  ) => void;
}

export interface UseServerOrEditSeedResult {
  isEditing: boolean;
  currentCharterId: string | null;
  serverDraftId: string | null;
  serverVersion: number | null;
  draftLoaded: boolean;
  isRestoringDraft: boolean;
  setDraftLoaded: (b: boolean) => void;
  setServerVersion: (v: number | null) => void;
  setServerDraftId: (id: string | null) => void;
  setIsRestoringDraft: (b: boolean) => void;
  setIsEditing: (b: boolean) => void;
}

export function useServerOrEditSeed({
  editCharterId,
  reset,
  setLastSavedAt,
  clearLocalDraft,
  initializeDraftState,
}: UseServerOrEditSeedArgs): UseServerOrEditSeedResult {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  const [currentCharterId, setCurrentCharterId] = useState<string | null>(null);
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<number | null>(null);

  // Phase 2: hydrate local draft OR existing charter.
  useEffect(() => {
    const defaultState = createDefaultCharterFormValues();
    if (editCharterId) {
      clearLocalDraft();
      initializeDraftState(defaultState, null);
      setDraftLoaded(true);
      emitCharterFormEvent({
        type: "step_view",
        step: STEP_SEQUENCE[0].id,
        index: 0,
      });
      return;
    }
    setIsRestoringDraft(true);
    // Local draft hydration is still handled in outer hook (kept minimal here to avoid coupling)
    initializeDraftState(defaultState, null);
    setDraftLoaded(true);
    setIsRestoringDraft(false);
    emitCharterFormEvent({
      type: "step_view",
      step: STEP_SEQUENCE[0].id,
      index: 0,
    });
  }, [editCharterId, clearLocalDraft, initializeDraftState]);

  // Fetch existing charter OR server draft create/load.
  // Ref outside to persist across renders
  const fetchedModeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draftLoaded) return;
    const modeKey = editCharterId ? `edit:${editCharterId}` : "create";
    if (fetchedModeRef.current === modeKey) return; // already fetched for this mode
    let cancelled = false;
    fetchedModeRef.current = modeKey;
    (async () => {
      try {
        if (editCharterId) {
          const res = await fetch(`/api/charters/${editCharterId}/get`, {
            method: "GET",
          });
          if (!res.ok) return;
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
            setIsEditing(true);
            setCurrentCharterId(editCharterId);
            setLastSavedAt(new Date().toISOString());
          }
          return;
        }
        // NEW FLOW: load or create draft (only if we don't already have a serverDraftId)
        if (serverDraftId) return;
        const existingRes = await fetch("/api/charter-drafts", {
          method: "GET",
        });
        if (existingRes.ok) {
          const existingJson = await existingRes.json();
          if (existingJson?.draft && !existingJson.draft.charterId) {
            setServerDraftId(existingJson.draft.id);
            setServerVersion(existingJson.draft.version);
            setIsEditing(false);
            setLastSavedAt(new Date().toISOString());
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
            setIsEditing(false);
            setLastSavedAt(new Date().toISOString());
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally exclude reset/setLastSavedAt to avoid loops
  }, [draftLoaded, editCharterId, serverDraftId]);

  return {
    isEditing,
    currentCharterId,
    serverDraftId,
    serverVersion,
    draftLoaded,
    isRestoringDraft,
    setDraftLoaded,
    setServerVersion,
    setServerDraftId,
    setIsRestoringDraft,
    setIsEditing,
  };
}

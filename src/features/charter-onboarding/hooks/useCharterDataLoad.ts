"use client";
import { createDefaultCharterFormValues } from "@features/charter-onboarding/charterForm.defaults";
import { hydrateDraftValues } from "@features/charter-onboarding/charterForm.draft";
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
  // Exposed only for debugging field population problems
  const hydrationLogRef = useRef<{ stage: string; ts: number }[]>([]);

  // Initialize baseline state only once per editCharterId value. We intentionally
  // exclude clearLocalDraft / initializeDraftState from dependencies because they
  // may be unstable (recreated each provider render) causing an infinite loop.
  const initRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (initRef.current === editCharterId) return; // already initialized for this id value
    initRef.current = editCharterId;
    const defaults = createDefaultCharterFormValues();
    if (editCharterId) {
      // Only update state if changing from non-editing -> editing
      setEffectiveEditing((prev) => (prev ? prev : true));
      // Ensure currentCharterId is available immediately for downstream upload hooks
      // so that media uploads in edit mode aren't blocked while hydration fetch runs.
      setCurrentCharterId(editCharterId);
      try {
        clearLocalDraft();
      } catch {
        /* swallow clear errors */
      }
      try {
        initializeDraftState(defaults, null);
      } catch {
        /* swallow init errors */
      }
      setDraftLoaded(true);
    } else {
      try {
        initializeDraftState(defaults, null);
      } catch {
        /* swallow init errors */
      }
      setDraftLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally exclude clearLocalDraft & initializeDraftState to avoid infinite re-init when their identities change
  }, [editCharterId]);

  useEffect(() => {
    if (!draftLoaded || fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (editCharterId) {
          console.log(
            "[charterDataLoad] starting fetch for editCharterId",
            editCharterId
          );
          const res = await fetch(`/api/charters/${editCharterId}/get`, {
            cache: "no-store",
          });
          console.log("[charterDataLoad] fetch status", res.status, res.ok);
          if (!res.ok) {
            // If unauthorized, revert editing flag so sign-in banner can appear upstream (if implemented)
            if (res.status === 401) {
              console.warn(
                "[charterDataLoad] unauthorized for edit charter; reverting editing mode"
              );
              setEffectiveEditing(false);
            } else if (res.status === 404) {
              console.warn(
                "[charterDataLoad] charter not found",
                editCharterId
              );
            } else {
              console.warn("[charterDataLoad] edit fetch failed", {
                status: res.status,
                editCharterId,
              });
            }
            try {
              const errorText = await res.text();
              console.log("[charterDataLoad] error body", errorText);
            } catch {
              /* ignore */
            }
            return;
          }
          let json: unknown = null;
          try {
            const clone = res.clone();
            const raw = await clone.text();
            try {
              json = JSON.parse(raw);
            } catch (parseErr) {
              console.error("[charterDataLoad] JSON parse error", parseErr, {
                rawSnippet: raw.slice(0, 300),
              });
              return;
            }
            if (json && typeof json === "object") {
              console.log("[charterDataLoad] raw json keys", Object.keys(json));
            } else {
              console.warn("[charterDataLoad] parsed json not object", json);
              return;
            }
          } catch (bodyErr) {
            console.error("[charterDataLoad] body read error", bodyErr);
            return;
          }
          if (cancelled) return;
          interface CharterJsonShape {
            charter?: Record<string, unknown> & {
              captain?: Record<string, unknown>;
            };
            media?: {
              images?: unknown;
              videos?: unknown;
              avatar?: unknown;
              imagesCoverIndex?: unknown;
            };
          }
          const jsonObj = json as CharterJsonShape;
          // Instrumentation: log immediate post-parse charter presence
          try {
            const rawCharter: unknown = (jsonObj as { charter?: unknown })
              .charter;
            const isObj = rawCharter !== null && typeof rawCharter === "object";
            console.log("[charterDataLoad] charter presence check", {
              hasOwn: Object.prototype.hasOwnProperty.call(jsonObj, "charter"),
              type: typeof rawCharter,
              isNull: rawCharter === null,
              keysIfObject: isObj
                ? Object.keys(rawCharter as Record<string, unknown>)
                : null,
            });
          } catch (e) {
            console.warn(
              "[charterDataLoad] charter presence logging failed",
              e
            );
          }
          // Attach raw json for debugging regardless of success
          try {
            // @ts-expect-error debug attach
            window.__CHARTER_EDIT_RAW__ = jsonObj;
          } catch {
            /* noop */
          }
          if (!jsonObj.charter) {
            console.warn(
              "[charterDataLoad] charter key present in keys list but value falsy",
              jsonObj.charter
            );
          }
          if (jsonObj.charter) {
            console.log(
              "[charterDataLoad] charter object type",
              typeof jsonObj.charter
            );
            const charter = jsonObj.charter as {
              charterType?: string;
              name?: string;
              state?: string;
              city?: string;
              startingPoint?: string;
              postcode?: string;
              latitude?: unknown;
              longitude?: unknown;
              description?: string;
              boat?: unknown;
              features?: unknown;
              amenities?: unknown;
              policies?: unknown;
              pickup?: unknown;
              trips?: unknown;
              captain?: {
                displayName?: string;
                phone?: string;
                bio?: string;
                experienceYrs?: number;
                avatarUrl?: string | null;
              };
            };
            console.log(
              "[charterDataLoad] fetched charter (keys)",
              Object.keys(charter)
            );
            // Use broad function signature (unknown in/out) to avoid importing full DraftValues type graph here.
            // eslint rule ban-types not configured; we provide explicit params/return.
            let mapCharterToDraftValuesFeature: (p: unknown) => unknown;
            try {
              ({ mapCharterToDraftValuesFeature } = (await import(
                "@features/charter-onboarding/server/mapping"
              )) as {
                mapCharterToDraftValuesFeature: (p: unknown) => unknown;
              });
            } catch (e) {
              console.error(
                "[charterDataLoad] failed dynamic import mapping",
                e
              );
              return;
            }
            const mediaPayload =
              jsonObj.media && typeof jsonObj.media === "object"
                ? jsonObj.media
                : undefined;
            const captainProfile = {
              displayName: charter.captain?.displayName || "",
              phone: charter.captain?.phone || "",
              bio: charter.captain?.bio || "",
              experienceYrs: charter.captain?.experienceYrs || 0,
            } as const;
            let draftValues: CharterFormValues | undefined;
            try {
              draftValues = mapCharterToDraftValuesFeature({
                // mapper has its own interface, we trust shape runtime; keep TS broad but no 'any'
                charter: charter as unknown as never,
                captainProfile,
                media: mediaPayload as unknown as {
                  images?: { name: string; url: string }[];
                  videos?: { name: string; url: string }[];
                  avatar?: string | null;
                  imagesCoverIndex?: number;
                },
              }) as CharterFormValues;
            } catch (e) {
              console.error("[charterDataLoad] mapping function threw", e);
              return;
            }
            if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
              console.log("[charterDataLoad] mapped draftValues", draftValues);
            }
            // Primary hydration path: reset entire form with mapped values
            try {
              // We assume DraftValues is structurally compatible with CharterFormValues root (validated elsewhere)
              if (!draftValues) throw new Error("draftValues undefined");
              reset(draftValues, { keepDirty: false });
              if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
                console.log(
                  "[charterDataLoad] applied reset",
                  draftValues.charterName,
                  draftValues.city
                );
              }
            } catch (e) {
              console.error("[charterDataLoad] reset hydration failed", e);
            }
            // Secondary (legacy diagnostic) event dispatch retained temporarily to observe race conditions
            try {
              if (draftValues) {
                const patch: Partial<CharterFormValues> = {
                  charterName: draftValues.charterName,
                  charterType: draftValues.charterType,
                  state: draftValues.state,
                  city: draftValues.city,
                  startingPoint: draftValues.startingPoint,
                  postcode: draftValues.postcode,
                  latitude: draftValues.latitude,
                  longitude: draftValues.longitude,
                  description: draftValues.description,
                };
                setTimeout(() => {
                  document.dispatchEvent(
                    new CustomEvent("charter-edit-hydrated", { detail: patch })
                  );
                }, 50); // slight delay so listener definitely mounted
              }
            } catch (e) {
              console.warn(
                "[charterDataLoad] supplemental event dispatch failed",
                e
              );
            }
            hydrationLogRef.current.push({ stage: "hydrated", ts: Date.now() });
            // Attach for quick manual inspection in DevTools
            // @ts-expect-error debug attach
            window.__CHARTER_EDIT_HYDRATION__ = {
              editCharterId,
              hydratedPreview: {
                charterName: draftValues?.charterName,
                city: draftValues?.city,
                trips: (draftValues?.trips || []).length,
              },
              draftValues,
            };
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
      } catch (e) {
        console.error("[charterDataLoad] unexpected fetch error", e);
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

import { useCallback } from "react";

// Phase 1 migration: introduce new storage key & schemaVersion; migrate any legacy keys once.

// Bump key to v3 to avoid leaking a prior user's draft into a new session (no migration on purpose)
const STORAGE_KEY = "fishon.charterRegisterDraft.v3";
const LEGACY_KEYS = [
  // Intentionally DO NOT migrate v2 to prevent cross-account pollution
  "fishon.charterRegisterDraft.v1",
  "charterDraft",
  "charterFormState",
];
const CURRENT_SCHEMA_VERSION = 2;
const MIGRATION_TOMBSTONE = "fishon.charterRegisterDraft.migrated";

type DraftEnvelope<T> = {
  schemaVersion: number;
  savedAt: string;
  values: T;
};

export function useCharterDraft<T = unknown>(storageKey: string = STORAGE_KEY) {
  const runLegacyMigration = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const already = window.localStorage.getItem(MIGRATION_TOMBSTONE);
      if (already) return; // only once
      let migrated = false;
      for (const legacyKey of LEGACY_KEYS) {
        const raw = window.localStorage.getItem(legacyKey);
        if (!raw) continue;
        try {
          const parsedUnknown = JSON.parse(raw) as unknown;
          const candidate = ((): unknown => {
            if (
              parsedUnknown &&
              typeof parsedUnknown === "object" &&
              (parsedUnknown as { values?: unknown }).values !== undefined
            ) {
              return (parsedUnknown as { values?: unknown }).values;
            }
            return parsedUnknown;
          })();
          const candidateObj =
            candidate && typeof candidate === "object"
              ? (candidate as Record<string, unknown>)
              : {};
          const hasTrips =
            Array.isArray((candidateObj as { trips?: unknown[] }).trips) &&
            (candidateObj as { trips?: unknown[] }).trips!.length > 0;
          const charterNameVal = candidateObj["charterName"];
          const hasName =
            typeof charterNameVal === "string" &&
            charterNameVal.trim().length > 0;
          if (
            (hasTrips || hasName) &&
            !window.localStorage.getItem(storageKey)
          ) {
            const envelope: DraftEnvelope<T> = {
              schemaVersion: CURRENT_SCHEMA_VERSION,
              savedAt: new Date().toISOString(),
              // We trust candidate shape to align; migration sanitize occurs later in hydrate
              values: candidateObj as unknown as T,
            };
            window.localStorage.setItem(storageKey, JSON.stringify(envelope));
            console.info("[draft] migrated legacy draft", { legacyKey });
            migrated = true;
          }
        } catch {
          // ignore malformed legacy entry
        }
        window.localStorage.removeItem(legacyKey); // always clear legacy key
      }
      window.localStorage.setItem(
        MIGRATION_TOMBSTONE,
        JSON.stringify({ at: new Date().toISOString(), migrated })
      );
    } catch {
      // ignore
    }
  }, [storageKey]);

  const loadDraft = useCallback((): { savedAt: string; values: T } | null => {
    if (typeof window === "undefined") return null;
    runLegacyMigration();
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DraftEnvelope<T>;
      if (
        !parsed ||
        parsed.schemaVersion !== CURRENT_SCHEMA_VERSION ||
        !parsed.values
      ) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      return { savedAt: parsed.savedAt, values: parsed.values };
    } catch {
      window.localStorage.removeItem(storageKey);
      return null;
    }
  }, [runLegacyMigration, storageKey]);

  const saveDraft = useCallback(
    (values: T): string => {
      if (typeof window === "undefined") return "";
      const savedAt = new Date().toISOString();
      const envelope: DraftEnvelope<T> = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        savedAt,
        values,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(envelope));
      return savedAt;
    },
    [storageKey]
  );

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { loadDraft, saveDraft, clearDraft };
}

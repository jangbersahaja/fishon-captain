import { useCallback } from "react";

type DraftEnvelope<T> = {
  version: number;
  savedAt: string;
  values: T;
};

const STORAGE_KEY = "fishon.charterRegisterDraft.v1";
const VERSION = 1;

export function useCharterDraft<T = unknown>(storageKey: string = STORAGE_KEY) {
  const loadDraft = useCallback((): { savedAt: string; values: T } | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DraftEnvelope<T>;
      if (!parsed || parsed.version !== VERSION || !parsed.values) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      return { savedAt: parsed.savedAt, values: parsed.values };
    } catch {
      window.localStorage.removeItem(storageKey);
      return null;
    }
  }, [storageKey]);

  const saveDraft = useCallback(
    (values: T): string => {
      if (typeof window === "undefined") return "";
      const savedAt = new Date().toISOString();
      const envelope: DraftEnvelope<T> = {
        version: VERSION,
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

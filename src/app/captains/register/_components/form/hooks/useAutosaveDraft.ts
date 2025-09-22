import { useCallback, useEffect, useRef, useState } from "react";

import type { CharterFormValues } from "../charterForm.schema";
import type { DraftValues } from "../charterForm.draft";

type UseAutosaveDraftOptions = {
  values: CharterFormValues;
  draftLoaded: boolean;
  isRestoring: boolean;
  sanitize: (values: CharterFormValues) => DraftValues;
  saveDraft: (values: DraftValues) => string | null;
};

type UseAutosaveDraftResult = {
  lastSavedAt: string | null;
  setLastSavedAt: (value: string | null) => void;
  persistDraft: (values?: CharterFormValues) => void;
  initializeDraftState: (values: CharterFormValues, savedAt: string | null) => void;
};

export function useAutosaveDraft({
  values,
  draftLoaded,
  isRestoring,
  sanitize,
  saveDraft,
}: UseAutosaveDraftOptions): UseAutosaveDraftResult {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const lastSerializedRef = useRef<string | null>(null);

  const persistDraft = useCallback(
    (source?: CharterFormValues) => {
      if (!draftLoaded) return;
      const target = source ?? values;
      const sanitized = sanitize(target);
      const serialized = JSON.stringify(sanitized);
      const savedAt = saveDraft(sanitized);
      lastSerializedRef.current = serialized;
      setLastSavedAt(savedAt);
    },
    [draftLoaded, saveDraft, sanitize, values]
  );

  const initializeDraftState = useCallback(
    (initialValues: CharterFormValues, savedAt: string | null) => {
      const sanitized = sanitize(initialValues);
      lastSerializedRef.current = JSON.stringify(sanitized);
      setLastSavedAt(savedAt);
    },
    [sanitize]
  );

  useEffect(() => {
    if (!draftLoaded || isRestoring) return;
    const sanitized = sanitize(values);
    const serialized = JSON.stringify(sanitized);
    if (serialized === lastSerializedRef.current) return;
    const timeout = window.setTimeout(() => {
      const savedAt = saveDraft(sanitized);
      lastSerializedRef.current = serialized;
      setLastSavedAt(savedAt);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [draftLoaded, isRestoring, saveDraft, sanitize, values]);

  return {
    lastSavedAt,
    setLastSavedAt,
    persistDraft,
    initializeDraftState,
  };
}

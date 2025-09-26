/**
 * useFormMode
 * Phase 2: Extract logic that determines whether we are creating a new charter (draft mode)
 * or editing an existing charter (edit mode). This hook centralizes URL param parsing and
 * exposes booleans + the target charter ID. Keeping it isolated simplifies FormSection.
 */
"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export interface UseFormModeResult {
  isEditing: boolean;
  editCharterId: string | null;
}

export function useFormMode(): UseFormModeResult {
  const search = useSearchParams();
  const editCharterId = search?.get("editCharterId") || null;
  return useMemo(
    () => ({ isEditing: Boolean(editCharterId), editCharterId }),
    [editCharterId]
  );
}

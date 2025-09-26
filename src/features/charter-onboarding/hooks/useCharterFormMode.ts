"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export interface UseCharterFormModeResult {
  editCharterId: string | null;
  isEditing: boolean; // purely from presence of param, data load may still adjust
}

export function useCharterFormMode(): UseCharterFormModeResult {
  const search = useSearchParams();
  const editCharterId = search?.get("editCharterId") || null;
  return useMemo(
    () => ({ editCharterId, isEditing: Boolean(editCharterId) }),
    [editCharterId]
  );
}

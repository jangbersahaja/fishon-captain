"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export interface UseCharterFormModeResult {
  editCharterId: string | null;
  adminUserId: string | null;
  isEditing: boolean; // purely from presence of param, data load may still adjust
  isAdminOverride: boolean;
}

export function useCharterFormMode(): UseCharterFormModeResult {
  const search = useSearchParams();
  const editCharterId = search?.get("editCharterId") || null;
  const adminUserId = search?.get("adminUserId") || null;
  return useMemo(
    () => ({
      editCharterId,
      adminUserId,
      isEditing: Boolean(editCharterId),
      isAdminOverride: Boolean(adminUserId),
    }),
    [editCharterId, adminUserId]
  );
}

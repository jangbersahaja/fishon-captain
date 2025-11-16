"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface ToggleCharterStatusParams {
  charterId: string;
  isActive: boolean;
  adminUserId?: string;
}

interface ToggleCharterStatusResponse {
  success: boolean;
  message: string;
  charter: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

export function useToggleCharterStatus() {
  return useMutation({
    mutationFn: async ({
      charterId,
      isActive,
      adminUserId,
    }: ToggleCharterStatusParams): Promise<ToggleCharterStatusResponse> => {
      const res = await fetch(`/api/charters/${charterId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update charter status");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Charter status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update charter status: ${error.message}`);
    },
  });
}

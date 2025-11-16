"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface UpdateBookingFlowParams {
  charterId: string;
  bookingFlowType: "MANUAL" | "AUTO";
  approvalTimeHours?: number;
  adminUserId?: string;
}

interface UpdateBookingFlowResponse {
  success: boolean;
  message: string;
  charter: {
    id: string;
    name: string;
    bookingFlowType: "MANUAL" | "AUTO";
    approvalTimeHours: number;
    instantBookingEnabled: boolean;
  };
}

export function useUpdateBookingFlow() {
  return useMutation({
    mutationFn: async ({
      charterId,
      bookingFlowType,
      approvalTimeHours,
      adminUserId,
    }: UpdateBookingFlowParams): Promise<UpdateBookingFlowResponse> => {
      const res = await fetch(`/api/charters/${charterId}/booking-flow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingFlowType, approvalTimeHours }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update booking flow");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Booking flow updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update booking flow: ${error.message}`);
    },
  });
}

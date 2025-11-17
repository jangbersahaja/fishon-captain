import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UpdateBookingFlowData {
  charterId: string;
  bookingFlowType?: "MANUAL" | "AUTO";
  approvalTimeHours?: number;
  instantBookingEnabled?: boolean;
  adminUserId?: string;
}

export function useUpdateBookingFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBookingFlowData) => {
      const { charterId, ...body } = data;
      const response = await fetch(`/api/charters/${charterId}/booking-flow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update booking flow");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Booking flow updated successfully");
      queryClient.invalidateQueries({ queryKey: ["charters"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

interface ToggleStatusData {
  charterId: string;
  isActive: boolean;
  adminUserId?: string;
}

export function useToggleCharterStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ToggleStatusData) => {
      const { charterId, isActive } = data;
      const response = await fetch(`/api/charters/${charterId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update charter status");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isActive
          ? "Charter activated successfully"
          : "Charter deactivated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["charters"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

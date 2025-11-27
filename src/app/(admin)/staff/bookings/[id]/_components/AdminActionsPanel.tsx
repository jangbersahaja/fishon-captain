"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  forceApproveBooking,
  forceRejectBooking,
  initiateBookingRefund,
  markBookingCompleted,
} from "@/lib/actions/staff-booking-actions";
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  Shield,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionDialog } from "../../_components/ActionDialog";
import { StatusOverrideDialog } from "./StatusOverrideDialog";

type BookingStatus =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PAYMENT_AUTHORIZED"
  | "PAID"
  | "UNDER_REVIEW"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

interface AdminActionsPanelProps {
  bookingId: string;
  status: BookingStatus;
  hasPayment: boolean;
  userRole: "STAFF" | "ADMIN";
  finalPrice: number;
}

export function AdminActionsPanel({
  bookingId,
  status,
  hasPayment,
  userRole,
  finalPrice,
}: AdminActionsPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine available actions based on status
  const canForceApprove = status === "PENDING";
  const canForceReject = [
    "PENDING",
    "AWAITING_PAYMENT",
    "PAYMENT_AUTHORIZED",
  ].includes(status);
  const canInitiateRefund =
    hasPayment && !["COMPLETED", "REFUNDED"].includes(status);
  const canMarkCompleted = status === "PAID";
  const canOverrideStatus = userRole === "ADMIN";

  if (status === "COMPLETED") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Booking completed - no actions needed</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <XCircle className="h-4 w-4" />
            <span>
              Booking {status.toLowerCase()} - limited actions available
            </span>
          </div>
          {canInitiateRefund && (
            <div className="mt-4">
              <ActionDialog
                title="Initiate Refund"
                description={`Process refund of RM ${finalPrice.toFixed(2)} for this booking.`}
                action={async (password: string, reason: string) => {
                  setIsProcessing(true);
                  try {
                    const result = await initiateBookingRefund(
                      bookingId,
                      password,
                      reason
                    );
                    if (result.success) {
                      toast.success(result.message || "Refund initiated");
                    } else {
                      toast.error(result.error || "Failed to initiate refund");
                    }
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Initiate Refund
                  </Button>
                }
                requireReason
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-600" />
          <span>Admin Actions</span>
          <Badge variant="outline" className="ml-auto">
            {userRole}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Force Approve */}
        {canForceApprove && (
          <ActionDialog
            title="Force Approve Booking"
            description="Bypass captain approval and move booking to payment stage. Use when captain is unresponsive or for special circumstances."
            action={async (password: string, reason: string) => {
              setIsProcessing(true);
              try {
                const result = await forceApproveBooking(
                  bookingId,
                  password,
                  reason
                );
                if (result.success) {
                  toast.success(result.message || "Booking force approved");
                } else {
                  toast.error(result.error || "Failed to approve booking");
                }
              } finally {
                setIsProcessing(false);
              }
            }}
            trigger={
              <Button
                variant="default"
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Force Approve
              </Button>
            }
            requireReason
          />
        )}

        {/* Force Reject */}
        {canForceReject && (
          <ActionDialog
            title="Force Reject Booking"
            description={
              hasPayment
                ? "Reject booking and initiate refund. Payment will be released/refunded."
                : "Reject this booking request. This action cannot be undone."
            }
            action={async (password: string, reason: string) => {
              setIsProcessing(true);
              try {
                const result = await forceRejectBooking(
                  bookingId,
                  password,
                  reason
                );
                if (result.success) {
                  toast.success(result.message || "Booking force rejected");
                } else {
                  toast.error(result.error || "Failed to reject booking");
                }
              } finally {
                setIsProcessing(false);
              }
            }}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="w-full border-red-200 text-red-700 hover:bg-red-50"
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Force Reject
              </Button>
            }
            requireReason
          />
        )}

        {/* Initiate Refund */}
        {canInitiateRefund && (
          <ActionDialog
            title="Initiate Refund"
            description={`Process refund of RM ${finalPrice.toFixed(2)}. This will start the refund process through the payment gateway.`}
            action={async (password: string, reason: string) => {
              setIsProcessing(true);
              try {
                const result = await initiateBookingRefund(
                  bookingId,
                  password,
                  reason
                );
                if (result.success) {
                  toast.success(result.message || "Refund initiated");
                } else {
                  toast.error(result.error || "Failed to initiate refund");
                }
              } finally {
                setIsProcessing(false);
              }
            }}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isProcessing}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Initiate Refund
              </Button>
            }
            requireReason
          />
        )}

        {/* Mark as Completed */}
        {canMarkCompleted && (
          <ActionDialog
            title="Mark as Completed"
            description="Mark this booking as completed. Trip should be finished and no issues remain."
            action={async (password: string, reason: string) => {
              setIsProcessing(true);
              try {
                const result = await markBookingCompleted(
                  bookingId,
                  password,
                  reason || undefined
                );
                if (result.success) {
                  toast.success(
                    result.message || "Booking marked as completed"
                  );
                } else {
                  toast.error(result.error || "Failed to mark as completed");
                }
              } finally {
                setIsProcessing(false);
              }
            }}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="w-full border-green-200 text-green-700 hover:bg-green-50"
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Completed
              </Button>
            }
            requireReason={false}
          />
        )}

        {/* Status Override (Admin only) */}
        {canOverrideStatus && (
          <>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-medium text-orange-600">
                  DANGER ZONE (Admin Only)
                </span>
              </div>
            </div>

            <StatusOverrideDialog
              bookingId={bookingId}
              currentStatus={status}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </>
        )}

        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-gray-500">
            All admin actions require password verification and are logged for
            audit purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

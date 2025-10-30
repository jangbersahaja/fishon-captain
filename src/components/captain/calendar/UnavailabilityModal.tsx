/**
 * Unavailability Modal Component
 *
 * Modal for blocking specific date ranges or editing existing blocks.
 */

"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CharterUnavailability } from "@prisma/client";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UnavailabilityModalProps {
  charterId: string;
  isOpen: boolean;
  onClose: () => void;
  prefillDate?: Date;
  onSuccess?: () => void;
  editBlock?: CharterUnavailability | null;
}

export function UnavailabilityModal({
  charterId,
  isOpen,
  onClose,
  prefillDate,
  onSuccess,
  editBlock,
}: UnavailabilityModalProps) {
  const router = useRouter();
  const toasts = useToasts();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const isEditMode = !!editBlock;

  // Initialize form with editBlock data or prefillDate
  useEffect(() => {
    if (editBlock) {
      setStartDate(format(new Date(editBlock.startDate), "yyyy-MM-dd"));
      setEndDate(format(new Date(editBlock.endDate), "yyyy-MM-dd"));
      setReason(editBlock.reason || "");
    } else if (prefillDate) {
      setStartDate(format(prefillDate, "yyyy-MM-dd"));
      setEndDate(format(prefillDate, "yyyy-MM-dd"));
      setReason("");
    } else {
      setStartDate("");
      setEndDate("");
      setReason("");
    }
  }, [editBlock, prefillDate, isOpen]);

  const handleDelete = async () => {
    if (!editBlock) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      const response = await fetch(
        `/api/charters/${charterId}/unavailability`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unavailabilityId: editBlock.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove unavailability");
      }

      toasts.push({
        type: "success",
        message: "Unavailability block has been removed.",
        autoDismiss: 4000,
      });

      // Call success callback to refresh calendar
      onSuccess?.();

      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error deleting unavailability:", error);
      toasts.push({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to remove unavailability",
        autoDismiss: 6000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!startDate) {
      toasts.push({
        type: "error",
        message: "Please select a start date.",
        autoDismiss: 5000,
      });
      return;
    }

    // Default endDate to startDate for single-day blocks
    const finalEndDate = endDate || startDate;
    const start = new Date(startDate);
    const end = new Date(finalEndDate);

    if (start > end) {
      toasts.push({
        type: "error",
        message: "End date cannot be before start date.",
        autoDismiss: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement PATCH endpoint for editing
      // For now, edit mode is read-only with delete option
      if (isEditMode) {
        toasts.push({
          type: "info",
          message: "Editing not yet supported. Use delete and recreate.",
          autoDismiss: 5000,
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `/api/charters/${charterId}/unavailability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            reason: reason.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create unavailability block");
      }

      const data = await response.json();

      toasts.push({
        type: "success",
        message: data.message || "Your unavailability block has been created.",
        autoDismiss: 4000,
      });

      // Reset form
      setStartDate("");
      setEndDate("");
      setReason("");

      // Call success callback to refresh calendar
      onSuccess?.();

      // Refresh page
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error creating unavailability:", error);
      toasts.push({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to block dates",
        autoDismiss: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Blocked Dates" : "Block Dates"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "View details of this unavailability block. You can delete it if needed."
                : "Select a single date or date range when your charter will be unavailable. Leave end date empty to block a single day. Existing bookings will not be affected."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                disabled={isEditMode}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || format(new Date(), "yyyy-MM-dd")}
                placeholder="Same as start date"
                disabled={isEditMode}
              />
              {!isEditMode && (
                <p className="text-xs text-slate-500">
                  Leave empty to block a single day
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Boat maintenance, Personal leave"
                rows={3}
                maxLength={200}
                disabled={isEditMode}
              />
              {!isEditMode && (
                <p className="text-xs text-slate-500">
                  {reason.length}/200 characters
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0">
            {isEditMode ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Block
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Block Dates
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Unavailability Block"
        description="Are you sure you want to remove this unavailability block? This action cannot be undone."
        confirmText="Delete Block"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
}

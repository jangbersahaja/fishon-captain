"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { CharterUnavailability } from "@prisma/client";
import { differenceInDays, format } from "date-fns";
import {
  Anchor,
  Calendar,
  Clock,
  Edit2,
  Loader2,
  Ship,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BlockedDateDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  block: CharterUnavailability | null;
  charterName?: string;
  tripName?: string;
  onEdit: () => void;
}

// Map reasons to display info
const REASON_INFO: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  "Offline Booking": {
    label: "Offline Booking",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "📱",
  },
  "Boat Maintenance": {
    label: "Boat Maintenance",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "🔧",
  },
  "No Crew Available": {
    label: "No Crew Available",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: "👥",
  },
  "Weather Concerns": {
    label: "Weather Concerns",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    icon: "🌧️",
  },
  "Personal Leave": {
    label: "Personal Leave",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: "🏖️",
  },
};

function getReasonInfo(reason: string | null) {
  if (!reason) {
    return {
      label: "Unavailable",
      color: "bg-gray-100 text-gray-700 border-gray-200",
      icon: "🚫",
    };
  }
  return (
    REASON_INFO[reason] || {
      label: reason,
      color: "bg-gray-100 text-gray-700 border-gray-200",
      icon: "📝",
    }
  );
}

export function BlockedDateDetailsPanel({
  isOpen,
  onClose,
  block,
  charterName,
  tripName,
  onEdit,
}: BlockedDateDetailsPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const toasts = useToasts();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!block) return null;

  const reasonInfo = getReasonInfo(block.reason);
  const startDate = new Date(block.startDate);
  const endDate = new Date(block.endDate);
  const daysDiff = differenceInDays(endDate, startDate);
  const isMultiDay = daysDiff > 0;
  const isAllDay = block.isAllDay;

  const handleDelete = async () => {
    if (!block) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      const response = await fetch(
        `/api/charters/${block.charterId}/unavailability`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unavailabilityId: block.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove unavailability");
      }

      toasts.push({
        type: "success",
        message: "Blocked date has been removed.",
        autoDismiss: 4000,
      });

      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error deleting unavailability:", error);
      toasts.push({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to remove blocked date",
        autoDismiss: 6000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    onClose();
    // Small delay to allow sheet to close before opening modal
    setTimeout(() => {
      onEdit();
    }, 150);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={
            isDesktop
              ? "w-[400px] sm:w-[480px] overflow-y-auto"
              : "h-[85vh] w-full overflow-y-auto rounded-t-xl"
          }
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xl">{reasonInfo.icon}</span>
              Blocked Date
            </SheetTitle>
            <SheetDescription>
              View and manage this unavailability block.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Reason Badge */}
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium",
                reasonInfo.color
              )}
            >
              <span>{reasonInfo.icon}</span>
              {reasonInfo.label}
            </div>

            {/* Details Card */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Charter Info */}
              {charterName && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <Ship className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Charter</p>
                    <p className="font-medium text-gray-900">{charterName}</p>
                  </div>
                </div>
              )}

              {/* Trip Info (if specific trip blocked) */}
              {tripName && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <Anchor className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Specific Trip</p>
                    <p className="font-medium text-gray-900">{tripName}</p>
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">
                    {isMultiDay ? "Date Range" : "Date"}
                  </p>
                  <p className="font-medium text-gray-900">
                    {isMultiDay ? (
                      <>
                        {format(startDate, "EEE, d MMM yyyy")} –{" "}
                        {format(endDate, "EEE, d MMM yyyy")}
                        <span className="text-gray-500 font-normal ml-2">
                          ({daysDiff + 1} days)
                        </span>
                      </>
                    ) : (
                      format(startDate, "EEEE, d MMMM yyyy")
                    )}
                  </p>
                </div>
              </div>

              {/* Time (if not all day) */}
              <div className="flex items-center gap-3 px-4 py-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-medium text-gray-900">
                    {isAllDay ? (
                      <span className="text-gray-600">All Day</span>
                    ) : (
                      <>
                        {block.startTime || format(startDate, "HH:mm")} –{" "}
                        {block.endTime || format(endDate, "HH:mm")}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Reason Note */}
            {block.reason &&
              !REASON_INFO[block.reason] &&
              block.reason !== "Other (please specify)" && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Note
                  </p>
                  <p className="text-gray-700">{block.reason}</p>
                </div>
              )}

            {/* Created Info */}
            <div className="text-xs text-gray-400">
              Created {format(new Date(block.createdAt), "d MMM yyyy, h:mm a")}
              {block.updatedAt && block.updatedAt !== block.createdAt && (
                <>
                  <br />
                  Updated{" "}
                  {format(new Date(block.updatedAt), "d MMM yyyy, h:mm a")}
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleEdit}
                disabled={isDeleting}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Blocked Date"
        description="Are you sure you want to remove this blocked date? Anglers will be able to book this time slot again."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
}

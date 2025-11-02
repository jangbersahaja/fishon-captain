/**
 * Unavailability Section Component
 *
 * Displays blocked date ranges with add/remove capabilities.
 */

"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CharterUnavailability } from "@prisma/client";
import { format } from "date-fns";
import { BanIcon, Edit2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UnavailabilityModal } from "./UnavailabilityModal";

interface UnavailabilitySectionProps {
  charterId: string;
  unavailability: CharterUnavailability[];
}

export function UnavailabilitySection({
  charterId,
  unavailability,
}: UnavailabilitySectionProps) {
  const router = useRouter();
  const toasts = useToasts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] =
    useState<CharterUnavailability | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter and sort: only show upcoming or current blocks
  const sortedBlocks = [...unavailability]
    .filter((block) => {
      const blockEnd = new Date(block.endDate);
      blockEnd.setHours(0, 0, 0, 0);
      return blockEnd >= today; // Show blocks that end today or in the future
    })
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

  const handleEditClick = (block: CharterUnavailability) => {
    setEditingBlock(block);
  };

  const handleDeleteClick = (unavailabilityId: string) => {
    setConfirmDelete(unavailabilityId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBlock(null);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete);

    try {
      const response = await fetch(
        `/api/charters/${charterId}/unavailability`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unavailabilityId: confirmDelete }),
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

      setConfirmDelete(null);
      router.refresh();
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
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BanIcon className="w-4 h-4" />
          Unavailable Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Block List */}
        {sortedBlocks.length === 0 ? (
          <p className="text-sm text-slate-600">
            No unavailable dates. Block specific dates when you cannot operate.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedBlocks.map((block) => {
              const startDate = new Date(block.startDate);
              const endDate = new Date(block.endDate);
              const isSameDay =
                format(startDate, "yyyy-MM-dd") ===
                format(endDate, "yyyy-MM-dd");

              return (
                <div
                  key={block.id}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg border-slate-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {isSameDay
                        ? format(startDate, "MMM d, yyyy")
                        : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`}
                    </p>
                    {block.reason && (
                      <span className="text-xs text-slate-500">
                        {block.reason}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(block)}
                    disabled={deletingId === block.id}
                    className="w-8 h-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    title="Edit block"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(block.id)}
                    disabled={deletingId === block.id}
                    className="w-8 h-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    title="Delete block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Button */}
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus className="w-3 h-3 mr-2" />
          Block Dates
        </Button>

        <UnavailabilityModal
          charterId={charterId}
          isOpen={isModalOpen || !!editingBlock}
          onClose={handleCloseModal}
          editBlock={editingBlock}
        />
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Unavailability Block"
        description="Are you sure you want to remove this unavailability block? This action cannot be undone."
        confirmText="Delete Block"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={!!deletingId}
      />
    </Card>
  );
}

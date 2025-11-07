"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { Edit2, Plus, Ship, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoatDialog } from "./BoatDialog";

type Boat = {
  id: string;
  name: string;
  type: string;
  lengthFt: number;
  capacity: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  features: string[];
  charters: Array<{
    charterId: string;
    charterName: string;
  }>;
};

type Charter = {
  id: string;
  name: string;
  boatId: string | null;
};

type BoatListProps = {
  boats: Boat[];
  charters: Charter[];
  adminUserId?: string;
};

export function BoatList({ boats, charters, adminUserId }: BoatListProps) {
  const router = useRouter();
  const { push } = useToasts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleAdd = () => {
    setSelectedBoat(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (boat: Boat) => {
    setSelectedBoat(boat);
    setIsDialogOpen(true);
  };

  const handleDelete = async (boatId: string) => {
    const boat = boats.find((b) => b.id === boatId);
    if (
      !confirm(
        `Are you sure you want to delete this boat? ${
          boat && boat.charters.length > 0
            ? `This will affect ${boat.charters.length} charter(s).`
            : ""
        }`
      )
    ) {
      return;
    }

    setIsDeleting(boatId);
    try {
      const url = adminUserId
        ? `/api/captain/boats/${boatId}?adminUserId=${adminUserId}`
        : `/api/captain/boats/${boatId}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete boat");
      }

      push({ message: "Boat deleted successfully", type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Delete boat error:", error);
      push({
        message:
          error instanceof Error ? error.message : "Failed to delete boat",
        type: "error",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedBoat(null);
    router.refresh();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">
              {boats.length} boat{boats.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-[#ec2227] hover:bg-[#d81e23]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Boat
          </Button>
        </div>

        {/* Boats List */}
        {boats.length === 0 ? (
          <div className="p-12 text-center bg-white border shadow-sm rounded-2xl border-slate-200">
            <Ship className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              No boats yet
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              Add your first boat to get started with your fleet management
            </p>
            <Button
              onClick={handleAdd}
              className="bg-[#ec2227] hover:bg-[#d81e23]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Boat
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boats.map((boat) => (
              <div
                key={boat.id}
                className="overflow-hidden transition-shadow bg-white border shadow-sm rounded-2xl border-slate-200 hover:shadow-md"
              >
                {/* Boat Image */}
                {boat.imageUrl ? (
                  <div className="relative w-full aspect-square bg-slate-100">
                    <Image
                      src={boat.imageUrl}
                      alt={boat.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center w-full aspect-square bg-gradient-to-br from-blue-50 to-blue-100">
                    <Ship className="w-16 h-16 text-blue-300" />
                  </div>
                )}

                <div className="p-6">
                  {/* Boat Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold truncate text-slate-900">
                      {boat.name}
                    </h3>
                    <p className="text-sm text-slate-500">{boat.type}</p>
                  </div>

                  {/* Boat Specs */}
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Length:</span>
                      <span className="font-medium text-slate-900">
                        {boat.lengthFt} ft
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Capacity:</span>
                      <span className="font-medium text-slate-900">
                        {boat.capacity} anglers
                      </span>
                    </div>
                  </div>

                  {/* Boat Features */}
                  {boat.features.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold text-slate-500">
                        Features:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {boat.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assigned Charters */}
                  {boat.charters.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold text-slate-500">
                        Used by {boat.charters.length} charter
                        {boat.charters.length !== 1 ? "s" : ""}:
                      </p>
                      <div className="space-y-1">
                        {boat.charters.slice(0, 2).map((charter) => (
                          <p
                            key={charter.charterId}
                            className="text-xs truncate text-slate-600"
                          >
                            • {charter.charterName}
                          </p>
                        ))}
                        {boat.charters.length > 2 && (
                          <p className="text-xs text-slate-400">
                            +{boat.charters.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-slate-200">
                    <Button
                      onClick={() => handleEdit(boat)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(boat.id)}
                      variant="outline"
                      size="sm"
                      disabled={isDeleting === boat.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isDeleting === boat.id ? (
                        <span className="text-xs">Deleting...</span>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BoatDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        boat={selectedBoat}
        charters={charters}
        adminUserId={adminUserId}
        onSuccess={handleSuccess}
      />
    </>
  );
}

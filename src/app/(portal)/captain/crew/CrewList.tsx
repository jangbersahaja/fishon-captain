"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { Edit2, Plus, Trash2, User, Users as UsersIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CrewDialog } from "./CrewDialog";

type CrewMember = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  phone: string;
  avatarUrl: string | null;
  primaryRole: string;
  bio: string | null;
  experienceYrs: number;
  isActive: boolean;
  charters: Array<{
    charterId: string;
    charterName: string;
    role: string;
    assignmentId: string;
  }>;
};

type Charter = {
  id: string;
  name: string;
};

type CrewListProps = {
  crewMembers: CrewMember[];
  charters: Charter[];
  adminUserId?: string;
};

export function CrewList({
  crewMembers,
  charters,
  adminUserId,
}: CrewListProps) {
  const router = useRouter();
  const { push } = useToasts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleAdd = () => {
    setSelectedCrew(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (crew: CrewMember) => {
    setSelectedCrew(crew);
    setIsDialogOpen(true);
  };

  const handleDelete = async (crewId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this crew member? This will remove all their charter assignments."
      )
    ) {
      return;
    }

    setIsDeleting(crewId);
    try {
      const url = adminUserId
        ? `/api/captain/crew/${crewId}?adminUserId=${adminUserId}`
        : `/api/captain/crew/${crewId}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete crew member");
      }

      push({ message: "Crew member deleted successfully", type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Delete crew error:", error);
      push({
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete crew member",
        type: "error",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedCrew(null);
    router.refresh();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">
              {crewMembers.length} crew member
              {crewMembers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-[#ec2227] hover:bg-[#d81e23]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Crew Member
          </Button>
        </div>

        {/* Crew Members List */}
        {crewMembers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm text-center">
            <UsersIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No crew members yet
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Add your first crew member to start building your team
            </p>
            <Button
              onClick={handleAdd}
              className="bg-[#ec2227] hover:bg-[#d81e23]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Crew Member
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {crewMembers.map((crew) => (
              <div
                key={crew.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Crew Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {crew.avatarUrl ? (
                      <Image
                        src={crew.avatarUrl}
                        alt={crew.displayName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center border-2 border-slate-100">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {crew.displayName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {crew.experienceYrs} yrs experience
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="mb-3">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                    {crew.primaryRole.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-1 mb-4">
                  <p className="text-sm text-slate-600 truncate">
                    📧 {crew.email || "No email"}
                  </p>
                  <p className="text-sm text-slate-600 truncate">
                    📱 {crew.phone}
                  </p>
                </div>

                {/* Assigned Charters */}
                {crew.charters.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      Assigned to:
                    </p>
                    <div className="space-y-1">
                      {crew.charters.map((charter) => (
                        <p
                          key={charter.assignmentId}
                          className="text-xs text-slate-600 truncate"
                        >
                          • {charter.charterName} (
                          {charter.role.replace(/_/g, " ")})
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(crew)}
                    className="flex-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(crew.id)}
                    disabled={isDeleting === crew.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <CrewDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedCrew(null);
        }}
        crew={selectedCrew}
        charters={charters}
        adminUserId={adminUserId}
        onSuccess={handleSuccess}
      />
    </>
  );
}

"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Save, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type CrewMember = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  phone: string;
  primaryRole: string;
  bio: string | null;
  experienceYrs: number;
  avatarUrl: string | null;
};

type Charter = {
  id: string;
  name: string;
};

type CrewDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  crew: CrewMember | null;
  charters: Charter[];
  adminUserId?: string;
  onSuccess: () => void;
};

const CREW_ROLES = [
  { value: "FIRST_MATE", label: "First Mate" },
  { value: "DECKHAND", label: "Deckhand" },
  { value: "COOK", label: "Cook" },
  { value: "ENGINEER", label: "Engineer" },
  { value: "GUIDE", label: "Guide" },
  { value: "CLEANER", label: "Cleaner" },
  { value: "OTHER", label: "Other" },
];

export function CrewDialog({
  isOpen,
  onClose,
  crew,
  charters,
  adminUserId,
  onSuccess,
}: CrewDialogProps) {
  const { push } = useToasts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    phone: "",
    primaryRole: "DECKHAND",
    bio: "",
    experienceYrs: 0,
    avatarUrl: "",
    assignedCharters: [] as Array<{ charterId: string; role: string }>,
  });

  // Reset form when dialog opens/closes or crew changes
  useEffect(() => {
    if (isOpen) {
      if (crew) {
        setFormData({
          firstName: crew.firstName,
          lastName: crew.lastName,
          displayName: crew.displayName,
          email: crew.email || "",
          phone: crew.phone,
          primaryRole: crew.primaryRole,
          bio: crew.bio || "",
          experienceYrs: crew.experienceYrs,
          avatarUrl: crew.avatarUrl || "",
          assignedCharters: [],
        });
      } else {
        setFormData({
          firstName: "",
          lastName: "",
          displayName: "",
          email: "",
          phone: "",
          primaryRole: "DECKHAND",
          bio: "",
          experienceYrs: 0,
          avatarUrl: "",
          assignedCharters: [],
        });
      }
    }
  }, [isOpen, crew]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      push({
        message: "Please select an image file",
        type: "error",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      push({
        message: "Image must be less than 5MB",
        type: "error",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { url } = await response.json();

      setFormData((prev) => ({ ...prev, avatarUrl: url }));
      push({
        message: "Avatar uploaded successfully",
        type: "success",
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      push({
        message: "Failed to upload avatar",
        type: "error",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = crew
        ? adminUserId
          ? `/api/captain/crew/${crew.id}?adminUserId=${adminUserId}`
          : `/api/captain/crew/${crew.id}`
        : adminUserId
          ? `/api/captain/crew?adminUserId=${adminUserId}`
          : "/api/captain/crew";

      const response = await fetch(url, {
        method: crew ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          displayName: formData.displayName,
          email: formData.email || null,
          phone: formData.phone,
          primaryRole: formData.primaryRole,
          bio: formData.bio || null,
          experienceYrs: formData.experienceYrs,
          avatarUrl: formData.avatarUrl || null,
          assignedCharters: formData.assignedCharters,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || `Failed to ${crew ? "update" : "create"} crew member`
        );
      }

      push({
        message: `Crew member ${crew ? "updated" : "created"} successfully`,
        type: "success",
      });
      onSuccess();
    } catch (error) {
      console.error("Crew dialog error:", error);
      push({
        message:
          error instanceof Error ? error.message : "Failed to save crew member",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCharterAssignment = () => {
    if (charters.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      assignedCharters: [
        ...prev.assignedCharters,
        { charterId: charters[0].id, role: "DECKHAND" },
      ],
    }));
  };

  const removeCharterAssignment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      assignedCharters: prev.assignedCharters.filter((_, i) => i !== index),
    }));
  };

  const updateCharterAssignment = (
    index: number,
    field: "charterId" | "role",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      assignedCharters: prev.assignedCharters.map((assignment, i) =>
        i === index ? { ...assignment, [field]: value } : assignment
      ),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {crew ? "Edit Crew Member" : "Add New Crew Member"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Profile Photo
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                {formData.avatarUrl ? (
                  <Image
                    src={formData.avatarUrl}
                    alt="Crew avatar"
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      {formData.avatarUrl ? "Change Photo" : "Upload Photo"}
                    </>
                  )}
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
                <p className="mt-2 text-xs text-slate-500">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                  }))
                }
                placeholder="How they prefer to be called"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="optional@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+60123456789"
                  required
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Professional Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryRole">Primary Role *</Label>
                <select
                  id="primaryRole"
                  value={formData.primaryRole}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryRole: e.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  {CREW_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experienceYrs">Years of Experience *</Label>
                <Input
                  id="experienceYrs"
                  type="number"
                  min="0"
                  max="99"
                  value={formData.experienceYrs}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      experienceYrs: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                rows={3}
                placeholder="Brief description of experience and skills..."
                className="resize-none"
              />
            </div>
          </div>

          {/* Charter Assignments */}
          {!crew && charters.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Charter Assignments
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCharterAssignment}
                >
                  Add Charter
                </Button>
              </div>

              {formData.assignedCharters.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No charters assigned yet. Add assignments above.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.assignedCharters.map((assignment, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-start p-3 rounded-lg border border-slate-200"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Charter</Label>
                          <select
                            value={assignment.charterId}
                            onChange={(e) =>
                              updateCharterAssignment(
                                index,
                                "charterId",
                                e.target.value
                              )
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                          >
                            {charters.map((charter) => (
                              <option key={charter.id} value={charter.id}>
                                {charter.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Role</Label>
                          <select
                            value={assignment.role}
                            onChange={(e) =>
                              updateCharterAssignment(
                                index,
                                "role",
                                e.target.value
                              )
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                          >
                            {CREW_ROLES.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCharterAssignment(index)}
                        className="mt-5"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#ec2227] hover:bg-[#d81e23]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {crew ? "Update" : "Create"} Crew Member
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

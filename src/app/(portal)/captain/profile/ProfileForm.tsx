"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Save } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CaptainProfile = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  backupPhone: string | null;
  bio: string;
  experienceYrs: number;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProfileFormProps = {
  profile: CaptainProfile;
  adminUserId?: string;
};

export function ProfileForm({ profile, adminUserId }: ProfileFormProps) {
  const router = useRouter();
  const { push } = useToasts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.displayName,
    phone: profile.phone,
    backupPhone: profile.backupPhone || "",
    bio: profile.bio,
    experienceYrs: profile.experienceYrs,
    avatarUrl: profile.avatarUrl,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      push({ message: "Please upload an image file", type: "error" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      push({ message: "Image must be smaller than 5MB", type: "error" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Upload to Vercel Blob
      const response = await fetch(
        `/api/blob/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          body: file,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
      push({ message: "Avatar uploaded successfully", type: "success" });
    } catch (error) {
      console.error("Avatar upload error:", error);
      push({ message: "Failed to upload avatar", type: "error" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = adminUserId
        ? `/api/captain/profile?adminUserId=${adminUserId}`
        : "/api/captain/profile";

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      push({ message: "Profile updated successfully", type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Profile update error:", error);
      push({
        message:
          error instanceof Error ? error.message : "Failed to update profile",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Avatar Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Profile Photo
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {formData.avatarUrl ? (
              <Image
                src={formData.avatarUrl}
                alt={formData.displayName}
                width={120}
                height={120}
                className="w-30 h-30 rounded-full object-cover border-4 border-slate-100"
              />
            ) : (
              <div className="w-30 h-30 rounded-full bg-slate-200 flex items-center justify-center border-4 border-slate-100">
                <Camera className="w-12 h-12 text-slate-400" />
              </div>
            )}
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <Label
              htmlFor="avatar"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              {formData.avatarUrl ? "Change Photo" : "Upload Photo"}
            </Label>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={isUploadingAvatar}
            />
            <p className="mt-2 text-xs text-slate-500">
              JPG, PNG or GIF. Max size 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, firstName: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lastName: e.target.value }))
              }
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, displayName: e.target.value }))
            }
            placeholder="Captain John"
            required
          />
          <p className="text-xs text-slate-500">
            This is how you&apos;ll appear to customers
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
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

        <div className="space-y-2">
          <Label htmlFor="backupPhone">Backup Phone Number</Label>
          <Input
            id="backupPhone"
            type="tel"
            value={formData.backupPhone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, backupPhone: e.target.value }))
            }
            placeholder="+60198765432 (Optional)"
          />
          <p className="text-xs text-slate-500">
            Alternative contact number for emergencies
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="experienceYrs">Years of Experience</Label>
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

      {/* Bio Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Professional Bio
        </h2>
        <div className="space-y-2">
          <Label htmlFor="bio">About You</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, bio: e.target.value }))
            }
            rows={6}
            placeholder="Tell customers about your experience, expertise, and what makes your charters special..."
            className="resize-none"
          />
          <p className="text-xs text-slate-500">
            {formData.bio.length} / 1000 characters
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
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
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

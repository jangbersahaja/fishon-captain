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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOAT_FEATURE_OPTIONS, BOAT_TYPES } from "@/utils/captainFormData";
import { upload } from "@vercel/blob/client";
import { Loader2, Plus, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Boat = {
  id: string;
  name: string;
  type: string;
  lengthFt: number | null;
  capacity: number | null;
  imageUrl: string | null;
  features: string[];
};

type Charter = {
  id: string;
  name: string;
  boatId: string | null;
};

type BoatDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  boat: Boat | null;
  charters: Charter[];
  onSuccess: () => void;
  adminUserId?: string;
};

export function BoatDialog({
  isOpen,
  onClose,
  boat,
  charters,
  adminUserId,
  onSuccess,
}: BoatDialogProps) {
  const { push } = useToasts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    lengthFt: 0,
    capacity: 0,
    charterId: "",
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Reset form when dialog opens/closes or boat changes
  useEffect(() => {
    if (isOpen) {
      if (boat) {
        setFormData({
          name: boat.name,
          type: boat.type,
          lengthFt: boat.lengthFt ?? 0,
          capacity: boat.capacity ?? 0,
          charterId: charters.find((c) => c.boatId === boat.id)?.id || "",
          imageUrl: boat.imageUrl || "",
        });
        setImagePreview(boat.imageUrl || "");
        setImageFile(null);
        setSelectedFeatures(boat.features);
      } else {
        setFormData({
          name: "",
          type: "",
          lengthFt: 0,
          capacity: 0,
          charterId: "",
          imageUrl: "",
        });
        setImagePreview("");
        setImageFile(null);
        setSelectedFeatures([]);
      }
    }
  }, [isOpen, boat, charters]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      push({ message: "Please select an image file", type: "error" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      push({ message: "Image must be smaller than 5MB", type: "error" });
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate charterId is provided
      if (!formData.charterId) {
        push({ message: "Please select a charter", type: "error" });
        setIsSubmitting(false);
        return;
      }

      let imageUrl = formData.imageUrl;

      // Upload new image if selected
      if (imageFile) {
        setIsUploadingImage(true);
        try {
          // Generate pathname for boat image
          const timestamp = Date.now();
          const sanitizedName = imageFile.name
            .replace(/[^\w\d.-]/g, "_")
            .slice(0, 100);
          const pathname = `boats/${timestamp}-${sanitizedName}`;

          const blob = await upload(pathname, imageFile, {
            access: "public",
            handleUploadUrl: "/api/blob/handle-upload",
          });
          imageUrl = blob.url;
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          push({ message: "Failed to upload image", type: "error" });
          setIsUploadingImage(false);
          setIsSubmitting(false);
          return;
        }
        setIsUploadingImage(false);
      }

      const url = boat
        ? adminUserId
          ? `/api/captain/boats/${boat.id}?adminUserId=${adminUserId}`
          : `/api/captain/boats/${boat.id}`
        : adminUserId
          ? `/api/captain/boats?adminUserId=${adminUserId}`
          : "/api/captain/boats";

      const response = await fetch(url, {
        method: boat ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          lengthFt: formData.lengthFt,
          capacity: formData.capacity,
          charterId: formData.charterId || null,
          imageUrl: imageUrl || null,
          features: selectedFeatures,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || `Failed to ${boat ? "update" : "create"} boat`
        );
      }

      push({
        message: `Boat ${boat ? "updated" : "created"} successfully`,
        type: "success",
      });
      onSuccess();
    } catch (error) {
      console.error("Boat dialog error:", error);
      push({
        message: error instanceof Error ? error.message : "Failed to save boat",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{boat ? "Edit Boat" : "Add New Boat"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Boat Image */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Boat Image</h3>

            {imagePreview ? (
              <div className="relative w-full aspect-video bg-slate-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Boat preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-white hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Boat Image
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Max 5MB • JPG, PNG, or WebP
                </p>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Boat Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name">Boat Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g., Ocean Explorer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Boat Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select boat type" />
                </SelectTrigger>
                <SelectContent>
                  {BOAT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lengthFt">Length (feet) *</Label>
                <Input
                  id="lengthFt"
                  type="number"
                  min="1"
                  max="999"
                  value={formData.lengthFt || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lengthFt: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="e.g., 30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Max Capacity (anglers) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.capacity || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      capacity: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="e.g., 6"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Boat Features</Label>
              <div className="grid grid-cols-2 gap-2">
                {BOAT_FEATURE_OPTIONS.map((feature) => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => {
                      setSelectedFeatures((prev) =>
                        prev.includes(feature)
                          ? prev.filter((f) => f !== feature)
                          : [...prev, feature]
                      );
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                      selectedFeatures.includes(feature)
                        ? "bg-[#ec2227] text-white border-[#ec2227]"
                        : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {feature}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Select the features available on this boat
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="charterId">Assign to Charter *</Label>
              <Select
                value={formData.charterId}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({
                    ...prev,
                    charterId: value,
                  }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a charter" />
                </SelectTrigger>
                <SelectContent>
                  {charters.map((charter) => (
                    <SelectItem key={charter.id} value={charter.id}>
                      {charter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Boat must be assigned to a charter. You can transfer it to
                another charter later.
              </p>
            </div>
          </div>

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
                  {boat ? "Update" : "Create"} Boat
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

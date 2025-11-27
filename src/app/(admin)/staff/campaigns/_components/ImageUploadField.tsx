"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  campaignCode?: string;
  id?: string;
  helpText?: string;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  campaignCode,
  id,
  helpText,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload to fishon-market via proxy API
  const MARKET_API_URL =
    process.env.NEXT_PUBLIC_FISHON_MARKET_URL || "https://fishon.my";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please select an image file",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 5MB",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (campaignCode) {
        formData.append("campaignCode", campaignCode);
      }

      // Upload directly to fishon-market internal API
      const response = await fetch(
        `${MARKET_API_URL}/api/internal/campaigns/upload-image`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      onChange(result.url);
      toast.success("Image uploaded", {
        description: "Image has been uploaded successfully",
      });
    } catch (error) {
      console.error("[ImageUpload] Error:", error);
      toast.error("Upload failed", {
        description:
          error instanceof Error ? error.message : "Failed to upload image",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUrlSubmit = (url: string) => {
    if (!url.trim()) return;

    // Basic URL validation
    try {
      new URL(url);
      onChange(url);
      setShowUrlInput(false);
      toast.success("Image URL added");
    } catch {
      toast.error("Invalid URL", {
        description: "Please enter a valid URL",
      });
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {value ? (
        <div className="space-y-2">
          {/* Image Preview */}
          <div className="relative w-full overflow-hidden border rounded-lg aspect-video bg-slate-50">
            <Image
              src={value}
              alt="Campaign image"
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Replace
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {showUrlInput ? (
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleUrlSubmit(e.currentTarget.value);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowUrlInput(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUrlInput(true)}
                disabled={isUploading}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Or paste URL
              </Button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
        </div>
      )}
    </div>
  );
}

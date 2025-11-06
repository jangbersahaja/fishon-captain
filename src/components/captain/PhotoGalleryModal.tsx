"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";

interface PhotoRecord {
  id: string;
  url: string;
  storageKey: string;
  charterId?: string | null;
}

interface PhotoGalleryModalProps {
  open: boolean;
  onClose: () => void;
  charterId: string | null;
  ownerId: string;
  onPhotosLinked?: () => void;
  // For new charter creation: pass selected photo IDs and callback
  selectedPhotoIds?: string[];
  onSelectionChange?: (photoIds: string[]) => void;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  open,
  onClose,
  charterId,
  ownerId,
  onPhotosLinked,
  selectedPhotoIds: initialSelectedPhotoIds,
  onSelectionChange,
}) => {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    new Set(initialSelectedPhotoIds || [])
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync selection state when prop changes (for new charters)
  useEffect(() => {
    if (initialSelectedPhotoIds) {
      setSelectedPhotoIds(new Set(initialSelectedPhotoIds));
    }
  }, [initialSelectedPhotoIds]);

  // Load owner's photos
  const loadPhotos = useCallback(async () => {
    if (!ownerId || !open) return;

    setLoading(true);
    try {
      // Fetch all owner's photos
      const res = await fetch(`/api/photos/list-self`);
      if (!res.ok) return;

      const data = await res.json();
      const allPhotos: PhotoRecord[] = data.photos || [];
      setPhotos(allPhotos);

      // Pre-select photos already linked to this charter
      if (charterId) {
        const linkedPhotos = allPhotos.filter((p) => p.charterId === charterId);
        const linked = new Set(linkedPhotos.map((p) => p.id));
        setSelectedPhotoIds(linked);
      }
    } catch (error) {
      console.error("Failed to load photos:", error);
    } finally {
      setLoading(false);
    }
  }, [ownerId, charterId, open]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Toggle photo selection
  const togglePhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  // Save photo links
  const handleSave = async () => {
    // Two modes:
    // 1. Edit mode (charterId exists): Save to database via API
    // 2. New charter mode (no charterId): Store in form state via callback
    if (charterId) {
      // Edit mode: save to database
      setSaving(true);
      try {
        const res = await fetch(`/api/charters/${charterId}/photos/link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photoIds: Array.from(selectedPhotoIds),
          }),
        });

        if (res.ok) {
          onPhotosLinked?.();
          onClose();
        } else {
          const data = await res.json();
          console.error("Failed to link photos:", data.error);
        }
      } catch (error) {
        console.error("Failed to save photo links:", error);
      } finally {
        setSaving(false);
      }
    } else {
      // New charter mode: notify parent of selection
      onSelectionChange?.(Array.from(selectedPhotoIds));
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl">
            Select Photos for Charter
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Choose from your existing photos to showcase this charter. Photos
            can be used across multiple charters.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
              <div className="p-4 mb-3 rounded-full bg-slate-100">
                <Loader2 className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium sm:text-base">
                No photos available
              </p>
              <p className="max-w-xs mt-2 text-xs sm:text-sm text-slate-400">
                Upload photos from the form above first. They&apos;ll appear
                here once uploaded.
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 pr-2 sm:pr-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {photos.map((photo) => {
                    const isSelected = selectedPhotoIds.has(photo.id);

                    return (
                      <button
                        key={photo.id}
                        onClick={() => togglePhoto(photo.id)}
                        className={`group relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all active:scale-95 ${
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                        }`}
                        aria-label={`${isSelected ? "Deselect" : "Select"} photo`}
                      >
                        {/* Photo */}
                        <Image
                          src={photo.url}
                          alt="Photo"
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />

                        {/* Overlay gradient for better icon visibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                        {/* Selection indicator */}
                        <div className="absolute z-10 top-2 right-2">
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 transition-transform bg-white rounded-full shadow-sm sm:w-6 sm:h-6 group-hover:scale-110" />
                          ) : (
                            <Circle className="w-5 h-5 transition-all rounded-full shadow-sm sm:w-6 sm:h-6 text-slate-400 bg-white/90 group-hover:bg-white group-hover:text-slate-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-4 mt-4 border-t sm:flex-row sm:items-center sm:justify-between">
                {/* Selection count */}
                <div className="flex items-center justify-between sm:justify-start">
                  <p className="text-sm font-medium text-slate-700 sm:text-base">
                    {selectedPhotoIds.size === 0 ? (
                      <span className="text-slate-500">No photos selected</span>
                    ) : (
                      <span>
                        <span className="text-blue-600">
                          {selectedPhotoIds.size}
                        </span>{" "}
                        photo{selectedPhotoIds.size !== 1 ? "s" : ""} selected
                      </span>
                    )}
                  </p>
                  {/* Mobile: Show deselect all button */}
                  {selectedPhotoIds.size > 0 && (
                    <button
                      onClick={() => setSelectedPhotoIds(new Set())}
                      className="text-xs text-blue-600 sm:hidden hover:text-blue-700"
                    >
                      Deselect all
                    </button>
                  )}
                </div>

                {/* Desktop: Deselect all link */}
                {selectedPhotoIds.size > 0 && (
                  <button
                    onClick={() => setSelectedPhotoIds(new Set())}
                    className="hidden text-sm text-blue-600 sm:block hover:text-blue-700"
                  >
                    Deselect all
                  </button>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors border rounded-lg sm:flex-none border-slate-300 hover:bg-slate-50 active:bg-slate-100"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center flex-1 gap-2 px-4 py-2.5 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg sm:flex-none hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving..." : "Save Selection"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

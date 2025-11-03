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

interface VideoRecord {
  id: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  processStatus: string;
  charterId?: string | null;
  ready720pUrl?: string | null;
  processedDurationSec?: number | null;
}

interface VideoGalleryModalProps {
  open: boolean;
  onClose: () => void;
  charterId: string | null;
  captainId: string;
  onVideosLinked?: () => void;
}

export const VideoGalleryModal: React.FC<VideoGalleryModalProps> = ({
  open,
  onClose,
  charterId,
  captainId,
  onVideosLinked,
}) => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load captain's videos
  const loadVideos = useCallback(async () => {
    if (!captainId || !open) return;

    setLoading(true);
    try {
      // Fetch all captain's videos
      const res = await fetch(`/api/videos/list?ownerId=${captainId}`);
      if (!res.ok) return;

      const data = await res.json();
      const allVideos: VideoRecord[] = data.videos || [];

      // Only show ready videos
      const readyVideos = allVideos.filter((v) => v.processStatus === "ready");
      setVideos(readyVideos);

      // Pre-select videos already linked to this charter via junction table
      if (charterId) {
        const linkedRes = await fetch(
          `/api/videos/list?ownerId=${captainId}&charterId=${charterId}`
        );
        if (linkedRes.ok) {
          const linkedData = await linkedRes.json();
          const linkedVideos: VideoRecord[] = linkedData.videos || [];
          const linked = new Set(linkedVideos.map((v) => v.id));
          setSelectedVideoIds(linked);
        }
      }
    } catch (error) {
      console.error("Failed to load videos:", error);
    } finally {
      setLoading(false);
    }
  }, [captainId, charterId, open]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Toggle video selection
  const toggleVideo = (videoId: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  // Save video links
  const handleSave = async () => {
    if (!charterId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/charters/${charterId}/videos/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoIds: Array.from(selectedVideoIds),
        }),
      });

      if (res.ok) {
        onVideosLinked?.();
        onClose();
      } else {
        const data = await res.json();
        console.error("Failed to link videos:", data.error);
      }
    } catch (error) {
      console.error("Failed to save video links:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl">
            Select Videos for Charter
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Choose from your existing videos to showcase this charter. Videos
            can be used across multiple charters.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
              <div className="p-4 mb-3 rounded-full bg-slate-100">
                <Loader2 className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium sm:text-base">
                No videos available
              </p>
              <p className="max-w-xs mt-2 text-xs sm:text-sm text-slate-400">
                Upload videos from the form above first. They&apos;ll appear
                here once processing is complete.
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 pr-2 sm:pr-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                  {videos.map((video) => {
                    const isSelected = selectedVideoIds.has(video.id);
                    const videoUrl = video.ready720pUrl || video.originalUrl;
                    const thumbnail = video.thumbnailUrl || videoUrl;
                    const duration = video.processedDurationSec
                      ? `${Math.round(video.processedDurationSec)}s`
                      : "";

                    return (
                      <button
                        key={video.id}
                        onClick={() => toggleVideo(video.id)}
                        className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all active:scale-95 ${
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                        }`}
                        aria-label={`${isSelected ? "Deselect" : "Select"} video`}
                      >
                        {/* Video thumbnail */}
                        <Image
                          src={thumbnail}
                          alt="Video thumbnail"
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

                        {/* Duration badge */}
                        {duration && (
                          <div className="absolute z-10 px-2 py-0.5 sm:py-1 text-xs font-medium text-white rounded shadow-sm bottom-2 right-2 bg-black/75 backdrop-blur-sm">
                            {duration}
                          </div>
                        )}
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
                    {selectedVideoIds.size === 0 ? (
                      <span className="text-slate-500">No videos selected</span>
                    ) : (
                      <span>
                        <span className="text-blue-600">
                          {selectedVideoIds.size}
                        </span>{" "}
                        video{selectedVideoIds.size !== 1 ? "s" : ""} selected
                      </span>
                    )}
                  </p>
                  {/* Mobile: Show deselect all button */}
                  {selectedVideoIds.size > 0 && (
                    <button
                      onClick={() => setSelectedVideoIds(new Set())}
                      className="text-xs text-blue-600 sm:hidden hover:text-blue-700"
                    >
                      Deselect all
                    </button>
                  )}
                </div>

                {/* Desktop: Deselect all link */}
                {selectedVideoIds.size > 0 && (
                  <button
                    onClick={() => setSelectedVideoIds(new Set())}
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
                    disabled={saving || !charterId}
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

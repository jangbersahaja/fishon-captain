"use client";

import { Anchor, MapPin, ShipIcon, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import type { CaptainCardData } from "./CaptainCard";

interface CaptainDetailModalProps {
  captain: CaptainCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CaptainDetailModal({
  captain,
  open,
  onOpenChange,
}: CaptainDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open || !captain) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-neutral-100 p-2 hover:bg-neutral-200 transition-colors"
          >
            <X className="h-5 w-5 text-neutral-600" />
          </button>

          {/* Header background with gradient */}
          <div className="relative h-32 bg-gradient-to-br from-[#EC2227] to-[#EC2227]/80" />

          {/* Content */}
          <div className="relative -mt-16 px-6 pb-8 pt-8">
            {/* Avatar */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white">
                  {captain.avatarUrl ? (
                    <Image
                      src={captain.avatarUrl}
                      alt={captain.displayName}
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#EC2227]/10 to-[#EC2227]/5 flex items-center justify-center">
                      <Anchor className="h-12 w-12 text-[#EC2227]/40" />
                    </div>
                  )}
                </div>
                {/* Experience badge */}
                <div className="absolute -bottom-2 -right-2 rounded-full bg-[#EC2227] px-3 py-1 text-sm font-bold text-white shadow-lg border-4 border-white">
                  {captain.experienceYrs}y
                </div>
              </div>
            </div>

            {/* Name and location */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-neutral-900">
                {captain.displayName}
              </h2>
              <div className="mt-2 flex items-center justify-center gap-2 text-neutral-600">
                <MapPin className="h-5 w-5 text-[#EC2227]" />
                <span className="font-medium">
                  {captain.city}, {captain.state}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 h-px bg-neutral-200" />

            {/* Bio section */}
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                About
              </h3>
              <p className="text-base leading-relaxed text-neutral-700">
                {captain.bio || "Passionate fishing charter captain"}
              </p>
            </div>

            {/* Stats grid */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-neutral-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ShipIcon className="h-5 w-5 text-[#EC2227]" />
                  <span className="text-xl font-bold text-neutral-900">
                    {captain.charterCount}
                  </span>
                </div>
                <p className="text-xs font-medium text-neutral-600">
                  Available Trips
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Anchor className="h-5 w-5 text-[#EC2227]" />
                  <p className="text-lg font-bold text-neutral-900">
                    {captain.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      year: "2-digit",
                    })}
                  </p>
                </div>
                <p className="text-xs font-medium text-neutral-600 tracking-wide">
                  Fishon Captain Since
                </p>
              </div>
            </div>

            {/* CTA */}
            <a
              href={`/auth?next=/captain/form`}
              className="block w-full rounded-xl bg-[#EC2227] py-3 text-center font-semibold text-white hover:bg-[#EC2227]/90 transition-colors shadow-md hover:shadow-lg"
            >
              Start Your Journey
            </a>

            {/* Inspirational text */}
            <p className="mt-4 text-center text-xs text-neutral-600">
              Join {captain.charterCount}+ captains already earning on Fishon.my
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

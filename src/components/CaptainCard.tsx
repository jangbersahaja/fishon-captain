"use client";

import { Anchor, MapPin, Ship } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import CaptainDetailModal from "./CaptainDetailModal";

export interface CaptainCardData {
  id: string;
  displayName: string;
  bio: string;
  experienceYrs: number;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  state: string;
  city: string;
  charterCount: number;
  createdAt: Date;
}

interface CaptainCardProps {
  captain: CaptainCardData;
}

// Helper function to convert to title case
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function CaptainCard({ captain }: CaptainCardProps) {
  const [showModal, setShowModal] = useState(false);
  const displayNameTitleCase = toTitleCase(captain.displayName);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="group relative h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:border-[#EC2227]/50 hover:shadow-lg"
      >
        {/* Background image overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#EC2227]/5 to-transparent" />

        {/* Content */}
        <div className="relative flex flex-col items-center justify-center p-6 text-center h-full">
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-[#EC2227]/20 group-hover:border-[#EC2227]/50 transition-colors shadow-md">
              {captain.avatarUrl ? (
                <Image
                  src={captain.avatarUrl}
                  alt={captain.displayName}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#EC2227]/10 to-[#EC2227]/5 flex items-center justify-center">
                  <Anchor className="h-8 w-8 text-[#EC2227]/40" />
                </div>
              )}
            </div>
            {/* Badge */}
            <div className="absolute -bottom-1 -right-1 rounded-full bg-[#EC2227] px-2 py-1 text-[10px] font-bold text-white shadow-md">
              {captain.experienceYrs}y
            </div>
          </div>

          {/* Name */}
          <h3 className="text-lg font-bold text-neutral-900 group-hover:text-[#EC2227] transition-colors">
            {displayNameTitleCase}
          </h3>

          {/* Location */}
          <div className="mt-2 flex items-center justify-center gap-1 text-sm text-neutral-600">
            <MapPin className="h-4 w-4 text-[#EC2227]" />
            <span>{captain.city}</span>
          </div>

          {/* Bio preview */}
          <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
            {captain.bio || "Passionate fishing charter captain"}
          </p>

          {/* Stats */}
          <div className="mt-4 flex gap-3 text-xs text-neutral-700">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-100 group-hover:bg-[#EC2227]/10 transition-colors">
              <Ship className="h-3 w-3 text-[#EC2227]" />
              <span className="font-semibold">{captain.charterCount}</span>
              <span>Trips</span>
            </div>
          </div>

          {/* Hover arrow */}
          <div className="mt-4 text-[#EC2227] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            View Profile →
          </div>
        </div>
      </button>

      {/* Modal */}
      <CaptainDetailModal
        captain={captain}
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}

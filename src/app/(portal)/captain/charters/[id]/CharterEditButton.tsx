"use client";

import { Edit2 } from "lucide-react";
import { useState } from "react";
import { CharterEditDialog } from "./CharterEditDialog";

type CharterData = {
  id: string;
  name: string;
  charterType: string;
  startingPoint: string;
  city: string;
  state: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  amenities: Array<{ label: string }>;
  policies: {
    licenseProvided: boolean;
    catchAndKeep: boolean;
    catchAndRelease: boolean;
    childFriendly: boolean;
    liveBaitProvided: boolean;
    alcoholNotAllowed: boolean;
    smokingNotAllowed: boolean;
  } | null;
  pickup: {
    fee: number | null;
    notes: string | null;
    areas: Array<{ label: string }>;
  } | null;
};

type CharterEditButtonProps = {
  charter: CharterData;
  adminUserId?: string;
};

export function CharterEditButton({
  charter,
  adminUserId,
}: CharterEditButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[#ec2227] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d81e23]"
      >
        <Edit2 className="w-4 h-4" />
        Edit Charter
      </button>

      <CharterEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        charter={charter}
        adminUserId={adminUserId}
      />
    </>
  );
}

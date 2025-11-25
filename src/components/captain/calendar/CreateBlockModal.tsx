"use client";

import { CharterUnavailability } from "@prisma/client";
import { UnavailabilityModal } from "./UnavailabilityModal";

interface CreateBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillDate?: Date;
  charterId: string;
  onSuccess?: () => void;
  editBlock?: CharterUnavailability | null;
  trips: { id: string; name: string; durationHours: number }[];
}

export function CreateBlockModal(props: CreateBlockModalProps) {
  return <UnavailabilityModal {...props} />;
}

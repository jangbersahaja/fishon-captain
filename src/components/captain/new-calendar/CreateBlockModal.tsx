"use client";

import { CharterUnavailability } from "@prisma/client";
import { UnavailabilityModal } from "../calendar/UnavailabilityModal";

interface CreateBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillDate?: Date;
  charterId: string;
  onSuccess?: () => void;
  editBlock?: CharterUnavailability | null;
}

export function CreateBlockModal(props: CreateBlockModalProps) {
  return <UnavailabilityModal {...props} />;
}

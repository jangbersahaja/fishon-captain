/**
 * Professional Licenses Section Component
 * Handles captain license, boat registration, and fishing license uploads
 */

import { FileText } from "lucide-react";
import { submitDocument } from "../server/documents-api";
import type { Statused } from "../types";

interface ProfessionalLicensesSectionProps {
  // State
  captainLicense: Statused | null;
  setCaptainLicense: (
    value: Statused | null | ((prev: Statused | null) => Statused | null)
  ) => void;
  boatReg: Statused | null;
  setBoatReg: (
    value: Statused | null | ((prev: Statused | null) => Statused | null)
  ) => void;
  fishingLicense: Statused | null;
  setFishingLicense: (
    value: Statused | null | ((prev: Statused | null) => Statused | null)
  ) => void;
  // Helpers
  dirty: Record<string, boolean>;
  setDirty: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  loading: Record<string, boolean>;
  setMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
  // Upload hooks
  captainLicenseUpload: {
    handleReplace: (file: File) => void;
    handleRemove: () => void;
  };
  boatRegUpload: {
    handleReplace: (file: File) => void;
    handleRemove: () => void;
  };
  fishingLicenseUpload: {
    handleReplace: (file: File) => void;
    handleRemove: () => void;
  };
  openConfirm: (message: string, onConfirm: () => void | Promise<void>) => void;
  // Child components
  FileInput: React.ComponentType<{
    label: string;
    existing: Statused | null;
    onReplace: (file: File) => void;
    onRemove?: () => void;
    openConfirm?: (message: string, run: () => void | Promise<void>) => void;
    loading?: boolean;
    accept: string;
  }>;
  Section: React.ComponentType<{
    title: string;
    description: string;
    processing?: boolean;
    validated?: boolean;
    children: React.ReactNode;
  }>;
  SubmitRow: React.ComponentType<{
    disabled: boolean;
    onSubmit: () => void;
  }>;
}

export function ProfessionalLicensesSection({
  captainLicense,
  setCaptainLicense,
  boatReg,
  setBoatReg,
  fishingLicense,
  setFishingLicense,
  dirty,
  setDirty,
  loading,
  setMessage,
  captainLicenseUpload,
  boatRegUpload,
  fishingLicenseUpload,
  openConfirm,
  FileInput,
  Section,
  SubmitRow,
}: ProfessionalLicensesSectionProps) {
  const handleSubmitDocument = async (
    fieldName: string,
    setter: (
      value: Statused | null | ((prev: Statused | null) => Statused | null)
    ) => void
  ) => {
    try {
      await submitDocument(fieldName);

      setter((v) => (v ? { ...v, status: "processing" } : v));
      setDirty((d) => ({ ...d, [fieldName]: false }));
      setMessage({ type: "success", text: "Submitted for verification." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Submit failed",
      });
    }
  };

  return (
    <div className="p-6 mb-6 space-y-4 bg-white border shadow-sm rounded-xl border-slate-200">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-5 h-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Professional Licenses
        </h2>
        <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase bg-slate-100 rounded">
          Optional
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Upload your captain license, boat registration, and fishing license.
        Helps build trust with anglers.
      </p>

      <div className="space-y-4">
        {/* Captain License */}
        <Section
          title="Captain license"
          description="Upload an image or document (PDF, DOCX, etc.). Optional, but recommended."
          processing={captainLicense?.status === "processing"}
          validated={captainLicense?.status === "validated"}
        >
          <FileInput
            label="Captain license"
            existing={captainLicense}
            onReplace={captainLicenseUpload.handleReplace}
            onRemove={captainLicenseUpload.handleRemove}
            openConfirm={openConfirm}
            loading={!!loading["captainLicense"]}
            accept="*/*"
          />
          <SubmitRow
            disabled={
              !captainLicense ||
              captainLicense.status === "processing" ||
              captainLicense.status === "validated" ||
              !dirty.captainLicense
            }
            onSubmit={() =>
              handleSubmitDocument("captainLicense", setCaptainLicense)
            }
          />
        </Section>

        {/* Boat Registration */}
        <Section
          title="Boat registration certificate"
          description="Upload any supporting document (PDF, image, DOCX, ZIP). Optional."
          processing={boatReg?.status === "processing"}
          validated={boatReg?.status === "validated"}
        >
          <FileInput
            label="Boat registration"
            existing={boatReg}
            onReplace={boatRegUpload.handleReplace}
            onRemove={boatRegUpload.handleRemove}
            openConfirm={openConfirm}
            loading={!!loading["boatRegistration"]}
            accept="*/*"
          />
          <SubmitRow
            disabled={
              !boatReg ||
              boatReg.status === "processing" ||
              boatReg.status === "validated" ||
              !dirty.boatRegistration
            }
            onSubmit={() =>
              handleSubmitDocument("boatRegistration", setBoatReg)
            }
          />
        </Section>

        {/* Fishing License */}
        <Section
          title="Fishing license"
          description="Upload image or document. Optional."
          processing={fishingLicense?.status === "processing"}
          validated={fishingLicense?.status === "validated"}
        >
          <FileInput
            label="Fishing license"
            existing={fishingLicense}
            onReplace={fishingLicenseUpload.handleReplace}
            onRemove={fishingLicenseUpload.handleRemove}
            openConfirm={openConfirm}
            loading={!!loading["fishingLicense"]}
            accept="*/*"
          />
          <SubmitRow
            disabled={
              !fishingLicense ||
              fishingLicense.status === "processing" ||
              fishingLicense.status === "validated" ||
              !dirty.fishingLicense
            }
            onSubmit={() =>
              handleSubmitDocument("fishingLicense", setFishingLicense)
            }
          />
        </Section>
      </div>
    </div>
  );
}

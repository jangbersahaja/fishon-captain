/**
 * Government ID Section Component
 * Handles MyKad/Passport upload and verification
 */

import { CheckCircle2, ChevronDown, IdCard, Save } from "lucide-react";
import { submitGovernmentId } from "../server/documents-api";
import type { Statused } from "../types";

interface GovernmentIdSectionProps {
  // State
  idFront: Statused | null;
  setIdFront: (
    value: Statused | null | ((prev: Statused | null) => Statused | null)
  ) => void;
  idBack: Statused | null;
  setIdBack: (
    value: Statused | null | ((prev: Statused | null) => Statused | null)
  ) => void;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  // Helpers
  dirty: Record<string, boolean>;
  setDirty: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  loading: Record<string, boolean>;
  setMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
  // Upload hooks
  idFrontUpload: {
    handleReplace: (file: File) => void;
    handleRemove: () => void;
  };
  idBackUpload: {
    handleReplace: (file: File) => void;
    handleRemove: () => void;
  };
  openConfirm: (message: string, onConfirm: () => void | Promise<void>) => void;
  // Child component
  FileInput: React.ComponentType<{
    label: string;
    required?: boolean;
    existing: Statused | null;
    onReplace: (file: File) => void;
    onRemove?: () => void;
    openConfirm?: (message: string, run: () => void | Promise<void>) => void;
    loading?: boolean;
    accept: string;
  }>;
}

export function GovernmentIdSection({
  idFront,
  setIdFront,
  idBack,
  setIdBack,
  collapsed,
  setCollapsed,
  dirty,
  setDirty,
  loading,
  setMessage,
  idFrontUpload,
  idBackUpload,
  openConfirm,
  FileInput,
}: GovernmentIdSectionProps) {
  const handleSubmit = async () => {
    setMessage(null);

    if (!idFront || !idBack) {
      setMessage({
        type: "error",
        text: "Upload both front and back before submitting.",
      });
      return;
    }

    try {
      await submitGovernmentId();

      setIdFront((v) => (v ? { ...v, status: "processing" } : v));
      setIdBack((v) => (v ? { ...v, status: "processing" } : v));
      setDirty((d) => ({ ...d, idFront: false, idBack: false }));
      setMessage({ type: "success", text: "Submitted for verification." });

      // Auto-collapse after successful submit
      setCollapsed(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Submit failed",
      });
    }
  };

  const isValidated =
    idFront?.status === "validated" && idBack?.status === "validated";
  const isProcessing =
    idFront?.status === "processing" || idBack?.status === "processing";
  const isDisabled =
    !idFront ||
    !idBack ||
    isProcessing ||
    isValidated ||
    (!dirty.idFront && !dirty.idBack);

  return (
    <div className="p-6 mb-6 bg-white border shadow-sm rounded-xl border-slate-200">
      {/* Identity Documents Section */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center w-full gap-2 mb-1 text-left group"
      >
        <IdCard className="w-5 h-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Government ID
        </h2>
        <span className="px-2 py-0.5 text-[10px] font-bold text-red-600 uppercase bg-red-50 rounded">
          Required
        </span>
        {isValidated && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        <ChevronDown
          className={`w-5 h-5 ml-auto text-slate-400 transition-transform ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      </button>
      <p className="mb-4 text-sm text-slate-600">
        Upload clear photos of both sides of your MyKad or Passport to verify
        your identity.
      </p>

      {!collapsed && (
        <div className="space-y-4">
          <FileInput
            label="Front side"
            required
            existing={idFront}
            onReplace={idFrontUpload.handleReplace}
            onRemove={idFrontUpload.handleRemove}
            openConfirm={openConfirm}
            loading={!!loading["idFront"]}
            accept="image/*"
          />
          <FileInput
            label="Back side"
            required
            existing={idBack}
            onReplace={idBackUpload.handleReplace}
            onRemove={idBackUpload.handleRemove}
            openConfirm={openConfirm}
            loading={!!loading["idBack"]}
            accept="image/*"
          />

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isDisabled}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-full shadow-sm bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Submit for Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { FileText } from "lucide-react";
import type { DocType, Statused } from "../types";

interface AdditionalDocumentsSectionProps {
  additionalDocs: Statused[];
  setAdditionalDocs: (
    value: Statused[] | ((prev: Statused[]) => Statused[])
  ) => void;
  loading: Record<string, boolean>;
  setLoading: (
    value:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void;
  setMessage: (
    value:
      | { type: "success" | "error"; text: string }
      | null
      | ((
          prev: { type: "success" | "error"; text: string } | null
        ) => { type: "success" | "error"; text: string } | null)
  ) => void;
  uploadFile: (file: File, docType: DocType) => Promise<Statused>;
  saveField: (payload: Record<string, unknown>) => Promise<void>;
  deleteKey: (key: string) => Promise<void>;
  openConfirm: (message: string, run: () => void | Promise<void>) => void;
  Section: React.ComponentType<{
    title: string;
    description?: string;
    children: React.ReactNode;
    processing?: boolean;
    validated?: boolean;
    collapsible?: boolean;
  }>;
  MultiFileInput: React.ComponentType<{
    label: string;
    files: Statused[];
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
    onRename: (key: string, name: string) => void;
    loading?: boolean;
    accept: string;
    openConfirm?: (message: string, run: () => void | Promise<void>) => void;
  }>;
}

export function AdditionalDocumentsSection({
  additionalDocs,
  setAdditionalDocs,
  loading,
  setLoading,
  setMessage,
  uploadFile,
  saveField,
  deleteKey,
  openConfirm,
  Section,
  MultiFileInput,
}: AdditionalDocumentsSectionProps) {
  async function handleAdditionalAdd(files: File[]) {
    if (!files.length) return;
    setLoading((s) => ({ ...s, additional: true }));
    setMessage(null);
    try {
      const uploads: Statused[] = [];
      for (const f of files) {
        const up = await uploadFile(f, "additional");
        uploads.push(up);
        await saveField({ additionalAdd: up });
      }
      setAdditionalDocs((arr) => [...arr, ...uploads]);
    } catch {
      setMessage({ type: "error", text: "Some files failed to upload." });
    } finally {
      setLoading((s) => ({ ...s, additional: false }));
    }
  }

  async function handleAdditionalRemove(i: number) {
    const item = additionalDocs[i];
    if (!item) return;
    if (item.status === "validated") {
      setMessage({
        type: "error",
        text: "Validated document cannot be removed.",
      });
      return;
    }
    setLoading((s) => ({ ...s, additional: true }));
    try {
      await deleteKey(item.key);
      setAdditionalDocs((arr) => arr.filter((_, idx) => idx !== i));
      await saveField({ additionalRemove: item.key });
    } finally {
      setLoading((s) => ({ ...s, additional: false }));
    }
  }

  return (
    <div className="p-6 mb-6 space-y-4 bg-white border shadow-sm rounded-xl border-slate-200">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-5 h-5 text-slate-700" />
        <h2 className="text-base font-semibold text-slate-900">
          Additional Documents
        </h2>
        <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase bg-slate-100 rounded">
          Optional
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Upload insurance, certifications, or other supporting documents. No
        verification required.
      </p>

      <Section
        title="Supporting Files"
        description="Upload insurance, certifications, or other documents. Accepts all file types."
        collapsible={false}
      >
        <MultiFileInput
          label="Additional documents"
          files={additionalDocs}
          onAdd={(files) => handleAdditionalAdd(files)}
          onRemove={(i) => handleAdditionalRemove(i)}
          onRename={(key, name) =>
            setAdditionalDocs((arr) =>
              arr.map((it) => (it.key === key ? { ...it, name } : it))
            )
          }
          loading={!!loading["additional"]}
          accept="*/*"
          openConfirm={openConfirm}
        />
        {/* Additional documents are saved instantly; no verification step. */}
      </Section>
    </div>
  );
}

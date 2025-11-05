"use client";

import { zIndexClasses } from "@/config/zIndex";

interface ConfirmDialogProps {
  message: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}

export function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
  busy,
}: ConfirmDialogProps) {
  return (
    <div
      className={`fixed inset-0 ${zIndexClasses.backdrop} flex items-center justify-center p-4`}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm p-5 bg-white border rounded-lg shadow-xl border-slate-200">
        <h3 className="text-sm font-medium text-slate-800">Confirm removal</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{message}</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

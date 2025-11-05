"use client";

import { Save } from "lucide-react";

interface SubmitRowProps {
  disabled?: boolean;
  onSubmit: () => void;
}

export function SubmitRow({ disabled, onSubmit }: SubmitRowProps) {
  return (
    <div className="flex justify-end mt-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-full shadow-sm bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
      >
        <Save className="w-4 h-4" /> Save
      </button>
    </div>
  );
}

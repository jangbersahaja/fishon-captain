"use client";

import { Loader2, Trash2 } from "lucide-react";
import type { Statused } from "../../types";
import { PreviewOrIcon } from "./PreviewOrIcon";

interface MultiFileInputProps {
  label: string;
  files: Statused[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  onRename: (key: string, name: string) => void;
  loading?: boolean;
  accept: string;
  openConfirm?: (message: string, run: () => void | Promise<void>) => void;
}

export function MultiFileInput({
  label,
  files,
  onAdd,
  onRemove,
  onRename,
  loading,
  accept,
  openConfirm,
}: MultiFileInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 mt-1">
        <input
          type="file"
          accept={accept}
          multiple
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length) onAdd(list);
            e.currentTarget.value = "";
          }}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100"
        />
        {files.length > 0 && (
          <ul className="grid gap-2 text-xs">
            {files.map((f, i) => (
              <li
                key={f.key}
                className="flex items-center justify-between gap-3 px-3 py-2 border rounded-lg border-slate-200 bg-slate-50 text-slate-700"
              >
                <div className="flex items-center flex-1 min-w-0 gap-2">
                  <PreviewOrIcon file={f} />
                  <input
                    type="text"
                    defaultValue={f.name}
                    placeholder="Document name"
                    className="w-full min-w-0 px-2 py-1 text-xs bg-white border rounded-md border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    onBlur={async (e) => {
                      const name = e.currentTarget.value.trim();
                      if (!name || name === f.name) return;
                      // update parent state optimistically
                      onRename(f.key, name);
                      await fetch("/api/captain/documents", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          additionalUpdateName: { key: f.key, name },
                        }),
                      });
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openConfirm
                      ? openConfirm("Remove this document?", () => onRemove(i))
                      : onRemove(i)
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border rounded-full border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

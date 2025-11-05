"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { Statused } from "../../types";
import { PreviewOrIcon } from "./PreviewOrIcon";

interface FileInputProps {
  label: string;
  existing: Statused | null;
  onReplace: (file: File) => void;
  onRemove?: () => void;
  openConfirm?: (message: string, run: () => void | Promise<void>) => void;
  loading?: boolean;
  accept: string;
  capture?: "user" | "environment";
  required?: boolean;
  variant?: "govId";
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FileInput({
  label,
  existing,
  onReplace,
  onRemove,
  openConfirm,
  loading,
  accept,
  capture,
  required,
  variant,
}: FileInputProps) {
  const inputId = useMemo(
    () => `${label}-file-input`.replace(/\s+/g, "-"),
    [label]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onReplace(f);
      e.currentTarget.value = ""; // allow re-select same file
    },
    [onReplace]
  );

  return (
    <div className="block">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">
          {label}
          {required ? " *" : ""}
        </span>
        {loading ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </span>
        ) : existing ? (
          existing.status === "validated" ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validated
              {existing.validForPeriod?.to ? (
                <span className="ml-1 text-emerald-800/80">
                  · Valid until: {fmtDate(existing.validForPeriod.to)}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              Updated on {fmtDate(existing.updatedAt)}
            </span>
          )
        ) : (
          <span className="text-xs text-slate-500">Not uploaded</span>
        )}
      </div>
      <div className="mt-2">
        <input
          id={inputId}
          type="file"
          accept={accept}
          capture={variant === "govId" ? capture || "environment" : capture}
          onChange={handleSelect}
          className="hidden"
          required={required && !existing}
          disabled={existing?.status === "validated"}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={existing?.status === "validated"}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {existing ? "Replace File" : "Upload File"}
          </button>
          {existing && existing.status !== "validated" && onRemove && (
            <button
              type="button"
              onClick={() =>
                openConfirm
                  ? openConfirm(`Remove ${label}? This cannot be undone.`, () =>
                      onRemove()
                    )
                  : onRemove()
              }
              className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
        {existing && (
          <div className="flex items-center max-w-sm gap-2 mt-3">
            <PreviewOrIcon file={existing} />
            <span className="text-xs truncate text-slate-600">
              {existing.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

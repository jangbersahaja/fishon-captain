"use client";
import { FIELD_LABELS } from "@features/charter-onboarding/fieldLabels";
import React from "react";

export interface ErrorSummaryProps {
  errors: string[];
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({ errors }) => {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
      <p className="font-semibold mb-1">Please fix before continuing:</p>
      <ul className="list-disc pl-4 space-y-0.5">
        {errors.map((f, i) => (
          <li key={f + i}>
            <button
              type="button"
              onClick={() => {
                const fieldKey = Object.entries(FIELD_LABELS).find(
                  ([, label]) => label === f
                )?.[0];
                if (!fieldKey) return;
                const el = document.querySelector(
                  `[name='${fieldKey.replace(/\./g, ".")}']`
                ) as HTMLElement | null;
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  setTimeout(() => el.focus?.(), 300);
                }
              }}
              className="underline hover:text-red-800 focus:outline-none"
            >
              {f}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

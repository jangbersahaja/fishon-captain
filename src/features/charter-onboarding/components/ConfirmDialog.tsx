/**
 * ConfirmDialog.tsx
 * Phase 1 extraction: Previously inline within FormSection. This dialog handles final submit/save confirmation.
 * Keeping it standalone reduces noise in the main orchestration component and lets us test/future-enhance easily.
 */
"use client";
import { zIndexClasses } from "@/config/zIndex";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  isEditing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean; // disables confirm while async ops in flight
  errorMessage?: string | null;
  requireAgreements?: boolean;
}

/**
 * Accessibility Notes:
 * - Focus trap implemented manually (kept minimal to avoid adding a heavy dependency now).
 * - Escape key closes (cancel).
 * - Returns focus to previously focused element on unmount.
 */
import { useState } from "react";

export function ConfirmDialog({
  isEditing,
  onCancel,
  onConfirm,
  busy,
  errorMessage,
  requireAgreements = false,
}: ConfirmDialogProps) {
  // Agreement checkboxes (only for new registration, not edit)
  const [checked, setChecked] = useState([false, false, false]);
  const allChecked = checked.every(Boolean);
  const cancelRef = useCallback((el: HTMLButtonElement | null) => {
    if (el) setTimeout(() => el.focus(), 0);
  }, []);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Keyboard handling (Escape & Tab focus loop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Restore original focus when closing
  useEffect(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    return () => {
      if (lastFocusedRef.current) {
        try {
          lastFocusedRef.current.focus();
        } catch {
          /* ignored */
        }
      }
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className={`fixed inset-0 ${zIndexClasses.backdrop} flex items-end sm:items-center justify-center bg-black/40 px-4 py-6`}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 animate-in fade-in zoom-in"
      >
        <h2
          id="confirm-dialog-title"
          className="text-xl font-semibold text-slate-900"
        >
          {isEditing ? "Save changes?" : "Confirm Submission"}
        </h2>

        <hr className="border-t my-6 border-neutral-200" />
        {requireAgreements && !isEditing && (
          <div className="mb-10 space-y-3">
            <p id="confirm-dialog-desc" className="text-sm text-slate-600 mb-3">
              To complete your registration, please review and agree to the
              following.
            </p>
            <div className="ml-5 space-y-3">
              <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-1 accent-slate-900"
                  checked={checked[0]}
                  onChange={(e) =>
                    setChecked([e.target.checked, checked[1], checked[2]])
                  }
                />
                <span>
                  I have read and agree to the{" "}
                  <Link
                    href="/captain-terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-slate-900 hover:text-blue-700"
                  >
                    Terms &amp; Conditions
                  </Link>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-1 accent-slate-900"
                  checked={checked[1]}
                  onChange={(e) =>
                    setChecked([checked[0], e.target.checked, checked[2]])
                  }
                />
                <span>
                  I have read the{" "}
                  <Link
                    href="/refund-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-slate-900 hover:text-blue-700"
                  >
                    Refund &amp; Cancellation Policy
                  </Link>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-1 accent-slate-900"
                  checked={checked[2]}
                  onChange={(e) =>
                    setChecked([checked[0], checked[1], e.target.checked])
                  }
                />
                <span>All information provided is true and accurate.</span>
              </label>
            </div>
          </div>
        )}

        <hr className="border-t my-6 border-neutral-200" />
        <p id="confirm-dialog-desc" className="text-sm text-slate-600 mb-10">
          {isEditing
            ? "Your live charter will be updated. Media processing (videos) may continue in background. Continue?"
            : "We'll review and reach out if anything else is needed. You can still edit after submission."}
        </p>

        {errorMessage && !busy && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {errorMessage}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || (requireAgreements && !allChecked)}
            onClick={() => {
              if (busy || (requireAgreements && !allChecked)) return;
              onConfirm();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            {busy && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" className="opacity-25" />
                <path d="M4 12a8 8 0 0 1 8-8" className="opacity-75" />
              </svg>
            )}
            {busy
              ? isEditing
                ? "Saving..."
                : "Submitting..."
              : isEditing
              ? "Save"
              : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

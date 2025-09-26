/**
 * ConfirmDialog.tsx
 * Phase 1 extraction: Previously inline within FormSection. This dialog handles final submit/save confirmation.
 * Keeping it standalone reduces noise in the main orchestration component and lets us test/future-enhance easily.
 */
"use client";
import { useCallback, useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  isEditing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean; // disables confirm while async ops in flight
}

/**
 * Accessibility Notes:
 * - Focus trap implemented manually (kept minimal to avoid adding a heavy dependency now).
 * - Escape key closes (cancel).
 * - Returns focus to previously focused element on unmount.
 */
export function ConfirmDialog({
  isEditing,
  onCancel,
  onConfirm,
  busy,
}: ConfirmDialogProps) {
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 animate-in fade-in zoom-in"
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold text-slate-900 mb-2"
        >
          {isEditing ? "Save changes?" : "Submit charter?"}
        </h2>
        <p id="confirm-dialog-desc" className="text-sm text-slate-600 mb-4">
          {isEditing
            ? "Your live charter will be updated. Media processing (videos) may continue in background. Continue?"
            : "We will review and reach out if anything else is needed. You can return later to make edits. Submit now?"}
        </p>
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
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            {busy ? "Processing..." : isEditing ? "Save" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

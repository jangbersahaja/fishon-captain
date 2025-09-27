"use client";
import { useCharterFormSelectors } from "@features/charter-onboarding/context/CharterFormContext";
import { logFormDebug } from "@features/charter-onboarding/debug";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import React from "react";
import { useToasts } from "@/components/toast/ToastContext";

export interface ReviewBarProps {
  active: boolean;
  onPrimary: () => void;
}

export const ReviewBar: React.FC<ReviewBarProps> = ({ active, onPrimary }) => {
  const isEditing = useCharterFormSelectors((s) => s.isEditing);
  const { savingEdit, serverSaving, finalizing } = useCharterFormSelectors(
    (s) => ({
      savingEdit: s.submission?.savingEdit ?? false,
      serverSaving: s.submission?.serverSaving ?? false,
      finalizing: s.submission?.finalizing ?? false,
    })
  );
  const { handlePrev } = useCharterFormSelectors((s) => ({
    handlePrev: s.navigation?.handlePrev || (() => {}),
  }));
  const { isMediaUploading, canSubmitMedia } = useCharterFormSelectors((s) => ({
    isMediaUploading: s.media?.isMediaUploading ?? false,
    canSubmitMedia: s.media?.canSubmitMedia ?? false,
  }));
  const [show, setShow] = React.useState(false);
  const { registerBottomAnchor } = useToasts();
  const barRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!active) return; // register only when visible
    if (!barRef.current) return;
    const el = barRef.current;
    const unregister = registerBottomAnchor("review-bar", () => el.offsetHeight);
    const ro = new ResizeObserver(() => {
      // trigger re-registration logic by re-registering height (simple approach)
      unregister();
      registerBottomAnchor("review-bar", () => el.offsetHeight);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      unregister();
    };
  }, [active, registerBottomAnchor]);
  React.useEffect(() => {
    if (active) {
      const t = setTimeout(() => setShow(true), 20);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [active]);
  return (
  <div ref={barRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-4">
      <div className="pointer-events-auto mx-auto w-full max-w-xl px-4">
        <div
          className={`rounded-2xl bg-white/90 backdrop-blur border border-slate-200 shadow-lg p-4 flex flex-col gap-3 transform-gpu transition-all duration-300 ease-out ${
            show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="text-center text-sm text-slate-600">
            Review looks good? Submit to{" "}
            {isEditing ? "update" : "publish your draft for review"}.
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              disabled={
                savingEdit ||
                serverSaving ||
                finalizing ||
                isMediaUploading ||
                !canSubmitMedia
              }
              onClick={() => {
                if (isEditing) logFormDebug("save_edit_review", {});
                onPrimary();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
              title={
                !canSubmitMedia
                  ? "Need at least 3 photos before submitting"
                  : isMediaUploading
                  ? "Uploads still in progress"
                  : finalizing
                  ? "Finalizing submission..."
                  : savingEdit || serverSaving
                  ? "Saving in progress"
                  : undefined
              }
            >
              {savingEdit || finalizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingEdit
                ? "Saving…"
                : finalizing
                ? "Submitting…"
                : isEditing
                ? "Save"
                : "Submit Charter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

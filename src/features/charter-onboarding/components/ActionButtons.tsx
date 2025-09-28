"use client";
import { Tooltip } from "@/components/ui/Tooltip";
import { useCharterFormSelectors } from "@features/charter-onboarding/context/CharterFormContext";
import { logFormDebug } from "@features/charter-onboarding/debug";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

export const ActionButtons: React.FC = () => {
  const router = useRouter();
  // Narrow slices so unrelated context updates (e.g. media progress) don't rerender all buttons
  const isEditing = useCharterFormSelectors((s) => s.isEditing);
  const { currentStep, isLastStep, handlePrev, handleNext } =
    useCharterFormSelectors((s) => ({
      currentStep: s.navigation?.currentStep ?? 0,
      isLastStep: s.navigation?.isLastStep ?? false,
      handlePrev: s.navigation?.handlePrev || (() => {}),
      handleNext: s.navigation?.handleNext || (() => {}),
    }));
  const { serverSaving, savingEdit, saveEditChanges } = useCharterFormSelectors(
    (s) => ({
      serverSaving: s.submission?.serverSaving ?? false,
      savingEdit: s.submission?.savingEdit ?? false,
      saveEditChanges: s.submission?.saveEditChanges || (() => {}),
    })
  );
  // Additional media state for disabling Save during uploads or when media cannot submit
  const { isMediaUploading, canSubmitMedia, hasBlockingMedia } =
    useCharterFormSelectors((s) => ({
      isMediaUploading: s.media?.isMediaUploading ?? false,
      canSubmitMedia: s.media?.canSubmitMedia ?? true,
      hasBlockingMedia: s.media?.hasBlockingMedia ?? false,
    }));
  const serverDraftId = useCharterFormSelectors((s) => s.serverDraftId);
  const { avatarUploading } = useCharterFormSelectors((s) => ({
    avatarUploading: s.media?.avatarUploading ?? false,
  }));
  // In edit mode we do not depend on a serverDraftId, so only block when actively saving or uploading avatar.
  const nextDisabled =
    serverSaving || avatarUploading || (!isEditing && !serverDraftId); // block navigation during avatar upload (create flow only)
  return (
    <div className="flex flex-wrap justify-end gap-3">
      {isEditing && (
        <Tooltip content="Cancel edit">
          <button
            type="button"
            onClick={() => {
              router.push("/captain");
              logFormDebug("cancel_edit", {});
            }}
            aria-label="Cancel edit"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cancel edit</span>
            <span
              aria-hidden
              className="hidden md:ml-2 md:inline text-[11px] font-medium"
            >
              Cancel
            </span>
          </button>
        </Tooltip>
      )}
      {currentStep > 0 && (
        <Tooltip content="Back">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Back"
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
            <span
              aria-hidden
              className="hidden md:ml-2 md:inline text-[11px] font-medium"
            >
              Back
            </span>
          </button>
        </Tooltip>
      )}
      {!isLastStep && (
        <Tooltip
          content={
            serverSaving
              ? "Saving…"
              : avatarUploading
              ? "Uploading avatar…"
              : "Next"
          }
        >
          <button
            type="button"
            onClick={handleNext}
            disabled={nextDisabled}
            aria-label={
              serverSaving
                ? "Saving"
                : avatarUploading
                ? "Uploading avatar"
                : !serverDraftId
                ? "Preparing"
                : "Next"
            }
            className="inline-flex items-center justify-center rounded-full bg-slate-900 p-3 text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            {serverSaving || avatarUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !isEditing && !serverDraftId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            <span className="sr-only">
              {serverSaving
                ? "Saving"
                : avatarUploading
                ? "Uploading avatar"
                : !isEditing && !serverDraftId
                ? "Preparing"
                : "Next"}
            </span>
            <span
              aria-hidden
              className="hidden md:ml-2 md:inline text-[11px] font-medium"
            >
              {serverSaving
                ? "Saving"
                : avatarUploading
                ? "Uploading…"
                : !isEditing && !serverDraftId
                ? "Preparing draft…"
                : "Next"}
            </span>
          </button>
        </Tooltip>
      )}
      {isEditing && !isLastStep && (
        <Tooltip content={savingEdit ? "Saving…" : "Save"}>
          <button
            type="button"
            disabled={
              savingEdit ||
              serverSaving ||
              isMediaUploading ||
              hasBlockingMedia ||
              !canSubmitMedia
            }
            aria-label="Save"
            onClick={saveEditChanges}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 p-3 text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
          >
            {savingEdit ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span className="sr-only">Save</span>
            <span
              aria-hidden
              className="hidden md:ml-2 md:inline text-[11px] font-medium"
            >
              {savingEdit
                ? "Saving…"
                : hasBlockingMedia
                ? "Waiting for video…"
                : "Save"}
            </span>
          </button>
        </Tooltip>
      )}
    </div>
  );
};

"use client";

import { useState } from "react";

interface ForceSubmitButtonProps {
  draftId: string;
  targetUserId: string;
  status: string;
  forceSubmitAction: (formData: FormData) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
    charterId?: string;
  }>;
}

export function ForceSubmitButton({
  draftId,
  targetUserId,
  status,
  forceSubmitAction,
}: ForceSubmitButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (
      !confirm(
        "Are you sure you want to force submit this draft? This will finalize the registration on behalf of the user."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("draftId", draftId);
    formData.append("targetUserId", targetUserId);

    try {
      const result = await forceSubmitAction(formData);

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Draft successfully submitted!",
        });
        // Reload after success to show updated status
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to submit draft",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only show if status is DRAFT
  if (status !== "DRAFT") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "⏳ Submitting..." : "🚀 Force Submit"}
      </button>
      {message && (
        <div
          className={`text-xs px-2 py-1 rounded ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-300"
              : "bg-red-50 text-red-700 border border-red-300"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

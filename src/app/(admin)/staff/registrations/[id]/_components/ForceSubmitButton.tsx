"use client";

import { AdminBypassAction } from "@/components/admin";
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

  const handleSubmit = async (password: string) => {
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("draftId", draftId);
    formData.append("targetUserId", targetUserId);
    formData.append("password", password);

    try {
      const result = await forceSubmitAction(formData);

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Draft successfully submitted!",
        });
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
      <AdminBypassAction
        actionLabel={isSubmitting ? "Submitting..." : "Force Submit"}
        buttonVariant="default"
        buttonSize="sm"
        buttonClassName="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
        confirmTitle="Confirm Force Submit"
        confirmDescription="Are you sure you want to force submit this draft? This will finalize the registration on behalf of the user. Please enter your admin password to confirm."
        onConfirm={handleSubmit}
        loading={isSubmitting}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-medium">
          {isSubmitting ? "Submitting..." : "Force Submit"}
        </span>
      </AdminBypassAction>
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

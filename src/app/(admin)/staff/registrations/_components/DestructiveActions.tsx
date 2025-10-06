"use client";

import { useTransition } from "react";

interface DestructiveActionsProps {
  draftId: string;
  status: string;
  userName?: string | null;
  userEmail?: string | null;
  markAbandoned: (id: string) => Promise<void>;
  softDelete: (id: string) => Promise<void>;
}

export function DestructiveActions({
  draftId,
  status,
  userName,
  userEmail,
  markAbandoned,
  softDelete,
}: DestructiveActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleAbandon = () => {
    const userIdentifier = userName || userEmail || "Unknown";
    if (
      confirm(
        `Are you sure you want to mark this draft as abandoned?\n\nUser: ${userIdentifier}\nDraft ID: ${draftId}\n\nThis action cannot be undone.`
      )
    ) {
      startTransition(() => {
        markAbandoned(draftId);
      });
    }
  };

  const handleDelete = () => {
    const userIdentifier = userName || userEmail || "Unknown";
    if (
      confirm(
        `Are you sure you want to delete this draft?\n\nUser: ${userIdentifier}\nDraft ID: ${draftId}\n\nThis action cannot be undone and will permanently remove all draft data.`
      )
    ) {
      startTransition(() => {
        softDelete(draftId);
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <button
          className="flex items-center gap-1.5 rounded-full border border-amber-300 px-3 py-1.5 text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
          type="button"
          onClick={handleAbandon}
          disabled={isPending}
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="hidden sm:inline text-xs font-medium">
            {isPending ? "Abandoning..." : "Abandon"}
          </span>
        </button>
      )}
      {status !== "DELETED" && (
        <button
          className="flex items-center gap-1.5 rounded-full border border-rose-300 px-3 py-1.5 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
          type="button"
          onClick={handleDelete}
          disabled={isPending}
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span className="hidden sm:inline text-xs font-medium">
            {isPending ? "Deleting..." : "Delete"}
          </span>
        </button>
      )}
    </div>
  );
}

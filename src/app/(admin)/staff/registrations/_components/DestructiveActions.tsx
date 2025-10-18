"use client";

import { AdminBypassAction } from "@/components/admin";
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

  const userIdentifier = userName || userEmail || "Unknown";

  // Password verification happens in AdminBypassAction modal
  // The password parameter is required by the interface but not used here
  // since these are server actions that don't verify passwords
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAbandon = async (_password: string) => {
    startTransition(() => {
      markAbandoned(draftId);
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDelete = async (_password: string) => {
    startTransition(() => {
      softDelete(draftId);
    });
  };

  return (
    <>
      {(status === "DRAFT" || status !== "DELETED") && (
        <div className="flex items-center gap-2 ml-auto border-l border-slate-200 pl-3">
          {status === "DRAFT" && (
            <AdminBypassAction
              actionLabel={isPending ? "Abandoning..." : "Abandon"}
              buttonVariant="outline"
              buttonSize="sm"
              buttonClassName="border-amber-300 text-amber-700 hover:bg-amber-50"
              confirmTitle="Confirm Abandon Draft"
              confirmDescription={`Are you sure you want to mark this draft as abandoned?\n\nUser: ${userIdentifier}\nDraft ID: ${draftId}\n\nThis action cannot be undone. Please enter your admin password to confirm.`}
              onConfirm={handleAbandon}
              loading={isPending}
            >
              <svg
                className="w-4 h-4"
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
              <span>{isPending ? "Abandoning..." : "Abandon"}</span>
            </AdminBypassAction>
          )}
          {status !== "DELETED" && (
            <AdminBypassAction
              actionLabel={isPending ? "Deleting..." : "Delete"}
              buttonVariant="destructive"
              buttonSize="sm"
              buttonClassName="bg-red-600 hover:bg-red-700 text-white"
              confirmTitle="Confirm Delete Draft"
              confirmDescription={`Are you sure you want to delete this draft?\n\nUser: ${userIdentifier}\nDraft ID: ${draftId}\n\nThis action cannot be undone and will permanently remove all draft data. Please enter your admin password to confirm.`}
              onConfirm={handleDelete}
              loading={isPending}
            >
              <svg
                className="w-4 h-4"
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
              <span>{isPending ? "Deleting..." : "Delete"}</span>
            </AdminBypassAction>
          )}
        </div>
      )}
    </>
  );
}

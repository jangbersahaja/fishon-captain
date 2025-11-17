import { AdminBypassAction } from "@/components/admin";
import { useState } from "react";

interface CharterActionsProps {
  charterId: string;
  charterName: string;
  isActive: boolean;
  isLocked: boolean;
  bulkAction: (formData: FormData) => Promise<void>;
  redirectTo: string;
  isAdmin: boolean;
}

export function CharterActions({
  charterId,
  charterName,
  isActive,
  isLocked,
  bulkAction,
  redirectTo,
  isAdmin,
}: CharterActionsProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);

  const handleDelete = async (password: string) => {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      const res = await fetch(`/api/admin/charters/${charterId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data?.error || "Delete failed");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleLockToggle = async () => {
    const action = isLocked ? "unlock" : "lock";
    const actionText = isLocked ? "unlock" : "lock";

    if (
      confirm(
        `Are you sure you want to ${actionText} this charter?\n\nCharter: ${charterName}\nID: ${charterId}\n\nThis will ${isLocked ? "allow the captain to change status" : "prevent the captain from changing status"}.`
      )
    ) {
      try {
        const res = await fetch(`/api/admin/charters/${charterId}/lock`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isLocked: !isLocked }),
        });
        if (res.ok) {
          window.location.reload();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data?.error || "Failed to update lock status");
        }
      } catch (error) {
        console.error("Lock toggle error:", error);
        alert("Failed to update lock status");
      }
    }
  };
  const handleToggle = () => {
    const action = isActive ? "disable" : "enable";
    const actionText = isActive ? "disable" : "enable";

    if (
      confirm(
        `Are you sure you want to ${actionText} this charter?\n\nCharter: ${charterName}\nID: ${charterId}\n\nThis will ${
          isActive ? "make it inactive" : "make it active"
        }.`
      )
    ) {
      const form = new FormData();
      form.append("op", action);
      form.append("ids", charterId);
      form.append("redirectTo", redirectTo);
      bulkAction(form);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Normal actions */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/staff/charters/${charterId}`}
          className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span className="hidden sm:inline text-xs font-medium">View</span>
        </a>
        <button
          onClick={handleToggle}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors text-xs font-medium ${
            isActive
              ? "border-amber-300 text-amber-700 hover:bg-amber-50"
              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isActive ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            )}
          </svg>
          <span className="hidden sm:inline">
            {isActive ? "Disable" : "Enable"}
          </span>
        </button>
        {isAdmin && (
          <button
            onClick={handleLockToggle}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors text-xs font-medium ${
              isLocked
                ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
            title={
              isLocked
                ? "Unlock charter (allow captain to change status)"
                : "Lock charter (prevent captain from changing status)"
            }
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isLocked ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              )}
            </svg>
            <span className="hidden sm:inline">
              {isLocked ? "Unlock" : "Lock"}
            </span>
          </button>
        )}
      </div>

      {/* Destructive actions - visually separated */}
      {isAdmin && (
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <AdminBypassAction
            actionLabel={deleting ? "Deleting..." : "Delete"}
            buttonVariant="destructive"
            buttonSize="sm"
            buttonClassName="bg-red-600 hover:bg-red-700 text-white"
            confirmTitle="Confirm Charter Deletion"
            confirmDescription="Delete this charter? This will remove all data except draft, photos, and captain profile. This action cannot be undone. Please enter your admin password to confirm."
            onConfirm={handleDelete}
            loading={deleting}
            error={deleteError}
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
            <span>{deleting ? "Deleting..." : "Delete"}</span>
          </AdminBypassAction>
        </div>
      )}
    </div>
  );
}

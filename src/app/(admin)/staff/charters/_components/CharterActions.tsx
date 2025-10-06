"use client";

interface CharterActionsProps {
  charterId: string;
  charterName: string;
  isActive: boolean;
  bulkAction: (formData: FormData) => Promise<void>;
  redirectTo: string;
}

export function CharterActions({
  charterId,
  charterName,
  isActive,
  bulkAction,
  redirectTo,
}: CharterActionsProps) {
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
    </div>
  );
}

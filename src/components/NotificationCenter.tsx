import { AlertCircle, FileWarning, Loader2 } from "lucide-react";
import Link from "next/link";

export type NotificationItem = {
  id: string;
  label: string;
  status: "missing" | "partial" | "processing" | "validated";
  detail?: string;
  href?: string;
};

// (Legacy badge styling retained in case we need to revert)
function statusContainerClasses(status: NotificationItem["status"]) {
  switch (status) {
    case "processing":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "partial":
    case "missing":
      return "border-red-200 bg-red-50 text-red-700";
    // validated items are not rendered
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

export function NotificationCenter({
  items,
  title = "Reminders",
  description,
  inline = true,
}: {
  items: NotificationItem[];
  title?: string;
  description?: string;
  /** render as inline alert rows (new design). */
  inline?: boolean;
}) {
  // Exclude validated items per new requirement
  const actionable = items.filter((i) => i.status !== "validated");
  if (actionable.length === 0) return null; // nothing to show

  if (!inline) {
    // (Optional legacy layout fall-back kept for potential reuse)
    return (
      <section aria-label={title} className="space-y-3">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        </div>
        {description && (
          <p className="text-xs text-slate-500 leading-relaxed">
            {description}
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-2" aria-label={title}>
      {actionable.map((it) => {
        const isProcessing = it.status === "processing";
        const isPartial = it.status === "partial";
        const container = statusContainerClasses(it.status);
        const Icon = isProcessing ? Loader2 : AlertCircle;
        return (
          <div
            key={it.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${container}`}
          >
            <Icon
              className={`h-4 w-4 ${
                isProcessing ? "animate-spin" : isPartial ? "" : ""
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{it.label}</p>
              {it.detail && (
                <p className="mt-0.5 text-xs opacity-90 leading-snug">
                  {it.detail}
                </p>
              )}
            </div>
            {it.href && (
              <Link
                href={it.href}
                className="inline-flex shrink-0 items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
              >
                Manage
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default NotificationCenter;

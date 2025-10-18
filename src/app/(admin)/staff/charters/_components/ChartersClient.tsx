"use client";

import { useMemo, useState } from "react";
import { CharterActions } from "./CharterActions";

type CharterItem = {
  id: string;
  name: string;
  city: string;
  state: string;
  isActive: boolean;
  updatedAt: string;
  captain?: { displayName?: string | null; userId: string };
};

export default function ChartersClient({
  items,
  bulkAction,
  redirectTo,
  isAdmin,
}: {
  items: CharterItem[];
  bulkAction: (formData: FormData) => Promise<void>;
  redirectTo: string;
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulkFormId = "bulkForm";

  const allIds = useMemo(() => items.map((c) => c.id), [items]);
  const allSelected =
    selected.size > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const onRowCheck = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions header */}
      {items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Select all charters"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Select all ({items.length})
                </span>
              </label>
              {selected.size > 0 && (
                <span className="text-sm text-slate-500">
                  {selected.size} selected
                </span>
              )}
            </div>
            {selected.size > 0 && (
              <form
                id={bulkFormId}
                className="flex items-center gap-2"
                action={bulkAction}
              >
                <input type="hidden" name="redirectTo" value={redirectTo} />
                {Array.from(selected).map((id) => (
                  <input key={id} type="hidden" name="ids" value={id} />
                ))}
                <button
                  name="op"
                  value="enable"
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Enable selected
                </button>
                <button
                  name="op"
                  value="disable"
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  Disable selected
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Charter cards */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          No charters found.
        </div>
      ) : (
        items.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
          >
            {/* Header row - Charter info and status */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <label className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    value={c.id}
                    checked={selected.has(c.id)}
                    onChange={(e) => onRowCheck(c.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-800 truncate mb-1">
                    {c.name}
                  </h3>
                  <div className="text-sm text-slate-600">
                    {c.city}, {c.state}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={
                    c.isActive
                      ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                      : "inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
                  }
                >
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Details row */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="text-sm text-slate-500">
                <div>
                  <span className="font-medium">Captain:</span>{" "}
                  {c.captain?.displayName || c.captain?.userId || "—"}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Updated {new Date(c.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-400 font-mono">{c.id}</div>
              <CharterActions
                charterId={c.id}
                charterName={c.name}
                isActive={c.isActive}
                bulkAction={bulkAction}
                redirectTo={redirectTo}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

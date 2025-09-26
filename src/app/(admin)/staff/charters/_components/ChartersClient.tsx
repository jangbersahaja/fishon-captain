"use client";

import { useMemo, useState } from "react";

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
  q,
  activeParam,
  sort,
  order,
  pageSize,
  bulkAction,
  redirectTo,
}: {
  items: CharterItem[];
  q?: string;
  activeParam?: "1" | "0";
  sort: string;
  order: string;
  pageSize: number;
  bulkAction: (formData: FormData) => Promise<void>;
  redirectTo: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const bulkFormId = "bulkForm";

  const allIds = useMemo(() => items.map((c) => c.id), [items]);
  const allSelected =
    selected.size > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const buildSortUrl = (col: string) => {
    const isActiveSort = sort === col;
    const nextOrder = isActiveSort && order === "asc" ? "desc" : "asc";
    const sp = new URLSearchParams({
      ...(q ? { q } : {}),
      ...(activeParam ? { active: activeParam } : {}),
      sort: col,
      order: nextOrder,
      pageSize: String(pageSize),
      page: "1",
    });
    return `/staff/charters?${sp.toString()}`;
  };

  const onRowCheck = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const itemById = (id: string | null) => items.find((i) => i.id === id);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-700">
        <label className="inline-flex items-center justify-center">
          <input
            type="checkbox"
            aria-label="Select all on page"
            checked={allSelected}
            onChange={toggleAll}
          />
        </label>
        <a href={buildSortUrl("name")} className="hover:underline">
          Name {sort === "name" ? (order === "asc" ? "↑" : "↓") : ""}
        </a>
        <a href={buildSortUrl("city")} className="hover:underline">
          City {sort === "city" ? (order === "asc" ? "↑" : "↓") : ""}
        </a>
        <a href={buildSortUrl("state")} className="hover:underline">
          State {sort === "state" ? (order === "asc" ? "↑" : "↓") : ""}
        </a>
        <a href={buildSortUrl("updatedAt")} className="hover:underline">
          Updated {sort === "updatedAt" ? (order === "asc" ? "↑" : "↓") : ""}
        </a>
        <div className="text-right">Actions</div>
      </div>

      {items.map((c) => (
        <div
          key={c.id}
          className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm"
        >
          <label className="inline-flex items-center justify-center">
            <input
              type="checkbox"
              name="ids"
              form={bulkFormId}
              value={c.id}
              checked={selected.has(c.id)}
              onChange={(e) => onRowCheck(c.id, e.target.checked)}
            />
          </label>
          <div className="truncate font-medium text-slate-800">{c.name}</div>
          <div className="truncate text-slate-600">{c.city}</div>
          <div className="truncate text-slate-600">{c.state}</div>
          <div className="truncate text-slate-500">
            {new Date(c.updatedAt).toLocaleString()}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => setQuickViewId(c.id)}
            >
              Quick view
            </button>
            <a
              href={`/staff/charters/${c.id}`}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              View
            </a>
            <form action={bulkAction} className="inline-flex items-center">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input type="hidden" name="ids" value={c.id} />
              <button
                name="op"
                value={c.isActive ? "disable" : "enable"}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                {c.isActive ? "Disable" : "Enable"}
              </button>
            </form>
          </div>
        </div>
      ))}

      <form
        id={bulkFormId}
        className="flex items-center gap-2 px-4 py-3"
        action={bulkAction}
      >
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <span className="text-xs text-slate-600">Bulk:</span>
        <button
          name="op"
          value="enable"
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          Enable selected
        </button>
        <button
          name="op"
          value="disable"
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          Disable selected
        </button>
      </form>

      {/* Quick View Modal */}
      {quickViewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
            {(() => {
              const item = itemById(quickViewId);
              if (!item) return null;
              return (
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-slate-900">
                    {item.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {item.city}, {item.state}
                  </div>
                  <div className="text-sm text-slate-500">
                    Captain:{" "}
                    {item.captain?.displayName || item.captain?.userId || "—"}
                  </div>
                  <div className="text-sm text-slate-500">
                    Updated {new Date(item.updatedAt).toLocaleString()}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <a
                      href={`/staff/charters/${item.id}`}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => setQuickViewId(null)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

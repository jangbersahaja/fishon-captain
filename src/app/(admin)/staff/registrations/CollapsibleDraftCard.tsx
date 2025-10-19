"use client";
import Link from "next/link";
import { useState } from "react";

export function CollapsibleDraftCard({
  user,
  charter,
  statusBadge,
  lastTouchedAt,
  email,
  children,
}: {
  user?: { name?: string } | null;
  charter?: { id: string; name?: string } | null;
  statusBadge: React.ReactNode;
  lastTouchedAt: string;
  email: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4 transition-shadow border-b border-slate-200 hover:shadow-sm">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate text-slate-700">
              {user?.name || "—"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 truncate">
            {email || "—"}
          </span>
          {charter && (
            <div className="text-xs">
              <span className=" text-slate-700">Charter: </span>
              <Link
                href={`/staff/charters/${charter.id}`}
                className=" text-sky-600 hover:underline"
              >
                {charter.name || charter.id}
              </Link>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {statusBadge}
          <span className="text-xs text-slate-700">{lastTouchedAt}</span>
        </div>
      </div>
      {open && <div className="pt-4">{children}</div>}
    </div>
  );
}

"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  processing?: boolean;
  validated?: boolean;
  collapsible?: boolean;
}

export function Section({
  title,
  description,
  children,
  processing,
  validated,
  collapsible = true,
}: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Collapse only after submission (processing) or validated state reached
  useEffect(() => {
    if ((processing || validated) && collapsible) setCollapsed(true);
  }, [processing, validated, collapsible]);

  const isCollapsed = collapsible ? collapsed : false;

  return (
    <div className="relative p-5 transition-shadow bg-white border shadow-sm rounded-xl border-slate-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        {collapsible ? (
          <button
            type="button"
            className="text-left"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!isCollapsed}
          >
            <h2 className="font-medium text-slate-800">{title}</h2>
            {!isCollapsed && description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </button>
        ) : (
          <div>
            <h2 className="font-medium text-slate-800">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
        )}
        {validated ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> validated
          </span>
        ) : processing ? (
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            processing
          </span>
        ) : null}
      </div>
      <div
        className={`mt-4 grid gap-3 transition-opacity duration-200 ${
          isCollapsed ? "opacity-0 hidden" : "opacity-100"
        }`}
        aria-hidden={isCollapsed}
      >
        {children}
      </div>
    </div>
  );
}

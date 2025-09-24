"use client";
import {
  ALL_SPECIES,
  SPECIES_BY_CATEGORY,
  SPECIES_CATEGORIES,
  type SpeciesCategory,
} from "@/lib/data/species";
import { ACCENT } from "@features/charter-form/constants";
import clsx from "clsx";
import Image from "next/image";
import { useMemo, useState } from "react";

type SpeciesSelectorProps = {
  value?: string[];
  onChange: (next: string[]) => void;
  maxVisiblePerCategory?: number;
  activeTab?: SpeciesCategory;
  onActiveTabChange?: (tab: SpeciesCategory) => void;
  maxSelected?: number;
};

const TAB_ORDER: SpeciesCategory[] = [
  SPECIES_CATEGORIES.SALTWATER,
  SPECIES_CATEGORIES.FRESHWATER,
  SPECIES_CATEGORIES.SQUID,
];
const TAB_LABEL: Record<SpeciesCategory, string> = {
  [SPECIES_CATEGORIES.SALTWATER]: "Saltwater",
  [SPECIES_CATEGORIES.FRESHWATER]: "Freshwater",
  [SPECIES_CATEGORIES.SQUID]: "Squid",
};

export function SpeciesSelector({
  value = [],
  onChange,
  activeTab: controlledTab,
  onActiveTabChange,
  maxSelected = 5,
}: SpeciesSelectorProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<SpeciesCategory>(
    SPECIES_CATEGORIES.SALTWATER
  );
  const activeTab = controlledTab ?? uncontrolledTab;
  const [queries, setQueries] = useState<Record<SpeciesCategory, string>>({
    [SPECIES_CATEGORIES.SALTWATER]: "",
    [SPECIES_CATEGORIES.FRESHWATER]: "",
    [SPECIES_CATEGORIES.SQUID]: "",
  });
  const query = queries[activeTab];
  function setQueryFor(tab: SpeciesCategory, val: string) {
    setQueries((prev) => ({ ...prev, [tab]: val }));
  }
  const activeList = SPECIES_BY_CATEGORY[activeTab];
  const filtered = useMemo(() => {
    if (!query.trim()) return activeList;
    const q = query.toLowerCase();
    return activeList.filter(
      (s) =>
        s.english_name.toLowerCase().includes(q) ||
        s.local_name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [activeList, query]);
  const counts = useMemo(() => {
    return ALL_SPECIES.reduce<Record<SpeciesCategory, number>>(
      (acc, item) => {
        if (value.includes(item.id)) acc[item.category] += 1;
        return acc;
      },
      {
        [SPECIES_CATEGORIES.SALTWATER]: 0,
        [SPECIES_CATEGORIES.FRESHWATER]: 0,
        [SPECIES_CATEGORIES.SQUID]: 0,
      }
    );
  }, [value]);
  function toggle(id: string) {
    const set = new Set(value);
    if (set.has(id)) {
      set.delete(id);
    } else {
      if (value.length >= maxSelected) return;
      set.add(id);
    }
    onChange(Array.from(set));
  }
  const reachedLimit = value.length >= maxSelected;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-neutral-200 p-3">
        <div
          className="flex items-stretch gap-0 rounded-t-lg border border-neutral-200 bg-neutral-50 p-1"
          role="tablist"
          aria-label="Species categories"
        >
          {TAB_ORDER.map((tab) => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                aria-controls={`species-panel-${tab}`}
                type="button"
                onClick={() => {
                  if (controlledTab) {
                    onActiveTabChange?.(tab);
                  } else {
                    setUncontrolledTab(tab);
                    onActiveTabChange?.(tab);
                  }
                }}
                className={clsx(
                  "relative flex min-w-[90px] flex-col items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                <span className="pointer-events-none flex items-center gap-1">
                  {TAB_LABEL[tab]}
                  {counts[tab] ? (
                    <span
                      className={clsx(
                        "inline-flex items-center justify-center rounded-full bg-slate-200 px-1.5 text-[10px] font-bold text-slate-600 transition",
                        active && "bg-slate-900 text-white"
                      )}
                    >
                      {counts[tab]}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden
                  className={clsx(
                    "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-slate-900 transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
              </button>
            );
          })}
        </div>
        <div className="mb-3 flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQueryFor(activeTab, e.target.value)}
            placeholder="Search species..."
            className="w-full rounded-b-lg border border-neutral-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQueryFor(activeTab, "")}
              className="text-[10px] font-semibold text-slate-500 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {filtered.map((species) => {
            const active = value.includes(species.id);
            const disabled = !active && reachedLimit;
            return (
              <button
                key={species.id}
                type="button"
                onClick={() => !disabled && toggle(species.id)}
                className={clsx(
                  "group relative flex flex-col items-start gap-0 rounded-xl border px-3 py-1.5 text-[12px] font-semibold leading-tight transition min-w-[84px]",
                  active
                    ? "text-white"
                    : disabled
                    ? "border-neutral-100 bg-neutral-50 text-slate-400 cursor-not-allowed"
                    : "border-neutral-200 bg-white text-slate-700 hover:border-slate-300"
                )}
                style={
                  active
                    ? { backgroundColor: ACCENT, borderColor: ACCENT }
                    : undefined
                }
                title={`${species.english_name} (${species.local_name})`}
              >
                <span>{species.english_name}</span>
                <span
                  className={clsx(
                    "font-normal text-[11px]",
                    active ? "text-white/90" : "text-slate-500"
                  )}
                >
                  {species.local_name}
                </span>
                {"image" in species && species.image ? (
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden -translate-x-1/2 translate-y-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg group-hover:inline-block">
                    <div className="relative h-12 w-20">
                      <Image
                        src={
                          typeof species.image === "object" &&
                          species.image &&
                          "src" in (species.image as Record<string, unknown>)
                            ? (species.image as { src?: string }).src || ""
                            : (species.image as string | undefined) || ""
                        }
                        alt={species.english_name}
                        fill
                        className="object-contain"
                        loading="lazy"
                        sizes="80px"
                      />
                    </div>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="p-4 text-center text-xs text-slate-500">
            No species in this category.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
        <span>
          Selected {value.length}/{maxSelected}
          {reachedLimit && (
            <span className="ml-1 text-red-500">(limit reached)</span>
          )}
        </span>
        {reachedLimit && (
          <span className="text-red-400">Remove one to add more</span>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="font-semibold text-slate-600">Selected:</span>
          {value.map((id) => {
            const item = ALL_SPECIES.find((s) => s.id === id);
            if (!item) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="group flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 font-medium text-slate-600 hover:border-red-300 hover:text-red-600"
              >
                {item.english_name}
                <span className="text-red-400 group-hover:text-red-600">×</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500 hover:bg-slate-200"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

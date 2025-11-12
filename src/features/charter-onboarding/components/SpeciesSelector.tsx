"use client";
import { SpeciesPills } from "@/components/charter/SpeciesPills";
import {
  ALL_SPECIES,
  SPECIES_BY_CATEGORY,
  SPECIES_CATEGORIES,
  type SpeciesCategory,
} from "@/lib/data/species";
import { ACCENT } from "@features/charter-onboarding/constants";
import clsx from "clsx";
import Image from "next/image";
import { useMemo, useState } from "react";

// Unified selector uses action-style callback names to satisfy Next.js serializable props rule
// (functions named *Action are treated as intentional callbacks).
type SpeciesSelectorProps = {
  value?: string[];
  onChangeAction: (next: string[]) => void;
  maxVisiblePerCategory?: number; // (reserved for later virtualization / paging)
  activeTab?: SpeciesCategory;
  onActiveTabChangeAction?: (tab: SpeciesCategory) => void;
  maxSelected?: number;
};

const TAB_ORDER: SpeciesCategory[] = [
  SPECIES_CATEGORIES.FRESHWATER,
  SPECIES_CATEGORIES.SALTWATER,
  SPECIES_CATEGORIES.SQUID,
];
const TAB_LABEL: Record<SpeciesCategory, string> = {
  [SPECIES_CATEGORIES.SALTWATER]: "Saltwater",
  [SPECIES_CATEGORIES.FRESHWATER]: "Freshwater",
  [SPECIES_CATEGORIES.SQUID]: "Squid",
};

export function SpeciesSelector({
  value = [],
  onChangeAction,
  activeTab: controlledTab,
  onActiveTabChangeAction,
  maxSelected = 5,
}: SpeciesSelectorProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<SpeciesCategory>(
    SPECIES_CATEGORIES.FRESHWATER
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
    onChangeAction(Array.from(set));
  }
  const reachedLimit = value.length >= maxSelected;
  return (
    <div className="flex flex-col gap-3">
      <div className="">
        <div
          className="flex items-stretch gap-0 p-1 border-t border-x rounded-t-md border-neutral-200 bg-slate-50 w-fit"
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
                    onActiveTabChangeAction?.(tab);
                  } else {
                    setUncontrolledTab(tab);
                    onActiveTabChangeAction?.(tab);
                  }
                }}
                className={clsx(
                  "flex min-w-[90px] flex-col items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-[#ec2227] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                <span className="flex items-center gap-1 pointer-events-none">
                  {TAB_LABEL[tab]}
                  {counts[tab] ? (
                    <span
                      className={clsx(
                        "inline-flex items-center justify-center rounded-full bg-slate-200 px-1.5 text-[10px] font-bold text-slate-600 transition",
                        active && "bg-white text-[#ec2227]"
                      )}
                    >
                      {counts[tab]}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQueryFor(activeTab, e.target.value)}
            placeholder="Search species..."
            className="w-full p-3 text-xs border rounded-bl-md rounded-r-md border-neutral-200 focus:border-slate-400 focus:outline-none"
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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          {filtered.map((species) => {
            const active = value.includes(species.id);
            const disabled = !active && reachedLimit;
            return (
              <button
                key={species.id}
                type="button"
                onClick={() => !disabled && toggle(species.id)}
                className={clsx(
                  "group relative flex flex-col items-center gap-0 rounded-md border px-3 py-1.5 text-[12px] font-semibold leading-tight transition min-w-[84px]",
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
                  <span className="absolute z-10 hidden p-2 -translate-x-1/2 translate-y-2 bg-white border rounded-lg shadow-lg pointer-events-none left-1/2 top-full border-neutral-200 group-hover:inline-block">
                    <div className="relative w-20 h-12">
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
          <p className="p-4 text-xs text-center text-slate-500">
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
          <SpeciesPills
            items={value
              .map((id) => ALL_SPECIES.find((s) => s.id === id))
              .filter(Boolean)
              .map((s) => ({
                id: s!.id,
                english: s!.english_name,
                local: s!.local_name,
                imageSrc:
                  typeof s!.image === "object" &&
                  s!.image &&
                  "src" in (s!.image as Record<string, unknown>)
                    ? (s!.image as { src?: string }).src
                    : (s!.image as string | undefined) || undefined,
              }))}
            readOnly={false}
            onRemoveAction={(item) => toggle(item.id || "")}
            size="sm"
            stackedNames={false}
          />
          <button
            type="button"
            onClick={() => onChangeAction([])}
            className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500 hover:bg-slate-200"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

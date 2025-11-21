"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

type TabFilterProps = {
  q: string;
  status: string;
  step?: number;
  counts: {
    all: number;
    draft: number;
    submitted: number;
    abandonedDeleted: number;
    draftSteps: Record<number, number>; // step 1-6 -> count
  };
};

export function TabFilter({ q, status, step, counts }: TabFilterProps) {
  const router = useRouter();
  const _searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  // Determine active main tab
  const activeMainTab =
    status === "SUBMITTED"
      ? "SUBMITTED"
      : status === "ABANDONED" ||
          status === "DELETED" ||
          status === "ABANDONED_DELETED"
        ? "ABANDONED_DELETED"
        : status === "DRAFT" || status === ""
          ? "DRAFT"
          : "DRAFT"; // default

  // Determine active step tab (only for DRAFT)
  const activeStepTab = step ? String(step) : "all-steps";

  function buildURL(newStatus: string, newStep?: number) {
    const params = new URLSearchParams();
    if (searchRef.current?.value) params.set("q", searchRef.current.value);
    else if (q) params.set("q", q);

    if (newStatus === "DRAFT") {
      params.set("status", "DRAFT");
      if (newStep) params.set("step", String(newStep));
    } else if (newStatus === "SUBMITTED") {
      params.set("status", "SUBMITTED");
    } else if (newStatus === "ABANDONED_DELETED") {
      params.set("status", "ABANDONED_DELETED");
    }
    // For "all" tab, don't set status param

    return `/staff/registrations?${params.toString()}`;
  }

  function handleMainTabChange(value: string) {
    router.replace(buildURL(value));
  }

  function handleStepTabChange(value: string) {
    if (value === "all-steps") {
      router.replace(buildURL("DRAFT"));
    } else {
      const stepNum = parseInt(value, 10);
      router.replace(buildURL("DRAFT", stepNum));
    }
  }

  function handleSearchChange() {
    const currentStatus = status || "DRAFT";
    router.replace(buildURL(currentStatus, step));
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3 p-4 bg-white border rounded-xl border-slate-200">
        <div className="flex-1">
          <label className="block mb-1 text-xs font-medium text-slate-500">
            Search
          </label>
          <input
            ref={searchRef}
            defaultValue={q}
            placeholder="Search by name, email, draft ID, or user ID"
            className="w-full px-3 py-2 text-sm bg-white border rounded-md border-slate-300 focus:border-slate-500 focus:outline-none"
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Main status tabs */}
      <div className="p-4 bg-white border rounded-xl border-slate-200">
        <Tabs value={activeMainTab} onValueChange={handleMainTabChange}>
          <TabsList className="grid w-full h-auto grid-cols-4">
            <TabsTrigger value="DRAFT" className="flex items-center gap-2">
              <span>Draft</span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-slate-700 rounded-full">
                {counts.draft}
              </span>
            </TabsTrigger>
            <TabsTrigger value="SUBMITTED" className="flex items-center gap-2">
              <span>Submitted</span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-full">
                {counts.submitted}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="ABANDONED_DELETED"
              className="flex items-center gap-2"
            >
              <span>Abandoned/Deleted</span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-amber-600 rounded-full">
                {counts.abandonedDeleted}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Step sub-tabs for DRAFT */}
        {activeMainTab === "DRAFT" && (
          <div className="mt-3">
            <div className="mb-2 text-xs font-medium text-slate-600">
              Filter by step:
            </div>
            <Tabs value={activeStepTab} onValueChange={handleStepTabChange}>
              <TabsList className="flex-wrap w-full h-auto">
                <TabsTrigger
                  value="all-steps"
                  className="flex items-center gap-1.5"
                >
                  <span>All Steps</span>
                  <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-semibold text-white bg-slate-600 rounded-full">
                    {counts.draft}
                  </span>
                </TabsTrigger>
                {[6, 5, 4, 3, 2, 1].map((s) => (
                  <TabsTrigger
                    key={s}
                    value={String(s)}
                    className="flex items-center gap-1.5"
                  >
                    <span>Step {s}</span>
                    <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-semibold text-white bg-slate-600 rounded-full">
                      {counts.draftSteps[s] || 0}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

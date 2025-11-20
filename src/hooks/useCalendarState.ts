import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type CalendarView = "month" | "week" | "day" | "agenda";

export function useCalendarState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get state from URL or defaults
  const view = (searchParams.get("view") as CalendarView) || "month";
  const dateStr = searchParams.get("date");
  const date = dateStr ? new Date(dateStr) : new Date();
  const charterId = searchParams.get("charterId") || undefined;
  const showCancelled = searchParams.get("showCancelled") === "true";

  // Helper to update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const setView = useCallback(
    (newView: CalendarView) => {
      updateParams({ view: newView });
    },
    [updateParams]
  );

  const setDate = useCallback(
    (newDate: Date) => {
      updateParams({ date: newDate.toISOString() });
    },
    [updateParams]
  );
  const setCharterId = useCallback(
    (newCharterId: string) => {
      updateParams({ charterId: newCharterId });
    },
    [updateParams]
  );

  const setShowCancelled = useCallback(
    (show: boolean) => {
      updateParams({ showCancelled: show ? "true" : null });
    },
    [updateParams]
  );

  return {
    view,
    date,
    charterId,
    showCancelled,
    setView,
    setDate,
    setCharterId,
    setShowCancelled,
  };
}

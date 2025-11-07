"use client";
"use client";

import type { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { isWithinInterval } from "date-fns";
import {
  Grid3x3,
  List,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { BookingFilters } from "./BookingFilters";
import { EnhancedBookingCard } from "./EnhancedBookingCard";

interface BookingTabsProps {
  bookings: EnrichedMarketBooking[];
  anglerMap: Record<
    string,
    {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    }
  >;
}

export function BookingTabs({ bookings, anglerMap }: BookingTabsProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<
    "requests" | "upcoming" | "all" | "history"
  >("requests");

  // Filters / search state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // View options state
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "price-high" | "price-low" | "date-soon" | "date-late"
  >("newest");
  const [viewDensity, setViewDensity] = useState<"comfortable" | "compact">(
    "comfortable"
  );
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Build trip list from bookings (unique tripId -> tripName)
  const trips = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach((b) => {
      if (b.trip && b.trip.id) map.set(b.trip.id, b.trip.name || "Unknown");
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookings]);

  // Helper to parse booking date safely
  const parseBookingDate = (b: EnrichedMarketBooking) => {
    try {
      return new Date(b.date);
    } catch {
      return null;
    }
  };

  // Apply trip filter and date range first
  const prefiltered = useMemo(() => {
    return bookings.filter((b) => {
      // Trip filter
      if (selectedTripId && b.tripId !== selectedTripId) return false;

      // Date range filter - use booking.date
      if (dateRange?.from) {
        const dt = parseBookingDate(b);
        if (!dt) return false;
        // if to is not provided, treat as single-day start
        const to = dateRange.to || dateRange.from;
        if (!isWithinInterval(dt, { start: dateRange.from, end: to }))
          return false;
      }

      return true;
    });
  }, [bookings, selectedTripId, dateRange]);

  // Search across fields
  const searched = useMemo(() => {
    if (!searchTerm) return prefiltered;
    const term = searchTerm.toLowerCase();
    return prefiltered.filter((booking) => {
      const angler = booking.userId ? anglerMap[booking.userId] : null;
      const anglerName =
        angler?.name ||
        (booking.guestFirstName && booking.guestLastName
          ? `${booking.guestFirstName} ${booking.guestLastName}`
          : "");

      return (
        booking.charterName?.toLowerCase().includes(term) ||
        booking.tripName?.toLowerCase().includes(term) ||
        anglerName.toLowerCase().includes(term) ||
        booking.id.toLowerCase().includes(term) ||
        (angler?.email || booking.guestEmail || "").toLowerCase().includes(term)
      );
    });
  }, [prefiltered, searchTerm, anglerMap]);

  // Apply sorting
  const sorted = useMemo(() => {
    const toSort = [...searched];

    switch (sortBy) {
      case "newest":
        return toSort.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
      case "oldest":
        return toSort.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
      case "price-high":
        return toSort.sort((a, b) => b.totalPrice - a.totalPrice);
      case "price-low":
        return toSort.sort((a, b) => a.totalPrice - b.totalPrice);
      case "date-soon":
        return toSort.sort((a, b) => {
          const dateA = parseBookingDate(a);
          const dateB = parseBookingDate(b);
          if (!dateA || !dateB) return 0;
          return dateA.getTime() - dateB.getTime();
        });
      case "date-late":
        return toSort.sort((a, b) => {
          const dateA = parseBookingDate(a);
          const dateB = parseBookingDate(b);
          if (!dateA || !dateB) return 0;
          return dateB.getTime() - dateA.getTime();
        });
      default:
        return toSort;
    }
  }, [searched, sortBy]);

  // Grouping: REQUESTS, UPCOMING, COMPLETED, HISTORY (use sorted data)
  const now = useMemo(() => new Date(), []);

  const requests = useMemo(
    () => sorted.filter((b) => b.status === "PENDING"),
    [sorted]
  );

  const upcoming = useMemo(() => {
    return sorted.filter((b) => {
      const dt = parseBookingDate(b);
      if (!dt) return false;
      // Consider upcoming any APPROVED / PAID where trip is today or in future
      if (
        ["APPROVED", "PAID"].includes(b.status) &&
        dt.getTime() >= now.getTime()
      ) {
        return true;
      }
      return false;
    });
  }, [sorted, now]);

  const completed = useMemo(() => {
    return sorted.filter((b) => {
      const dt = parseBookingDate(b);
      // Treat bookings as completed when they were paid and the trip date is in the past
      if (b.status === "PAID" && dt && dt.getTime() < now.getTime())
        return true;
      return false;
    });
  }, [sorted, now]);

  const history = useMemo(() => {
    return sorted.filter((b) => {
      // History includes: rejected, cancelled, expired, and completed trips
      if (["REJECTED", "CANCELLED", "EXPIRED"].includes(b.status)) return true;
      const dt = parseBookingDate(b);
      if (b.status === "PAID" && dt && dt.getTime() < now.getTime())
        return true;
      return false;
    });
  }, [sorted, now]);

  // When filters/search active, show grouped view; otherwise show tab-filtered view
  const hasFiltersOrSearch = Boolean(
    searchTerm || selectedTripId || dateRange?.from
  );

  // Tab-based filtering (used when no filters/search)
  const tabFiltered = useMemo(() => {
    if (hasFiltersOrSearch) return sorted; // Return all when filtering

    switch (activeTab) {
      case "requests":
        return requests;
      case "upcoming":
        return upcoming;
      case "all":
        return sorted;
      case "history":
        return history;
      default:
        return sorted;
    }
  }, [activeTab, hasFiltersOrSearch, sorted, requests, upcoming, history]);

  // Tab counts
  const tabCounts = useMemo(
    () => ({
      requests: requests.length,
      upcoming: upcoming.length,
      all: sorted.length,
      history: history.length,
    }),
    [requests.length, upcoming.length, sorted.length, history.length]
  );

  function clearFilters() {
    setSelectedTripId(null);
    setDateRange(undefined);
  }

  const hasActiveFilters = Boolean(selectedTripId) || Boolean(dateRange?.from);

  return (
    <div className="space-y-6">
      {/* Search + Filters */}
      <div className="flex flex-col items-center justify-between w-full gap-3 p-4 bg-white border border-slate-200 rounded-xl sm:flex-row">
        <div className="relative w-full">
          <Search className="absolute w-5 h-5 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by angler name, charter, trip, or booking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow"
          />
        </div>

        <div className="flex items-center self-end h-full gap-2 sm:self-center">
          <BookingFilters
            trips={trips}
            selectedTripId={selectedTripId}
            dateRange={dateRange}
            onTripChange={(id) => setSelectedTripId(id)}
            onDateRangeChange={(r) => setDateRange(r)}
            onClearFilters={() => clearFilters()}
            hasActiveFilters={hasActiveFilters}
          />

          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm transition-colors border rounded-lg border-slate-300 hover:bg-slate-50 text-slate-700"
            onClick={() => {
              // quick reset
              setSearchTerm("");
              clearFilters();
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* View Options - Sort, Density, Grid/List */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl">
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="sort-by"
            className="text-sm font-medium text-slate-700"
          >
            Sort:
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-high">Price: High to Low</option>
            <option value="price-low">Price: Low to High</option>
            <option value="date-soon">Trip Date: Soonest</option>
            <option value="date-late">Trip Date: Latest</option>
          </select>
        </div>

        {/* View Density + Grid/List (Desktop Only) */}
        <div className="items-center hidden gap-3 sm:flex">
          {/* Density Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
            <button
              onClick={() => setViewDensity("comfortable")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewDensity === "comfortable"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Comfortable view"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden md:inline">Comfortable</span>
            </button>
            <button
              onClick={() => setViewDensity("compact")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewDensity === "compact"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Compact view"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden md:inline">Compact</span>
            </button>
          </div>

          {/* Grid/List Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
            <button
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile: Show only sort dropdown */}
      </div>

      {/* Tabs - Hidden when filters/search active */}
      {!hasFiltersOrSearch && (
        <div className="bg-white border border-slate-200 rounded-xl p-1.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { label: "Requests", value: "requests" as const },
              { label: "Upcoming", value: "upcoming" as const },
              { label: "All Bookings", value: "all" as const },
              { label: "History", value: "history" as const },
            ].map((tab) => {
              const isActive = activeTab === tab.value;
              const count = tabCounts[tab.value];

              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveTab(tab.value);
                    setSearchTerm("");
                    clearFilters();
                  }}
                  className={`relative px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#ec2227] text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content: Grouped sections when filtering, or tab-filtered list */}
      {hasFiltersOrSearch ? (
        /* Grouped Sections */
        <section className="space-y-6">
          {/* Requests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Requests</h3>
              <div className="text-sm text-slate-500">
                {requests.length} items
              </div>
            </div>

            {requests.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                    : "space-y-4"
                }
              >
                {requests.map((b) => (
                  <EnhancedBookingCard
                    key={b.id}
                    booking={b}
                    anglerInfo={b.userId ? anglerMap[b.userId] : null}
                    showTimeline
                    viewDensity={viewDensity}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-white border border-slate-200 rounded-xl text-slate-600">
                No pending requests.
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Upcoming</h3>
              <div className="text-sm text-slate-500">
                {upcoming.length} items
              </div>
            </div>

            {upcoming.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                    : "space-y-4"
                }
              >
                {upcoming.map((b) => (
                  <EnhancedBookingCard
                    key={b.id}
                    booking={b}
                    anglerInfo={b.userId ? anglerMap[b.userId] : null}
                    showTimeline
                    viewDensity={viewDensity}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-white border border-slate-200 rounded-xl text-slate-600">
                No upcoming trips match your filters.
              </div>
            )}
          </div>

          {/* Completed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Completed</h3>
              <div className="text-sm text-slate-500">
                {completed.length} items
              </div>
            </div>

            {completed.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                    : "space-y-4"
                }
              >
                {completed.map((b) => (
                  <EnhancedBookingCard
                    key={b.id}
                    booking={b}
                    anglerInfo={b.userId ? anglerMap[b.userId] : null}
                    showTimeline
                    viewDensity={viewDensity}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-white border border-slate-200 rounded-xl text-slate-600">
                No completed bookings match your filters.
              </div>
            )}
          </div>
        </section>
      ) : (
        /* Tab-filtered list */
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
              : "space-y-4"
          }
        >
          {tabFiltered.length > 0 ? (
            tabFiltered.map((b) => (
              <EnhancedBookingCard
                key={b.id}
                booking={b}
                anglerInfo={b.userId ? anglerMap[b.userId] : null}
                showTimeline
                viewDensity={viewDensity}
              />
            ))
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
              <div className="max-w-sm mx-auto">
                <div className="mb-4 text-4xl">
                  {activeTab === "requests" && "📬"}
                  {activeTab === "upcoming" && "🗓️"}
                  {activeTab === "all" && "📋"}
                  {activeTab === "history" && "📚"}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  {activeTab === "requests" && "No pending requests"}
                  {activeTab === "upcoming" && "No upcoming trips"}
                  {activeTab === "all" && "No bookings yet"}
                  {activeTab === "history" && "No booking history"}
                </h3>
                <p className="text-sm text-slate-600">
                  {activeTab === "requests" &&
                    "New booking requests will appear here when customers book your charters."}
                  {activeTab === "upcoming" &&
                    "Confirmed trips will be listed here."}
                  {activeTab === "all" && "All bookings will appear here."}
                  {activeTab === "history" &&
                    "Completed, rejected, and cancelled bookings will appear here."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

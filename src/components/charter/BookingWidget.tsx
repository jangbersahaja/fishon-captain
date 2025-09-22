"use client";

import CalendarPicker from "@/components/CalendarPicker";
import type { Trip } from "@/dummy/charter";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function BookingWidget({
  trips,
  defaultPersons = 2,
  personsMax,
  childFriendly = true,
  preview = false,
  className = "",
}: {
  trips: Trip[];
  defaultPersons?: number;
  personsMax?: number;
  childFriendly?: boolean;
  preview?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const spAdults = parseInt(
    searchParams.get("adults") || searchParams.get("booking_persons") || "",
    10
  );
  const spChildren = parseInt(searchParams.get("children") || "", 10);
  const spDate = searchParams.get("date");
  const spDays = parseInt(searchParams.get("days") || "", 10);

  const readOnly = preview === true;

  // Compute initial guests from search params with fallbacks
  let initAdults =
    Number.isFinite(spAdults) && spAdults > 0
      ? spAdults
      : Math.max(1, defaultPersons);
  let initChildren =
    Number.isFinite(spChildren) && spChildren >= 0 ? spChildren : 0;

  if (typeof personsMax === "number" && personsMax > 0) {
    // Clamp to max capacity (reduce children first, then adults)
    const total = initAdults + initChildren;
    if (total > personsMax) {
      const excess = total - personsMax;
      const reduceChildren = Math.min(initChildren, excess);
      initChildren -= reduceChildren;
      const remaining = excess - reduceChildren;
      initAdults = Math.max(1, initAdults - remaining);
      if (initAdults + initChildren > personsMax) {
        initAdults = Math.max(1, personsMax - initChildren);
      }
    }
  }

  const initDate = spDate || todayIso();
  const initDays = Number.isFinite(spDays) && spDays >= 1 ? spDays : 1;

  const [adults, setAdults] = useState(initAdults);
  const [children, setChildren] = useState(initChildren);
  const [date, setDate] = useState<string>(initDate);
  const [days, setDays] = useState<number>(initDays);
  const MAX_DAYS = 14;
  function decDays() {
    if (readOnly) return;
    setDays((d) => Math.max(1, d - 1));
  }
  function incDays() {
    if (readOnly) return;
    setDays((d) => Math.min(MAX_DAYS, d + 1));
  }

  function replaceQuery(
    nextAdults: number,
    nextChildren: number,
    nextDate: string,
    nextDays: number
  ) {
    if (readOnly) return;
    const params = new URLSearchParams(searchParams.toString());
    if (Number.isFinite(nextAdults) && nextAdults > 0)
      params.set("adults", String(nextAdults));
    else params.delete("adults");

    if (Number.isFinite(nextChildren) && nextChildren >= 0)
      params.set("children", String(nextChildren));
    else params.delete("children");

    if (nextDate) params.set("date", nextDate);
    else params.delete("date");

    if (Number.isFinite(nextDays) && nextDays >= 1)
      params.set("days", String(nextDays));
    else params.delete("days");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const total = adults + children;
  const maxAllowed = personsMax ?? undefined;
  const overMax = maxAllowed !== undefined && total > maxAllowed;

  // Availability: for now, once a date is selected we show trips.
  // Hook up real availability later (API call) and set `available` accordingly.
  const available = !!date;

  function decAdults() {
    if (readOnly) return;
    setAdults((a) => Math.max(1, a - 1));
  }
  function incAdults() {
    if (readOnly) return;
    setAdults((a) =>
      maxAllowed ? Math.min(maxAllowed - children, a + 1) : a + 1
    );
  }
  function decChildren() {
    if (readOnly) return;
    setChildren((c) => Math.max(0, c - 1));
  }
  function incChildren() {
    if (readOnly) return;
    setChildren((c) => {
      const nextRaw = c + 1;
      return maxAllowed ? Math.min(maxAllowed - adults, nextRaw) : nextRaw;
    });
  }

  // Sync URL with current selections after render to avoid Router updates during render
  useEffect(() => {
    if (readOnly) return;
    replaceQuery(adults, children, date, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adults, children, date, days, readOnly]);

  const containerClassName = [
    "rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold sm:text-lg">
          Check availability
        </h3>
      </div>

      {/* Date (custom picker – same vibe as SearchBox) */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-700">Date</label>
        <CalendarPicker value={date} onChange={(v) => setDate(v)} />
      </div>

      {/* Days */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-700">Days</label>
        <div className="mt-1 flex h-10 items-center justify-between rounded-lg border border-gray-300 px-3">
          <button
            type="button"
            className="h-7 w-7 rounded-full border border-gray-300 text-sm leading-none hover:bg-gray-50"
            onClick={decDays}
            aria-label="Decrease days"
          >
            −
          </button>
          <span className="min-w-[2ch] text-sm text-center">{days}</span>
          <button
            type="button"
            className="h-7 w-7 rounded-full border border-gray-300 text-sm leading-none hover:bg-gray-50"
            onClick={incDays}
            aria-label="Increase days"
          >
            +
          </button>
        </div>
        <span className="text-[11px] text-gray-500">up to {MAX_DAYS} days</span>
      </div>

      {/* Guests */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          {/* Adults */}
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Adults
            </label>
            <div className="mt-1 flex h-10 items-center justify-between rounded-lg border border-gray-300 px-3">
              <button
                type="button"
                className="h-7 w-7 rounded-full border border-gray-300 text-sm leading-none hover:bg-gray-50"
                onClick={decAdults}
                aria-label="Decrease adults"
              >
                −
              </button>
              <span className="min-w-[2ch] text-sm text-center">{adults}</span>
              <button
                type="button"
                className="h-7 w-7 rounded-full border border-gray-300 text-sm leading-none hover:bg-gray-50"
                onClick={incAdults}
                aria-label="Increase adults"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div>
          {/* Children */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700">
                Children
              </label>
              {!childFriendly && (
                <span className="text-[10px] text-gray-500">
                  Not child friendly
                </span>
              )}
            </div>
            <div className="mt-1 flex h-10 items-center justify-between rounded-lg border border-gray-300 px-3">
              <button
                type="button"
                className="h-7 w-7 rounded-full border border-gray-300 text-sm leading-none hover:bg-gray-50 disabled:opacity-50"
                onClick={decChildren}
                aria-label="Decrease children"
                disabled={!childFriendly}
              >
                −
              </button>
              <span className="min-w-[2ch] text-sm text-center">
                {children}
              </span>
              <button
                type="button"
                className="h-7 w-7 rounded-full border border-gray-300 text-sm leading-none hover:bg-gray-50 disabled:opacity-50"
                onClick={incChildren}
                aria-label="Increase children"
                disabled={!childFriendly}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {maxAllowed !== undefined && (
          <p className="-mt-1 text-[11px] text-gray-500">
            Max {maxAllowed} guests.
          </p>
        )}
        {overMax && (
          <p className="-mt-1 text-[11px] text-red-600">
            You’ve exceeded the maximum capacity.
          </p>
        )}
      </div>

      {/* Trips shown only when available */}
      <div className="mt-4">
        {available ? (
          <div className="space-y-3">
            {trips.map((t, i) => (
              <div
                key={t.name + i}
                className="rounded-xl border border-black/10 p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-gray-600">
                      {t.duration}
                      {t.maxAnglers ? ` • up to ${t.maxAnglers} anglers` : ""}
                    </div>
                    {t.startTimes && t.startTimes.length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        Starts: {t.startTimes.join(", ")}
                      </div>
                    )}
                    {t.description && (
                      <div className="mt-2 text-xs text-gray-700">
                        {t.description}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#ec2227]">
                      RM{t.price * days}
                    </div>
                    {days > 1 && (
                      <div className="text-[11px] text-gray-500">
                        total for {days} day{days > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-[#ec2227] px-4 py-2 text-sm font-semibold text-white hover:translate-y-px transition disabled:opacity-50"
                  disabled={overMax}
                  onClick={() => {
                    // TODO: replace with real reserve flow (route to checkout or call API)
                    console.log("Reserve", {
                      tripIndex: i,
                      date,
                      days,
                      adults,
                      children,
                    });
                  }}
                >
                  Reserve Trip
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            Select a date to view available trips.
          </p>
        )}
      </div>
    </div>
  );
}

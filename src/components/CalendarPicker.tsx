"use client";

import { useEffect, useMemo, useState } from "react";

// Local date helpers (no UTC conversion)
const DISPLAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatLocalYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseLocalYMD(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return undefined;
  return new Date(y, mo - 1, d); // local midnight
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function startDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0..6
}

export default function CalendarPicker({
  value,
  onChange,
  disablePast = true,
  className = "",
  buttonClassName = "",
}: {
  value?: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
  disablePast?: boolean;
  className?: string;
  buttonClassName?: string; // style the trigger if needed
}) {
  const [open, setOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const selected = parseLocalYMD(value);
  const [viewYear, setViewYear] = useState(
    selected?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    selected?.getMonth() ?? today.getMonth()
  );

  useEffect(() => {
    // keep view anchored to externally changed value
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const dim = daysInMonth(viewYear, viewMonth);
  const firstDow = startDayOfMonth(viewYear, viewMonth);

  const weeks: (number | null)[][] = [];
  {
    let w: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= dim; d++) {
      w.push(d);
      if (w.length === 7) {
        weeks.push(w);
        w = [];
      }
    }
    if (w.length) {
      while (w.length < 7) w.push(null);
      weeks.push(w);
    }
  }

  const isPast = (y: number, m: number, d: number) => {
    if (!disablePast) return false;
    const cand = new Date(y, m, d);
    cand.setHours(0, 0, 0, 0);
    return cand.getTime() < today.getTime();
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dow = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className={["relative", className].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full rounded-lg border border-gray-300 py-2 px-3 text-left text-sm outline-none",
          buttonClassName,
        ].join(" ")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? "" : "text-gray-500"}>
          {value
            ? (() => {
                try {
                  return DISPLAY_FORMATTER.format(new Date(value));
                } catch {
                  return value;
                }
              })()
            : "Select date"}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute z-20 mt-2 w-[min(20rem,100%)] rounded-xl border border-black/10 bg-white shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
            <button
              type="button"
              className="rounded p-1 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else {
                  setViewMonth((m) => m - 1);
                }
              }}
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="text-sm font-semibold">
              {monthNames[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              className="rounded p-1 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else {
                  setViewMonth((m) => m + 1);
                }
              }}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          {/* Grid */}
          <div className="px-3 pb-3 pt-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500">
              {dow.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1 text-center">
              {weeks.map((w, wi) =>
                w.map((d, di) => {
                  if (d === null)
                    return <div key={`${wi}-${di}`} className="h-8" />;
                  const disabled = isPast(viewYear, viewMonth, d);
                  const isSel =
                    !!selected &&
                    selected.getFullYear() === viewYear &&
                    selected.getMonth() === viewMonth &&
                    selected.getDate() === d;
                  return (
                    <button
                      key={`${wi}-${di}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const nd = new Date(viewYear, viewMonth, d);
                        onChange(formatLocalYMD(nd)); // RETURN STRING
                        setOpen(false);
                      }}
                      className={[
                        "h-8 rounded text-sm",
                        disabled
                          ? "cursor-not-allowed text-gray-300"
                          : "hover:bg-gray-100",
                        isSel
                          ? "bg-[#ec2227] text-white hover:bg-[#c11212]"
                          : "",
                      ].join(" ")}
                      aria-pressed={isSel}
                    >
                      {d}
                    </button>
                  );
                })
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const todayStr = formatLocalYMD(today);
                  onChange(todayStr); // **select today**
                  setViewYear(today.getFullYear()); // keep view synced
                  setViewMonth(today.getMonth());
                }}
                className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

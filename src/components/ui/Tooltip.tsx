"use client";
import React, { useEffect, useId, useRef, useState } from "react";

/**
 * Lightweight tooltip component (no external deps).
 * Usage:
 * <Tooltip content="Submit edits"><button>...</button></Tooltip>
 */
export function Tooltip({
  content,
  children,
  side = "top",
  delay = 60,
}: {
  content: React.ReactNode;
  children: React.ReactElement<Record<string, unknown>>;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => setMounted(true), []);
  const show = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(false);
  };
  const pos =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-1.5"
      : side === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 mt-1.5"
      : side === "left"
      ? "right-full top-1/2 -translate-y-1/2 mr-1.5"
      : "left-full top-1/2 -translate-y-1/2 ml-1.5";
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(children, {
        // Add ARIA description attribute to the trigger element
        "aria-describedby": open ? id : undefined,
      })}
      {mounted && open && (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md ${pos} animate-in fade-in`}
        >
          {content}
          <span className="absolute inset-0 -z-10" aria-hidden />
        </span>
      )}
    </span>
  );
}

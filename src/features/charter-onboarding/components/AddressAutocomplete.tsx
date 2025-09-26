"use client";
import { inputClass } from "@features/charter-onboarding/constants";
import clsx from "clsx";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface AddressSuggestion {
  description: string;
  place_id: string;
}
interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (s: AddressSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  minLength?: number;
  debounceMs?: number;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelectSuggestion,
  placeholder = "Start typing an address or jetty...",
  disabled,
  error,
  className,
  minLength = 3,
  debounceMs = 250,
}: AddressAutocompleteProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const fetchSuggestions = useCallback(
    (query: string) => {
      if (abortRef.current) abortRef.current.abort();
      if (query.length < minLength) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      abortRef.current = new AbortController();
      fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(
          query
        )}&sessiontoken=${sessionTokenRef.current}`,
        { signal: abortRef.current.signal }
      )
        .then((r) => r.json())
        .then((data) => {
          setSuggestions(data.predictions ?? []);
          setOpen((data.predictions ?? []).length > 0);
          setHighlight(-1);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Autocomplete fetch failed", err);
          }
        });
    },
    [minLength]
  );
  const scheduleFetch = useCallback(
    (query: string) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(
        () => fetchSuggestions(query),
        debounceMs
      );
    },
    [fetchSuggestions, debounceMs]
  );
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    scheduleFetch(val);
  };
  const selectIndex = (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;
    onChange(s.description);
    onSelectSuggestion?.(s);
    setOpen(false);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (highlight >= 0) {
        e.preventDefault();
        selectIndex(highlight);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          inputClass,
          error && "border-red-500 focus:ring-red-300"
        )}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.place_id}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                selectIndex(i);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={clsx(
                "cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-slate-100",
                i === highlight && "bg-slate-100"
              )}
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import clsx from "clsx";

import { ACCENT } from "../constants";

type ChipGridProps = {
  options: string[];
  selected?: string[];
  onToggle: (value: string) => void;
};

export function ChipGrid({ options, selected = [], onToggle }: ChipGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              active
                ? "text-white"
                : "border-neutral-200 bg-white text-slate-700 hover:border-slate-300"
            )}
            style={
              active
                ? { backgroundColor: ACCENT, borderColor: ACCENT }
                : undefined
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

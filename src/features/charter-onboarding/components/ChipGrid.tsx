import { ACCENT } from "@features/charter-onboarding/constants";
import clsx from "clsx";

type ChipGridProps = {
  options: { key: string; label: string; labelMy?: string }[];
  selected?: string[];
  onToggle: (value: string) => void;
};

export function ChipGrid({ options, selected = [], onToggle }: ChipGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {options.map((option) => {
        const active = selected.includes(option.label);
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onToggle(option.label)}
            className="flex items-center gap-3 px-3 py-2 text-sm border rounded-md text-slate-700 border-slate-200 bg-slate-50"
          >
            <span
              className={clsx(
                "rounded-sm border h-6 w-6 transition",
                active
                  ? "text-white"
                  : "border-neutral-200 bg-white text-slate-700 hover:border-slate-300"
              )}
              style={
                active
                  ? { backgroundColor: ACCENT, borderColor: ACCENT }
                  : undefined
              }
            />
            <div className="flex flex-col items-start md:flex-row md:gap-2 md:items-center">
              <span>{option.label}</span>
              {option.labelMy && option.labelMy !== option.label && (
                <span className="font-normal text-slate-600">
                  [{option.labelMy}]
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

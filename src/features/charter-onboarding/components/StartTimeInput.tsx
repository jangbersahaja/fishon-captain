import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import { inputClass } from "@features/charter-onboarding/constants";
import { useState } from "react";

type StartTimeInputProps = {
  times?: string[];
  onAdd: (time: string) => void;
  onRemove: (time: string) => void;
};

export function StartTimeInput({
  times = [],
  onAdd,
  onRemove,
}: StartTimeInputProps) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex w-full gap-2 lg:w-1/3">
        <input
          type="time"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => {
            if (!draft) return;
            onAdd(draft);
            setDraft("");
          }}
          className="px-4 py-2 text-sm font-semibold transition bg-[#ec2227] border rounded-lg border-neutral-200 text-white hover:border-slate-300"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {times.map((time) => (
          <span
            key={time}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold bg-[#ec2227] border rounded-sm border-neutral-200 text-white"
          >
            {convert24to12Hour(time)}
            <button
              type="button"
              onClick={() => onRemove(time)}
              className="font-bold text-white transition hover:text-white/90"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

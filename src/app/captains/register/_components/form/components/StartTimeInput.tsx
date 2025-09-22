import { useState } from "react";

import { inputClass } from "../constants";

type StartTimeInputProps = {
  times?: string[];
  onAdd: (time: string) => void;
  onRemove: (time: string) => void;
};

export function StartTimeInput({ times = [], onAdd, onRemove }: StartTimeInputProps) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
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
          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {times.map((time) => (
          <span
            key={time}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {time}
            <button
              type="button"
              onClick={() => onRemove(time)}
              className="text-slate-400 transition hover:text-slate-700"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

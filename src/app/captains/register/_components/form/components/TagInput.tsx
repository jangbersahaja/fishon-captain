import { useState } from "react";

import { inputClass } from "../constants";

type TagInputProps = {
  values?: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
};

export function TagInput({ values = [], onAdd, onRemove }: TagInputProps) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={inputClass}
          placeholder="Add new value"
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            onAdd(draft.trim());
            setDraft("");
          }}
          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
        >
          Add
        </button>
      </div>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {value}
              <button
                type="button"
                onClick={() => onRemove(value)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

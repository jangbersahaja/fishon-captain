import type { ReactNode } from "react";

export type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function Field({ label, error, hint, className, children }: FieldProps) {
  return (
    <label
      className={`block text-sm font-semibold text-slate-800 ${
        className ?? ""
      }`}
    >
      <span>{label}</span>
      <div className="mt-2 space-y-1">
        {children}
        {hint && !error ? (
          <span className="text-xs text-slate-500">{hint}</span>
        ) : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </label>
  );
}

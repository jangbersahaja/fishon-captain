import { type ReactNode } from "react";

export type FieldProps = {
  label: string;
  labelMy?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  labelMy,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <label
      className={`block text-sm font-semibold text-slate-800 ${
        className ?? ""
      }`}
    >
      <div className="flex gap-1">
        <span>{label}</span>
        {labelMy && (
          <span className="font-normal text-slate-600">[{labelMy}]</span>
        )}
      </div>
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

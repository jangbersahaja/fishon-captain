import clsx from "clsx";

export type StepDefinition = { id: string; label: string };

type StepProgressProps = {
  steps: StepDefinition[];
  currentStep: number;
  completed?: boolean[];
  onStepClick?: (index: number) => void;
  clickable?: boolean;
};

export function StepProgress({
  steps,
  currentStep,
  completed,
  onStepClick,
  clickable = false,
}: StepProgressProps) {
  return (
    <ol
      className="flex flex-wrap items-center gap-4 rounded-2xl bg-white/80 px-4 py-3 text-sm shadow-sm ring-1 ring-neutral-200"
      aria-label="Form progress"
      role="list"
    >
      {steps.map((step, index) => {
        const status =
          index < currentStep
            ? "complete"
            : index === currentStep
            ? "current"
            : "upcoming";
        const isDone = completed?.[index];
        const interactive = clickable && (isDone || index <= currentStep + 1);
        const handleActivate = () => {
          if (interactive && onStepClick) onStepClick(index);
        };
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleActivate}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleActivate();
                }
              }}
              disabled={!interactive}
              aria-current={status === "current" ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${step.label}${
                status === "current" ? " (current)" : ""
              }`}
              className={clsx(
                "group flex items-center gap-2 rounded-full px-1 py-1 outline-none transition disabled:cursor-default",
                interactive
                  ? "hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400"
                  : "opacity-60",
                status === "current" && "bg-slate-100"
              )}
            >
              <span
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                  status === "complete"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : status === "current"
                    ? "border-slate-900 text-slate-900"
                    : "border-neutral-200 text-slate-400"
                )}
              >
                {isDone && status !== "current" ? "✓" : index + 1}
              </span>
              <span
                className={clsx(
                  "text-sm text-left",
                  status === "current"
                    ? "font-semibold text-slate-900"
                    : status === "complete"
                    ? "text-slate-700"
                    : "text-slate-500",
                  interactive &&
                    "group-hover:text-slate-900 group-hover:underline decoration-dotted"
                )}
              >
                {step.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

import clsx from "clsx";

export type StepDefinition = {
  id: string;
  label: string;
};

type StepProgressProps = {
  steps: StepDefinition[];
  currentStep: number;
};

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <ol className="flex flex-wrap items-center gap-4 rounded-2xl bg-white/80 px-4 py-3 text-sm shadow-sm ring-1 ring-neutral-200">
      {steps.map((step, index) => {
        const status =
          index < currentStep
            ? "complete"
            : index === currentStep
            ? "current"
            : "upcoming";
        return (
          <li key={step.id} className="flex items-center gap-2">
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
              {index + 1}
            </span>
            <span
              className={clsx(
                "text-sm",
                status === "current"
                  ? "font-semibold text-slate-900"
                  : status === "complete"
                  ? "text-slate-700"
                  : "text-slate-500"
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

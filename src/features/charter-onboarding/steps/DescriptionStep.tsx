"use client";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { AutoResizeTextarea, Field } from "@features/charter-onboarding/components";
import { generateCharterDescription, personalizationScore } from "@features/charter-onboarding/utils/descriptionGenerator";
import { useCallback, useEffect } from "react";
import { useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

interface DescriptionStepProps {
  form: UseFormReturn<CharterFormValues>;
  fieldError?: (path?: string) => string | undefined;
}

export function DescriptionStep({ form, fieldError }: DescriptionStepProps) {
  const description = useWatch({ control: form.control, name: "description" });
  const generated = useWatch({ control: form.control, name: "generatedDescription" });
  const tone = useWatch({ control: form.control, name: "tone" }) || "friendly";

  const score = personalizationScore(generated, description);
  const MIN_LEN = 40;
  const descLength = (description || "").length;
  const remaining = Math.max(0, MIN_LEN - descLength);

  const handleGenerate = useCallback(
    (mode: "new" | "refresh") => {
      const base = generateCharterDescription(form.getValues());
      if (mode === "refresh" && generated && description && score > 40) {
        const placeholders = description.match(/\[\[[^\]]+\]\]/g) || [];
        let next = description;
        const freshBlocks = base.split(/\n\n+/);
        placeholders.forEach((ph, i) => {
          const replacement = freshBlocks[i] || ph;
          next = next.replace(ph, replacement.includes("[[") ? replacement : replacement);
        });
        form.setValue("description", next, { shouldDirty: true, shouldValidate: true });
      } else {
        form.setValue("generatedDescription", base, { shouldDirty: true });
        form.setValue("description", base, { shouldDirty: true, shouldValidate: true });
      }
    },
    [form, generated, description, score]
  );

  const handleToneChange = (t: string) => {
    form.setValue("tone", t as "friendly" | "adventurous" | "professional", { shouldDirty: true });
    handleGenerate("new");
  };

  useEffect(() => {
    if (!description) {
      handleGenerate("new");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Charter Description</h2>
        <p className="text-sm text-slate-500">
          Craft a compelling story. Anglers want to feel the day, not just read a list of features.
        </p>
      </header>
      <hr className="border-t my-6 border-neutral-200" />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { id: "friendly", label: "Friendly & Welcoming" },
            { id: "adventurous", label: "Adventurous & Energetic" },
            { id: "professional", label: "Professional & Informative" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleToneChange(opt.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                tone === opt.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-neutral-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
              aria-pressed={tone === opt.id}
            >
              {opt.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Personalization:</span>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                score >= 60
                  ? "bg-emerald-100 text-emerald-700"
                  : score >= 30
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {score}%
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          We generated a starter description based on what you&apos;ve filled in. Add your personality—stories,
          local insight, memorable catches. Placeholders like
          <code className="rounded bg-white px-1 ml-1">[[Add a sentence about your captain’s style]]</code> are prompts you can replace.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleGenerate("new")}
            className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => handleGenerate("refresh")}
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Refresh Placeholders
          </button>
        </div>
        <Field label="Charter description" error={fieldError?.("description")} className="mt-2">
          <AutoResizeTextarea
            {...form.register("description")}
            rows={12}
            className="font-normal"
            placeholder="We’ll generate something here once you pick a tone."
          />
          <div className="mt-1 flex items-center justify-between text-[11px] leading-none">
            <span
              className={
                remaining === 0
                  ? "text-emerald-600"
                  : remaining <= 10
                  ? "text-amber-600"
                  : "text-slate-500"
              }
            >
              {remaining === 0
                ? "Minimum length reached"
                : `${remaining} more character${remaining === 1 ? "" : "s"} to reach minimum (${MIN_LEN}).`}
            </span>
            <span className="tabular-nums text-slate-400">
              {descLength}/{MIN_LEN}
            </span>
          </div>
        </Field>
      </div>
    </section>
  );
}

import { useCallback } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { Field } from "../components/Field";
import { ChipGrid } from "../components/ChipGrid";
import { StartTimeInput } from "../components/StartTimeInput";
import { AutoResizeTextarea } from "../components/AutoResizeTextarea";
import { charterFormOptions, defaultTrip } from "../charterForm.defaults";
import { inputClass } from "../constants";
import type { CharterFormValues } from "../charterForm.schema";

type TripsStepProps = {
  form: UseFormReturn<CharterFormValues>;
};

type TripArrayKey = "targetSpecies" | "techniques";

export function TripsStep({ form }: TripsStepProps) {
  const { control, register, watch, formState } = form;
  const {
    TRIP_TYPE_OPTIONS,
    SPECIES_OPTIONS,
    TECHNIQUE_OPTIONS,
  } = charterFormOptions;

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "trips",
  });

  const trips = watch("trips");

  const toggleTripArray = useCallback(
    (index: number, key: TripArrayKey, value: string) => {
      const current = new Set(trips?.[index]?.[key] ?? []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      update(index, {
        ...trips?.[index],
        [key]: Array.from(current),
      });
    },
    [trips, update]
  );

  const handleStartTimeAdd = useCallback(
    (index: number, time: string) => {
      if (!/^\d{2}:\d{2}$/u.test(time)) return;
      const current = trips?.[index]?.startTimes ?? [];
      if (current.includes(time)) return;
      update(index, {
        ...trips?.[index],
        startTimes: [...current, time],
      });
    },
    [trips, update]
  );

  const removeStartTime = useCallback(
    (index: number, time: string) => {
      const current = trips?.[index]?.startTimes ?? [];
      update(index, {
        ...trips?.[index],
        startTimes: current.filter((item) => item !== time),
      });
    },
    [trips, update]
  );

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Trips & pricing</h2>
        <p className="text-sm text-slate-500">
          Outline each package you offer. We&apos;ll show these to anglers.
        </p>
      </header>

      <hr className="border-t my-6 border-neutral-200" />

      <div className="mt-6 space-y-6">
        {fields.map((field, index) => {
          const tripErrors = formState.errors.trips?.[index];

          return (
            <div
              key={field.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Trip {index + 1}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fill in the details below. Anglers will see this as a package.
                  </p>
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field label="Trip type" error={tripErrors?.tripType?.message}>
                  <select
                    {...register(`trips.${index}.tripType` as const)}
                    className={inputClass}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const current = trips?.[index];
                      update(index, {
                        ...current,
                        tripType: nextValue,
                        name: current?.name || nextValue,
                      });
                    }}
                  >
                    {TRIP_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Trip name" error={tripErrors?.name?.message}>
                  <input
                    {...register(`trips.${index}.name` as const)}
                    className={inputClass}
                    placeholder="e.g. Half-day mangrove"
                  />
                </Field>
                <Field label="Price (MYR)" error={tripErrors?.price?.message}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    {...register(`trips.${index}.price` as const, {
                      valueAsNumber: true,
                    })}
                    className={inputClass}
                    placeholder="0"
                  />
                </Field>
                <Field
                  label="Duration (Hour)"
                  error={tripErrors?.durationHours?.message}
                >
                  <input
                    type="number"
                    min={1}
                    step={1}
                    {...register(`trips.${index}.durationHours` as const, {
                      valueAsNumber: true,
                    })}
                    className={inputClass}
                    placeholder="4"
                  />
                </Field>
                <Field label="Max anglers" error={tripErrors?.maxAnglers?.message}>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    {...register(`trips.${index}.maxAnglers` as const, {
                      valueAsNumber: true,
                    })}
                    className={inputClass}
                    placeholder="4"
                  />
                </Field>
                <Field label="Charter style" error={tripErrors?.charterStyle?.message}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm">
                      <input
                        type="radio"
                        value="private"
                        {...register(`trips.${index}.charterStyle` as const)}
                        className="h-4 w-4 border-slate-300"
                      />
                      Private charter
                    </label>
                    <label className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm">
                      <input
                        type="radio"
                        value="shared"
                        {...register(`trips.${index}.charterStyle` as const)}
                        className="h-4 w-4 border-slate-300"
                      />
                      Shared charter
                    </label>
                  </div>
                </Field>
              </div>

              <Field
                className="mt-4"
                label="Departure times"
                error={tripErrors?.startTimes?.message}
                hint="Add as many start times as you offer"
              >
                <StartTimeInput
                  times={trips?.[index]?.startTimes}
                  onAdd={(time) => handleStartTimeAdd(index, time)}
                  onRemove={(time) => removeStartTime(index, time)}
                />
              </Field>

              <Field
                className="mt-4"
                label="Trip description (optional)"
                error={tripErrors?.description?.message}
              >
                <AutoResizeTextarea
                  rows={3}
                  {...register(`trips.${index}.description` as const)}
                  placeholder="What anglers can expect, techniques, travel time, etc."
                />
              </Field>

              <Field className="mt-4" label="Target species">
                <ChipGrid
                  options={SPECIES_OPTIONS}
                  selected={trips?.[index]?.targetSpecies}
                  onToggle={(value) => toggleTripArray(index, "targetSpecies", value)}
                />
              </Field>

              <Field className="mt-4" label="Fishing techniques">
                <ChipGrid
                  options={TECHNIQUE_OPTIONS}
                  selected={trips?.[index]?.techniques}
                  onToggle={(value) => toggleTripArray(index, "techniques", value)}
                />
              </Field>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => append(defaultTrip())}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
        >
          + Add another trip
        </button>
      </div>
    </section>
  );
}

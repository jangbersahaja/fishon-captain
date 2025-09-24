import { SPECIES_CATEGORIES } from "@/lib/data/species";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import {
  charterFormOptions,
  defaultTrip,
} from "@features/charter-form/charterForm.defaults";
import type { CharterFormValues } from "@features/charter-form/charterForm.schema";
import {
  AutoResizeTextarea,
  ChipGrid,
  Field,
  SpeciesSelector,
  StartTimeInput,
} from "@features/charter-form/components";
import { inputClass } from "@features/charter-form/constants";

type TripsStepProps = {
  form: UseFormReturn<CharterFormValues>;
};

type TripArrayKey = "targetSpecies" | "techniques";

export function TripsStep({ form }: TripsStepProps) {
  const { control, register, watch, formState } = form;
  const { TRIP_TYPE_OPTIONS, TECHNIQUE_OPTIONS } = charterFormOptions;

  // Global active species tab across all trips with persistence
  const STORAGE_KEY = "fishon.activeSpeciesTab";
  const [activeSpeciesTab, setActiveSpeciesTab] = useState<string>(
    SPECIES_CATEGORIES.SALTWATER
  );
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const categories = Object.values(SPECIES_CATEGORIES) as string[];
      if (saved && categories.includes(saved)) {
        setActiveSpeciesTab(
          saved as (typeof SPECIES_CATEGORIES)[keyof typeof SPECIES_CATEGORIES]
        );
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, activeSpeciesTab);
    } catch {
      /* ignore */
    }
  }, [activeSpeciesTab]);

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
        <h2 className="text-xl font-semibold text-slate-900">
          Trips & pricing
        </h2>
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
                  <h3 className="text-md font-semibold text-slate-900">
                    Trip {index + 1}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fill in the details below. Anglers will see this as a
                    package.
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
                    placeholder="5"
                  />
                </Field>
                <Field
                  label="Max anglers"
                  error={tripErrors?.maxAnglers?.message}
                >
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

              <Field className="mt-8" label="Fishing techniques">
                <ChipGrid
                  options={TECHNIQUE_OPTIONS}
                  selected={trips?.[index]?.techniques}
                  onToggle={(value) =>
                    toggleTripArray(index, "techniques", value)
                  }
                />
              </Field>

              <Field className="mt-8" label="Target species">
                <SpeciesSelector
                  value={trips?.[index]?.targetSpecies}
                  activeTab={
                    activeSpeciesTab as (typeof SPECIES_CATEGORIES)[keyof typeof SPECIES_CATEGORIES]
                  }
                  onActiveTabChange={(tab) => setActiveSpeciesTab(tab)}
                  maxSelected={5}
                  onChange={(next) =>
                    update(index, { ...trips?.[index], targetSpecies: next })
                  }
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

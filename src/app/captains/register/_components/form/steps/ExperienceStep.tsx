import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Field } from "../components/Field";
import { ChipGrid } from "../components/ChipGrid";
import { TagInput } from "../components/TagInput";
import { AutoResizeTextarea } from "../components/AutoResizeTextarea";
import { charterFormOptions } from "../charterForm.defaults";
import { inputClass, policyOptions } from "../constants";
import type { CharterFormValues } from "../charterForm.schema";

type ExperienceStepProps = {
  form: UseFormReturn<CharterFormValues>;
  fieldError: (path: string | undefined) => string | undefined;
};

export function ExperienceStep({ form, fieldError }: ExperienceStepProps) {
  const { register, watch, setValue } = form;
  const { BOAT_TYPES, BOAT_FEATURE_OPTIONS, AMENITIES_OPTIONS } = charterFormOptions;

  const boatFeatures = watch("boat.features");
  const amenities = watch("amenities");
  const pickupAreas = watch("pickup.areas");
  const pickupAvailable = watch("pickup.available");

  const toggleAmenity = useCallback(
    (value: string) => {
      const next = new Set(amenities ?? []);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      setValue("amenities", Array.from(next), { shouldValidate: true });
    },
    [amenities, setValue]
  );

  const toggleBoatFeature = useCallback(
    (value: string) => {
      const next = new Set(boatFeatures ?? []);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      setValue("boat.features", Array.from(next), { shouldValidate: true });
    },
    [boatFeatures, setValue]
  );

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Boat & Logistic</h2>
        <p className="text-sm text-slate-500">
          Tell anglers about your vessel, amenities, and policies.
        </p>
      </header>

      <hr className="border-t my-6 border-neutral-200" />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Boat name" error={fieldError("boat.name")}
          >
          <input
            {...register("boat.name")}
            className={inputClass}
            placeholder="e.g. Sea Breeze"
          />
        </Field>
        <Field label="Boat type" error={fieldError("boat.type")}>
          <select {...register("boat.type")} className={inputClass}>
            {BOAT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Boat length (feet)" error={fieldError("boat.lengthFeet")}>
          <input
            type="number"
            min={1}
            step={1}
            {...register("boat.lengthFeet", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 28"
          />
        </Field>
        <Field label="Passenger capacity" error={fieldError("boat.capacity")}>
          <input
            type="number"
            min={1}
            step={1}
            {...register("boat.capacity", { valueAsNumber: true })}
            className={inputClass}
            placeholder="Max anglers"
          />
        </Field>
      </div>

      <Field
        label="Boat features"
        error={fieldError("boat.features")}
        className="mt-6"
      >
        <ChipGrid
          options={BOAT_FEATURE_OPTIONS}
          selected={boatFeatures}
          onToggle={toggleBoatFeature}
        />
      </Field>

      <Field
        label="Amenities included"
        error={fieldError("amenities")}
        className="mt-6"
      >
        <ChipGrid
          options={AMENITIES_OPTIONS}
          selected={amenities}
          onToggle={toggleAmenity}
        />
      </Field>

      <Field
        label="Policies"
        hint="Anglers see these on your listing"
        className="mt-6"
      >
        <div className="grid gap-2">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              {...register("policies.licenseProvided")}
              className="h-4 w-4 rounded border-slate-300"
            />
            Fishing license provided
          </label>
          {policyOptions.map((policy) => (
            <label
              key={policy.key}
              className="flex items-center gap-3 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                {...register(`policies.${policy.key}` as const)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {policy.label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Pickup" error={fieldError("pickup.fee")} className="mt-6">
        <div className="grid gap-3">
          <div className="flex gap-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="radio"
                value="yes"
                checked={pickupAvailable === true}
                onChange={() =>
                  setValue("pickup.available", true, { shouldValidate: true })
                }
                className="h-4 w-4 border-slate-300"
              />
              Available
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="radio"
                value="no"
                checked={!pickupAvailable}
                onChange={() =>
                  setValue(
                    "pickup",
                    {
                      available: false,
                      fee: null,
                      areas: [],
                      notes: "",
                    },
                    { shouldValidate: true }
                  )
                }
                className="h-4 w-4 border-slate-300"
              />
              Not available
            </label>
          </div>

          {pickupAvailable ? (
            <div className="space-y-4">
              <Field
                label="Pickup fee (MYR)"
                error={fieldError("pickup.fee")}
                hint="Not included in charter total. Pay captain/crew directly."
              >
                <input
                  type="number"
                  min={0}
                  step={1}
                  {...register("pickup.fee", { valueAsNumber: true })}
                  className={inputClass}
                />
              </Field>
              <Field label="Pickup areas" hint="Add each location separately">
                <TagInput
                  values={pickupAreas}
                  onAdd={(value) => {
                    if (!value.trim()) return;
                    const current = new Set(pickupAreas ?? []);
                    current.add(value.trim());
                    setValue("pickup.areas", Array.from(current), {
                      shouldValidate: true,
                    });
                  }}
                  onRemove={(value) => {
                    const current = (pickupAreas ?? []).filter(
                      (item) => item !== value
                    );
                    setValue("pickup.areas", current, { shouldValidate: true });
                  }}
                />
              </Field>
              <Field label="Pickup notes">
                <AutoResizeTextarea
                  rows={3}
                  {...register("pickup.notes")}
                  placeholder="Timing, vehicle details, extra info"
                />
              </Field>
            </div>
          ) : null}
        </div>
      </Field>
    </section>
  );
}

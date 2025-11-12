import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";

import { charterFormOptions } from "@features/charter-onboarding/charterForm.defaults";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import {
  AutoResizeTextarea,
  ChipGrid,
  Field,
  TagInput,
} from "@features/charter-onboarding/components";
import {
  inputClass,
  policyOptions,
} from "@features/charter-onboarding/constants";

type ExperienceStepProps = {
  form: UseFormReturn<CharterFormValues>;
  fieldError: (path: string | undefined) => string | undefined;
};

export function ExperienceStep({ form, fieldError }: ExperienceStepProps) {
  const { register, watch, setValue } = form;
  const { BOAT_TYPES, BOAT_FEATURE_OPTIONS, AMENITIES_OPTIONS } =
    charterFormOptions;

  const boatFeatures = watch("boat.features");
  const amenities = watch("amenities");
  const pickupAreas = watch("pickup.areas");
  const pickupAvailable = watch("pickup.available");
  const withoutBoat = watch("withoutBoat");
  const scheduleType = watch("scheduleType");
  const operationalDays = watch("operationalDays");

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
    <>
      <section className="p-6 bg-white border shadow-sm rounded-3xl border-neutral-200">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Operation Schedule
            </h2>
            <h3 className="text-lg text-slate-600">[Jadual Operasi]</h3>
          </div>
          <p className="text-sm text-slate-500">
            Tell anglers about your vessel, amenities, and policies.
          </p>
        </header>

        <hr className="my-6 border-t border-neutral-200" />

        <Field
          label="Operational Days"
          labelMy="Hari Operasi"
          hint="When does your charter operate? This helps anglers know when they can book."
          className=""
          error={fieldError("scheduleType")}
        >
          <select {...register("scheduleType")} className={inputClass}>
            <option value="EVERYDAY">Everyday [Setiap Hari]</option>
            <option value="WEEKDAYS">Weekdays (Mon-Fri) [Isnin-Jumaat]</option>
            <option value="WEEKENDS">Weekends (Sat-Sun) [Sabtu-Ahad]</option>
            <option value="CUSTOM">Custom Days [Pilih Hari]</option>
          </select>

          {scheduleType === "CUSTOM" && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-600">
                Select operating days:
              </p>
              <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-3">
                {[
                  { label: "Sun", value: 0 },
                  { label: "Mon", value: 1 },
                  { label: "Tue", value: 2 },
                  { label: "Wed", value: 3 },
                  { label: "Thu", value: 4 },
                  { label: "Fri", value: 5 },
                  { label: "Sat", value: 6 },
                ].map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer text-slate-700 bg-slate-50 border-slate-200"
                  >
                    <input
                      type="checkbox"
                      value={day.value}
                      checked={operationalDays?.includes(day.value)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const updated = checked
                          ? [...(operationalDays || []), day.value].sort(
                              (a, b) => a - b
                            )
                          : operationalDays?.filter((d) => d !== day.value) ||
                            [];
                        setValue("operationalDays", updated, {
                          shouldValidate: true,
                        });
                      }}
                      className="w-4 h-4 bg-white border border-gray-300 rounded-sm appearance-none peer checked:bg-[#ec2227] checked:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ec2227] cursor-pointer"
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Field>
      </section>

      <section className="p-6 bg-white border shadow-sm rounded-3xl border-neutral-200">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Charter Amenities
            </h2>
            <h3 className="text-lg text-slate-600">[Kemudahan Disediakan]</h3>
          </div>
          <p className="text-sm text-slate-500">
            Tell anglers about your vessel, amenities, and policies.
          </p>
        </header>

        <hr className="my-6 border-t border-neutral-200" />

        <Field
          label="Choose Amenities"
          labelMy="Pilih Kemudahan"
          error={fieldError("amenities")}
          className=""
        >
          <ChipGrid
            options={AMENITIES_OPTIONS}
            selected={amenities}
            onToggle={toggleAmenity}
          />
        </Field>
      </section>

      <section className="p-6 bg-white border shadow-sm rounded-3xl border-neutral-200">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Charter Policies
            </h2>
            <h3 className="text-lg text-slate-600">[Polisi Charter]</h3>
          </div>
          <p className="text-sm text-slate-500">
            Tell anglers about your vessel, amenities, and policies.
          </p>
        </header>

        <hr className="my-6 border-t border-neutral-200" />

        <Field
          label="Policies"
          labelMy="Polisi"
          hint="Anglers see these on your listing"
          className="mt-6"
          error={fieldError("policies")}
        >
          <div className="grid gap-2 ">
            {policyOptions.map((policy) => (
              <label
                key={policy.key}
                className="flex items-center gap-3 px-3 py-2 text-sm border rounded-md text-slate-700 border-slate-200 bg-slate-50"
              >
                <input
                  type="checkbox"
                  {...register(`policies.${policy.key}` as const)}
                  className="w-6 h-6 bg-white border border-gray-300 rounded-sm appearance-none peer checked:bg-[#ec2227] checked:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ec2227] cursor-pointer"
                />
                <div className="flex flex-col md:flex-row md:gap-2">
                  <span>{policy.label}</span>
                  <span className="font-normal text-slate-600">
                    [{policy.labelMy}]
                  </span>
                </div>
              </label>
            ))}
          </div>
        </Field>

        <hr className="my-6 border-t border-neutral-200" />

        <Field
          label="Pickup"
          labelMy="Servis Pickup"
          error={fieldError("pickup.fee")}
          className="mt-6"
        >
          <div className="grid gap-3">
            <div className="flex gap-3 px-3 py-2 text-sm border rounded-md text-slate-700 border-slate-200 bg-slate-50 w-fit">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="pickup-available"
                  value="yes"
                  checked={Boolean(pickupAvailable) === true}
                  onChange={() =>
                    setValue("pickup.available", true, { shouldValidate: true })
                  }
                  className="w-6 h-6 bg-white border border-gray-300 rounded-sm appearance-none peer checked:bg-[#ec2227] checked:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ec2227] cursor-pointer"
                />
                Available
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="pickup-available"
                  value="no"
                  checked={Boolean(pickupAvailable) === false}
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
                  className="w-6 h-6 bg-white border border-gray-300 rounded-sm appearance-none peer checked:bg-[#ec2227] checked:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ec2227] cursor-pointer"
                />
                Not available
              </label>
            </div>

            {pickupAvailable ? (
              <div className="space-y-4">
                <Field
                  label="Pickup fee (MYR)"
                  labelMy="Bayaran Pickup (MYR)"
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
                <Field
                  label="Pickup areas"
                  labelMy="Tempat Pickup"
                  hint="Add each location separately"
                >
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
                      setValue("pickup.areas", current, {
                        shouldValidate: true,
                      });
                    }}
                  />
                </Field>
                <Field label="Pickup notes" labelMy="Nota Pickup">
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

      <section className="p-6 bg-white border shadow-sm rounded-3xl border-neutral-200">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Boat Information
            </h2>
            <h3 className="text-lg text-slate-600">[Maklumat Boat]</h3>
          </div>
          <p className="text-sm text-slate-500">
            Tell anglers about your vessel, amenities, and policies.
          </p>
        </header>

        <hr className="my-6 border-t border-neutral-200" />

        <div className="flex justify-start w-full">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              {...register("withoutBoat")}
              onChange={(e) => {
                setValue("withoutBoat", e.target.checked, {
                  shouldValidate: true,
                });
                if (e.target.checked) {
                  // Clear all boat field values when checkbox is checked
                  setValue("boat.name", "", { shouldValidate: true });
                  setValue("boat.type", "", { shouldValidate: true });
                  setValue("boat.lengthFeet", undefined, {
                    shouldValidate: true,
                  });
                  setValue("boat.capacity", undefined, {
                    shouldValidate: true,
                  });
                }
              }}
              className="w-6 h-6 bg-white border border-gray-300 rounded-sm appearance-none peer checked:bg-[#ec2227] checked:border-[#ec2227] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ec2227] cursor-pointer"
            />
            <div className="flex flex-col items-start">
              <span className="font-semibold">Service Without Boat</span>{" "}
              <span>[Servis Tanpa Bot]</span>
            </div>
          </label>
        </div>

        <hr className="my-6 border-t border-neutral-200" />

        <div
          className={`grid gap-5 sm:grid-cols-2 transition-opacity ${
            withoutBoat ? "opacity-40" : "opacity-100"
          }`}
        >
          <Field
            label="Boat name"
            labelMy="Nama Bot"
            error={fieldError("boat.name")}
          >
            <input
              {...register("boat.name", {
                setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
              })}
              disabled={withoutBoat}
              className={inputClass}
              placeholder="e.g. Sea Breeze"
            />
          </Field>
          <Field
            label="Boat type"
            labelMy="Jenis Bot"
            error={fieldError("boat.type")}
          >
            <select
              {...register("boat.type")}
              disabled={withoutBoat}
              className={inputClass}
            >
              {BOAT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Length (feet)"
            labelMy="Panjang (kaki)"
            error={fieldError("boat.lengthFeet")}
          >
            <input
              type="number"
              min={1}
              step={1}
              {...register("boat.lengthFeet", { valueAsNumber: true })}
              disabled={withoutBoat}
              className={inputClass}
              placeholder="e.g. 28"
            />
          </Field>
          <Field
            label="Passenger"
            labelMy="Penumpang"
            error={fieldError("boat.capacity")}
          >
            <input
              type="number"
              min={1}
              step={1}
              {...register("boat.capacity", { valueAsNumber: true })}
              disabled={withoutBoat}
              className={inputClass}
              placeholder="Max anglers"
            />
          </Field>
        </div>

        <hr className="my-6 border-t border-neutral-200" />

        <Field
          label="Boat features"
          labelMy="Peralatan Bot"
          error={fieldError("boat.features")}
          className=""
        >
          <ChipGrid
            options={BOAT_FEATURE_OPTIONS}
            selected={boatFeatures}
            onToggle={toggleBoatFeature}
          />
        </Field>
      </section>
    </>
  );
}

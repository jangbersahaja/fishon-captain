import { useMemo, type ChangeEvent } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Field } from "../components/Field";
import { PhoneInput } from "../components/PhoneInput";
import { AutoResizeTextarea } from "../components/AutoResizeTextarea";
import { charterFormOptions } from "../charterForm.defaults";
import { inputClass } from "../constants";
import type { CharterFormValues } from "../charterForm.schema";

type BasicsStepProps = {
  form: UseFormReturn<CharterFormValues>;
  fieldError: (path: string | undefined) => string | undefined;
  captainAvatarPreview: string | null;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarClear: () => void;
  districtOptions: string[];
};

export function BasicsStep({
  form,
  fieldError,
  captainAvatarPreview,
  onAvatarChange,
  onAvatarClear,
  districtOptions,
}: BasicsStepProps) {
  const { register, control } = form;
  const { CHARTER_TYPES, MALAYSIA_LOCATIONS } = charterFormOptions;

  const avatarButtonLabel = useMemo(
    () => (captainAvatarPreview ? "Change photo" : "Upload photo"),
    [captainAvatarPreview]
  );

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Basic Information</h2>
        <p className="text-sm text-slate-500">
          Tell us who to contact and where you depart from.
        </p>
      </header>

      <hr className="border-t my-6 border-neutral-200" />

      <h3 className="text-lg font-semibold text-slate-900">Operator</h3>

      <Field
        label="Profile photo"
        error={fieldError("operator.avatar")}
        hint="Square images work best."
        className="mt-4"
      >
        <div className="flex gap-3 flex-row items-center">
          <div className="flex h-30 w-30 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-slate-50">
            {captainAvatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={captainAvatarPreview}
                alt="Captain preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-slate-400">No photo</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() =>
                document.getElementById("captain-avatar-upload")?.click()
              }
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400"
            >
              {avatarButtonLabel}
            </button>
            {captainAvatarPreview ? (
              <button
                type="button"
                onClick={onAvatarClear}
                className="text-sm font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            ) : null}
            <input
              id="captain-avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>
        </div>
      </Field>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field label="First name" error={fieldError("operator.firstName")}>
          <input
            {...register("operator.firstName")}
            className={inputClass}
            placeholder="e.g. Rahman"
          />
        </Field>
        <Field label="Last name" error={fieldError("operator.lastName")}>
          <input
            {...register("operator.lastName")}
            className={inputClass}
            placeholder="e.g. Salleh"
          />
        </Field>
        <Field
          label="Captain/Operator name"
          error={fieldError("operator.displayName")}
        >
          <input
            {...register("operator.displayName")}
            className={inputClass}
            placeholder="e.g. Captain Rahman"
          />
        </Field>
        <Field
          label="Captain/Operator experience (years)"
          error={fieldError("operator.experienceYears")}
        >
          <input
            type="number"
            min={0}
            step={1}
            {...register("operator.experienceYears", { valueAsNumber: true })}
            className={inputClass}
            placeholder="e.g. 5"
          />
        </Field>

        <Field
          label="Captain/Operator description"
          error={fieldError("operator.bio")}
          hint="Share your story, specialties, and what makes your trips memorable."
          className="sm:col-span-2"
        >
          <AutoResizeTextarea
            {...register("operator.bio")}
            rows={4}
            placeholder="20+ years guiding in Langkawi. Specialist in offshore pelagics and family-friendly trips."
          />
        </Field>

        <Field
          label="Primary phone"
          error={fieldError("operator.phone")}
          hint="Include country code, e.g. +60 12-345 6789"
        >
          <Controller
            control={control}
            name="operator.phone"
            render={({ field }) => (
              <PhoneInput
                {...field}
                error={Boolean(fieldError("operator.phone"))}
              />
            )}
          />
        </Field>
      </div>

      <hr className="border-t my-6 border-neutral-200" />

      <h3 className="text-lg font-semibold text-slate-900">Charter</h3>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Field label="Charter name" error={fieldError("charterName")}>
          <input
            {...register("charterName")}
            className={inputClass}
            placeholder="e.g. Langkawi Reef Assault"
          />
        </Field>
        <Field label="Charter type" error={fieldError("charterType")}>
          <select {...register("charterType")} className={inputClass}>
            {CHARTER_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        className="mt-8"
        label="Description about charter"
        error={fieldError("description")}
      >
        <AutoResizeTextarea
          {...register("description")}
          rows={4}
          placeholder="Highlight the water, target species, and why guests love your trips."
        />
      </Field>

      <hr className="border-t my-6 border-neutral-200" />

      <h3 className="text-lg font-semibold text-slate-900">Location</h3>

      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        <Field label="State" error={fieldError("state")}>
          <select {...register("state")} className={inputClass}>
            {MALAYSIA_LOCATIONS.map((item) => (
              <option key={item.state} value={item.state}>
                {item.state}
              </option>
            ))}
          </select>
        </Field>
        <Field label="District" error={fieldError("district")}
          >
          <select {...register("district")} className={inputClass}>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Postcode" error={fieldError("postcode")}>
          <input
            {...register("postcode")}
            className={inputClass}
            placeholder="5 digit postcode"
          />
        </Field>
      </div>

      <Field
        className="mt-8"
        label="Starting point address"
        error={fieldError("startingPoint")}
      >
        <input
          {...register("startingPoint")}
          className={inputClass}
          placeholder="Jetty or meeting point"
        />
      </Field>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field
          label="Latitude"
          error={fieldError("latitude")}
          hint="Decimal degrees (DD), e.g. 5.4201"
        >
          <input
            type="number"
            step="any"
            {...register("latitude", { valueAsNumber: true })}
            className={inputClass}
          />
        </Field>
        <Field
          label="Longitude"
          error={fieldError("longitude")}
          hint="Decimal degrees (DD), e.g. 100.3356"
        >
          <input
            type="number"
            step="any"
            {...register("longitude", { valueAsNumber: true })}
            className={inputClass}
          />
        </Field>
      </div>
    </section>
  );
}

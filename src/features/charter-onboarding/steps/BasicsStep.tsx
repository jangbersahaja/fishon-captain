import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Tooltip } from "@/components/ui/SimpleTooltip";
import { charterFormOptions } from "@features/charter-onboarding/charterForm.defaults";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import {
  AddressAutocomplete,
  AutoResizeTextarea,
  Field,
  LocationMap,
  PhoneInput,
} from "@features/charter-onboarding/components";
import { inputClass } from "@features/charter-onboarding/constants";
import { usePlaceDetails } from "@features/charter-onboarding/hooks";
import { parseAddressComponents } from "@features/charter-onboarding/utils/parseAddressComponents";
import Image from "next/image";

type BasicsStepProps = {
  form: UseFormReturn<CharterFormValues>;
  fieldError: (path: string | undefined) => string | undefined;
  captainAvatarPreview: string | null;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarClear: () => void;
};

export function BasicsStep({
  form,
  fieldError,
  captainAvatarPreview,
  onAvatarChange,
  onAvatarClear,
}: BasicsStepProps) {
  const { register, control, setValue, watch } = form;
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const placeId = watch("placeId");
  const startingPoint = watch("startingPoint");
  const [mapActive, setMapActive] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [refreshCooling, setRefreshCooling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshCountRef = useRef(0);
  const { fetchDetails, loading: placeLoading } = usePlaceDetails();
  const { CHARTER_TYPES, MALAYSIA_LOCATIONS } = charterFormOptions;
  const { data: session } = useSession();

  // Autofill displayName from session if empty
  useEffect(() => {
    if (session?.user?.name) {
      const current = form.getValues("operator.displayName");
      if (!current) {
        form.setValue("operator.displayName", session.user.name, {
          shouldDirty: true,
        });
      }
    }
  }, [session?.user?.name, form]);

  // Activate map if placeId is available from draft
  useEffect(() => {
    if (placeId && !mapActive) {
      setMapActive(true);
    }
  }, [placeId, mapActive]);

  // Plain city input (suggestions dropdown removed)

  const avatarButtonLabel = useMemo(
    () => (captainAvatarPreview ? "Change photo" : "Upload photo"),
    [captainAvatarPreview]
  );

  return (
    <>
      <section className="p-6 bg-white border shadow-sm rounded-3xl border-neutral-200">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Operator/Captain
            </h2>
            <h3 className="text-lg text-slate-600">[Maklumat Kapten]</h3>
          </div>
          <p className="text-sm text-slate-500">Let anglers know about you</p>
        </header>
        <hr className="my-6 border-t border-neutral-200" />

        <Field
          label="Profile photo"
          labelMy="Gambar Profil"
          error={fieldError("operator.avatar")}
          hint="Square images work best."
          className="mt-4"
        >
          <div className="flex flex-row items-center gap-3">
            <div className="relative flex items-center justify-center overflow-hidden border rounded-full h-30 w-30 border-neutral-200 bg-slate-50">
              {captainAvatarPreview ? (
                <Image
                  src={captainAvatarPreview}
                  alt="Captain preview"
                  fill
                  className="object-cover w-full h-full"
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
                className="px-4 py-2 text-sm font-semibold transition bg-white border rounded-full shadow-sm border-neutral-300 text-slate-700 hover:border-slate-400"
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

        <div className="grid gap-5 mt-4 sm:grid-cols-2">
          <Field
            label="Primary phone"
            labelMy="No Tel Utama"
            error={fieldError("operator.phone")}
            hint="Include country code, e.g. +60 12-345 6789"
          >
            <Controller
              control={control}
              name="operator.phone"
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  value={field.value ?? ""}
                  error={Boolean(fieldError("operator.phone"))}
                />
              )}
            />
          </Field>
          <Field
            label="Secondary phone"
            labelMy="No Tel Kedua"
            error={fieldError("operator.backupPhone")}
            hint="Will be used if primary phone can't be contacted."
          >
            <Controller
              control={control}
              name="operator.backupPhone"
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  value={field.value ?? ""}
                  error={Boolean(fieldError("operator.backupPhone"))}
                />
              )}
            />
          </Field>

          <Field
            label="Captain/Operator name"
            labelMy="Nama Kapten"
            error={fieldError("operator.displayName")}
          >
            <input
              {...register("operator.displayName")}
              className={inputClass}
              placeholder="e.g. Captain Rahman"
            />
          </Field>
          <Field
            label="Experience (years)"
            labelMy="Pengalaman (tahun)"
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
            label="Captain/Operator bio"
            labelMy="Bio Kapten"
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
        </div>
      </section>
      <section className="p-6 bg-white border shadow-sm rounded-3xl border-neutral-200">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Charter Information
            </h2>
            <h3 className="text-lg text-slate-600">[Maklumat Charter]</h3>
          </div>
          <p className="text-sm text-slate-500">
            Tell us about your charter and where you depart from.
          </p>
        </header>
        <hr className="my-6 border-t border-neutral-200" />

        <h3 className="text-lg font-semibold text-slate-900">Charter</h3>

        <div className="grid gap-5 mt-4 sm:grid-cols-2">
          <Field
            label="Charter name"
            labelMy="Nama Charter"
            error={fieldError("charterName")}
          >
            <input
              {...register("charterName")}
              className={inputClass}
              placeholder="e.g. Langkawi Reef Assault"
            />
          </Field>
          <Field
            label="Charter type"
            labelMy="Jenis Charter"
            error={fieldError("charterType")}
          >
            <select {...register("charterType")} className={inputClass}>
              {CHARTER_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <hr className="my-6 border-t border-neutral-200" />

        <h3 className="text-lg font-semibold text-slate-900">Location</h3>

        <Field
          className="mt-4"
          label="Starting point address"
          labelMy="Alamat Titik Perjumpaan"
          error={fieldError("startingPoint")}
        >
          {/* Replace plain input with autocomplete */}
          <Controller
            control={control}
            name="startingPoint"
            render={({ field }) => (
              <AddressAutocomplete
                value={field.value ?? ""}
                onChange={(val) => {
                  field.onChange(val);
                  if (!val) {
                    setMapActive(false);
                    setValue("placeId", undefined, { shouldDirty: true });
                  }
                }}
                onSelectSuggestion={async (s) => {
                  form.setValue("placeId", s.place_id, { shouldDirty: true });
                  const details = await fetchDetails(s.place_id);
                  if (details) {
                    if (details.location) {
                      setValue("latitude", details.location.lat, {
                        shouldDirty: true,
                      });
                      setValue("longitude", details.location.lng, {
                        shouldDirty: true,
                      });
                    }
                    const parsed = parseAddressComponents(
                      details.addressComponents
                    );
                    // Only auto-fill if the user has not touched these fields or they are blank
                    if (parsed.state) {
                      setValue("state", parsed.state, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                    if (parsed.city) {
                      // Only auto-fill city if user hasn't typed something different
                      const currentCity = form.getValues("city");
                      if (!currentCity?.trim()) {
                        setValue("city", parsed.city, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }
                    }
                    if (parsed.postcode) {
                      const currentPostcode = form.getValues("postcode");
                      if (!currentPostcode?.trim()) {
                        setValue("postcode", parsed.postcode, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }
                    }
                  }
                  setMapActive(true);
                }}
                error={Boolean(fieldError("startingPoint"))}
              />
            )}
          />
          {placeLoading && (
            <p className="mt-1 text-xs text-slate-500">Fetching coordinates…</p>
          )}
        </Field>

        <div className="grid gap-5 mt-8 sm:grid-cols-3">
          <Field label="State" labelMy="Negeri" error={fieldError("state")}>
            <select {...register("state")} className={inputClass}>
              {MALAYSIA_LOCATIONS.map((item) => (
                <option key={item.state} value={item.state}>
                  {item.state}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="City/Town"
            labelMy="Bandar/Kampung"
            error={fieldError("city")}
          >
            <input
              {...register("city")}
              className={inputClass}
              placeholder="e.g. Langkawi"
            />
          </Field>
          <Field
            label="Postcode"
            labelMy="Poskod"
            error={fieldError("postcode")}
          >
            <input
              {...register("postcode")}
              className={inputClass}
              placeholder="5 digit postcode"
            />
          </Field>
        </div>

        {/* Interactive map */}
        <div className="mt-6">
          {startingPoint?.trim() && (
            <div className="flex justify-end mb-2">
              <Tooltip
                content={
                  refreshCooling
                    ? "Please wait a moment…"
                    : "Reload map tiles (use if map failed to appear)"
                }
              >
                <button
                  type="button"
                  disabled={refreshCooling}
                  onClick={() => {
                    // Diagnostics counter
                    refreshCountRef.current += 1;
                    if (process.env.NODE_ENV !== "production") {
                      console.info(
                        `[map-refresh] attempt #${refreshCountRef.current}`
                      );
                    }
                    setRefreshing(true);
                    setMapRefreshKey((k) => k + 1);
                    if (!mapActive) setMapActive(true);
                    setRefreshCooling(true);
                    setTimeout(() => setRefreshCooling(false), 1000);
                    // Brief spinner window (map init is fast; keep subtle)
                    setTimeout(() => setRefreshing(false), 450);
                  }}
                  className={`group relative inline-flex h-7 w-7 items-center justify-center rounded-full border text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                    refreshCooling
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                  aria-label="Refresh map"
                >
                  {refreshing ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  ) : (
                    // Refresh/rotate arrow icon (inline SVG)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="w-4 h-4 stroke-slate-600 group-hover:stroke-slate-800"
                      strokeWidth={1.6}
                    >
                      <path
                        d="M3.5 10a6.5 6.5 0 0 1 11.06-4.596M16.5 10a6.5 6.5 0 0 1-11.06 4.596"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14.56 3.75v3.2h-3.2M5.44 16.25v-3.2h3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </Tooltip>
            </div>
          )}
          <LocationMap
            key={mapRefreshKey}
            active={mapActive}
            lat={Number.isFinite(latitude) ? (latitude as number) : null}
            lng={Number.isFinite(longitude) ? (longitude as number) : null}
            onChange={(lat, lng) => {
              setValue("latitude", lat, { shouldDirty: true });
              setValue("longitude", lng, { shouldDirty: true });
            }}
          />
        </div>

        <div className="grid gap-5 mt-8 sm:grid-cols-2">
          <Field
            label="Latitude"
            labelMy="Latitud"
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
            labelMy="Longitud"
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
    </>
  );
}

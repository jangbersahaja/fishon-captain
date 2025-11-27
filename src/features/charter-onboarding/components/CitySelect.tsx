"use client";

import { MALAYSIA_LOCATIONS } from "@/utils/captainFormData";
import { inputClass } from "@features/charter-onboarding/constants";
import clsx from "clsx";
import { useMemo } from "react";

interface CitySelectProps {
  value: string;
  onChange: (value: string) => void;
  state: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * City/Town select dropdown that filters options based on the selected state.
 * Falls back to a text input if no state is selected or state has no cities.
 */
export function CitySelect({
  value,
  onChange,
  state,
  error,
  disabled,
  className,
  placeholder = "Select city/town",
}: CitySelectProps) {
  // Get cities for the selected state
  const cities = useMemo(() => {
    if (!state) return [];
    const stateData = MALAYSIA_LOCATIONS.find(
      (loc) => loc.state.toLowerCase() === state.toLowerCase()
    );
    return stateData?.city ?? [];
  }, [state]);

  // If no state selected or no cities available, show disabled select
  if (!state || cities.length === 0) {
    return (
      <select
        value=""
        disabled
        className={clsx(
          inputClass,
          "text-slate-400",
          error && "border-red-500 focus:ring-red-300",
          className
        )}
      >
        <option value="">Select a state first</option>
      </select>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={clsx(
        inputClass,
        error && "border-red-500 focus:ring-red-300",
        !value && "text-slate-400",
        className
      )}
    >
      <option value="">{placeholder}</option>
      {cities.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}

import { charterFormOptions } from "@features/charter-onboarding/charterForm.defaults";
import type { CharterFormValues } from "@features/charter-onboarding/charterForm.schema";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

/**
 * Auto-fills `city` when user selects a state and city is empty.
 * Kept separate from FormSection to simplify its responsibility.
 */
export function useAutofillCity(form: UseFormReturn<CharterFormValues>) {
  const state = form.watch("state");
  const city = form.watch("city");
  useEffect(() => {
    const st = charterFormOptions.MALAYSIA_LOCATIONS.find(
      (s) => s.state === state
    );
    if (!st) return;
    if (!city?.trim()) {
      const fallback = st.city[0];
      if (fallback) form.setValue("city", fallback, { shouldValidate: true });
    }
  }, [state, city, form]);
}

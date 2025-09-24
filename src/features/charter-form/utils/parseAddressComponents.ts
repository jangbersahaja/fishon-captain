import { charterFormOptions } from "@features/charter-form/charterForm.defaults";
import type { GoogleAddressComponent } from "@features/charter-form/hooks/usePlaceDetails";

interface MalaysiaLocation {
  state: string;
  city: string[];
}

export interface ParsedAddressResult {
  state?: string;
  city?: string;
  postcode?: string;
}

function norm(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export function parseAddressComponents(
  components: GoogleAddressComponent[]
): ParsedAddressResult {
  const { MALAYSIA_LOCATIONS } = charterFormOptions;
  let stateLong: string | undefined;
  let cityCandidate: string | undefined;
  let postcode: string | undefined;

  for (const c of components) {
    if (c.types.includes("administrative_area_level_1")) {
      stateLong = c.long_name;
    } else if (
      c.types.includes("administrative_area_level_2") ||
      c.types.includes("administrative_area_level_3") ||
      c.types.includes("locality")
    ) {
      cityCandidate = cityCandidate || c.long_name;
    } else if (c.types.includes("postal_code")) {
      postcode = c.long_name;
    }
  }

  let matchedState: string | undefined;
  if (stateLong) {
    const normState = norm(stateLong);
    matchedState = (MALAYSIA_LOCATIONS as MalaysiaLocation[]).find(
      (s) => norm(s.state) === normState
    )?.state;
  }

  let matchedCity: string | undefined;
  if (matchedState && cityCandidate) {
    const stateObj = (MALAYSIA_LOCATIONS as MalaysiaLocation[]).find(
      (s) => s.state === matchedState
    );
    if (stateObj) {
      const normCity = norm(cityCandidate);
      matchedCity = stateObj.city.find((c) => norm(c) === normCity);
    }
  }

  return {
    state: matchedState,
    city: matchedCity || cityCandidate,
    postcode,
  };
}

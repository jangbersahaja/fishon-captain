import { CITY_ALIASES } from "@/utils/captainFormData";
import { charterFormOptions } from "@features/charter-onboarding/charterForm.defaults";
import type { GoogleAddressComponent } from "@features/charter-onboarding/hooks/usePlaceDetails";

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

/**
 * Resolve a city name to its canonical form using aliases.
 * First checks if there's an alias, then returns the normalized name.
 */
function resolveCity(cityName: string): string {
  const normalized = norm(cityName);
  // Check if there's an alias for this city name
  const alias = CITY_ALIASES[normalized];
  return alias || cityName;
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
      // First, try to resolve the city using aliases
      const resolvedCity = resolveCity(cityCandidate);
      const normResolved = norm(resolvedCity);

      // Check if the resolved city matches any city in the state
      matchedCity = stateObj.city.find((c) => norm(c) === normResolved);

      // If alias resolution didn't work, try direct matching
      if (!matchedCity) {
        const normCity = norm(cityCandidate);
        matchedCity = stateObj.city.find((c) => norm(c) === normCity);
      }
    }
  }

  return {
    state: matchedState,
    city: matchedCity || cityCandidate,
    postcode,
  };
}

import {
  AMENITIES_OPTIONS,
  BOAT_FEATURE_OPTIONS,
  BOAT_TYPES,
  CHARTER_TYPES,
  MALAYSIA_LOCATIONS,
  SPECIES_OPTIONS,
  TECHNIQUE_OPTIONS,
  TRIP_TYPE_OPTIONS,
} from "@/utils/captainFormData";

import type { CharterFormValues } from "./charterForm.schema";

export const defaultTrip: () => CharterFormValues["trips"][number] = () => ({
  name: "",
  tripType: TRIP_TYPE_OPTIONS[0]?.value ?? "",
  price: Number.NaN,
  durationHours: 4,
  startTimes: [],
  maxAnglers: Number.NaN,
  charterStyle: "private",
  description: "",
  targetSpecies: [],
  techniques: [],
});

export function createDefaultCharterFormValues(): CharterFormValues {
  const stateFallback = MALAYSIA_LOCATIONS[0];
  const districtFallback = stateFallback.districts[0];

  return {
    operator: {
      firstName: "",
      lastName: "",
      displayName: "",
      experienceYears: Number.NaN,
      bio: "",
      phone: "",
      avatar: undefined,
    },
    charterType: CHARTER_TYPES[0]?.value ?? "",
    charterName: "",
    state: stateFallback.state,
    district: districtFallback,
    startingPoint: "",
    postcode: "",
    latitude: Number.NaN,
    longitude: Number.NaN,
    description: "",
    boat: {
      name: "",
      type: BOAT_TYPES[0] ?? "",
      lengthFeet: Number.NaN,
      capacity: Number.NaN,
      features: [],
    },
    amenities: [],
    policies: {
      licenseProvided: false,
      catchAndKeep: false,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: false,
      alcoholAllowed: false,
      smokingAllowed: false,
    },
    pickup: {
      available: false,
      fee: null,
      areas: [],
      notes: "",
    },
    trips: [defaultTrip()],
    photos: [],
    videos: [],
    pricingModel: "basic",
  };
}

export const charterFormOptions = {
  AMENITIES_OPTIONS,
  BOAT_FEATURE_OPTIONS,
  BOAT_TYPES,
  CHARTER_TYPES,
  MALAYSIA_LOCATIONS,
  SPECIES_OPTIONS,
  TECHNIQUE_OPTIONS,
  TRIP_TYPE_OPTIONS,
};

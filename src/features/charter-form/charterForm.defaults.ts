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
  tripType: "",
  price: Number.NaN,
  durationHours: 5,
  startTimes: [],
  maxAnglers: Number.NaN,
  charterStyle: "private",
  description: "",
  targetSpecies: [],
  techniques: [],
});

export function createDefaultCharterFormValues(): CharterFormValues {
  return {
    operator: {
      displayName: "",
      experienceYears: Number.NaN,
      bio: "",
      phone: "",
      avatar: undefined,
    },
    charterType: CHARTER_TYPES[0]?.value ?? "",
    charterName: "",
    state: "",
    city: "",
    startingPoint: "",
    placeId: undefined,
    postcode: "",
    latitude: Number.NaN,
    longitude: Number.NaN,
    description: "",
    generatedDescription: undefined,
    tone: "friendly",
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
      alcoholNotAllowed: false,
      smokingNotAllowed: false,
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

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

type TripType = NonNullable<CharterFormValues["trips"]>[number];

export const defaultTrip: () => TripType = () => ({
  name: "",
  tripType: "",
  price: Number.NaN,
  promoPrice: Number.NaN,
  durationHours: 5,
  startTimes: [],
  maxAnglers: Number.NaN,
  charterStyle: "private",
  description: "",
  species: [],
  techniques: [],
});

export function createDefaultCharterFormValues(): CharterFormValues {
  return {
    operator: {
      displayName: "",
      experienceYears: Number.NaN,
      bio: "",
      phone: "",
      backupPhone: "",
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
    longitude: 0,
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
      catchAndRelease: false,
      childFriendly: false,
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
    uploadedPhotos: [],
    uploadedVideos: [],
    withoutBoat: false,
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

import type { DraftValues } from "@features/charter-onboarding/charterForm.draft";

interface CharterFeature {
  label: string;
}
interface CharterAmenity {
  label: string;
}
interface CharterPolicyFlags {
  licenseProvided: boolean;
  catchAndKeep: boolean;
  catchAndRelease: boolean;
  childFriendly: boolean;
  liveBaitProvided: boolean;
  alcoholNotAllowed: boolean;
  smokingNotAllowed: boolean;
}
interface PickupArea {
  label: string;
}
interface PickupRecord {
  fee: unknown;
  areas: PickupArea[];
  notes: string | null;
}
interface TripStartTime {
  value: string;
}
interface TripSpecies {
  value: string;
}
interface TripTechnique {
  value: string;
}
interface TripRecord {
  name: string;
  tripType: string;
  price: unknown;
  durationHours: number;
  maxAnglers: number;
  style: string;
  description: string | null;
  startTimes: TripStartTime[];
  species: TripSpecies[];
  techniques: TripTechnique[];
}
interface BoatRecord {
  name: string;
  type: string;
  lengthFt: number;
  capacity: number;
}
interface CharterFull {
  charterType: string;
  name: string;
  state: string;
  city: string;
  startingPoint: string;
  postcode: string;
  latitude: unknown;
  longitude: unknown;
  description: string;
  boat: BoatRecord | null;
  features: CharterFeature[];
  amenities: CharterAmenity[];
  policies: CharterPolicyFlags | null;
  pickup: (PickupRecord & { areas: PickupArea[] }) | null;
  trips: TripRecord[];
}

export function mapCharterToDraftValuesFeature(params: {
  charter: CharterFull;
  captainProfile: {
    displayName: string;
    phone: string;
    bio: string;
    experienceYrs: number;
  };
}): DraftValues {
  const { charter, captainProfile } = params;
  const boat = charter.boat || ({} as BoatRecord);
  const policies = charter.policies || ({} as CharterPolicyFlags);
  const pickup = charter.pickup || null;
  return {
    operator: {
      displayName: captainProfile.displayName || "",
      experienceYears: captainProfile.experienceYrs ?? 0,
      bio: captainProfile.bio || "",
      phone: captainProfile.phone || "",
    },
    charterType: charter.charterType || "",
    charterName: charter.name || "",
    state: charter.state || "",
    city: charter.city || "",
    startingPoint: charter.startingPoint || "",
    postcode: charter.postcode || "",
    latitude: charter.latitude ? Number(charter.latitude) : Number.NaN,
    longitude: charter.longitude ? Number(charter.longitude) : Number.NaN,
    description: charter.description || "",
    generatedDescription: undefined,
    tone: "friendly",
    boat: {
      name: boat.name || "",
      type: boat.type || "",
      lengthFeet:
        typeof boat.lengthFt === "number" ? boat.lengthFt : Number.NaN,
      capacity: typeof boat.capacity === "number" ? boat.capacity : Number.NaN,
      features: (charter.features || []).map((f) => f.label),
    },
    amenities: (charter.amenities || []).map((a) => a.label),
    policies: {
      licenseProvided: !!policies.licenseProvided,
      catchAndKeep: !!policies.catchAndKeep,
      catchAndRelease: !!policies.catchAndRelease,
      childFriendly: !!policies.childFriendly,
      liveBaitProvided: !!policies.liveBaitProvided,
      alcoholNotAllowed: !!policies.alcoholNotAllowed,
      smokingNotAllowed: !!policies.smokingNotAllowed,
    },
    pickup: pickup
      ? {
          available: true,
          fee: pickup.fee ? Number(pickup.fee) : null,
          areas: (pickup.areas || []).map((a) => a.label),
          notes: pickup.notes || "",
        }
      : { available: false, fee: null, areas: [], notes: "" },
    trips: (charter.trips || []).map((t) => ({
      name: t.name || "",
      tripType: t.tripType || "",
      price: t.price ? Number(t.price) : Number.NaN,
      durationHours:
        typeof t.durationHours === "number" ? t.durationHours : Number.NaN,
      startTimes: (t.startTimes || []).map((st) => st.value),
      maxAnglers: typeof t.maxAnglers === "number" ? t.maxAnglers : Number.NaN,
      charterStyle: t.style === "SHARED" ? "shared" : "private",
      description: t.description || "",
      species: (t.species || []).map((s) => s.value),
      techniques: (t.techniques || []).map((tech) => tech.value),
    })),
    photos: [],
    videos: [],
  } as DraftValues;
}

// Temporary backward compatibility re-export under legacy name (if something still imports directly after barrel usage).
export { mapCharterToDraftValuesFeature as mapCharterToDraftValues };

// Future: add reverse mapping and partial diff utilities here.

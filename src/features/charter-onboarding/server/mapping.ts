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
interface CharterCaptainProfilePartial {
  avatarUrl?: string | null;
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
  captain?: CharterCaptainProfilePartial;
}

function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return Number.NaN;
  if (typeof value === "number")
    return Number.isFinite(value) ? value : Number.NaN;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : Number.NaN;
}

export function mapCharterToDraftValuesFeature(params: {
  charter: CharterFull;
  captainProfile: {
    displayName: string;
    phone: string;
    bio: string;
    experienceYrs: number;
  };
  media?: {
    images?: { name: string; url: string }[];
    videos?: { name: string; url: string }[];
    avatar?: string | null;
    imagesCoverIndex?: number;
  };
}): DraftValues {
  const { charter, captainProfile, media } = params;
  const boat = charter.boat || ({} as BoatRecord);
  const policies = charter.policies || ({} as CharterPolicyFlags);
  const pickup = charter.pickup || null;

  const draft: DraftValues = {
    operator: {
      displayName: captainProfile.displayName || "",
      experienceYears: captainProfile.experienceYrs ?? 0,
      bio: captainProfile.bio || "",
      phone: captainProfile.phone || "",
      avatarUrl: media?.avatar || charter.captain?.avatarUrl || undefined,
    },
    charterType: charter.charterType || "",
    charterName: charter.name || "",
    state: charter.state || "",
    city: charter.city || "",
    startingPoint: charter.startingPoint || "",
    postcode: charter.postcode || "",
    latitude: safeNumber(charter.latitude),
    longitude: safeNumber(charter.longitude),
    description: charter.description || "",
    generatedDescription: undefined,
    tone: "friendly",
    boat: {
      name: boat.name || "",
      type: boat.type || "",
      lengthFeet: safeNumber(boat.lengthFt),
      capacity: safeNumber(boat.capacity),
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
          fee: (() => {
            const n = safeNumber(pickup.fee);
            return Number.isFinite(n) ? n : null;
          })(),
          areas: (pickup.areas || []).map((a) => a.label),
          notes: pickup.notes || "",
        }
      : { available: false, fee: null, areas: [], notes: "" },
    trips: (charter.trips || []).map((t) => ({
      name: t.name || "",
      tripType: t.tripType || "",
      price: safeNumber(t.price),
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
    uploadedPhotos: media?.images || [],
    uploadedVideos: media?.videos || [],
    imagesCoverIndex:
      typeof media?.imagesCoverIndex === "number" ? media.imagesCoverIndex : 0,
  } as unknown as DraftValues;

  if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
    console.log("[mapping] mapped draft values", draft);
  }
  return draft;
}

export { mapCharterToDraftValuesFeature as mapCharterToDraftValues };

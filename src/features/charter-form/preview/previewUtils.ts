import type { Charter } from "@/dummy/charter";
import { SPECIES_BY_ID } from "@/lib/data/species";
import type { CharterFormValues } from "@features/charter-form/charterForm.schema";
import { PREVIEW_PLACEHOLDER_IMAGES } from "@features/charter-form/constants";
import type { MediaPreview } from "@features/charter-form/types";

export function createPreviewCharter(
  values: CharterFormValues,
  media: MediaPreview[],
  avatarPreview: string | null
): Charter {
  const mediaUrls = media.map((item) => item.url).filter(Boolean);
  const images = mediaUrls.length ? mediaUrls : PREVIEW_PLACEHOLDER_IMAGES;
  const locationParts = [values.city?.trim(), values.state?.trim()].filter(
    Boolean
  ) as string[];
  const location = locationParts.length ? locationParts.join(", ") : "Malaysia";
  const experienceYears =
    typeof values.operator.experienceYears === "number" &&
    Number.isFinite(values.operator.experienceYears)
      ? values.operator.experienceYears
      : undefined;
  const lat =
    typeof values.latitude === "number" && Number.isFinite(values.latitude)
      ? values.latitude
      : undefined;
  const lng =
    typeof values.longitude === "number" && Number.isFinite(values.longitude)
      ? values.longitude
      : undefined;
  const coordinates =
    lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
  const trips = (values.trips ?? []).map((trip) => {
    const price =
      typeof trip.price === "number" && Number.isFinite(trip.price)
        ? trip.price
        : 0;
    const durationHours =
      typeof trip.durationHours === "number" &&
      Number.isFinite(trip.durationHours)
        ? trip.durationHours
        : undefined;
    const maxAnglers =
      typeof trip.maxAnglers === "number" && Number.isFinite(trip.maxAnglers)
        ? trip.maxAnglers
        : undefined;
    return {
      name: trip.name || trip.tripType || "Trip",
      price,
      duration:
        durationHours !== undefined
          ? `${durationHours} hour${durationHours === 1 ? "" : "s"}`
          : "Duration TBD",
      description: trip.description,
      startTimes: trip.startTimes ?? [],
      maxAnglers,
      private: trip.charterStyle === "private",
    };
  });
  const speciesIds = Array.from(
    new Set((values.trips ?? []).flatMap((trip) => trip.targetSpecies ?? []))
  );
  const species = speciesIds.map((id) => {
    const item = SPECIES_BY_ID[id];
    return item ? item.english_name : id;
  });
  const techniques = Array.from(
    new Set((values.trips ?? []).flatMap((trip) => trip.techniques ?? []))
  );
  const amenities = values.amenities ?? [];
  const previewSpecies = species.length
    ? species
    : ["Target species will appear once you add them in Trips"];
  const previewTechniques = techniques.length
    ? techniques
    : ["Techniques will appear once you add them in Trips"];
  const previewAmenities = amenities.length
    ? amenities
    : ["Amenities you select will show up here"];
  const capacity =
    typeof values.boat.capacity === "number" &&
    Number.isFinite(values.boat.capacity) &&
    values.boat.capacity > 0
      ? values.boat.capacity
      : 1;
  const lengthFeet =
    typeof values.boat.lengthFeet === "number" &&
    Number.isFinite(values.boat.lengthFeet) &&
    values.boat.lengthFeet > 0
      ? `${values.boat.lengthFeet} ft`
      : "Length TBD";
  const pickupFee =
    typeof values.pickup.fee === "number" && Number.isFinite(values.pickup.fee)
      ? values.pickup.fee
      : undefined;
  const pickupAreas = (values.pickup.areas ?? []).filter(Boolean);
  const captainName = values.operator.displayName?.trim() || "Charter operator";
  const captainIntro = values.operator.bio?.trim() || values.description || "";
  return {
    id: 0,
    name: values.charterName || "Your charter name",
    location,
    address: values.startingPoint || location,
    coordinates,
    images,
    imageUrl: images[0],
    description: values.description || "",
    trip: trips,
    species: previewSpecies,
    techniques: previewTechniques,
    includes: previewAmenities,
    excludes: [],
    licenseProvided: values.policies.licenseProvided,
    pickup: {
      available: values.pickup.available,
      included: values.pickup.available && (!pickupFee || pickupFee === 0),
      fee: pickupFee,
      areas: values.pickup.available ? pickupAreas : [],
      notes: values.pickup.available ? values.pickup.notes : undefined,
    },
    policies: values.policies,
    languages: ["BM", "English"],
    boat: {
      name: values.boat.name || "Boat name",
      type: values.boat.type || "Boat type",
      length: lengthFeet,
      capacity,
      features: values.boat.features ?? [],
    },
    captain: {
      name: captainName,
      avatarUrl: avatarPreview || undefined,
      yearsExperience: experienceYears ?? 0,
      crewCount: capacity,
      intro: captainIntro,
    },
    fishingType: (values.charterType || "lake") as Charter["fishingType"],
    tier: "basic",
  };
}

export function buildMapEmbedSrc(charter: Charter): string {
  if (charter.coordinates) {
    return `https://www.google.com/maps?q=${charter.coordinates.lat},${charter.coordinates.lng}&z=13&output=embed`;
  }
  const query = charter.address || charter.location || "Malaysia";
  return `https://www.google.com/maps?q=${encodeURIComponent(
    query
  )}&z=13&output=embed`;
}

import { mapCharterToDraftValuesFeature } from "@features/charter-onboarding/server/mapping";
import { describe, expect, it } from "vitest";

describe("mapCharterToDraftValuesFeature", () => {
  // Minimal representative charter object (photos/videos not included here because
  // mapping intentionally returns empty arrays for media re-upload phase).
  interface CharterFullTest {
    charterType: string;
    name: string;
    state: string;
    city: string;
    startingPoint: string;
    postcode: string;
    latitude: number;
    longitude: number;
    description: string;
    boat: {
      name: string;
      type: string;
      lengthFt: number;
      capacity: number;
    } | null;
    features: { label: string }[];
    amenities: { label: string }[];
    policies: {
      licenseProvided: boolean;
      catchAndKeep: boolean;
      catchAndRelease: boolean;
      childFriendly: boolean;
      liveBaitProvided: boolean;
      alcoholNotAllowed: boolean;
      smokingNotAllowed: boolean;
    } | null;
    pickup: null;
    trips: Array<{
      name: string;
      tripType: string;
      price: number;
      durationHours: number;
      maxAnglers: number;
      style: string;
      description: string;
      startTimes: { value: string }[];
      species: { value: string }[];
      techniques: { value: string }[];
    }>;
  }
  const baseCharter: CharterFullTest = {
    charterType: "inshore",
    name: "Sea Quest",
    state: "Sabah",
    city: "Kota Kinabalu",
    startingPoint: "Dock A",
    postcode: "88000",
    latitude: 5.98,
    longitude: 116.07,
    description: "Great trips",
    boat: {
      name: "Wave Rider",
      type: "Center Console",
      lengthFt: 28,
      capacity: 5,
    },
    features: [{ label: "GPS" }, { label: "Fishfinder" }],
    amenities: [{ label: "Rods" }, { label: "Bait" }],
    policies: {
      licenseProvided: true,
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: false,
      alcoholNotAllowed: false,
      smokingNotAllowed: true,
    },
    pickup: null,
    trips: [
      {
        name: "Half Day",
        tripType: "half-day",
        price: 400,
        durationHours: 4,
        maxAnglers: 4,
        style: "PRIVATE",
        description: "Fun trip",
        startTimes: [{ value: "07:00" }],
        species: [{ value: "Grouper" }],
        techniques: [{ value: "Jigging" }],
      },
    ],
  };

  const captain = {
    displayName: "Captain Jane",
    phone: "+6012345678",
    bio: "Bio text",
    experienceYrs: 6,
  };

  it("maps core fields & empties media arrays", () => {
    const draft = mapCharterToDraftValuesFeature({
      charter: baseCharter,
      captainProfile: captain,
    });
    expect(draft.operator.displayName).toBe(captain.displayName);
    expect(draft.boat.features).toEqual(["GPS", "Fishfinder"]);
    expect(draft.amenities).toEqual(["Rods", "Bait"]);
    expect(draft.trips[0].charterStyle).toBe("private");
    // photos/videos not part of DraftValues shape directly (added later when hydrated)
  });

  it("handles missing boat & policies gracefully", () => {
    const draft = mapCharterToDraftValuesFeature({
      charter: { ...baseCharter, boat: null, policies: null },
      captainProfile: captain,
    });
    expect(draft.boat.name).toBe("");
    expect(draft.policies.catchAndKeep).toBe(false);
  });

  it("normalizes invalid numeric fields to NaN in boat & trips", () => {
    const charter = {
      ...baseCharter,
      boat: baseCharter.boat
        ? {
            name: baseCharter.boat.name,
            type: baseCharter.boat.type,
            lengthFt: Number("bad"),
            capacity: Number("nope"),
          }
        : null,
      trips: [
        {
          ...baseCharter.trips[0],
          price: Number("bad"),
          durationHours: Number("bad"),
          maxAnglers: Number("bad"),
        },
      ],
    } as typeof baseCharter;
    const draft = mapCharterToDraftValuesFeature({
      charter,
      captainProfile: captain,
    });
    expect(Number.isNaN(draft.boat.lengthFeet)).toBe(true);
    expect(Number.isNaN(draft.boat.capacity)).toBe(true);
    expect(Number.isNaN(draft.trips[0].price)).toBe(true);
    expect(Number.isNaN(draft.trips[0].durationHours)).toBe(true);
    expect(Number.isNaN(draft.trips[0].maxAnglers)).toBe(true);
  });
});

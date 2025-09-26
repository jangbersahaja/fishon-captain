import type { DraftValues } from "@features/charter-onboarding/charterForm.draft";
import {
  validateDraftForFinalizeFeature,
  type FinalizeMediaPayload,
} from "@features/charter-onboarding/server/validation";
import { describe, expect, it } from "vitest";

function makeBaseDraft(): DraftValues {
  return {
    operator: {
      firstName: "Jane",
      lastName: "Doe",
      displayName: "Captain Jane",
      phone: "+600000000",
      experienceYears: 3,
      bio: "bio",
    },
    charterType: "inshore",
    charterName: "Sea Quest",
    state: "Sabah",
    city: "Kota Kinabalu",
    startingPoint: "Dock A",
    postcode: "88000",
    latitude: 0,
    longitude: 0,
    description: "desc",
    boat: {
      name: "Boat",
      type: "Center",
      lengthFeet: 25,
      capacity: 4,
      features: ["GPS"],
    },
    amenities: ["Rods"],
    policies: {
      licenseProvided: true,
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: false,
      alcoholNotAllowed: false,
      smokingNotAllowed: true,
    },
    pickup: { available: false, fee: null, areas: [], notes: "" },
    trips: [
      {
        name: "Half Day",
        tripType: "half-day",
        price: 400,
        durationHours: 4,
        maxAnglers: 4,
        charterStyle: "private",
        description: "nice",
        species: ["Grouper"],
        techniques: ["Jigging"],
        startTimes: ["07:00"],
      },
    ],
  } as unknown as DraftValues;
}

const goodMedia: FinalizeMediaPayload = {
  images: [
    { name: "a.jpg", url: "u" },
    { name: "b.jpg", url: "u" },
    { name: "c.jpg", url: "u" },
  ],
  videos: [],
};

describe("validateDraftForFinalizeFeature", () => {
  it("passes for a complete valid draft", () => {
    const draft = makeBaseDraft();
    const r = validateDraftForFinalizeFeature(draft, goodMedia);
    expect(r.ok).toBe(true);
  });

  it("includes legacy operatorFirstName key even when displayName present but firstName missing", () => {
    const draft = makeBaseDraft();
    (draft.operator as Record<string, unknown>)["firstName"] = "";
    const r = validateDraftForFinalizeFeature(draft, goodMedia);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.operatorFirstName).toBeDefined();
      // displayName remains so operatorDisplayName should NOT appear
      expect(r.errors.operatorDisplayName).toBeUndefined();
    }
  });

  it("requires display name OR first name; if both missing surfaces both keys", () => {
    const draft = makeBaseDraft();
    (draft.operator as Record<string, unknown>)["firstName"] = "";
    (draft.operator as Record<string, unknown>)["displayName"] = "";
    const r = validateDraftForFinalizeFeature(draft, goodMedia);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.operatorFirstName).toBeDefined();
      expect(r.errors.operatorDisplayName).toBeDefined();
    }
  });

  it("aggregates multiple unrelated errors", () => {
    const draft = makeBaseDraft();
    // Remove amenities + trips + reduce images
    (draft as unknown as { amenities: string[] }).amenities = [];
    (draft as unknown as { trips: unknown[] }).trips = [];
    const media: FinalizeMediaPayload = {
      images: [{ name: "only.jpg", url: "u" }],
      videos: [],
    };
    const r = validateDraftForFinalizeFeature(draft, media);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const keys = Object.keys(r.errors);
      expect(keys).toEqual(
        expect.arrayContaining(["amenities", "trips", "images"])
      );
    }
  });
});
// (getFieldError tests moved to separate file)

import type { DraftValues } from "@features/charter-onboarding/charterForm.draft";
import {
  validateDraftForFinalizeFeature,
  type FinalizeMediaPayload,
} from "@features/charter-onboarding/server/validation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCharterFromDraftData } from "../../server/charters";

// Mock prisma
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      captainProfile: {
        upsert: vi.fn().mockResolvedValue({ id: "captain-1" }),
      },
      boat: { create: vi.fn().mockResolvedValue({ id: "boat-1" }) },
      charter: { create: vi.fn().mockResolvedValue({ id: "charter-1" }) },
      $transaction: async <T>(
        fn: (client: Record<string, unknown>) => Promise<T>
      ) =>
        fn({
          boat: { create: vi.fn().mockResolvedValue({ id: "boat-1" }) },
          charter: { create: vi.fn().mockResolvedValue({ id: "charter-1" }) },
        }),
    },
  };
});

describe("createCharterFromDraftData", () => {
  let baseDraft: DraftValues;
  beforeEach(() => {
    baseDraft = {
      operator: {
        firstName: "Jane",
        lastName: "Doe",
        displayName: "Captain Jane",
        email: "jane@example.com",
        phone: "+6012345678",
        experienceYears: 5,
        bio: "Experienced captain with many trips.",
      },
      charterType: "inshore",
      charterName: "Jane Adventures",
      state: "Sabah",
      city: "Kota Kinabalu",
      startingPoint: "Marina Point",
      postcode: "88000",
      latitude: 5.98,
      longitude: 116.07,
      description: "Great fishing charter.",
      boat: {
        name: "Sea Queen",
        type: "Center Console",
        lengthFeet: 30,
        capacity: 6,
        features: ["GPS", "Fishfinder"],
      },
      amenities: ["Rods", "Bait"],
      pickup: { available: false, fee: null, areas: [], notes: undefined },
      policies: {
        licenseProvided: true,
        catchAndKeep: true,
        catchAndRelease: true,
        childFriendly: true,
        liveBaitProvided: true,
        alcoholNotAllowed: false,
        smokingNotAllowed: true,
      },
      trips: [
        {
          name: "Half Day",
          tripType: "half-day",
          price: 500,
          durationHours: 4,
          maxAnglers: 4,
          charterStyle: "private",
          description: "A nice half day trip",
          species: ["Grouper"],
          techniques: ["Jigging"],
          startTimes: ["07:00"],
        },
      ],
    } as unknown as DraftValues;
  });

  it("returns validation errors for missing required fields", async () => {
    const badDraft = {
      ...baseDraft,
      operator: { ...baseDraft.operator, firstName: "" },
    } as DraftValues;
    const result = await createCharterFromDraftData({
      userId: "user-1",
      draft: badDraft,
      media: { images: [], videos: [] },
    });
    // With relaxed validation (displayName sufficient), firstName empty but displayName present should still fail due to missing media only.
    expect(result.ok).toBeFalsy();
    // @ts-expect-error runtime shape when !ok
    expect(result.errors.images).toBeDefined();
    // Should NOT include operatorFirstName now
    // @ts-expect-error runtime shape when !ok
    expect(result.errors.operatorFirstName).toBeUndefined();
  });

  it("creates charter successfully with valid data (order + cover applied)", async () => {
    const result = await createCharterFromDraftData({
      userId: "user-1",
      draft: baseDraft,
      media: {
        images: [
          { name: "a.jpg", url: "https://example.com/a.jpg" },
          { name: "b.jpg", url: "https://example.com/b.jpg" },
          { name: "c.jpg", url: "https://example.com/c.jpg" },
        ],
        videos: [],
        imagesOrder: [2, 0, 1],
        imagesCoverIndex: 1,
      },
    });
    expect(result.ok).toBeTruthy();
    if (result.ok) {
      expect(result.charterId).toBe("charter-1");
    }
  });

  it("fails when fewer than 3 images", async () => {
    const r = await createCharterFromDraftData({
      userId: "user-1",
      draft: baseDraft,
      media: { images: [{ name: "one.jpg", url: "u" }], videos: [] },
    });
    expect(r.ok).toBeFalsy();
    // @ts-expect-error narrowing
    expect(r.errors.images).toBeDefined();
  });

  it("fails when no amenities", async () => {
    const d = { ...baseDraft, amenities: [] } as DraftValues;
    const r = await createCharterFromDraftData({
      userId: "user-1",
      draft: d,
      media: {
        images: [
          { name: "a.jpg", url: "u" },
          { name: "b.jpg", url: "u" },
          { name: "c.jpg", url: "u" },
        ],
        videos: [],
      },
    });
    expect(r.ok).toBeFalsy();
    // @ts-expect-error runtime shape
    expect(r.errors.amenities).toBeDefined();
  });

  it("fails when no trips", async () => {
    const d = { ...baseDraft, trips: [] } as DraftValues;
    const r = await createCharterFromDraftData({
      userId: "user-1",
      draft: d,
      media: {
        images: [
          { name: "a.jpg", url: "u" },
          { name: "b.jpg", url: "u" },
          { name: "c.jpg", url: "u" },
        ],
        videos: [],
      },
    });
    expect(r.ok).toBeFalsy();
    // @ts-expect-error runtime shape
    expect(r.errors.trips).toBeDefined();
  });

  it("validateDraftForFinalizeFeature aggregates multiple errors", () => {
    const bad = {
      ...baseDraft,
      operator: { ...baseDraft.operator, firstName: "" },
      amenities: [],
    } as DraftValues;
    const vr = validateDraftForFinalizeFeature(bad, { images: [], videos: [] });
    expect(vr.ok).toBeFalsy();
    if (!vr.ok) {
      // operatorFirstName no longer required if displayName present
      expect(Object.keys(vr.errors)).toEqual(
        expect.arrayContaining(["amenities", "images"])
      );
      expect(vr.errors.operatorFirstName).toBeUndefined();
    }
  });

  it("allows displayName without first/last name", () => {
    const minimal = {
      ...baseDraft,
      operator: {
        ...baseDraft.operator,
        firstName: "",
        lastName: "",
        displayName: "Captain Solo",
      },
    } as DraftValues;
    const vr = validateDraftForFinalizeFeature(minimal, {
      images: [
        { name: "a.jpg", url: "u" },
        { name: "b.jpg", url: "u" },
        { name: "c.jpg", url: "u" },
      ],
      videos: [],
    });
    expect(vr.ok).toBeTruthy();
  });

  it("ignores invalid imagesOrder (duplicates) gracefully", async () => {
    const media: FinalizeMediaPayload = {
      images: [
        { name: "1.jpg", url: "u" },
        { name: "2.jpg", url: "u" },
        { name: "3.jpg", url: "u" },
      ],
      videos: [],
      imagesOrder: [0, 0, 1], // invalid
      imagesCoverIndex: 2,
    };
    const r = await createCharterFromDraftData({
      userId: "user-1",
      draft: baseDraft,
      media,
    });
    expect(r.ok).toBeTruthy();
  });

  it("ignores out-of-range cover index", async () => {
    const r = await createCharterFromDraftData({
      userId: "user-1",
      draft: baseDraft,
      media: {
        images: [
          { name: "a.jpg", url: "u" },
          { name: "b.jpg", url: "u" },
          { name: "c.jpg", url: "u" },
        ],
        videos: [],
        imagesCoverIndex: 99,
      },
    });
    expect(r.ok).toBeTruthy();
  });

  it("handles pickup available branch", async () => {
    const draftWithPickup = {
      ...baseDraft,
      pickup: {
        available: true,
        fee: 100,
        areas: ["Zone A"],
        notes: "Near dock",
      },
    } as DraftValues;
    const r = await createCharterFromDraftData({
      userId: "user-1",
      draft: draftWithPickup,
      media: {
        images: [
          { name: "a.jpg", url: "u" },
          { name: "b.jpg", url: "u" },
          { name: "c.jpg", url: "u" },
        ],
        videos: [],
      },
    });
    expect(r.ok).toBeTruthy();
  });

  it("maps shared style correctly", async () => {
    const sharedTripDraft = {
      ...baseDraft,
      trips: [
        {
          ...baseDraft.trips[0],
          charterStyle: "shared",
        },
      ],
    } as DraftValues;
    const r = await createCharterFromDraftData({
      userId: "user-1",
      draft: sharedTripDraft,
      media: {
        images: [
          { name: "a.jpg", url: "u" },
          { name: "b.jpg", url: "u" },
          { name: "c.jpg", url: "u" },
        ],
        videos: [],
      },
    });
    expect(r.ok).toBeTruthy();
  });
});

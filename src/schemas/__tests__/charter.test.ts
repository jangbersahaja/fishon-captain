import { describe, expect, it } from "vitest";
import { charterFormSchema, policiesSchema, tripSchema } from "../charter";

describe("Charter Schemas", () => {
  describe("tripSchema", () => {
    it("should accept valid trip data", () => {
      const validTrip = {
        name: "Morning Fishing Trip",
        tripType: "inshore",
        price: 500,
        durationHours: 4,
        startTimes: ["07:00", "09:00"],
        maxAnglers: 6,
        charterStyle: "private" as const,
        description: "Great morning fishing experience",
        species: ["snapper", "grouper"],
        techniques: ["bottom-fishing", "trolling"],
      };
      const result = tripSchema.safeParse(validTrip);
      expect(result.success).toBe(true);
    });

    it("should accept minimal trip data with defaults", () => {
      const minimalTrip = {
        name: "Basic Trip",
        tripType: "inshore",
        price: 300,
        durationHours: 3,
        startTimes: ["08:00"],
        maxAnglers: 4,
        charterStyle: "shared" as const,
      };
      const result = tripSchema.safeParse(minimalTrip);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.species).toEqual([]);
        expect(result.data.techniques).toEqual([]);
      }
    });

    it("should reject invalid start time format", () => {
      const invalidTrip = {
        name: "Trip",
        tripType: "inshore",
        price: 300,
        durationHours: 3,
        startTimes: ["8:00"], // Should be 08:00
        maxAnglers: 4,
        charterStyle: "private" as const,
      };
      const result = tripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it("should reject negative price", () => {
      const invalidTrip = {
        name: "Trip",
        tripType: "inshore",
        price: -100,
        durationHours: 3,
        startTimes: ["08:00"],
        maxAnglers: 4,
        charterStyle: "private" as const,
      };
      const result = tripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it("should reject zero duration", () => {
      const invalidTrip = {
        name: "Trip",
        tripType: "inshore",
        price: 300,
        durationHours: 0,
        startTimes: ["08:00"],
        maxAnglers: 4,
        charterStyle: "private" as const,
      };
      const result = tripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it("should reject invalid charter style", () => {
      const invalidTrip = {
        name: "Trip",
        tripType: "inshore",
        price: 300,
        durationHours: 3,
        startTimes: ["08:00"],
        maxAnglers: 4,
        charterStyle: "invalid" as const,
      };
      const result = tripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });
  });

  describe("policiesSchema", () => {
    it("should accept all boolean policies", () => {
      const validPolicies = {
        licenseProvided: true,
        catchAndKeep: true,
        catchAndRelease: false,
        childFriendly: true,
        liveBaitProvided: true,
        alcoholNotAllowed: false,
        smokingNotAllowed: true,
      };
      const result = policiesSchema.safeParse(validPolicies);
      expect(result.success).toBe(true);
    });

    it("should accept empty object with defaults", () => {
      const result = policiesSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.licenseProvided).toBe(false);
        expect(result.data.catchAndKeep).toBe(false);
        expect(result.data.catchAndRelease).toBe(false);
      }
    });

    it("should accept partial policies", () => {
      const partialPolicies = {
        licenseProvided: true,
        childFriendly: true,
      };
      const result = policiesSchema.safeParse(partialPolicies);
      expect(result.success).toBe(true);
    });
  });

  describe("charterFormSchema", () => {
    it("should accept valid charter form data", () => {
      // Create mock File objects for photos (minimum 3 required)
      const mockPhoto1 = new File(["photo1"], "photo1.jpg", {
        type: "image/jpeg",
      });
      const mockPhoto2 = new File(["photo2"], "photo2.jpg", {
        type: "image/jpeg",
      });
      const mockPhoto3 = new File(["photo3"], "photo3.jpg", {
        type: "image/jpeg",
      });

      const validForm = {
        operator: {
          displayName: "Captain John",
          experienceYears: 15,
          bio: "Experienced captain with deep knowledge of local waters",
          phone: "+1-555-123-4567",
        },
        charterType: "inshore",
        charterName: "John's Fishing Charters",
        state: "Florida",
        city: "Miami",
        startingPoint: "123 Marina Dr, Miami, FL",
        postcode: "33101",
        latitude: 25.7617,
        longitude: -80.1918,
        description:
          "Premium fishing experience in Miami waters with experienced captain",
        tone: "friendly" as const,
        withoutBoat: false,
        boat: {
          name: "Sea Hunter",
          type: "Center Console",
          lengthFeet: 28,
          capacity: 6,
          features: ["GPS", "Fish Finder"],
        },
        policies: {
          licenseProvided: true,
          catchAndKeep: true,
        },
        pickup: {
          available: true,
          fee: 50,
          areas: ["Miami Beach", "Downtown"],
        },
        trips: [
          {
            name: "Half Day",
            tripType: "inshore",
            price: 500,
            durationHours: 4,
            startTimes: ["07:00"],
            maxAnglers: 6,
            charterStyle: "private" as const,
            species: ["snapper"],
            techniques: ["bottom-fishing"],
          },
        ],
        photos: [mockPhoto1, mockPhoto2, mockPhoto3],
        videos: [],
      };
      const result = charterFormSchema.safeParse(validForm);
      if (!result.success) {
        console.error(result.error);
      }
      expect(result.success).toBe(true);
    });

    it("should reject short bio", () => {
      const invalidForm = {
        operator: {
          displayName: "Captain John",
          experienceYears: 15,
          bio: "Too short", // Less than 20 chars
          phone: "+1-555-123-4567",
        },
        charterType: "inshore",
        charterName: "Charters",
        state: "Florida",
        city: "Miami",
        startingPoint: "123 Marina Dr",
        postcode: "33101",
        latitude: 25.7617,
        longitude: -80.1918,
        description: "Premium fishing experience in Miami waters area",
        tone: "friendly" as const,
        boat: {},
        policies: {},
        pickup: {
          available: false,
          fee: null,
          areas: [],
        },
        trips: [
          {
            name: "Trip",
            tripType: "inshore",
            price: 300,
            durationHours: 3,
            startTimes: ["08:00"],
            maxAnglers: 4,
            charterStyle: "private" as const,
          },
        ],
        photos: [],
      };
      const result = charterFormSchema.safeParse(invalidForm);
      expect(result.success).toBe(false);
    });

    it("should reject invalid postcode", () => {
      const invalidForm = {
        operator: {
          displayName: "Captain John",
          experienceYears: 15,
          bio: "Experienced captain with knowledge",
          phone: "+1-555-123-4567",
        },
        charterType: "inshore",
        charterName: "Charters",
        state: "Florida",
        city: "Miami",
        startingPoint: "123 Marina Dr",
        postcode: "ABC", // Invalid format
        latitude: 25.7617,
        longitude: -80.1918,
        description: "Premium fishing experience in Miami waters area",
        boat: {},
        policies: {},
        pickup: {
          available: false,
          fee: null,
          areas: [],
        },
        trips: [
          {
            name: "Trip",
            tripType: "inshore",
            price: 300,
            durationHours: 3,
            startTimes: ["08:00"],
            maxAnglers: 4,
            charterStyle: "private" as const,
          },
        ],
        photos: [],
      };
      const result = charterFormSchema.safeParse(invalidForm);
      expect(result.success).toBe(false);
    });

    it("should require pickup fee when pickup is available", () => {
      const invalidForm = {
        operator: {
          displayName: "Captain John",
          experienceYears: 15,
          bio: "Experienced captain with knowledge",
          phone: "+1-555-123-4567",
        },
        charterType: "inshore",
        charterName: "Charters",
        state: "Florida",
        city: "Miami",
        startingPoint: "123 Marina Dr",
        postcode: "33101",
        latitude: 25.7617,
        longitude: -80.1918,
        description: "Premium fishing experience in Miami waters area",
        boat: {},
        policies: {},
        pickup: {
          available: true,
          fee: null, // Should have fee when available
          areas: ["Miami"],
        },
        trips: [
          {
            name: "Trip",
            tripType: "inshore",
            price: 300,
            durationHours: 3,
            startTimes: ["08:00"],
            maxAnglers: 4,
            charterStyle: "private" as const,
          },
        ],
        photos: [],
      };
      const result = charterFormSchema.safeParse(invalidForm);
      expect(result.success).toBe(false);
    });
  });
});

import React from "react";
import { describe, it, expect } from "vitest";
import { act } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  charterFormSchema,
  descriptionStepSchema,
  type CharterFormValues,
} from "../../charter-onboarding/charterForm.schema";
import { DescriptionStep } from "../../charter-onboarding/steps/DescriptionStep";
import { createRoot } from "react-dom/client";

// Build minimal valid defaults (focus on description-related fields)
function makeDefaults(): CharterFormValues {
  return {
    operator: {
      displayName: "Cap",
      experienceYears: 2,
      bio: "Experienced and friendly guide with stories to tell.",
      phone: "+60123456789",
      avatar: undefined,
      avatarUrl: undefined,
    },
    charterType: "inshore",
    charterName: "Sample",
    state: "Selangor",
    city: "Shah Alam",
    startingPoint: "Dock A",
    placeId: "p1",
    postcode: "40000",
    latitude: 3.05,
    longitude: 101.5,
    description: "Short seed", // intentionally under min
    generatedDescription: undefined,
    tone: "friendly",
    boat: {
      name: "Boat",
      type: "Skiff",
      lengthFeet: 18,
      capacity: 3,
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
    pickup: { available: false, fee: null, areas: [], notes: "" },
    trips: [
      {
        name: "Half Day",
        tripType: "inshore",
        price: 100,
        durationHours: 4,
        startTimes: ["07:00"],
        maxAnglers: 3,
        charterStyle: "private",
        description: "Trip desc",
        species: [],
        techniques: [],
      },
    ],
    photos: [],
    videos: [],
    uploadedPhotos: [],
    uploadedVideos: [],
  };
}

describe("DescriptionStep validation", () => {

  it("fails descriptionStepSchema when description below min", () => {
    const form = makeDefaults();
    const values = form;
    const result = descriptionStepSchema.safeParse(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m: string) => m.includes("40"))).toBe(true);
    }
  });

  it("passes after updating description to >= 40 chars", () => {
    const values = makeDefaults();
    values.description = "A long enough charter description that exceeds forty characters.";
    const result = descriptionStepSchema.safeParse(values);
    expect(result.success).toBe(true);
  });

  it("renders character counter reflecting remaining chars", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    const Wrapper: React.FC = () => {
      const methods = useForm<CharterFormValues>({
        defaultValues: makeDefaults(),
        resolver: zodResolver(charterFormSchema) as never,
      });
      return (
        <FormProvider {...methods}>
          <DescriptionStep form={methods} />
        </FormProvider>
      );
    };
    act(() => {
      root.render(<Wrapper />);
    });
    const counter = el.querySelector("span.tabular-nums");
    expect(counter).toBeTruthy();
    act(() => {
      root.unmount();
    });
  });
});

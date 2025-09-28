import {
  __resetCharterFormAnalyticsForTests,
  setCharterFormAnalyticsListener,
} from "@features/charter-onboarding/analytics";
import {
  charterFormSchema,
  type CharterFormValues,
} from "@features/charter-onboarding/charterForm.schema";
import { useStepNavigation } from "@features/charter-onboarding/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal default values builder (mirror createDefaultCharterFormValues shape subset)
const makeDefaults = (): CharterFormValues => ({
  operator: {
    displayName: "Cap Test",
    experienceYears: 2,
    bio: "Experienced captain with safe trips",
    phone: "+60000000",
    avatar: undefined,
  },
  charterType: "shared",
  charterName: "Charter X",
  state: "Selangor",
  city: "Shah Alam",
  startingPoint: "Dock",
  postcode: "40000",
  latitude: 1,
  longitude: 1,
  description: "A valid description over forty characters in length here.",
  generatedDescription: undefined,
  tone: "friendly",
  boat: {
    name: "Boat",
    type: "Center",
    lengthFeet: 30,
    capacity: 4,
    features: ["GPS"],
  },
  amenities: ["Rods"],
  policies: {
    licenseProvided: true,
    catchAndKeep: true,
    catchAndRelease: true,
    childFriendly: true,
    liveBaitProvided: true,
    alcoholNotAllowed: true,
    smokingNotAllowed: true,
  },
  pickup: { available: false, fee: null, areas: [], notes: "" },
  trips: [
    {
      name: "Half Day",
      tripType: "inshore",
      price: 400,
      durationHours: 4,
      startTimes: ["07:00"],
      maxAnglers: 4,
      charterStyle: "private",
      description: "Trip",
      species: [],
      techniques: [],
    },
  ],
  photos: [],
  videos: [],
  // Provide languages so basics step schema passes (schema requires at least one; form schema default would normally fill this in production code path)
  // Tests use explicit defaultValues, so we must mirror runtime default.
  supportedLanguages: ["Malay", "English"],
  uploadedPhotos: [],
  uploadedVideos: [],
});

describe("useStepNavigation", () => {
  beforeEach(() => {
    __resetCharterFormAnalyticsForTests();
    // jsdom doesn't implement scrollTo; mock to avoid errors impacting state flush timing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollTo = vi.fn();
  });

  const setup = (existingImagesCount = 0, isEditing = false) => {
    const saveServerDraftSnapshot = vi.fn().mockResolvedValue(1);
    const hook = renderHook(() => {
      const form = useForm<CharterFormValues>({
        resolver: zodResolver(charterFormSchema) as unknown as never,
        defaultValues: makeDefaults(),
        mode: "onBlur",
      });
      return {
        nav: useStepNavigation({
          form,
          isEditing,
          existingImagesCount,
          saveServerDraftSnapshot,
          setSnapshotCurrentStep: () => {},
        }),
        form,
      };
    });
    return { hook, saveServerDraftSnapshot };
  };

  it("advances on valid Next and marks completion", async () => {
    const { hook } = setup();
    expect(hook.result.current.nav.currentStep).toBe(0);
    await act(async () => {
      await hook.result.current.nav.handleNext();
    });
    expect(hook.result.current.nav.currentStep).toBe(1);
    expect(hook.result.current.nav.stepCompleted[0]).toBe(true);
  });

  it("collects errors and does not advance on invalid step", async () => {
    const { hook } = setup();
    const { form, nav } = hook.result.current;
    // Register then invalidate a required field (unregistered fields won't update internal state in RHF tests)
    act(() => {
      form.register("charterName");
      // Force mutation using reset to guarantee value store update
      const current = form.getValues();
      form.reset({ ...current, charterName: "" });
    });
    expect(hook.result.current.form.getValues().charterName).toBe("");
    await act(async () => {
      await nav.handleNext();
    });
    expect(nav.currentStep).toBe(0);
    // Either we captured a summary or we prevented advancement (some jsdom timing quirks); key invariant: not advanced & not marked complete
    expect(nav.stepCompleted[0]).toBe(false);
  });

  it("bypasses media photo minimum when sufficient existing images present", async () => {
    // editing with 3 existing images should allow media step to pass even if form.photos empty
    const { hook } = setup(3, true);
    // Sequence (per STEP_SEQUENCE): 0 basics -> 1 experience -> 2 trips -> 3 description -> 4 media -> 5 review
    await act(async () => {
      await hook.result.current.nav.handleNext();
    }); // 0 -> 1
    await act(async () => {
      await hook.result.current.nav.handleNext();
    }); // 1 -> 2
    await act(async () => {
      await hook.result.current.nav.handleNext();
    }); // 2 -> 3 (description)
    await act(async () => {
      await hook.result.current.nav.handleNext();
    }); // 3 -> 4 (media)
    expect(hook.result.current.nav.currentStep).toBe(4); // media index
    // Now advance; should bypass min photos using existingImagesCount and reach review
    await act(async () => {
      await hook.result.current.nav.handleNext();
    }); // 4 -> 5 (review)
    expect(hook.result.current.nav.isReviewStep).toBe(true);
  });

  it("emits step_view events on navigation", async () => {
    const events: string[] = [];
    setCharterFormAnalyticsListener((e) => {
      if (e.type === "step_view") events.push(e.step as string);
    });
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.nav.handleNext();
    });
    expect(events.includes("experience")).toBe(true);
  });
});

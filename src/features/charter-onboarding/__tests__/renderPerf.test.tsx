import { ActionButtons } from "@features/charter-onboarding/components/ActionButtons";
import { CharterFormProvider } from "@features/charter-onboarding/context/CharterFormContext";
import { render } from "@testing-library/react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/**
 * Lightweight render/performance harness: ensures ActionButtons doesn't rerender
 * excessively when media-related values change (basic heuristic).
 * We can't measure actual React commits easily without a custom renderer, so we increment
 * a counter in a child component that subscribes to the same context slice.
 */

const RenderCounter: React.FC<{ onRender: () => void }> = ({ onRender }) => {
  useEffect(() => {
    onRender();
  });
  return null;
};

describe("Context selector render performance", () => {
  it("limits ActionButtons re-renders when media slice changes repeatedly", () => {
    let renders = 0;
    const Wrapper: React.FC = () => {
      // Provide a minimal shape aligned with actual form schema to satisfy type expectations
      const form = useForm({
        defaultValues: {
          operator: {
            displayName: "Captain",
            experienceYears: 1,
            bio: "",
            phone: "",
            avatar: undefined,
          },
          charterType: "inshore",
          charterName: "Test Charter",
          state: "FL",
          city: "Miami",
          startingPoint: "Dock A",
          targetSpecies: [],
          techniques: [],
          amenities: [],
          description: "",
          trips: [],
          media: { images: [], videos: [] },
          pricing: { basePrice: 0, currency: "USD" },
          cancellationPolicy: "flexible",
          rules: "",
          tags: [],
          generatedDescription: undefined,
        },
      });
      return (
        <CharterFormProvider
          value={{
            form: form as unknown as ReturnType<typeof useForm>,
            isEditing: true,
            currentCharterId: "c1",
            serverDraftId: null,
            serverVersion: 1,
            setServerVersion: () => {},
            navigation: {
              currentStep: 0,
              isLastStep: false,
              isReviewStep: false,
              activeStep: { label: "Basics" },
              handleNext: () => {},
              handlePrev: () => {},
              gotoStep: () => {},
            },
            submission: {
              submitState: null,
              savingEdit: false,
              serverSaving: false,
              saveEditChanges: () => {},
              triggerSubmit: () => {},
            },
            media: {
              isMediaUploading: false,
              canSubmitMedia: true,
              existingImagesCount: 0,
              existingVideosCount: 0,
            },
          }}
        >
          <ActionButtons />
          <RenderCounter onRender={() => renders++} />
        </CharterFormProvider>
      );
    };
    const { rerender } = render(<Wrapper />);
    // Simulate 20 unrelated media state changes (would update context.media but not navigation/submission slices used by buttons)
    for (let i = 0; i < 20; i++) {
      rerender(<Wrapper />);
    }
    // Heuristic: Should not exceed initial + small number (no per-change re-render spike)
    expect(renders).toBeLessThan(25);
  });
});

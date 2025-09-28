import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionButtons } from "../components/ActionButtons";
import { CharterFormProvider } from "../context/CharterFormContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ActionButtons", () => {
  type Env = Parameters<typeof CharterFormProvider>[0]["value"] & {
    form: unknown;
  };
  // Minimal value factory with forced cast for form (not used in component under test)
  const makeEnv = (over: Partial<Env> = {}): Env => ({
    // Cast through unknown to satisfy type without implementing full RHF contract
    form: {} as unknown as Env["form"],
    isEditing: true,
    currentCharterId: "charter-1",
    serverDraftId: "draft-1",
    serverVersion: 1,
    setServerVersion: () => {},
    navigation: {
      currentStep: 1,
      isLastStep: false,
      isReviewStep: false,
      activeStep: { label: "Step" },
      handleNext: () => {},
      handlePrev: () => {},
      gotoStep: () => {},
    },
    submission: {
      submitState: null as {
        type: "success" | "error";
        message: string;
      } | null,
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
      avatarUploading: false,
    },
    ...over,
  });
  it("renders Cancel button in edit mode", () => {
    render(
      <CharterFormProvider value={makeEnv()}>
        <ActionButtons />
      </CharterFormProvider>
    );
    expect(screen.getByLabelText(/cancel edit/i)).toBeInTheDocument();
  });
  it("disables Next when serverSaving", () => {
    render(
      <CharterFormProvider
        value={makeEnv({
          submission: {
            submitState: null,
            savingEdit: false,
            serverSaving: true,
            saveEditChanges: () => {},
            triggerSubmit: () => {},
          },
        })}
      >
        <ActionButtons />
      </CharterFormProvider>
    );
    const btn = screen.getByLabelText(/saving|next/i) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
  it("disables Save when media uploading or cannot submit", () => {
    render(
      <CharterFormProvider
        value={makeEnv({
          submission: {
            submitState: null,
            savingEdit: false,
            serverSaving: false,
            saveEditChanges: () => {},
            triggerSubmit: () => {},
          },
          media: {
            isMediaUploading: true,
            canSubmitMedia: false,
            existingImagesCount: 0,
            existingVideosCount: 0,
            avatarUploading: true,
          },
        })}
      >
        <ActionButtons />
      </CharterFormProvider>
    );
    const saveBtn = screen.getByLabelText(/save/i) as HTMLButtonElement;
    expect(saveBtn).toBeDisabled();
  });
  it("shows Back button when not on first step", () => {
    const baseNav = makeEnv().navigation!;
    render(
      <CharterFormProvider
        value={makeEnv({
          navigation: {
            ...baseNav,
            currentStep: 2,
            isLastStep: false,
            isReviewStep: false,
            activeStep: { label: "Step" },
            handleNext: baseNav.handleNext,
            handlePrev: baseNav.handlePrev,
            gotoStep: baseNav.gotoStep,
          },
        })}
      >
        <ActionButtons />
      </CharterFormProvider>
    );
    expect(screen.getByLabelText(/back/i)).toBeInTheDocument();
  });
});

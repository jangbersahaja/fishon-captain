import FormSection from "@features/charter-onboarding/FormSection";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Next.js navigation used inside FormSection
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/dynamic to return a no-op component (we only need first step)
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}));

// Mock next-auth session hook to avoid provider wiring
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "test-user" } },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Basic smoke test to guard refactors: ensures component mounts and first step label appears.
// Mock charter form mode + data load for create baseline
vi.mock("@features/charter-onboarding/hooks", async () => {
  const actual = (await vi.importActual(
    "@features/charter-onboarding/hooks"
  )) as Record<string, unknown>;
  return {
    ...actual,
    useCharterFormMode: () => ({ editCharterId: null }),
    useCharterDataLoad: () => ({
      effectiveEditing: false,
      currentCharterId: null,
      serverDraftId: "draft-abc",
      serverVersion: 1,
      setServerVersion: () => {},
    }),
  };
});

describe("FormSection integration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  it("renders basics step in create mode without editing banner", () => {
    render(<FormSection />);
    const basics = screen.getAllByText(/Captain & Charter|Basics/i);
    expect(basics.length).toBeGreaterThan(0);
    expect(screen.queryByText(/Editing live charter/i)).toBeNull();
  });

  it("renders editing banner in edit mode", async () => {
    // Re-mock module for edit state using doMock then dynamic import
    vi.resetModules();
    vi.doMock("@features/charter-onboarding/hooks", async () => {
      const actual = (await vi.importActual(
        "@features/charter-onboarding/hooks"
      )) as Record<string, unknown>;
      return {
        ...actual,
        useCharterFormMode: () => ({ editCharterId: "charter-1" }),
        useCharterDataLoad: () => ({
          effectiveEditing: true,
          currentCharterId: "charter-1",
          serverDraftId: null,
          serverVersion: 2,
          setServerVersion: () => {},
        }),
      };
    });
    // Re-import after mocks applied
    const { default: EditForm } = await import(
      "@features/charter-onboarding/FormSection"
    );
    render(<EditForm />);
    expect(screen.getByText(/Editing live charter/i)).toBeInTheDocument();
  });
});

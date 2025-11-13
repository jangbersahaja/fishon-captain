/**
 * @vitest-environment jsdom
 */

import { InstallButton } from "@/components/pwa/InstallButton";
import * as usePWAInstallModule from "@/hooks/usePWAInstall";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the usePWAInstall hook
vi.mock("@/hooks/usePWAInstall");

describe("InstallButton Component", () => {
  const mockPromptInstall = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering Behavior", () => {
    it("should not render when not installable", () => {
      vi.spyOn(usePWAInstallModule, "usePWAInstall").mockReturnValue({
        installState: "not-ready",
        platform: "desktop",
        promptInstall: mockPromptInstall,
        isIOSInstallable: false,
        canInstall: false,
        isInstalled: false,
      });

      const { container } = render(<InstallButton />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render when already installed", () => {
      vi.spyOn(usePWAInstallModule, "usePWAInstall").mockReturnValue({
        installState: "installed",
        platform: "desktop",
        promptInstall: mockPromptInstall,
        isIOSInstallable: false,
        canInstall: false,
        isInstalled: true,
      });

      const { container } = render(<InstallButton />);
      expect(container.firstChild).toBeNull();
    });

    it("should render when installable", () => {
      vi.spyOn(usePWAInstallModule, "usePWAInstall").mockReturnValue({
        installState: "installable",
        platform: "desktop",
        promptInstall: mockPromptInstall,
        isIOSInstallable: false,
        canInstall: true,
        isInstalled: false,
      });

      render(<InstallButton />);
      expect(screen.getByText("Install App")).toBeInTheDocument();
    });
  });

  describe("Button Interaction", () => {
    it("should call promptInstall when clicked (direct mode)", async () => {
      mockPromptInstall.mockResolvedValue(true);

      vi.spyOn(usePWAInstallModule, "usePWAInstall").mockReturnValue({
        installState: "installable",
        platform: "desktop",
        promptInstall: mockPromptInstall,
        isIOSInstallable: false,
        canInstall: true,
        isInstalled: false,
      });

      render(<InstallButton />);

      const button = screen.getByText("Install App");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockPromptInstall).toHaveBeenCalledTimes(1);
      });
    });

    it("should show dialog when showDialog prop is true", async () => {
      vi.spyOn(usePWAInstallModule, "usePWAInstall").mockReturnValue({
        installState: "installable",
        platform: "desktop",
        promptInstall: mockPromptInstall,
        isIOSInstallable: false,
        canInstall: true,
        isInstalled: false,
      });

      render(<InstallButton showDialog />);

      const button = screen.getByText("Install App");
      fireEvent.click(button);

      // Should not call promptInstall directly
      expect(mockPromptInstall).not.toHaveBeenCalled();

      // Dialog should open (check for dialog title)
      await waitFor(() => {
        expect(screen.getByText("Install Fishon Captain")).toBeInTheDocument();
      });
    });
  });

  describe("Customization Props", () => {
    beforeEach(() => {
      vi.spyOn(usePWAInstallModule, "usePWAInstall").mockReturnValue({
        installState: "installable",
        platform: "desktop",
        promptInstall: mockPromptInstall,
        isIOSInstallable: false,
        canInstall: true,
        isInstalled: false,
      });
    });

    it("should render custom label", () => {
      render(<InstallButton label="Get App" />);
      expect(screen.getByText("Get App")).toBeInTheDocument();
    });

    it("should hide icon when showIcon is false", () => {
      const { container } = render(<InstallButton showIcon={false} />);
      const icon = container.querySelector("svg");
      expect(icon).toBeNull();
    });

    it("should apply custom className", () => {
      const { container } = render(<InstallButton className="custom-class" />);
      const button = container.querySelector("button");
      expect(button).toHaveClass("custom-class");
    });

    it("should apply different variants", () => {
      const { rerender, container } = render(
        <InstallButton variant="outline" />
      );
      let button = container.querySelector("button");
      expect(button).toHaveClass("border");

      rerender(<InstallButton variant="ghost" />);
      button = container.querySelector("button");
      expect(button).toHaveClass("hover:bg-accent");
    });

    it("should apply different sizes", () => {
      const { rerender, container } = render(<InstallButton size="sm" />);
      let button = container.querySelector("button");
      expect(button).toHaveClass("h-8"); // sm size uses h-8

      rerender(<InstallButton size="lg" />);
      button = container.querySelector("button");
      expect(button).toHaveClass("h-10"); // lg size uses h-10
    });
  });

  describe("iOS Platform", () => {
    it("should render for iOS installable", () => {
      vi.spyOn(usePWAInstallModule, "usePWAInstall").mockReturnValue({
        installState: "not-ready",
        platform: "ios",
        promptInstall: mockPromptInstall,
        isIOSInstallable: true,
        canInstall: true,
        isInstalled: false,
      });

      render(<InstallButton />);
      expect(screen.getByText("Install App")).toBeInTheDocument();
    });
  });
});

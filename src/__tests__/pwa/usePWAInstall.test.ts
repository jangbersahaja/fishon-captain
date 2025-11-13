/**
 * @vitest-environment jsdom
 */

import { usePWAInstall } from "@/hooks/usePWAInstall";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockBeforeInstallPromptEvent {
  preventDefault: ReturnType<typeof vi.fn>;
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: string; platform: string }>;
  platforms: string[];
}

describe("usePWAInstall Hook", () => {
  let mockBeforeInstallPromptEvent: MockBeforeInstallPromptEvent;
  let eventListeners: { [key: string]: EventListener[] };

  beforeEach(() => {
    // Reset event listeners
    eventListeners = {};

    // Mock window.addEventListener
    vi.spyOn(window, "addEventListener").mockImplementation(
      (event, handler) => {
        if (!eventListeners[event]) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(handler as EventListener);
      }
    );

    // Mock window.removeEventListener
    vi.spyOn(window, "removeEventListener").mockImplementation(
      (event, handler) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter(
            (h) => h !== handler
          );
        }
      }
    );

    // Mock beforeinstallprompt event
    mockBeforeInstallPromptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
      platforms: ["web"],
    };

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock location.protocol
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        protocol: "https:",
        hostname: "fishon-captain.vercel.app",
      },
    });

    // Mock navigator.userAgent
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with 'not-ready' state", () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.installState).toBe("not-ready");
      expect(result.current.canInstall).toBe(false);
      expect(result.current.isInstalled).toBe(false);
    });

    it("should detect desktop platform", () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.platform).toBe("desktop");
    });

    it("should detect iOS platform", () => {
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.platform).toBe("ios");
    });

    it("should detect Android platform", () => {
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value: "Mozilla/5.0 (Linux; Android 10) Chrome/120.0.0.0",
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.platform).toBe("android");
    });
  });

  describe("beforeinstallprompt Event", () => {
    it("should capture beforeinstallprompt event", async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Simulate beforeinstallprompt event
      act(() => {
        const handler = eventListeners["beforeinstallprompt"]?.[0];
        if (handler) {
          handler(mockBeforeInstallPromptEvent as unknown as Event);
        }
      });

      await waitFor(() => {
        expect(result.current.installState).toBe("installable");
      });

      expect(mockBeforeInstallPromptEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.canInstall).toBe(true);
    });

    it("should handle app installation", async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Capture prompt
      act(() => {
        const handler = eventListeners["beforeinstallprompt"]?.[0];
        if (handler) {
          handler(mockBeforeInstallPromptEvent as unknown as Event);
        }
      });

      await waitFor(() => {
        expect(result.current.installState).toBe("installable");
      });

      // Trigger app installed event
      act(() => {
        const handler = eventListeners["appinstalled"]?.[0];
        if (handler) {
          handler(new Event("appinstalled"));
        }
      });

      await waitFor(() => {
        expect(result.current.installState).toBe("installed");
      });

      expect(result.current.isInstalled).toBe(true);
    });
  });

  describe("promptInstall Method", () => {
    it("should prompt installation successfully", async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Capture prompt event
      act(() => {
        const handler = eventListeners["beforeinstallprompt"]?.[0];
        if (handler) {
          handler(mockBeforeInstallPromptEvent as unknown as Event);
        }
      });

      await waitFor(() => {
        expect(result.current.installState).toBe("installable");
      });

      // Prompt installation
      let installResult: boolean | undefined;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(mockBeforeInstallPromptEvent.prompt).toHaveBeenCalled();
      expect(installResult).toBe(true);
      expect(result.current.installState).toBe("installed");
    });

    it("should handle user dismissal", async () => {
      // Mock user dismissing the prompt
      mockBeforeInstallPromptEvent.userChoice = Promise.resolve({
        outcome: "dismissed",
        platform: "web",
      });

      const { result } = renderHook(() => usePWAInstall());

      // Capture prompt event
      act(() => {
        const handler = eventListeners["beforeinstallprompt"]?.[0];
        if (handler) {
          handler(mockBeforeInstallPromptEvent as unknown as Event);
        }
      });

      await waitFor(() => {
        expect(result.current.installState).toBe("installable");
      });

      // Prompt installation
      let installResult: boolean | undefined;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult).toBe(false);
      expect(result.current.installState).toBe("dismissed");
    });

    it("should return false when no deferred prompt", async () => {
      const { result } = renderHook(() => usePWAInstall());

      // Try to prompt without capturing event
      let installResult: boolean | undefined;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult).toBe(false);
    });

    it("should handle prompt errors", async () => {
      // Mock prompt error
      mockBeforeInstallPromptEvent.prompt = vi
        .fn()
        .mockRejectedValue(new Error("Prompt failed"));

      const { result } = renderHook(() => usePWAInstall());

      // Capture prompt event
      act(() => {
        const handler = eventListeners["beforeinstallprompt"]?.[0];
        if (handler) {
          handler(mockBeforeInstallPromptEvent as unknown as Event);
        }
      });

      await waitFor(() => {
        expect(result.current.installState).toBe("installable");
      });

      // Prompt installation
      let installResult: boolean | undefined;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult).toBe(false);
    });
  });

  describe("Standalone Mode Detection", () => {
    it("should detect standalone mode via matchMedia", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === "(display-mode: standalone)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.installState).toBe("installed");
      expect(result.current.isInstalled).toBe(true);
    });

    it("should detect Safari standalone mode", () => {
      // @ts-expect-error - Testing Safari-specific property
      window.navigator.standalone = true;

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.installState).toBe("installed");
      expect(result.current.isInstalled).toBe(true);

      // Cleanup
      // @ts-expect-error - Cleanup
      delete window.navigator.standalone;
    });
  });

  describe("iOS Installation", () => {
    it("should detect iOS installable state", () => {
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.platform).toBe("ios");
      expect(result.current.isIOSInstallable).toBe(true);
      expect(result.current.canInstall).toBe(true);
    });

    it("should not be installable if iOS in standalone mode", () => {
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      });

      // @ts-expect-error - Testing Safari-specific property
      window.navigator.standalone = true;

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.platform).toBe("ios");
      expect(result.current.installState).toBe("installed");
      expect(result.current.isIOSInstallable).toBe(false);
      expect(result.current.canInstall).toBe(false);

      // Cleanup
      // @ts-expect-error - Cleanup
      delete window.navigator.standalone;
    });
  });

  describe("HTTPS Requirement", () => {
    it("should be unsupported on HTTP (non-localhost)", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          protocol: "http:",
          hostname: "fishon-captain.com",
        },
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.installState).toBe("unsupported");
      expect(result.current.canInstall).toBe(false);
    });

    it("should work on HTTP localhost", () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          protocol: "http:",
          hostname: "localhost",
        },
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.installState).toBe("not-ready");
    });
  });

  describe("Cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const { unmount } = renderHook(() => usePWAInstall());

      expect(window.addEventListener).toHaveBeenCalledWith(
        "beforeinstallprompt",
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        "appinstalled",
        expect.any(Function)
      );

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        "beforeinstallprompt",
        expect.any(Function)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        "appinstalled",
        expect.any(Function)
      );
    });
  });
});

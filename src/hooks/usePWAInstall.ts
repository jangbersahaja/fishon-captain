"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * BeforeInstallPromptEvent interface
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * PWA installation states
 */
export type InstallState =
  | "unsupported" // PWA not supported (not HTTPS, no service worker support)
  | "installed" // Already installed (standalone mode)
  | "installable" // Can be installed (beforeinstallprompt captured)
  | "dismissed" // User dismissed the prompt
  | "not-ready"; // Waiting for beforeinstallprompt event

/**
 * Platform detection
 */
export type Platform = "ios" | "android" | "desktop" | "unknown";

/**
 * usePWAInstall Hook
 *
 * Manages PWA installation state and provides methods to prompt installation.
 * Follows Next.js 15 PWA guide patterns.
 *
 * @returns {object} Installation state and methods
 *
 * @example
 * ```tsx
 * const { installState, platform, promptInstall, isIOSInstallable } = usePWAInstall();
 *
 * if (installState === 'installable') {
 *   return <button onClick={promptInstall}>Install App</button>;
 * }
 * ```
 */
export function usePWAInstall() {
  const [installState, setInstallState] = useState<InstallState>("not-ready");
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  /**
   * Detect platform
   */
  const detectPlatform = useCallback((): Platform => {
    if (typeof window === "undefined") return "unknown";

    const ua = window.navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      return "ios";
    } else if (/android/.test(ua)) {
      return "android";
    } else {
      return "desktop";
    }
  }, []);

  /**
   * Check if app is already installed (standalone mode)
   */
  const isStandalone = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error - Safari-specific property
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://")
    );
  }, []);

  /**
   * Check if iOS and installable via manual instructions
   */
  const isIOSInstallable = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    const detectedPlatform = detectPlatform();
    const standalone = isStandalone();

    // iOS Safari can be installed manually, but not in standalone mode
    return detectedPlatform === "ios" && !standalone;
  }, [detectPlatform, isStandalone]);

  /**
   * Prompt installation (for Android/Desktop Chrome)
   */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn("PWA: No deferred prompt available");
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("PWA: User accepted installation");
        setInstallState("installed");
        setDeferredPrompt(null);
        return true;
      } else {
        console.log("PWA: User dismissed installation");
        setInstallState("dismissed");
        setDeferredPrompt(null);
        return false;
      }
    } catch (error) {
      console.error("PWA: Error prompting installation:", error);
      return false;
    }
  }, [deferredPrompt]);

  /**
   * Initialize and listen for beforeinstallprompt event
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect platform
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);

    // Check if already installed
    if (isStandalone()) {
      setInstallState("installed");
      return;
    }

    // Check if PWA is supported (HTTPS required)
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      setInstallState("unsupported");
      return;
    }

    // Listen for beforeinstallprompt event (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      console.log("PWA: beforeinstallprompt event captured");

      // Store the event for later use
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setInstallState("installable");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log("PWA: App successfully installed");
      setInstallState("installed");
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [detectPlatform, isStandalone]);

  return {
    installState,
    platform,
    promptInstall,
    isIOSInstallable: isIOSInstallable(),
    canInstall: installState === "installable" || isIOSInstallable(),
    isInstalled: installState === "installed",
  };
}

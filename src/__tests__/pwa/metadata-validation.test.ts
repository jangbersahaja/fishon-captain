/**
 * PWA Metadata Tests
 *
 * Verifies that layout.tsx includes all required PWA metadata.
 */

import { metadata, viewport } from "@/app/layout";
import { describe, expect, it } from "vitest";

describe("PWA Metadata Validation", () => {
  describe("Viewport Configuration", () => {
    it("should have viewport configuration", () => {
      expect(viewport).toBeDefined();
    });

    it("should have theme color in viewport", () => {
      expect(viewport.themeColor).toBeDefined();
      expect(viewport.themeColor).toBe("#ec2227");
    });

    it("should have responsive viewport settings", () => {
      expect(viewport.width).toBe("device-width");
      expect(viewport.initialScale).toBe(1);
    });
  });

  describe("Apple Web App Configuration", () => {
    it("should have apple web app configuration", () => {
      expect(metadata.appleWebApp).toBeDefined();
    });

    it("should be apple web app capable", () => {
      expect(metadata.appleWebApp?.capable).toBe(true);
    });

    it("should have status bar style", () => {
      expect(metadata.appleWebApp?.statusBarStyle).toBeDefined();
      expect(["default", "black", "black-translucent"]).toContain(
        metadata.appleWebApp?.statusBarStyle
      );
    });

    it("should have apple web app title", () => {
      expect(metadata.appleWebApp?.title).toBeDefined();
      expect(typeof metadata.appleWebApp?.title).toBe("string");
      expect(metadata.appleWebApp?.title).toBe("Fishon Captain");
    });
  });

  describe("Icons Configuration", () => {
    it("should have icons configuration", () => {
      expect(metadata.icons).toBeDefined();
    });

    it("should have favicon", () => {
      if (
        typeof metadata.icons === "object" &&
        !Array.isArray(metadata.icons)
      ) {
        expect(metadata.icons.icon).toBeDefined();
      }
    });

    it("should have apple touch icon", () => {
      if (
        typeof metadata.icons === "object" &&
        !Array.isArray(metadata.icons)
      ) {
        expect(metadata.icons.apple).toBeDefined();
      }
    });
  });

  describe("General Metadata", () => {
    it("should have title", () => {
      expect(metadata.title).toBeDefined();
    });

    it("should have description", () => {
      expect(metadata.description).toBeDefined();
      expect(typeof metadata.description).toBe("string");
    });

    it("should have metadataBase", () => {
      expect(metadata.metadataBase).toBeDefined();
    });

    it("should have application name", () => {
      expect(metadata.applicationName).toBe("Fishon Captain");
    });

    it("should have keywords for SEO", () => {
      expect(metadata.keywords).toBeDefined();
      expect(Array.isArray(metadata.keywords)).toBe(true);
    });
  });

  describe("OpenGraph Configuration", () => {
    it("should have OpenGraph metadata", () => {
      expect(metadata.openGraph).toBeDefined();
    });

    it("should have OpenGraph title and description", () => {
      expect(metadata.openGraph?.title).toBeDefined();
      expect(metadata.openGraph?.description).toBeDefined();
    });

    it("should have OpenGraph images", () => {
      expect(metadata.openGraph?.images).toBeDefined();
    });
  });

  describe("Twitter Card Configuration", () => {
    it("should have Twitter card metadata", () => {
      expect(metadata.twitter).toBeDefined();
    });

    it("should have Twitter card type", () => {
      expect(metadata.twitter?.card).toBe("summary_large_image");
    });
  });
});

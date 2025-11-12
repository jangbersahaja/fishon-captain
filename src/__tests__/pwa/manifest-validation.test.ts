/**
 * PWA Manifest Validation Tests
 *
 * Verifies that manifest function returns valid data following Next.js MetadataRoute.Manifest.
 */

import manifest from "@/app/manifest";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

interface WebAppManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  orientation?: string;
  scope?: string;
  lang?: string;
  categories?: string[];
  icons: ManifestIcon[];
}

describe("PWA Manifest Validation", () => {
  const manifestData: WebAppManifest = manifest() as WebAppManifest;

  describe("Required Fields", () => {
    it("should have name field", () => {
      expect(manifestData.name).toBeDefined();
      expect(typeof manifestData.name).toBe("string");
      expect(manifestData.name.length).toBeGreaterThan(0);
    });

    it("should have short_name field", () => {
      expect(manifestData.short_name).toBeDefined();
      expect(typeof manifestData.short_name).toBe("string");
      expect(manifestData.short_name.length).toBeGreaterThan(0);
      expect(manifestData.short_name.length).toBeLessThanOrEqual(15); // Recommended max length for mobile displays
    });

    it("should have description field", () => {
      expect(manifestData.description).toBeDefined();
      expect(typeof manifestData.description).toBe("string");
    });

    it("should have start_url field", () => {
      expect(manifestData.start_url).toBeDefined();
      expect(typeof manifestData.start_url).toBe("string");
      expect(manifestData.start_url).toMatch(/^\/.*$/); // Should start with /
    });

    it("should have display field with valid value", () => {
      expect(manifestData.display).toBeDefined();
      expect(["standalone", "fullscreen", "minimal-ui", "browser"]).toContain(
        manifestData.display
      );
    });

    it("should have theme_color field", () => {
      expect(manifestData.theme_color).toBeDefined();
      expect(typeof manifestData.theme_color).toBe("string");
      expect(manifestData.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/); // Valid hex color
    });

    it("should have background_color field", () => {
      expect(manifestData.background_color).toBeDefined();
      expect(typeof manifestData.background_color).toBe("string");
      expect(manifestData.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it("should have correct theme_color (#ec2227)", () => {
      expect(manifestData.theme_color).toBe("#ec2227");
    });
  });

  describe("Icons Configuration", () => {
    it("should have icons array", () => {
      expect(manifestData.icons).toBeDefined();
      expect(Array.isArray(manifestData.icons)).toBe(true);
      expect(manifestData.icons.length).toBeGreaterThan(0);
    });

    it("should have all required icon sizes", () => {
      const requiredSizes = [
        "72x72",
        "96x96",
        "128x128",
        "144x144",
        "152x152",
        "192x192",
        "384x384",
        "512x512",
      ];
      const iconSizes = manifestData.icons.map((icon) => icon.sizes);

      requiredSizes.forEach((size) => {
        expect(iconSizes).toContain(size);
      });
    });

    it("should have at least one maskable icon", () => {
      const maskableIcons = manifestData.icons.filter(
        (icon) => icon.purpose && icon.purpose.includes("maskable")
      );

      expect(maskableIcons.length).toBeGreaterThan(0);
    });

    it("should have valid icon objects", () => {
      manifestData.icons.forEach((icon) => {
        expect(icon.src).toBeDefined();
        expect(icon.sizes).toBeDefined();
        expect(icon.type).toBe("image/png");
        expect(icon.purpose).toBeDefined();
      });
    });

    it("should reference existing icon files", () => {
      manifestData.icons.forEach((icon) => {
        const iconPath = path.join(process.cwd(), "public", icon.src);
        expect(fs.existsSync(iconPath)).toBe(true);
      });
    });
  });

  describe("Optional but Recommended Fields", () => {
    it("should have orientation field", () => {
      expect(manifestData.orientation).toBeDefined();
    });

    it("should have scope field", () => {
      expect(manifestData.scope).toBeDefined();
      expect(manifestData.scope).toMatch(/^\//); // Should start with /
    });

    it("should have lang field", () => {
      expect(manifestData.lang).toBeDefined();
    });

    it("should have categories array", () => {
      expect(manifestData.categories).toBeDefined();
      expect(Array.isArray(manifestData.categories)).toBe(true);
    });
  });
});

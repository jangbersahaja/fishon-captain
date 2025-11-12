/**
 * PWA Icon Validation Tests
 *
 * Verifies that all required PWA icons exist and have correct dimensions.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

// Icon specifications
const REQUIRED_PWA_ICONS = [
  { size: 72, path: "public/icons/icon-72x72.png" },
  { size: 96, path: "public/icons/icon-96x96.png" },
  { size: 128, path: "public/icons/icon-128x128.png" },
  { size: 144, path: "public/icons/icon-144x144.png" },
  { size: 152, path: "public/icons/icon-152x152.png" },
  { size: 192, path: "public/icons/icon-192x192.png" },
  { size: 384, path: "public/icons/icon-384x384.png" },
  { size: 512, path: "public/icons/icon-512x512.png" },
];

const IOS_ICON = { size: 180, path: "public/apple-touch-icon.png" };
const MASKABLE_ICON = {
  size: 512,
  path: "public/icons/icon-512x512-maskable.png",
};

describe("PWA Icon Validation", () => {
  describe("PWA Icons Existence", () => {
    REQUIRED_PWA_ICONS.forEach(({ size, path: iconPath }) => {
      it(`should have ${size}x${size} icon at ${iconPath}`, () => {
        const fullPath = path.join(process.cwd(), iconPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    it("should have iOS apple-touch-icon at public/apple-touch-icon.png", () => {
      const fullPath = path.join(process.cwd(), IOS_ICON.path);
      expect(fs.existsSync(fullPath)).toBe(true);
    });

    it("should have maskable icon at public/icons/icon-512x512-maskable.png", () => {
      const fullPath = path.join(process.cwd(), MASKABLE_ICON.path);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  describe("PWA Icons Dimensions", () => {
    REQUIRED_PWA_ICONS.forEach(({ size, path: iconPath }) => {
      it(`should have correct dimensions for ${size}x${size} icon`, async () => {
        const fullPath = path.join(process.cwd(), iconPath);
        const metadata = await sharp(fullPath).metadata();

        expect(metadata.width).toBe(size);
        expect(metadata.height).toBe(size);
        expect(metadata.format).toBe("png");
      });
    });

    it("should have correct dimensions for iOS icon (180x180)", async () => {
      const fullPath = path.join(process.cwd(), IOS_ICON.path);
      const metadata = await sharp(fullPath).metadata();

      expect(metadata.width).toBe(IOS_ICON.size);
      expect(metadata.height).toBe(IOS_ICON.size);
      expect(metadata.format).toBe("png");
    });

    it("should have correct dimensions for maskable icon (512x512)", async () => {
      const fullPath = path.join(process.cwd(), MASKABLE_ICON.path);
      const metadata = await sharp(fullPath).metadata();

      expect(metadata.width).toBe(MASKABLE_ICON.size);
      expect(metadata.height).toBe(MASKABLE_ICON.size);
      expect(metadata.format).toBe("png");
    });
  });

  describe("Icon File Sizes", () => {
    it("should have reasonable file sizes (not empty, not too large)", () => {
      REQUIRED_PWA_ICONS.forEach(({ path: iconPath }) => {
        const fullPath = path.join(process.cwd(), iconPath);
        const stats = fs.statSync(fullPath);

        // Icons should be between 1KB and 500KB
        expect(stats.size).toBeGreaterThan(1024); // > 1KB
        expect(stats.size).toBeLessThan(500 * 1024); // < 500KB
      });
    });
  });
});

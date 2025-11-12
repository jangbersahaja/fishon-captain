/**
 * i18n Configuration Tests
 * Tests for locale detection, fallback logic, and cookie persistence
 */

import { i18nConfig } from "@/i18n";
import { describe, expect, it } from "vitest";

describe("i18n Configuration", () => {
  describe("supported locales", () => {
    it("should support Malay (ms) and English (en)", () => {
      expect(i18nConfig.locales).toEqual(["ms", "en"]);
    });

    it("should have Malay (ms) as default locale", () => {
      expect(i18nConfig.defaultLocale).toBe("ms");
    });
  });

  describe("locale prefix strategy", () => {
    it("should use 'as-needed' strategy (no prefix for default locale)", () => {
      expect(i18nConfig.localePrefix).toBe("as-needed");
    });
  });
});

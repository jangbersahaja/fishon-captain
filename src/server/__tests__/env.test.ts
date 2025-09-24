import { describe, expect, it } from "vitest";

// Dynamic import helper – rely on ESM loader (Next/Vitest) so we can re-import fresh copy.
async function loadFreshEnvModule() {
  // Create a query param to bypass module cache (works under Vitest with native dynamic import)
  const mod = await import(`@/lib/env?cacheBust=${Date.now()}`);
  return mod;
}

describe("env loader", () => {
  it("throws when required missing", async () => {
    const original = { ...process.env };
    try {
      process.env.DATABASE_URL = "";
      process.env.NEXTAUTH_SECRET = "";
      process.env.GOOGLE_CLIENT_ID = "";
      process.env.GOOGLE_CLIENT_SECRET = "";
      await expect(loadFreshEnvModule()).rejects.toThrow(
        /Environment validation failed/
      );
    } finally {
      process.env = original;
    }
  });

  it("passes with valid values", async () => {
    const original = { ...process.env };
    try {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
      process.env.NEXTAUTH_SECRET = "abcdefghijklmnopqrstuvwxyz012345";
      process.env.GOOGLE_CLIENT_ID = "client-id";
      process.env.GOOGLE_CLIENT_SECRET = "client-secret";
      const fresh = await loadFreshEnvModule();
      // env exported eagerly; verify shape via a property
      expect(fresh.env.DATABASE_URL).toContain("postgres://");
    } finally {
      process.env = original;
    }
  });
});

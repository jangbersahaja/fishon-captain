import { __resetEnvCacheForTests, env, loadEnv } from "@/lib/env";
import { describe, expect, it } from "vitest";

describe("env loader", () => {
  it("throws when required missing", async () => {
    const original = { ...process.env };
    try {
      process.env.DATABASE_URL = "";
      process.env.NEXTAUTH_SECRET = "";
      process.env.GOOGLE_CLIENT_ID = "";
      process.env.GOOGLE_CLIENT_SECRET = "";
      __resetEnvCacheForTests();
      expect(() => loadEnv()).toThrow(/Environment validation failed/);
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
      __resetEnvCacheForTests();
      loadEnv();
      expect(env.DATABASE_URL).toContain("postgres://");
    } finally {
      process.env = original;
    }
  });
});

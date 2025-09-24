import { prisma } from "@/lib/prisma";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ||= "postgres://user:pass@localhost:5432/testdb";
process.env.NEXTAUTH_SECRET ||= "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // 40 chars
process.env.GOOGLE_CLIENT_ID ||= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ||= "test-google-client-secret";
process.env.GOOGLE_PLACES_API_KEY ||= "test-places-key";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: "user-req" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    charterDraft: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

let listHandler: (req: Request) => Promise<Response>;
let createHandler: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/charter-drafts/route");
  listHandler = mod.GET;
  createHandler = mod.POST;
});

describe("requestId propagation & draft create rate limit", () => {
  beforeEach(() => {
    (
      prisma.charterDraft.findFirst as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue(null);
    (
      prisma.charterDraft.create as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({
      id: "draft-new",
      version: 0,
      currentStep: 0,
      data: {},
    });
  });

  it("includes requestId in GET response", async () => {
    const req = new Request("http://t/", {
      method: "GET",
      headers: { "x-request-id": "abc-123" },
    });
    const res = await listHandler(req);
    const json = await res.json();
    expect(json.requestId).toBe("abc-123");
  });

  it("includes requestId in POST response and enforces rate limit after 3 attempts", async () => {
    for (let i = 0; i < 4; i++) {
      const req = new Request("http://t/", {
        method: "POST",
        headers: { "x-request-id": `rid-${i}` },
      });
      const res = await createHandler(req);
      const json = await res.json();
      expect(json.requestId).toBe(`rid-${i}`);
      if (i < 3) {
        expect(res.status).not.toBe(429);
      } else {
        expect(res.status).toBe(429);
        expect(json.error).toBe("rate_limited");
      }
    }
  });
});

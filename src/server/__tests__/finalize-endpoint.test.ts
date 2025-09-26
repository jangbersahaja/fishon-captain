import { prisma } from "@/lib/prisma";
import type { DraftValues } from "@features/charter-onboarding/charterForm.draft";
import { getServerSession } from "next-auth";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Ensure required env vars exist before any module (auth/env) loads.
process.env.DATABASE_URL ||= "postgres://user:pass@localhost:5432/testdb";
process.env.NEXTAUTH_SECRET ||= "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // 40 chars
process.env.GOOGLE_CLIENT_ID ||= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ||= "test-google-client-secret";
process.env.GOOGLE_PLACES_API_KEY ||= "test-places-key";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    charterDraft: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    captainProfile: { upsert: vi.fn().mockResolvedValue({ id: "cap-1" }) },
    boat: { create: vi.fn().mockResolvedValue({ id: "boat-1" }) },
    charter: { create: vi.fn().mockResolvedValue({ id: "charter-xyz" }) },
    $transaction: async <T>(
      fn: (client: Record<string, unknown>) => Promise<T>
    ): Promise<T> =>
      fn({
        boat: { create: vi.fn().mockResolvedValue({ id: "boat-1" }) },
        charter: { create: vi.fn().mockResolvedValue({ id: "charter-xyz" }) },
      }),
  },
}));

// Mock next-auth session retrieval
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

// We'll dynamically import the finalize route AFTER setting env vars so that
// the env guard sees seeded values. Static ESM imports run before the
// assignment lines above, causing validation failures.
let finalizeHandler: (
  req: Request,
  ctx: { params: { id: string } }
) => Promise<Response>;
let __resetFinalizeRateLimiter: () => void;

beforeAll(async () => {
  const mod = await import("@/app/api/charter-drafts/[id]/finalize/route");
  finalizeHandler = mod.POST;
  __resetFinalizeRateLimiter = mod.__resetFinalizeRateLimiter;
});

describe("Finalize Draft API", () => {
  beforeEach(() => {
    // Ensure module imported
    if (!finalizeHandler || !__resetFinalizeRateLimiter) {
      throw new Error("Finalize route module not loaded");
    }
    __resetFinalizeRateLimiter();
    (
      prisma.charterDraft.findUnique as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({
      id: "draft-1",
      userId: "user-1",
      status: "DRAFT",
      version: 1,
      updatedAt: new Date().toISOString(),
      data: baseDraft(),
    });
    (
      prisma.charterDraft.update as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({ id: "draft-1" });
  });

  it("returns 400 when media missing", async () => {
    const req = new Request("http://test/", {
      method: "POST",
      body: JSON.stringify({ media: { images: [] } }),
      headers: { "x-request-id": "fin-missing" },
    });
    const res = await finalizeHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.requestId).toBe("fin-missing");
  });

  it("finalizes successfully with valid payload", async () => {
    const req = new Request("http://test/", {
      method: "POST",
      body: JSON.stringify({
        media: {
          images: [
            { name: "a.jpg", url: "https://example.com/a.jpg" },
            { name: "b.jpg", url: "https://example.com/b.jpg" },
            { name: "c.jpg", url: "https://example.com/c.jpg" },
          ],
          videos: [],
        },
      }),
      headers: { "x-request-id": "fin-success" },
    });
    const res = await finalizeHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.charterId).toBe("charter-xyz");
    expect(json.requestId).toBe("fin-success");
  });

  it("returns 401 when unauthorized", async () => {
    (
      getServerSession as unknown as {
        mockResolvedValueOnce: (v: unknown) => void;
      }
    ).mockResolvedValueOnce(null);
    const req = new Request("http://test/", {
      method: "POST",
      body: JSON.stringify({
        media: {
          images: [
            { name: "a.jpg", url: "https://example.com/a.jpg" },
            { name: "b.jpg", url: "https://example.com/b.jpg" },
            { name: "c.jpg", url: "https://example.com/c.jpg" },
          ],
          videos: [],
        },
      }),
      headers: { "x-request-id": "fin-unauth" },
    });
    const res = await finalizeHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.requestId).toBe("fin-unauth");
  });

  it("returns 404 when draft belongs to another user", async () => {
    (
      prisma.charterDraft.findUnique as unknown as {
        mockResolvedValueOnce: (v: unknown) => void;
      }
    ).mockResolvedValueOnce({
      id: "draft-2",
      userId: "different-user",
      status: "DRAFT",
      version: 1,
      updatedAt: new Date().toISOString(),
      data: baseDraft(),
    });
    const req = new Request("http://test/", {
      method: "POST",
      body: JSON.stringify({
        media: {
          images: [
            { name: "a.jpg", url: "https://example.com/a.jpg" },
            { name: "b.jpg", url: "https://example.com/b.jpg" },
            { name: "c.jpg", url: "https://example.com/c.jpg" },
          ],
          videos: [],
        },
      }),
      headers: { "x-request-id": "fin-notfound" },
    });
    const res = await finalizeHandler(req, { params: { id: "draft-2" } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.requestId).toBe("fin-notfound");
  });

  it("returns 400 when draft status is not DRAFT", async () => {
    (
      prisma.charterDraft.findUnique as unknown as {
        mockResolvedValueOnce: (v: unknown) => void;
      }
    ).mockResolvedValueOnce({
      id: "draft-3",
      userId: "user-1",
      status: "SUBMITTED", // no charterId => should trigger 400 invalid_status path
      version: 1,
      updatedAt: new Date().toISOString(),
      data: baseDraft(),
    });
    const req = new Request("http://test/", {
      method: "POST",
      body: JSON.stringify({
        media: {
          images: [
            { name: "a.jpg", url: "https://example.com/a.jpg" },
            { name: "b.jpg", url: "https://example.com/b.jpg" },
            { name: "c.jpg", url: "https://example.com/c.jpg" },
          ],
          videos: [],
        },
      }),
      headers: { "x-request-id": "fin-badstatus" },
    });
    const res = await finalizeHandler(req, { params: { id: "draft-3" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.requestId).toBe("fin-badstatus");
  });

  it("returns 409 on version conflict when header mismatches", async () => {
    (
      prisma.charterDraft.findUnique as unknown as {
        mockResolvedValueOnce: (v: unknown) => void;
      }
    ).mockResolvedValueOnce({
      id: "draft-4",
      userId: "user-1",
      status: "DRAFT",
      version: 7,
      updatedAt: new Date().toISOString(),
      data: baseDraft(),
    });
    const req = new Request("http://test/", {
      method: "POST",
      headers: { "x-draft-version": "6" },
      body: JSON.stringify({
        media: {
          images: [
            { name: "a.jpg", url: "https://example.com/a.jpg" },
            { name: "b.jpg", url: "https://example.com/b.jpg" },
            { name: "c.jpg", url: "https://example.com/c.jpg" },
          ],
          videos: [],
        },
      }),
    });
    const res = await finalizeHandler(req, { params: { id: "draft-4" } });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.requestId).toBeDefined();
  });

  it("returns 429 after exceeding rate limit", async () => {
    // Use a fresh user id so prior tests don't contribute to the attempt counter
    (
      getServerSession as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({ user: { id: "user-rl" } });
    (
      prisma.charterDraft.findUnique as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({
      id: "draft-rl",
      userId: "user-rl",
      status: "DRAFT",
      version: 1,
      updatedAt: new Date().toISOString(),
      data: baseDraft(),
    });
    for (let i = 0; i < 6; i++) {
      const req = new Request("http://test/", {
        method: "POST",
        body: JSON.stringify({
          media: {
            images: [
              { name: "a.jpg", url: "https://example.com/a.jpg" },
              { name: "b.jpg", url: "https://example.com/b.jpg" },
              { name: "c.jpg", url: "https://example.com/c.jpg" },
            ],
            videos: [],
          },
        }),
        headers: { "x-request-id": `fin-rl-${i}` },
      });
      const res = await finalizeHandler(req, { params: { id: "draft-rl" } });
      if (i < 5) expect(res.status).not.toBe(429);
      if (i === 5) expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.requestId).toBeDefined();
    }
  });
});

function baseDraft(): DraftValues {
  const draft = {
    operator: {
      firstName: "Jane",
      lastName: "Doe",
      displayName: "Captain Jane",
      email: "jane@example.com",
      phone: "+6012345678",
      experienceYears: 3,
      bio: "Bio that is sufficiently long",
    },
    charterType: "inshore",
    charterName: "Sample Charter",
    state: "Sabah",
    city: "Kota Kinabalu",
    startingPoint: "Dock A",
    postcode: "88000",
    latitude: 5.98,
    longitude: 116.07,
    description: "Nice charter",
    tone: "friendly",
    boat: {
      name: "Sea Queen",
      type: "Center Console",
      lengthFeet: 30,
      capacity: 6,
      features: ["GPS"],
    },
    amenities: ["Bait"],
    pickup: { available: false, fee: null, areas: [], notes: undefined },
    policies: {
      licenseProvided: true,
      catchAndKeep: true,
      catchAndRelease: true,
      childFriendly: true,
      liveBaitProvided: true,
      alcoholNotAllowed: false,
      smokingNotAllowed: true,
    },
    trips: [
      {
        name: "Trip A",
        tripType: "custom-1",
        price: 400,
        durationHours: 4,
        maxAnglers: 4,
        charterStyle: "private",
        description: "desc",
        species: ["Grouper"],
        techniques: ["Jigging"],
        startTimes: ["07:00"],
      },
    ],
  } as unknown as DraftValues; // cast through unknown to satisfy partial shape
  return draft;
}

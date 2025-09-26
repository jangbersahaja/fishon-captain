import { prisma } from "@/lib/prisma";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ||= "postgres://user:pass@localhost:5432/testdb";
process.env.NEXTAUTH_SECRET ||= "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.GOOGLE_CLIENT_ID ||= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ||= "test-google-client-secret";
process.env.GOOGLE_PLACES_API_KEY ||= "test-places-key";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    charterDraft: { findUnique: vi.fn(), update: vi.fn() },
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

let finalizeHandler: (
  req: Request,
  ctx: { params: { id: string } }
) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/charter-drafts/[id]/finalize/route");
  finalizeHandler = mod.POST;
});

describe("Finalize schema validation", () => {
  beforeEach(() => {
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
  });

  it("rejects when images array empty (handled earlier but test schema)", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      body: JSON.stringify({ media: { images: [], videos: [] } }),
    });
    const res = await finalizeHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(400);
  });

  it("rejects when more than 20 images", async () => {
    const images = Array.from({ length: 21 }, (_, i) => ({
      name: `i${i}.jpg`,
      url: `https://e.com/${i}.jpg`,
    }));
    const req = new Request("http://t/", {
      method: "POST",
      body: JSON.stringify({ media: { images, videos: [] } }),
    });
    const res = await finalizeHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_payload");
  });

  it("rejects invalid URL", async () => {
    const req = new Request("http://t/", {
      method: "POST",
      body: JSON.stringify({
        media: {
          images: [
            { name: "a.jpg", url: "notaurl" },
            { name: "b.jpg", url: "https://example.com/b.jpg" },
            { name: "c.jpg", url: "https://example.com/c.jpg" },
          ],
          videos: [],
        },
      }),
    });
    const res = await finalizeHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(400);
  });
});

function baseDraft() {
  return {
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
  } as unknown;
}

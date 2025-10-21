import { Mock, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/headers", () => ({ applySecurityHeaders: (r: Response) => r }));
vi.mock("@/lib/rateLimiter", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 3 })),
}));
vi.mock("@/lib/requestTiming", () => ({
  withTiming: async <T>(_: string, fn: () => Promise<T> | T) => await fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/metrics", () => ({ counter: () => ({ inc: vi.fn() }) }));

type PrismaMock = {
  charterDraft: { findUnique: Mock; update: Mock };
  captainProfile: { findUnique: Mock; upsert: Mock };
  charterMedia: { findMany: Mock; updateMany: Mock };
  captainVideo: { findMany: Mock; update: Mock };
  boat: { create: Mock };
  charter: { create: Mock };
  $transaction: <T>(cb: (tx: PrismaMock) => Promise<T> | T) => Promise<T>;
};
type SafeGlobal = typeof globalThis & { __prismaMock_finalize: PrismaMock };
declare global {
  var __prismaMock_finalize: PrismaMock;
}

vi.mock("@/lib/prisma", () => {
  const prisma: PrismaMock = {
    charterDraft: {
      findUnique: vi.fn() as unknown as Mock,
      update: vi.fn() as unknown as Mock,
    },
    captainProfile: {
      findUnique: vi.fn() as unknown as Mock,
      upsert: vi.fn() as unknown as Mock,
    },
    charterMedia: {
      findMany: vi.fn() as unknown as Mock,
      updateMany: vi.fn() as unknown as Mock,
    },
    captainVideo: {
      findMany: vi.fn() as unknown as Mock,
      update: vi.fn() as unknown as Mock,
    },
    boat: { create: vi.fn() as unknown as Mock },
    charter: { create: vi.fn() as unknown as Mock },
    $transaction: (cb) =>
      Promise.resolve(cb((globalThis as SafeGlobal).__prismaMock_finalize)),
  };
  (globalThis as SafeGlobal).__prismaMock_finalize = prisma;
  // Provide a default upsert resolution for captainProfile
  prisma.captainProfile.upsert.mockResolvedValue({ id: "cap1" });
  return { prisma };
});

import { getServerSession } from "next-auth/next";
import { POST } from "../charter-drafts/[id]/finalize/route";

beforeEach(() => {
  vi.resetAllMocks();
  const prisma = (globalThis as SafeGlobal).__prismaMock_finalize;
  // Default upsert result so create path has captainProfile.id
  prisma.captainProfile.upsert.mockResolvedValue({ id: "cap1" });
});

describe("POST /api/charter-drafts/[id]/finalize", () => {
  it("create path links photos to CharterMedia and videos to CaptainVideo", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1" },
    });
    const prisma = (globalThis as SafeGlobal).__prismaMock_finalize;
    prisma.charterDraft.findUnique.mockResolvedValue({
      id: "d1",
      charterId: null,
      status: "DRAFT",
      data: {
        operator: { displayName: "Cap A", phone: "+60123456789" },
        charterType: "inshore",
        charterName: "Sea Fox",
        state: "Selangor",
        city: "Klang",
        startingPoint: "Port Klang",
        postcode: "42000",
        description: "Nice trips",
        amenities: ["Rods"],
        boat: {
          name: "Boat A",
          type: "center console",
          lengthFeet: 20,
          capacity: 4,
          features: ["GPS"],
        },
        pickup: { available: false },
        policies: { licenseProvided: false },
        trips: [
          {
            name: "Half Day",
            tripType: "custom-1",
            price: 100,
            durationHours: 4,
            maxAnglers: 2,
            charterStyle: "private",
            startTimes: [],
            species: [],
            techniques: [],
          },
        ],
      },
    });
    prisma.captainProfile.findUnique.mockResolvedValue({ id: "cap1" });
    prisma.charterMedia.findMany.mockResolvedValue([
      { id: "m1" },
      { id: "m2" },
      { id: "m3" },
    ]);
    prisma.captainVideo.findMany.mockResolvedValue([
      { id: "v1" },
      { id: "v2" },
    ]);
    prisma.boat.create.mockResolvedValue({ id: "b1" });
    prisma.charter.create.mockResolvedValue({ id: "c1" });
    prisma.charterDraft.update.mockResolvedValue({});

    const body = {
      media: {
        images: [
          { name: "captains/cap1/media/1.jpg", url: "https://blob/1.jpg" },
          { name: "captains/cap1/media/2.jpg", url: "https://blob/2.jpg" },
          { name: "captains/cap1/media/3.jpg", url: "https://blob/3.jpg" },
        ],
        videos: [],
      },
    };
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const nextLike = req as unknown as import("next/server").NextRequest;
    const ctx = { params: Promise.resolve({ id: "d1" }) } as {
      params: Promise<{ id: string }>;
    };
    const res = await POST(nextLike, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.charterId).toBe("c1");
    // Photos linked via CharterMedia.updateMany
    expect(prisma.charterMedia.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["m1", "m2", "m3"] } },
      data: { charterId: "c1" },
    });
    // Videos linked directly via CaptainVideo.update (looped)
    expect(prisma.captainVideo.update).toHaveBeenCalledTimes(2);
  });

  it("returns 409 when draft already submitted or has charterId", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1" },
    });
    const prisma = (globalThis as SafeGlobal).__prismaMock_finalize;
    prisma.charterDraft.findUnique.mockResolvedValue({
      id: "d2",
      charterId: "c-existing",
      status: "SUBMITTED",
      data: {},
    });

    const req = new Request("http://x", { method: "POST" });
    const nextLike = req as unknown as import("next/server").NextRequest;
    const ctx = { params: Promise.resolve({ id: "d2" }) } as {
      params: Promise<{ id: string }>;
    };
    const res = await POST(nextLike, ctx);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("already_submitted");
  });
});

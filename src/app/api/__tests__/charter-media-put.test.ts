import { describe, expect, it, Mock, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/headers", () => ({ applySecurityHeaders: (r: Response) => r }));
vi.mock("@vercel/blob", () => ({ del: vi.fn(async () => ({})) }));

// Strongly-typed global prisma mock
type PrismaMock = {
  charter: {
    findUnique: Mock;
    update: Mock;
  };
  charterMedia: {
    deleteMany: Mock;
  };
  $transaction: (
    cb: (tx: PrismaMock) => unknown | Promise<unknown>
  ) => Promise<unknown>;
};
type SafeGlobal = typeof globalThis & { __prismaMock_media: PrismaMock };
declare global {
  var __prismaMock_media: PrismaMock;
}

vi.mock("@/lib/prisma", () => {
  const prisma: PrismaMock = {
    charter: {
      findUnique: vi.fn() as unknown as Mock,
      update: vi.fn() as unknown as Mock,
    },
    charterMedia: {
      deleteMany: vi.fn() as unknown as Mock,
    },
    $transaction: vi.fn(
      async (cb: (tx: PrismaMock) => unknown | Promise<unknown>) =>
        cb((globalThis as SafeGlobal).__prismaMock_media)
    ),
  };
  (globalThis as SafeGlobal).__prismaMock_media = prisma;
  return { prisma };
});

import { getServerSession } from "next-auth";
import { PUT } from "../charters/[id]/media/route";

describe("PUT /api/charters/[id]/media", () => {
  it("rejects when payload includes videos", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1" },
    });
    const prisma = (globalThis as SafeGlobal).__prismaMock_media;
    prisma.charter.findUnique.mockResolvedValue({
      id: "c1",
      captain: { userId: "u1", id: "cap1" },
      media: [],
    });

    const req = new Request("http://x", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        media: {
          images: [],
          videos: [{ url: "https://blob", name: "captain-videos/abc" }],
        },
      }),
    });
    const ctx = { params: Promise.resolve({ id: "c1" }) } as {
      params: Promise<{ id: string }>;
    };
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("videos_not_supported");
  });

  it("accepts valid images and replaces CharterMedia", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1" },
    });
    const prisma = (globalThis as SafeGlobal).__prismaMock_media;
    prisma.charter.findUnique.mockResolvedValue({
      id: "c1",
      captain: { userId: "u1", id: "cap1" },
      media: [{ id: "m0", storageKey: "captains/cap1/media/old.jpg" }],
    });
    prisma.charterMedia.deleteMany.mockResolvedValue({ count: 1 });
    prisma.charter.update.mockResolvedValue({});

    const req = new Request("http://x", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        media: {
          images: [
            { url: "https://blob/c1.jpg", name: "captains/cap1/media/c1.jpg" },
            { url: "https://blob/c2.jpg", name: "captains/cap1/media/c2.jpg" },
          ],
          videos: [],
        },
        deleteKeys: ["captains/cap1/media/old.jpg"],
      }),
    });
    const ctx = { params: Promise.resolve({ id: "c1" }) } as {
      params: Promise<{ id: string }>;
    };
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // Ensure replacement called
    expect(prisma.charterMedia.deleteMany).toHaveBeenCalledWith({
      where: { charterId: "c1" },
    });
    expect(prisma.charter.update).toHaveBeenCalled();
  });
});

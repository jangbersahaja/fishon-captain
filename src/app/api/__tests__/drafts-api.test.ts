import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Strongly-typed global prisma mock to avoid any-casts
type PrismaMock = { charterDraft: { findUnique: Mock; update: Mock } };
type SafeGlobal = typeof globalThis & { __prismaMock: PrismaMock };
declare global {
  var __prismaMock: PrismaMock;
}

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/rateLimiter", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 2 })),
}));
vi.mock("@/server/drafts", () => ({
  createDraft: vi.fn(
    async (args: { userId: string; initial: unknown; step: number }) => ({
      id: "d1",
      userId: args.userId,
      data: args.initial,
      currentStep: args.step,
      version: 1,
      status: "DRAFT",
    })
  ),
  getActiveDraft: vi.fn(async () => null),
  patchDraft: vi.fn(
    async (args: {
      id: string;
      userId: string;
      clientVersion: number;
      dataPartial: unknown;
      currentStep: number;
    }) => ({
      conflict: false,
      draft: {
        id: args.id,
        userId: args.userId,
        data: args.dataPartial,
        currentStep: args.currentStep,
        version: args.clientVersion + 1,
        status: "DRAFT",
      },
    })
  ),
  DraftPatchSchema: {
    safeParse: (v: unknown) => ({ success: true, data: v as unknown }),
  },
}));
vi.mock("@/lib/prisma", () => {
  const charterDraft = {
    findUnique: vi.fn() as unknown as Mock,
    update: vi.fn() as unknown as Mock,
  };
  const mocked: PrismaMock = { charterDraft };
  (globalThis as SafeGlobal).__prismaMock = mocked;
  return { prisma: mocked };
});

import { getServerSession } from "next-auth";
import {
  DELETE as draftDelete,
  GET as draftGet,
  PATCH as draftPatch,
} from "../charter-drafts/[id]/route";
import { GET as draftsGet, POST as draftsPost } from "../charter-drafts/route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("/api/charter-drafts", () => {
  it("GET requires auth", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue(null);
    const res = await draftsGet(new Request("http://x"));
    expect(res.status).toBe(401);
  });
  it("POST creates new draft when none exists", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1", role: "CAPTAIN" },
    });
    const res = await draftsPost(new Request("http://x", { method: "POST" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft?.id).toBe("d1");
  });
});

describe("/api/charter-drafts/[id]", () => {
  it("GET returns 404 when not owner and not admin", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1", role: "CAPTAIN" },
    });
    const prismaMock = (globalThis as SafeGlobal).__prismaMock;
    prismaMock.charterDraft.findUnique.mockResolvedValue({
      id: "d1",
      userId: "u2",
    });
    const ctx: { params: Promise<{ id: string }> } = {
      params: Promise.resolve({ id: "d1" }),
    };
    const res = await draftGet(new Request("http://x"), ctx);
    expect(res.status).toBe(404);
  });

  it("PATCH updates when owner", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1", role: "CAPTAIN" },
    });
    const prismaMock = (globalThis as SafeGlobal).__prismaMock;
    prismaMock.charterDraft.findUnique.mockResolvedValue({
      id: "d1",
      userId: "u1",
    });
    const ctx2: { params: Promise<{ id: string }> } = {
      params: Promise.resolve({ id: "d1" }),
    };
    const res = await draftPatch(
      new Request("http://x", {
        method: "PATCH",
        body: JSON.stringify({
          dataPartial: { charterName: "X" },
          clientVersion: 1,
          currentStep: 2,
        }),
        headers: { "content-type": "application/json" },
      }),
      ctx2
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft.version).toBe(2);
  });

  it("DELETE marks draft as DELETED", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    });
    const prismaMock = (globalThis as SafeGlobal).__prismaMock;
    prismaMock.charterDraft.findUnique.mockResolvedValue({
      id: "d1",
      userId: "u2",
      status: "DRAFT",
    });
    prismaMock.charterDraft.update.mockResolvedValue({});
    const ctx3: { params: Promise<{ id: string }> } = {
      params: Promise.resolve({ id: "d1" }),
    };
    const res = await draftDelete(
      new Request("http://x", { method: "DELETE" }),
      ctx3
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

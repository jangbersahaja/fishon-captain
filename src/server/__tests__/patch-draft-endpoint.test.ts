import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Seed env
process.env.DATABASE_URL ||= "postgres://user:pass@localhost:5432/testdb";
process.env.NEXTAUTH_SECRET ||= "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // 40 chars
process.env.GOOGLE_CLIENT_ID ||= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ||= "test-google-client-secret";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      charterDraft: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

let patchHandler: (
  req: Request,
  ctx: { params: { id: string } }
) => Promise<Response>;

beforeAll(async () => {
  const mod = await import("@/app/api/charter-drafts/[id]/route");
  patchHandler = mod.PATCH;
});

describe("PATCH Draft API", () => {
  beforeEach(() => {
    if (!patchHandler) throw new Error("Patch handler not loaded");
    (
      prisma.charterDraft.findUnique as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({
      id: "draft-1",
      userId: "user-1",
      status: "DRAFT",
      version: 3,
      currentStep: 1,
      data: { operator: { firstName: "Jane" } },
    });
    (
      prisma.charterDraft.update as unknown as {
        mockResolvedValue: (v: unknown) => void;
      }
    ).mockResolvedValue({ id: "draft-1", version: 4 });
  });

  it("rejects invalid json", async () => {
    const req = new Request("http://test/", {
      method: "PATCH",
      body: "not-json",
      headers: { "x-request-id": "req-invalid-json" },
    });
    const res = await patchHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.requestId).toBe("req-invalid-json");
  });

  it("rejects payload missing clientVersion", async () => {
    const req = new Request("http://test/", {
      method: "PATCH",
      body: JSON.stringify({ dataPartial: { operator: { lastName: "Doe" } } }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_payload");
    expect(json.requestId).toBeDefined();
  });

  it("returns 409 on version conflict", async () => {
    const fn = prisma.charterDraft.findUnique as unknown as {
      mockResolvedValueOnce: (v: unknown) => void;
    };
    // First call (ownership check)
    fn.mockResolvedValueOnce({
      id: "draft-1",
      userId: "user-1",
      status: "DRAFT",
      version: 5,
      currentStep: 1,
      data: {},
    });
    // Second call (inside patchDraft)
    fn.mockResolvedValueOnce({
      id: "draft-1",
      userId: "user-1",
      status: "DRAFT",
      version: 5,
      currentStep: 1,
      data: {},
    });
    const req = new Request("http://test/", {
      method: "PATCH",
      body: JSON.stringify({
        clientVersion: 3,
        dataPartial: { operator: { lastName: "Doe" } },
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.requestId).toBeDefined();
  });

  it("patches successfully", async () => {
    const req = new Request("http://test/", {
      method: "PATCH",
      body: JSON.stringify({
        clientVersion: 3,
        dataPartial: { operator: { lastName: "Doe" } },
        currentStep: 2,
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft).toBeDefined();
    expect(json.requestId).toBeDefined();
  });

  it("returns 401 when unauthorized", async () => {
    (
      getServerSession as unknown as {
        mockResolvedValueOnce: (v: unknown) => void;
      }
    ).mockResolvedValueOnce(null);
    const req = new Request("http://test/", {
      method: "PATCH",
      body: JSON.stringify({ clientVersion: 3, dataPartial: {} }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchHandler(req, { params: { id: "draft-1" } });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.requestId).toBeDefined();
  });
});

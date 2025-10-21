import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

vi.mock("@/lib/rateLimiter", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 9 })),
}));
vi.mock("@/lib/adminBypass", () => ({
  verifyAdminBypassPassword: vi.fn(async (p: string) => p === "ok"),
}));

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { POST as verifyRoute } from "../admin/verify-password/route";

function makeNextRequest(body: unknown): NextRequest {
  const r = new Request("http://localhost/api/admin/verify-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  // Vitest does not provide a real NextRequest; route only uses .json()
  return r as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/admin/verify-password", () => {
  it("requires auth", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue(null);
    const res = await verifyRoute(makeNextRequest({ password: "ok" }));
    expect(res.status).toBe(401);
  });

  it("requires staff or admin role", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1", role: "CAPTAIN" },
    });
    const res = await verifyRoute(makeNextRequest({ password: "ok" }));
    expect(res.status).toBe(403);
  });

  it("rejects missing password", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    });
    const res = await verifyRoute(makeNextRequest({}));
    expect(res.status).toBe(400);
  });

  it("rejects invalid password", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1", role: "STAFF" },
    });
    const res = await verifyRoute(makeNextRequest({ password: "nope" }));
    expect(res.status).toBe(401);
  });

  it("accepts valid password", async () => {
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    });
    const res = await verifyRoute(makeNextRequest({ password: "ok" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

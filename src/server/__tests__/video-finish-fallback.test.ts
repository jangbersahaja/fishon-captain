import { beforeAll, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ||= "postgres://user:pass@localhost:5432/testdb";
process.env.NEXTAUTH_SECRET ||= "test-secret";

// Mock next-auth session
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: "user-123" } }),
}));

// Capture create payload
const createSpy = vi
  .fn()
  .mockImplementation((args) => ({ id: "vid-1", ...args.data }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    captainVideo: { create: createSpy },
  },
}));

// Relax type to simplify invocation in isolated unit context (unknown then cast locally)
let finishHandler: unknown;

beforeAll(async () => {
  const mod = await import("../../app/api/blob/finish/route");
  finishHandler = mod.POST;
});

describe("finish route fallback fields", () => {
  it("persists didFallback and fallbackReason", async () => {
    const form = new FormData();
    form.append("videoUrl", "https://example.com/video.mp4");
    form.append("startSec", "0");
    form.append("ownerId", "user-123");
    form.append("didFallback", "true");
    form.append("fallbackReason", "parser_error");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: Response = await (finishHandler as any)(
      new Request("http://test/finish", { method: "POST", body: form })
    );
    expect(res.status).toBe(200);
    const payload = createSpy.mock.calls[0][0];
    expect(payload.data.didFallback).toBe(true);
    expect(payload.data.fallbackReason).toBe("parser_error");
  });

  it("defaults didFallback false when omitted", async () => {
    const form = new FormData();
    form.append("videoUrl", "https://example.com/video2.mp4");
    form.append("startSec", "5");
    form.append("ownerId", "user-123");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: Response = await (finishHandler as any)(
      new Request("http://test/finish", { method: "POST", body: form })
    );
    expect(res.status).toBe(200);
    const lastCall = createSpy.mock.calls[createSpy.mock.calls.length - 1];
    expect(lastCall).toBeTruthy();
    expect(lastCall[0].data.didFallback).toBe(false);
  });
});

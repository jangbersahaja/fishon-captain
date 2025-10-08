import { beforeAll, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ||= "postgres://user:pass@localhost:5432/testdb";
process.env.NEXTAUTH_SECRET ||= "test-secret";

// Mock next-auth session
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: "user-123" } }),
}));

// Spy prisma create
const createSpy = vi
  .fn()
  .mockImplementation((args) => ({ id: "vid-test", ...args.data }));

vi.mock("@/lib/prisma", () => ({
  prisma: { captainVideo: { create: createSpy } },
}));

// Mock fluent-ffmpeg to simulate ffprobe fallback when width/height missing
vi.mock("fluent-ffmpeg", () => {
  const mock = function () {
    return mock;
  } as unknown as {
    (url: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any
    setFfmpegPath?: (p: string) => void;
    ffprobe: (cb: (err: unknown, data: any) => void) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  mock.ffprobe = (cb) => {
    cb(null, {
      streams: [
        { codec_type: "video", width: 640, height: 360 },
        { codec_type: "audio" },
      ],
      format: { duration: 18.42 },
    });
  };
  return { __esModule: true, default: mock };
});

let finishHandler: unknown;
beforeAll(async () => {
  const mod = await import("../../app/api/blob/finish/route");
  finishHandler = mod.POST;
});

describe("/api/blob/finish bypass logic", () => {
  it("bypasses when metadata provided and within limits", async () => {
    const form = new FormData();
    form.append("videoUrl", "https://example.com/video-a.mp4");
    form.append("startSec", "0");
    form.append("endSec", "15");
    form.append("width", "640");
    form.append("height", "360");
    form.append("originalDurationSec", "15");
    form.append("ownerId", "user-123");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: Response = await (finishHandler as any)(
      new Request("http://test/finish", { method: "POST", body: form })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.video.processStatus).toBe("ready");
  });

  it("falls back to full duration when endSec missing but originalDurationSec <=30s", async () => {
    const form = new FormData();
    form.append("videoUrl", "https://example.com/video-b.mp4");
    form.append("startSec", "0");
    form.append("originalDurationSec", "18");
    // omit width/height to trigger ffprobe mock
    form.append("ownerId", "user-123");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: Response = await (finishHandler as any)(
      new Request("http://test/finish", { method: "POST", body: form })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.video.processStatus).toBe("ready");
    // Ensure create captured processedDurationSec reflecting fallback selection
    const call = createSpy.mock.calls[createSpy.mock.calls.length - 1];
    expect(call && call[0].data.processedDurationSec).toBeCloseTo(18, 1);
  });

  it("requires normalization when duration >30s (metadata provided)", async () => {
    const form = new FormData();
    form.append("videoUrl", "https://example.com/video-c.mp4");
    form.append("startSec", "0");
    form.append("endSec", "45");
    form.append("width", "640");
    form.append("height", "360");
    form.append("originalDurationSec", "45");
    form.append("ownerId", "user-123");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: Response = await (finishHandler as any)(
      new Request("http://test/finish", { method: "POST", body: form })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    // No external worker in test env -> shouldNormalize false => ready (document this behavior)
    // Because hasExternalWorker=false, even though over 30s we cannot normalize here.
    // We assert that should have been marked queued if worker existed; simulate by setting env and re-running.
    expect(json.video.processStatus).toBe("ready");
  });

  it("marks queued when over 30s and worker configured", async () => {
    process.env.EXTERNAL_WORKER_URL = "https://worker.example.com";
    const form = new FormData();
    form.append("videoUrl", "https://example.com/video-d.mp4");
    form.append("startSec", "0");
    form.append("endSec", "45");
    form.append("width", "640");
    form.append("height", "360");
    form.append("originalDurationSec", "45");
    form.append("ownerId", "user-123");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: Response = await (finishHandler as any)(
      new Request("http://test/finish", { method: "POST", body: form })
    );
    const json = await res.json();
    expect(json.video.processStatus).toBe("queued");
    delete process.env.EXTERNAL_WORKER_URL;
  });
});

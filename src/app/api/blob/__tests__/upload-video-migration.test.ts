/**
 * @file upload-video-migration.test.ts
 * Tests for Phase 2C: Blob upload migration to dual pipeline (legacy + CaptainVideo)
 */

import { counter } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../upload/route";

// Mock dependencies
vi.mock("next-auth");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    charterMedia: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    captainVideo: {
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/metrics", () => ({
  counter: vi.fn(() => ({ inc: vi.fn() })),
}));
vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

describe("POST /api/blob/upload - Phase 2C Video Migration", () => {
  const mockUserId = "user-123";
  const mockCharterId = "charter-456";
  const mockVideoUrl = "https://blob.vercel-storage.com/video-abc123.mp4";
  const mockBlobKey = "temp/charter-456/original/test-video.mp4";
  const mockCaptainVideoId = "captain-video-789";

  beforeEach(() => {
    vi.clearAllMocks();

    // Set required environment variables
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";

    // Mock session
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    // Mock blob upload
    vi.mocked(put).mockResolvedValue({
      url: mockVideoUrl,
    } as any);

    // Mock Prisma responses
    vi.mocked(prisma.charterMedia.aggregate).mockResolvedValue({
      _max: { sortOrder: 5 },
    } as any);

    vi.mocked(prisma.charterMedia.create).mockResolvedValue({
      id: "charter-media-123",
      charterId: mockCharterId,
      kind: "CHARTER_VIDEO",
      url: mockVideoUrl,
      storageKey: mockBlobKey,
      sortOrder: 6,
    } as any);

    vi.mocked(prisma.captainVideo.create).mockResolvedValue({
      id: mockCaptainVideoId,
      ownerId: mockUserId,
      originalUrl: mockVideoUrl,
      blobKey: mockBlobKey,
      processStatus: "queued",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Mock fetch for queue endpoints
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => "OK",
    } as any);
  });

  it("creates CaptainVideo record on video upload", async () => {
    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    // Verify CaptainVideo was created
    expect(prisma.captainVideo.create).toHaveBeenCalledWith({
      data: {
        ownerId: mockUserId,
        originalUrl: mockVideoUrl,
        blobKey: mockBlobKey,
        processStatus: "queued",
      },
    });

    // Verify metric was incremented
    expect(counter).toHaveBeenCalledWith("captain_video_created");
  });

  it("calls /api/videos/queue with videoId", async () => {
    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    await POST(request);

    // Verify new pipeline was called
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/videos/queue"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: mockCaptainVideoId }),
      })
    );

    // Verify metric was incremented
    expect(counter).toHaveBeenCalledWith("video_upload_new_pipeline_queued");
  });

  it("still creates CharterMedia for backward compatibility", async () => {
    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    await POST(request);

    // Verify CharterMedia still created (backward compatibility)
    expect(prisma.charterMedia.create).toHaveBeenCalledWith({
      data: {
        charterId: mockCharterId,
        kind: "CHARTER_VIDEO",
        url: mockVideoUrl,
        storageKey: mockBlobKey,
        sortOrder: 6,
      },
    });
  });

  it("still calls legacy /api/jobs/transcode (dual mode)", async () => {
    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    await POST(request);

    // Verify legacy transcode endpoint was called
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs/transcode"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining(mockBlobKey),
      })
    );

    // Verify legacy metric was incremented
    expect(counter).toHaveBeenCalledWith("video_transcode_jobs_queued");
  });

  it("handles CaptainVideo creation failure gracefully", async () => {
    // Mock CaptainVideo creation to fail
    vi.mocked(prisma.captainVideo.create).mockRejectedValue(
      new Error("Database error")
    );

    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    // Upload should still succeed (fallback to legacy)
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    // Verify error metric was incremented
    expect(counter).toHaveBeenCalledWith("captain_video_create_fail");

    // Verify legacy pipeline still called
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs/transcode"),
      expect.anything()
    );
  });

  it("handles /api/videos/queue call failure gracefully", async () => {
    // Mock queue endpoint to fail
    vi.mocked(fetch).mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/api/videos/queue")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "Internal Server Error",
        } as any);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as any);
    });

    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    // Upload should still succeed (fallback to legacy)
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    // Verify failure metric was incremented
    expect(counter).toHaveBeenCalledWith(
      "video_upload_new_pipeline_queue_fail"
    );

    // Verify legacy pipeline still called as backup
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs/transcode"),
      expect.anything()
    );
  });

  it("passes captainVideoId to legacy transcode for correlation", async () => {
    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    await POST(request);

    // Find the legacy transcode call
    const legacyCall = vi
      .mocked(fetch)
      .mock.calls.find(
        (call) =>
          typeof call[0] === "string" && call[0].includes("/api/jobs/transcode")
      );

    expect(legacyCall).toBeDefined();
    const legacyBody = JSON.parse(legacyCall![1]!.body as string);
    expect(legacyBody.captainVideoId).toBe(mockCaptainVideoId);
  });

  it("validates videoId is created before queue call", async () => {
    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    await POST(request);

    // Verify CaptainVideo.create called before /api/videos/queue
    const createCallOrder = vi.mocked(prisma.captainVideo.create).mock
      .invocationCallOrder[0];
    const queueCallOrder = vi
      .mocked(fetch)
      .mock.calls.findIndex(
        (call) =>
          typeof call[0] === "string" && call[0].includes("/api/videos/queue")
      );

    expect(createCallOrder).toBeLessThan(queueCallOrder);
  });

  it("logs migration events for monitoring", async () => {
    const consoleLogSpy = vi.spyOn(console, "log");

    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    await POST(request);

    // Verify logging for CaptainVideo creation
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Created CaptainVideo"),
      expect.stringContaining(mockCaptainVideoId)
    );

    // Verify logging for new pipeline queue
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Queued CaptainVideo"),
      expect.stringContaining("new pipeline")
    );

    consoleLogSpy.mockRestore();
  });

  it("does not process non-video files through new pipeline", async () => {
    const formData = new FormData();
    const imageFile = new File(["image content"], "test.jpg", {
      type: "image/jpeg",
    });
    formData.append("file", imageFile);
    formData.append("docType", "charter_media");
    formData.append("charterId", mockCharterId);

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    // Verify CaptainVideo was NOT created for images
    expect(prisma.captainVideo.create).not.toHaveBeenCalled();

    // Verify queue endpoints were NOT called for images
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles various video formats (mp4, mov, webm)", async () => {
    const formats = ["test.mp4", "test.mov", "test.webm"];

    for (const filename of formats) {
      vi.clearAllMocks();

      const formData = new FormData();
      const videoFile = new File(["video content"], filename, {
        type: `video/${filename.split(".")[1]}`,
      });
      formData.append("file", videoFile);
      formData.append("docType", "charter_media");
      formData.append("charterId", mockCharterId);

      const request = new Request("http://localhost:3000/api/blob/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(prisma.captainVideo.create).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/videos/queue"),
        expect.anything()
      );
    }
  });

  it("requires charterId for video uploads", async () => {
    const formData = new FormData();
    const videoFile = new File(["video content"], "test.mp4", {
      type: "video/mp4",
    });
    formData.append("file", videoFile);
    formData.append("docType", "charter_media");
    // No charterId provided

    const request = new Request("http://localhost:3000/api/blob/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    // Should reject video without charterId
    expect(response.status).toBe(400);
    expect(data.error).toBe("video_requires_charterId");

    // Should not create any records
    expect(prisma.captainVideo.create).not.toHaveBeenCalled();
    expect(prisma.charterMedia.create).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import {
  CreateUploadSchema,
  FinishFormSchema,
  ListQuerySchema,
  ProcessStatusEnum,
  TranscodePayloadSchema,
  validateThumbFile,
  isValidVideoFile,
} from "../video";

describe("Video Schemas", () => {
  describe("ProcessStatusEnum", () => {
    it("should accept valid status values", () => {
      expect(ProcessStatusEnum.safeParse("queued").success).toBe(true);
      expect(ProcessStatusEnum.safeParse("processing").success).toBe(true);
      expect(ProcessStatusEnum.safeParse("ready").success).toBe(true);
      expect(ProcessStatusEnum.safeParse("failed").success).toBe(true);
    });

    it("should reject invalid status values", () => {
      expect(ProcessStatusEnum.safeParse("invalid").success).toBe(false);
      expect(ProcessStatusEnum.safeParse("").success).toBe(false);
    });
  });

  describe("CreateUploadSchema", () => {
    it("should accept valid upload creation data", () => {
      const validData = {
        fileName: "test-video.mp4",
        fileType: "video/mp4",
      };
      const result = CreateUploadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept empty file type (mobile fallback)", () => {
      const validData = {
        fileName: "test-video.mp4",
        fileType: "",
      };
      const result = CreateUploadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept application/octet-stream (mobile fallback)", () => {
      const validData = {
        fileName: "test-video.mp4",
        fileType: "application/octet-stream",
      };
      const result = CreateUploadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept various video MIME types", () => {
      const mimeTypes = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp"];
      mimeTypes.forEach(fileType => {
        const result = CreateUploadSchema.safeParse({
          fileName: "test-video.mp4",
          fileType,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid file type", () => {
      const invalidData = {
        fileName: "test-file.jpg",
        fileType: "image/jpeg",
      };
      const result = CreateUploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty file name", () => {
      const invalidData = {
        fileName: "",
        fileType: "video/mp4",
      };
      const result = CreateUploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("FinishFormSchema", () => {
    it("should accept valid finish data", () => {
      const validData = {
        videoUrl: "https://example.com/video.mp4",
        startSec: 0,
        endSec: 30,
        width: 1920,
        height: 1080,
        originalDurationSec: 60,
        ownerId: "user123",
        didFallback: false,
      };
      const result = FinishFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept minimal valid data", () => {
      const minimalData = {
        videoUrl: "https://example.com/video.mp4",
        startSec: 5,
        ownerId: "user123",
      };
      const result = FinishFormSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL", () => {
      const invalidData = {
        videoUrl: "not-a-url",
        startSec: 0,
        ownerId: "user123",
      };
      const result = FinishFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject negative startSec", () => {
      const invalidData = {
        videoUrl: "https://example.com/video.mp4",
        startSec: -5,
        ownerId: "user123",
      };
      const result = FinishFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("TranscodePayloadSchema", () => {
    it("should accept valid transcode payload", () => {
      const validData = {
        videoUrl: "https://example.com/video.mp4",
        startSec: 10,
        videoId: "vid123",
      };
      const result = TranscodePayloadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject missing videoId", () => {
      const invalidData = {
        videoUrl: "https://example.com/video.mp4",
        startSec: 10,
      };
      const result = TranscodePayloadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("ListQuerySchema", () => {
    it("should accept valid owner ID", () => {
      const validData = { ownerId: "user123" };
      const result = ListQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty owner ID", () => {
      const invalidData = { ownerId: "" };
      const result = ListQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("validateThumbFile", () => {
    it("should accept valid JPEG thumbnail", () => {
      const file = new File(["content"], "thumb.jpg", {
        type: "image/jpeg",
      });
      Object.defineProperty(file, "size", { value: 1024 * 1024 }); // 1MB
      expect(validateThumbFile(file)).toBe(true);
    });

    it("should accept valid WEBP thumbnail", () => {
      const file = new File(["content"], "thumb.webp", {
        type: "image/webp",
      });
      Object.defineProperty(file, "size", { value: 1024 * 1024 }); // 1MB
      expect(validateThumbFile(file)).toBe(true);
    });

    it("should reject file over 2MB", () => {
      const file = new File(["content"], "thumb.jpg", {
        type: "image/jpeg",
      });
      Object.defineProperty(file, "size", { value: 3 * 1024 * 1024 }); // 3MB
      expect(validateThumbFile(file)).toBe(false);
    });

    it("should reject invalid MIME type", () => {
      const file = new File(["content"], "thumb.png", { type: "image/png" });
      Object.defineProperty(file, "size", { value: 1024 * 1024 });
      expect(validateThumbFile(file)).toBe(false);
    });
  });

  describe("isValidVideoFile", () => {
    it("should accept video with proper MIME type", () => {
      const file = new File(["content"], "video.mp4", { type: "video/mp4" });
      expect(isValidVideoFile(file)).toBe(true);
    });

    it("should accept video with quicktime MIME type", () => {
      const file = new File(["content"], "video.mov", { type: "video/quicktime" });
      expect(isValidVideoFile(file)).toBe(true);
    });

    it("should accept video with 3gpp MIME type (Android)", () => {
      const file = new File(["content"], "video.3gp", { type: "video/3gpp" });
      expect(isValidVideoFile(file)).toBe(true);
    });

    it("should accept video with empty MIME type (fallback to extension)", () => {
      const file = new File(["content"], "video.mp4", { type: "" });
      expect(isValidVideoFile(file)).toBe(true);
    });

    it("should accept video with application/octet-stream (mobile fallback)", () => {
      const file = new File(["content"], "video.mp4", { type: "application/octet-stream" });
      expect(isValidVideoFile(file)).toBe(true);
    });

    it("should accept various video extensions", () => {
      const extensions = ["mp4", "mov", "webm", "3gp", "m4v", "avi", "mkv"];
      extensions.forEach(ext => {
        const file = new File(["content"], `video.${ext}`, { type: "" });
        expect(isValidVideoFile(file)).toBe(true);
      });
    });

    it("should reject non-video MIME type with non-video extension", () => {
      const file = new File(["content"], "image.jpg", { type: "image/jpeg" });
      expect(isValidVideoFile(file)).toBe(false);
    });

    it("should reject file with no extension and no video MIME type", () => {
      const file = new File(["content"], "videofile", { type: "" });
      expect(isValidVideoFile(file)).toBe(false);
    });

    it("should accept mobile-specific formats", () => {
      // iOS m4v format
      const m4vFile = new File(["content"], "video.m4v", { type: "" });
      expect(isValidVideoFile(m4vFile)).toBe(true);

      // Android 3gpp format
      const threegpFile = new File(["content"], "video.3gpp", { type: "video/3gpp" });
      expect(isValidVideoFile(threegpFile)).toBe(true);
    });

    it("should accept video extension even with wrong MIME type (mobile edge case)", () => {
      // Some mobile browsers may misreport MIME types
      const file = new File(["content"], "video.mp4", { type: "audio/mpeg" });
      expect(isValidVideoFile(file)).toBe(true);
    });
  });
});

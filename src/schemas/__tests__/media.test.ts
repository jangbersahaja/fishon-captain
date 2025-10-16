import { describe, expect, it } from "vitest";
import {
  FinalizeMediaSchema,
  IncomingMediaSchema,
  MediaFileSchema,
  MediaRemovalSchema,
  normalizeFinalizeMedia,
} from "../media";

describe("Media Schemas", () => {
  describe("MediaFileSchema", () => {
    it("should accept valid media file with simple filename", () => {
      const validData = {
        name: "photo.jpg",
        url: "https://example.com/photo.jpg",
      };
      const result = MediaFileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept valid media file with charter path", () => {
      const validData = {
        name: "charters/abc123/media/photo.jpg",
        url: "https://example.com/photo.jpg",
        sizeBytes: 1024000,
        width: 1920,
        height: 1080,
      };
      const result = MediaFileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept captain avatar path", () => {
      const validData = {
        name: "captains/user123/avatar/profile.jpg",
        url: "https://example.com/avatar.jpg",
      };
      const result = MediaFileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid path pattern", () => {
      const invalidData = {
        name: "invalid/path/structure.jpg",
        url: "https://example.com/photo.jpg",
      };
      const result = MediaFileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject file size over limit", () => {
      const invalidData = {
        name: "photo.jpg",
        url: "https://example.com/photo.jpg",
        sizeBytes: 300 * 1024 * 1024, // 300MB > 200MB limit
      };
      const result = MediaFileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid URL", () => {
      const invalidData = {
        name: "photo.jpg",
        url: "not-a-url",
      };
      const result = MediaFileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("FinalizeMediaSchema", () => {
    it("should accept valid finalize media payload", () => {
      const validData = {
        media: {
          images: [
            {
              name: "charters/abc123/media/photo1.jpg",
              url: "https://example.com/photo1.jpg",
            },
            {
              name: "charters/abc123/media/photo2.jpg",
              url: "https://example.com/photo2.jpg",
            },
          ],
          videos: [
            {
              name: "charters/abc123/media/video1.mp4",
              url: "https://example.com/video1.mp4",
            },
          ],
          imagesOrder: [0, 1],
          imagesCoverIndex: 0,
          avatar: null,
        },
      };
      const result = FinalizeMediaSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept empty images array", () => {
      const validData = {
        media: {
          images: [],
          videos: [],
          avatar: null,
        },
      };
      const result = FinalizeMediaSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject over 20 images", () => {
      const images = Array.from({ length: 21 }, (_, i) => ({
        name: `photo${i}.jpg`,
        url: `https://example.com/photo${i}.jpg`,
      }));
      const invalidData = {
        media: {
          images,
          videos: [],
          avatar: null,
        },
      };
      const result = FinalizeMediaSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject over 5 videos", () => {
      const videos = Array.from({ length: 6 }, (_, i) => ({
        name: `video${i}.mp4`,
        url: `https://example.com/video${i}.mp4`,
      }));
      const invalidData = {
        media: {
          images: [],
          videos,
          avatar: null,
        },
      };
      const result = FinalizeMediaSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("IncomingMediaSchema", () => {
    it("should accept valid incoming media update", () => {
      const validData = {
        media: {
          images: [
            {
              name: "photo1.jpg",
              url: "https://example.com/photo1.jpg",
              thumbnailUrl: "https://example.com/thumb1.jpg",
            },
          ],
          videos: [],
        },
        order: {
          images: [0],
        },
      };
      const result = IncomingMediaSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept deleteKeys", () => {
      const validData = {
        media: {
          images: [],
          videos: [],
          deleteKeys: ["old-key-1", "old-key-2"],
        },
        deleteKeys: ["another-key"],
      };
      const result = IncomingMediaSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("MediaRemovalSchema", () => {
    it("should accept mediaId", () => {
      const validData = { mediaId: "media123" };
      const result = MediaRemovalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept storageKey", () => {
      const validData = { storageKey: "charters/123/media/photo.jpg" };
      const result = MediaRemovalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept both", () => {
      const validData = {
        mediaId: "media123",
        storageKey: "charters/123/media/photo.jpg",
      };
      const result = MediaRemovalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept empty object (both optional)", () => {
      const validData = {};
      const result = MediaRemovalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("normalizeFinalizeMedia", () => {
    it("should normalize valid media payload", () => {
      const raw = {
        images: [{ name: "photo.jpg", url: "https://example.com/photo.jpg" }],
        videos: [],
        imagesOrder: [0],
        imagesCoverIndex: 0,
        avatar: { name: "avatar.jpg", url: "https://example.com/avatar.jpg" },
      };
      const result = normalizeFinalizeMedia(raw);
      expect(result).toEqual({
        images: [{ name: "photo.jpg", url: "https://example.com/photo.jpg" }],
        videos: [],
        imagesOrder: [0],
        imagesCoverIndex: 0,
        avatar: { name: "avatar.jpg", url: "https://example.com/avatar.jpg" },
        videosOrder: undefined,
        videosCoverIndex: undefined,
      });
    });

    it("should return null for invalid input", () => {
      expect(normalizeFinalizeMedia(null)).toBe(null);
      expect(normalizeFinalizeMedia(undefined)).toBe(null);
      expect(normalizeFinalizeMedia("string")).toBe(null);
    });

    it("should handle missing optional fields", () => {
      const raw = {
        images: [],
        videos: [],
      };
      const result = normalizeFinalizeMedia(raw);
      expect(result).toEqual({
        images: [],
        videos: [],
        imagesOrder: undefined,
        videosOrder: undefined,
        imagesCoverIndex: undefined,
        videosCoverIndex: undefined,
        avatar: null,
      });
    });
  });
});

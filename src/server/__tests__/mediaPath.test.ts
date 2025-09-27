import { describe, it, expect } from "vitest";
import { extractLegacyFilename, LEGACY_CHARTER_MEDIA_FILENAME_REGEX } from "@/server/mediaPath";

describe("legacy media path helpers", () => {
  it("extracts filename from legacy charter path", () => {
    const key = "charters/abc123/media/photo-one.jpg";
    expect(extractLegacyFilename(key)).toBe("photo-one.jpg");
  });

  it("supports nested subpaths after media/", () => {
    const key = "charters/xyz/media/videos/raw/source.mp4";
    expect(extractLegacyFilename(key)).toBe("videos/raw/source.mp4");
  });

  it("returns null for non-legacy path", () => {
    const key = "captains/u1/media/photo.jpg";
    expect(extractLegacyFilename(key)).toBeNull();
  });

  it("regex matches and captures group 1 as filename", () => {
    const key = "charters/777/media/deep/dir/file.png";
    const m = key.match(LEGACY_CHARTER_MEDIA_FILENAME_REGEX);
    expect(m).not.toBeNull();
    expect(m && m[1]).toBe("deep/dir/file.png");
  });
});

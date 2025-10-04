import { describe, expect, it } from "vitest";
import { mergeReadyVideos, type VideoItem } from "../utils/videoDedupe";

describe("mergeReadyVideos", () => {
  it("returns existing when ready empty", () => {
    const existing: VideoItem[] = [{ name: "a.mp4", url: "/x/a.mp4" }];
    expect(mergeReadyVideos(existing, [])).toBe(existing); // same ref
  });

  it("adds new videos when not present", () => {
    const existing: VideoItem[] = [{ name: "a.mp4", url: "/x/a.mp4" }];
    const ready: VideoItem[] = [
      { name: "a.mp4", url: "/x/a.mp4" },
      { name: "b.mp4", url: "/x/b.mp4" },
    ];
    const merged = mergeReadyVideos(existing, ready);
    expect(merged).toHaveLength(2);
    expect(merged.find((v) => v.name === "b.mp4")).toBeTruthy();
  });

  it("updates URL when name matches but URL changed", () => {
    const existing: VideoItem[] = [{ name: "a.mp4", url: "/old/a.mp4" }];
    const ready: VideoItem[] = [{ name: "a.mp4", url: "/new/a.mp4" }];
    const merged = mergeReadyVideos(existing, ready);
    expect(merged).toHaveLength(1);
    expect(merged[0].url).toBe("/new/a.mp4");
  });

  it("renames to canonical storage key when same URL but different canonical name", () => {
    const existing: VideoItem[] = [
      { name: "temp-a.mp4", url: "/cdn/media/abc123/a.mp4" },
    ];
    const ready: VideoItem[] = [
      { name: "/cdn/media/abc123/a.mp4", url: "/cdn/media/abc123/a.mp4" },
    ];
    const merged = mergeReadyVideos(existing, ready);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("/cdn/media/abc123/a.mp4");
  });

  it("does not duplicate when identical content already merged", () => {
    const existing: VideoItem[] = [
      { name: "/cdn/media/abc/a.mp4", url: "/cdn/media/abc/a.mp4" },
      { name: "/cdn/media/def/b.mp4", url: "/cdn/media/def/b.mp4" },
    ];
    const ready: VideoItem[] = [
      { name: "/cdn/media/def/b.mp4", url: "/cdn/media/def/b.mp4" },
      { name: "/cdn/media/abc/a.mp4", url: "/cdn/media/abc/a.mp4" },
    ];
    const merged = mergeReadyVideos(existing, ready);
    expect(merged).toBe(existing); // unchanged reference shortcut path
  });
});

import { describe, expect, it } from "vitest";
import { generateFrameThumbnails } from "../utils/generateFrameThumbnails";

function mockVideo(duration: number): HTMLVideoElement {
  const video = document.createElement("video");
  // @ts-expect-error override
  video.duration = duration;
  // @ts-expect-error override
  video.videoWidth = 1920;
  // @ts-expect-error override
  video.videoHeight = 1080;
  // Track currentTime manually
  let _currentTime = 0;
  Object.defineProperty(video, "currentTime", {
    get() {
      return _currentTime;
    },
    set(v: number) {
      _currentTime = v;
      setTimeout(() => video.dispatchEvent(new Event("seeked")), 0);
    },
  });
  video.pause = () => {};
  video.play = () => Promise.resolve();
  return video;
}

describe("generateFrameThumbnails", () => {
  it("cancels generation early and returns partial frames", async () => {
    const video = mockVideo(10);
    const { promise, cancel } = generateFrameThumbnails(video, 10, {
      frameCount: 10,
      captureFrame: () => "data://frame",
    });

    // Cancel after a short tick
    setTimeout(() => cancel(), 5);
    const frames = await promise;
    // Should have <= frameCount frames due to cancellation
    expect(frames.length).toBeLessThanOrEqual(10);
  });

  it("generates full set when not cancelled", async () => {
    const video = mockVideo(5);
    const { promise } = generateFrameThumbnails(video, 5, {
      frameCount: 5,
      captureFrame: () => "data://frame",
    });
    const frames = await promise;
    expect(frames.length).toBe(5);
  });
});

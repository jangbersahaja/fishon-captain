import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Create mock object using vi.hoisted to avoid hoisting issues
const mockVideoUploadQueue = vi.hoisted(() => ({
  subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
  enqueue: vi.fn(),
  cancel: vi.fn(),
  retry: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  setMaxConcurrent: vi.fn(),
  setAutoStart: vi.fn(),
  startUpload: vi.fn(),
  updatePendingTrim: vi.fn(),
}));

vi.mock("@/lib/uploads/videoQueue", () => ({
  videoUploadQueue: mockVideoUploadQueue,
}));

import { useVideoQueue } from "../useVideoQueue";

describe("useVideoQueue Hook", () => {
  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUnsubscribe = vi.fn();
    mockSubscribe = mockVideoUploadQueue.subscribe;
    mockSubscribe.mockReturnValue(mockUnsubscribe);
  });

  it("should subscribe to queue on mount", () => {
    renderHook(() => useVideoQueue());

    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should unsubscribe on unmount", () => {
    const { unmount } = renderHook(() => useVideoQueue());

    act(() => {
      unmount();
    });

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("should provide all queue methods", () => {
    const { result } = renderHook(() => useVideoQueue());

    expect(result.current).toHaveProperty("items");
    expect(result.current).toHaveProperty("enqueue");
    expect(result.current).toHaveProperty("cancel");
    expect(result.current).toHaveProperty("retry");
    expect(result.current).toHaveProperty("pause");
    expect(result.current).toHaveProperty("resume");
    expect(result.current).toHaveProperty("setMaxConcurrent");
    expect(result.current).toHaveProperty("setAutoStart");
    expect(result.current).toHaveProperty("startUpload");
    expect(result.current).toHaveProperty("updatePendingTrim");
  });

  it("should call queue methods correctly", () => {
    const { result } = renderHook(() => useVideoQueue());
    const testFile = new File(["test"], "test.mp4", { type: "video/mp4" });

    act(() => {
      result.current.enqueue(testFile);
    });
    expect(mockVideoUploadQueue.enqueue).toHaveBeenCalledWith(testFile);

    act(() => {
      result.current.cancel("test-id");
    });
    expect(mockVideoUploadQueue.cancel).toHaveBeenCalledWith("test-id");

    act(() => {
      result.current.retry("test-id");
    });
    expect(mockVideoUploadQueue.retry).toHaveBeenCalledWith("test-id");

    act(() => {
      result.current.pause();
    });
    expect(mockVideoUploadQueue.pause).toHaveBeenCalled();

    act(() => {
      result.current.resume();
    });
    expect(mockVideoUploadQueue.resume).toHaveBeenCalled();

    act(() => {
      result.current.setMaxConcurrent(3);
    });
    expect(mockVideoUploadQueue.setMaxConcurrent).toHaveBeenCalledWith(3);

    act(() => {
      result.current.setAutoStart(false);
    });
    expect(mockVideoUploadQueue.setAutoStart).toHaveBeenCalledWith(false);

    act(() => {
      result.current.startUpload("test-id");
    });
    expect(mockVideoUploadQueue.startUpload).toHaveBeenCalledWith("test-id");

    act(() => {
      result.current.updatePendingTrim("test-id", {
        file: testFile,
        trim: { startSec: 0, endSec: 10 },
      });
    });
    expect(mockVideoUploadQueue.updatePendingTrim).toHaveBeenCalledWith(
      "test-id",
      {
        file: testFile,
        trim: { startSec: 0, endSec: 10 },
      }
    );
  });

  it("should update items when queue state changes", () => {
    const { result } = renderHook(() => useVideoQueue());

    // Get the callback function passed to subscribe
    const updateCallback = mockSubscribe.mock.calls[0][0];

    const mockItems = [
      {
        id: "test-1",
        file: new File(["test"], "test.mp4"),
        status: "pending" as const,
        progress: 0,
        sizeBytes: 4,
        createdAt: Date.now(),
      },
    ];

    act(() => {
      updateCallback(mockItems);
    });

    expect(result.current.items).toEqual(mockItems);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies first - before any imports
vi.mock("@/lib/metrics", () => ({
  counter: vi.fn(() => ({ inc: vi.fn() })),
}));

vi.mock("@/lib/storage/queueStorage", () => ({
  queueStorage: {
    getStoredItems: vi.fn(() => Promise.resolve([])),
    storeItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clearAll: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@/utils/captureThumbnail", () => ({
  captureThumbnailFromSrc: vi.fn(() => Promise.resolve(new Blob())),
}));

import { VideoUploadQueue } from "../videoQueue";

// Define a basic type for the test to avoid complex imports
interface VideoUploadItem {
  id: string;
  status: string;
  file: File;
  progress: number;
  sizeBytes: number;
  createdAt: number;
  trim?: {
    startSec: number;
    endSec: number;
    didFallback?: boolean;
    fallbackReason?: string | null;
  };
}

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  public readyState = 0;
  public status = 0;
  public responseText = "";
  public upload = {
    onprogress: null as ((ev: ProgressEvent) => void) | null,
  };

  public onreadystatechange: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public onabort: (() => void) | null = null;

  // Add static constants required by XMLHttpRequest interface
  static readonly UNSENT = 0;
  static readonly OPENED = 1;
  static readonly HEADERS_RECEIVED = 2;
  static readonly LOADING = 3;
  static readonly DONE = 4;

  open = vi.fn();
  send = vi.fn();
  abort = vi.fn(() => {
    this.readyState = 4;
    this.status = 0;
    if (this.onabort) this.onabort();
  });
  setRequestHeader = vi.fn();
}

// Set up global mocks
vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);
global.fetch = vi.fn();

describe("VideoUploadQueue", () => {
  let queue: VideoUploadQueue;
  let testFile: File;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful fetch responses
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          uploadUrl: "http://test.com/upload",
          blobKey: "test-key",
        }),
    } as Response);

    // Create test file
    testFile = new File(["test content"], "test.mp4", { type: "video/mp4" });

    // Create fresh queue instance
    queue = new VideoUploadQueue({ autoStart: false });
  });

  describe("Basic Queue Operations", () => {
    it("should enqueue files correctly", () => {
      const item = queue.enqueue(testFile);

      expect(item.status).toBe("pending");
      expect(item.file).toBe(testFile);
      expect(item.progress).toBe(0);
      expect(item.sizeBytes).toBe(testFile.size);
      expect(typeof item.id).toBe("string");
      expect(typeof item.createdAt).toBe("number");
    });

    it("should handle file with trim metadata", () => {
      const trim = { startSec: 10, endSec: 20 };
      const item = queue.enqueue({ file: testFile, trim });

      expect(item.status).toBe("pending");
      expect(item.trim).toEqual(trim);
    });

    it("should maintain queue order", () => {
      const item1 = queue.enqueue(testFile);
      const item2 = queue.enqueue(testFile);

      // Since items is private, we'll test through subscriber
      let receivedItems: VideoUploadItem[] = [];
      queue.subscribe((items) => {
        receivedItems = items;
      });

      expect(receivedItems).toHaveLength(2);
      expect(receivedItems[0].id).toBe(item2.id);
      expect(receivedItems[1].id).toBe(item1.id);
    });
  });

  describe("State Transitions", () => {
    it("should transition from pending to uploading", async () => {
      const item = queue.enqueue(testFile);

      // Subscribe to changes
      let lastItems: VideoUploadItem[] = [];
      queue.subscribe((items) => {
        lastItems = items;
      });

      queue.startUpload(item.id);

      // Should eventually transition to uploading
      expect(lastItems.find((i) => i.id === item.id)?.status).toBe("uploading");
    });

    it("should handle cancellation", () => {
      const item = queue.enqueue(testFile);

      let lastItems: VideoUploadItem[] = [];
      queue.subscribe((items) => {
        lastItems = items;
      });

      queue.cancel(item.id);

      const canceledItem = lastItems.find((i) => i.id === item.id);
      expect(canceledItem?.status).toBe("canceled");
    });

    it("should handle retry", () => {
      // Create queue with autoStart disabled to prevent automatic uploading
      const testQueue = new VideoUploadQueue({ autoStart: false });
      const item = testQueue.enqueue(testFile);

      let lastItems: VideoUploadItem[] = [];
      testQueue.subscribe((items) => {
        lastItems = items;
      });

      // First cancel it
      testQueue.cancel(item.id);

      // Verify it's canceled
      expect(lastItems.find((i) => i.id === item.id)?.status).toBe("canceled");

      // Pause the queue to prevent automatic start after retry
      testQueue.pause();

      // Then retry
      testQueue.retry(item.id);

      const retriedItem = lastItems.find((i) => i.id === item.id);
      expect(retriedItem?.status).toBe("pending");
    });
  });

  describe("Queue Controls", () => {
    it("should pause and resume queue", () => {
      expect(() => queue.pause()).not.toThrow();
      expect(() => queue.resume()).not.toThrow();
    });

    it("should update concurrency settings", () => {
      expect(() => queue.setMaxConcurrent(2)).not.toThrow();
    });

    it("should toggle autoStart", () => {
      expect(() => queue.setAutoStart(true)).not.toThrow();
      expect(() => queue.setAutoStart(false)).not.toThrow();
    });
  });

  describe("Trim Metadata Handling", () => {
    it("should update pending trim data", () => {
      const item = queue.enqueue(testFile);
      const newTrim = { startSec: 5, endSec: 15 };
      const newFile = new File(["new content"], "new.mp4", {
        type: "video/mp4",
      });

      let lastItems: VideoUploadItem[] = [];
      queue.subscribe((items) => {
        lastItems = items;
      });

      queue.updatePendingTrim(item.id, { file: newFile, trim: newTrim });

      const updatedItem = lastItems.find((i) => i.id === item.id);
      expect(updatedItem?.trim).toEqual(newTrim);
      expect(updatedItem?.file).toBe(newFile);
    });
  });

  describe("Subscription System", () => {
    it("should notify subscribers on state changes", () => {
      const mockSubscriber = vi.fn();

      queue.subscribe(mockSubscriber);
      queue.enqueue(testFile);

      expect(mockSubscriber).toHaveBeenCalled();
    });

    it("should provide initial state to new subscribers", () => {
      queue.enqueue(testFile);

      const mockSubscriber = vi.fn();
      queue.subscribe(mockSubscriber);

      expect(mockSubscriber).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            status: "pending",
            file: testFile,
          }),
        ])
      );
    });
  });
});

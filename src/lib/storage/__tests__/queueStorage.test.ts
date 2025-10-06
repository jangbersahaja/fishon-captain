/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queueStorage } from "../queueStorage";

// Mock variables with proper typing
let mockStore: {
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  createIndex: ReturnType<typeof vi.fn>;
  index: ReturnType<typeof vi.fn>;
  openCursor: ReturnType<typeof vi.fn>;
};

let mockTransaction: {
  objectStore: ReturnType<typeof vi.fn>;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
};

let mockDB: {
  transaction: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  objectStoreNames: {
    contains: ReturnType<typeof vi.fn>;
  };
  createObjectStore: ReturnType<typeof vi.fn>;
};

let mockRequest: {
  result: typeof mockDB;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onupgradeneeded: ((event: Event) => void) | null;
};

vi.hoisted(() => {
  // Initialize mock objects in hoisted context
  mockStore = {
    put: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    createIndex: vi.fn(),
    index: vi.fn(),
    openCursor: vi.fn(),
  };

  mockTransaction = {
    objectStore: vi.fn(() => mockStore),
    oncomplete: null,
    onerror: null,
  };

  mockDB = {
    transaction: vi.fn().mockReturnValue(mockTransaction),
    close: vi.fn(),
    objectStoreNames: {
      contains: vi.fn(),
    },
    createObjectStore: vi.fn(() => mockStore),
  };

  mockRequest = {
    result: mockDB,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  };

  // Mock global indexedDB
  global.indexedDB = {
    open: vi.fn(() => mockRequest),
    deleteDatabase: vi.fn(),
    databases: vi.fn(),
    cmp: vi.fn(),
  } as unknown as IDBFactory;
});

describe("QueueStorage", () => {
  let testFile: File;
  let testItem: {
    id: string;
    file: File;
    status: string;
    progress: number;
    url?: string;
    error?: string;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockStore.put.mockReturnValue({ onsuccess: null, onerror: null });
    mockStore.getAll.mockReturnValue({
      onsuccess: null,
      onerror: null,
      result: [],
    });
    mockStore.delete.mockReturnValue({ onsuccess: null, onerror: null });
    mockStore.clear.mockReturnValue({ onsuccess: null, onerror: null });

    testFile = new File(["test content"], "test.mp4", { type: "video/mp4" });
    testItem = {
      id: "test-123",
      file: testFile,
      status: "pending" as const,
      progress: 0,
      sizeBytes: 12,
      createdAt: Date.now(),
    };
  });

  describe("Initialization", () => {
    it("should initialize IndexedDB correctly", async () => {
      const initPromise = queueStorage.init();

      // Simulate successful opening
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess({ target: mockRequest } as any);
      }

      await expect(initPromise).resolves.toBeUndefined();
      expect(global.indexedDB.open).toHaveBeenCalledWith("video_queue_db", 1);
    });

    it("should handle database upgrade", async () => {
      const initPromise = queueStorage.init();

      // Simulate upgrade needed
      mockDB.objectStoreNames.contains.mockReturnValue(false);
      const createObjectStore = vi.fn(() => mockStore);
      mockDB.createObjectStore = createObjectStore;

      if (mockRequest.onupgradeneeded) {
        mockRequest.onupgradeneeded({ target: mockRequest } as any);
      }

      if (mockRequest.onsuccess) {
        mockRequest.onsuccess({ target: mockRequest } as any);
      }

      await initPromise;

      expect(createObjectStore).toHaveBeenCalledWith("queue_items", {
        keyPath: "id",
      });
      expect(mockStore.createIndex).toHaveBeenCalledWith("status", "status", {
        unique: false,
      });
      expect(mockStore.createIndex).toHaveBeenCalledWith(
        "createdAt",
        "createdAt",
        { unique: false }
      );
    });

    it("should handle initialization errors", async () => {
      const initPromise = queueStorage.init();

      // Simulate error
      if (mockRequest.onerror) {
        mockRequest.onerror(new Event("error"));
      }

      await expect(initPromise).rejects.toThrow("Failed to open IndexedDB");
    });
  });

  describe("Storage Operations", () => {
    it("should store items correctly", async () => {
      // Mock successful store operation
      const storeRequest = { onsuccess: null, onerror: null };
      mockStore.put.mockReturnValue(storeRequest);

      const storePromise = queueStorage.storeItem(testItem);

      // Simulate success
      if (storeRequest.onsuccess) {
        storeRequest.onsuccess(new Event("success"));
      }

      await expect(storePromise).resolves.toBeUndefined();
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-123",
          status: "pending",
          fileName: "test.mp4",
          fileType: "video/mp4",
          fileBuffer: expect.any(ArrayBuffer),
        })
      );
    });

    it("should handle store errors", async () => {
      const storeRequest = { onsuccess: null, onerror: null };
      mockStore.put.mockReturnValue(storeRequest);

      const storePromise = queueStorage.storeItem(testItem);

      // Simulate error
      if (storeRequest.onerror) {
        storeRequest.onerror(new Event("error"));
      }

      await expect(storePromise).rejects.toThrow("Failed to store queue item");
    });

    it("should retrieve stored items", async () => {
      const mockStoredItem = {
        id: "test-123",
        status: "pending",
        progress: 0,
        sizeBytes: 12,
        createdAt: Date.now(),
        fileName: "test.mp4",
        fileType: "video/mp4",
        fileBuffer: new ArrayBuffer(12),
      };

      const getAllRequest = {
        onsuccess: null,
        onerror: null,
        result: [mockStoredItem],
      };
      mockStore.getAll.mockReturnValue(getAllRequest);

      const getPromise = queueStorage.getStoredItems();

      // Simulate success
      if (getAllRequest.onsuccess) {
        getAllRequest.onsuccess(new Event("success"));
      }

      const result = await getPromise;

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "test-123",
        status: "pending",
        file: expect.any(File),
      });
      expect(result[0].file.name).toBe("test.mp4");
    });

    it("should remove items", async () => {
      const deleteRequest = { onsuccess: null, onerror: null };
      mockStore.delete.mockReturnValue(deleteRequest);

      const removePromise = queueStorage.removeItem("test-123");

      // Simulate success
      if (deleteRequest.onsuccess) {
        deleteRequest.onsuccess(new Event("success"));
      }

      await expect(removePromise).resolves.toBeUndefined();
      expect(mockStore.delete).toHaveBeenCalledWith("test-123");
    });

    it("should clear all items", async () => {
      const clearRequest = { onsuccess: null, onerror: null };
      mockStore.clear.mockReturnValue(clearRequest);

      const clearPromise = queueStorage.clear();

      // Simulate success
      if (clearRequest.onsuccess) {
        clearRequest.onsuccess(new Event("success"));
      }

      await expect(clearPromise).resolves.toBeUndefined();
      expect(mockStore.clear).toHaveBeenCalled();
    });
  });

  describe("Cleanup Operations", () => {
    it("should clear old items", async () => {
      const mockCursor = {
        delete: vi.fn(),
        continue: vi.fn(),
      };

      const cursorRequest = {
        onsuccess: null,
        onerror: null,
        result: mockCursor,
      };

      mockStore.index.mockReturnValue({
        openCursor: vi.fn(() => cursorRequest),
      });

      const clearPromise = queueStorage.clearOldItems(1000); // 1 second

      // Simulate cursor iteration
      if (cursorRequest.onsuccess) {
        // First call - has cursor
        cursorRequest.onsuccess(new Event("success"));

        // Second call - no more cursors
        cursorRequest.result = null;
        cursorRequest.onsuccess(new Event("success"));
      }

      await clearPromise;

      expect(mockCursor.delete).toHaveBeenCalled();
      expect(mockCursor.continue).toHaveBeenCalled();
    });

    it("should handle cleanup errors gracefully", async () => {
      const cursorRequest = { onsuccess: null, onerror: null, result: null };

      mockStore.index.mockReturnValue({
        openCursor: vi.fn(() => cursorRequest),
      });

      const clearPromise = queueStorage.clearOldItems();

      // Simulate error
      if (cursorRequest.onerror) {
        cursorRequest.onerror(new Event("error"));
      }

      await expect(clearPromise).rejects.toThrow("Failed to clear old items");
    });
  });

  describe("File Conversion", () => {
    it("should convert files to ArrayBuffer correctly", async () => {
      const testData = "test file content";
      const file = new File([testData], "test.mp4", { type: "video/mp4" });

      // Access the private fileToArrayBuffer method for testing
      const storage = queueStorage as any;
      const buffer = await storage.fileToArrayBuffer(file);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(testData.length);
    });

    it("should handle file read errors", async () => {
      // Create a file that will cause FileReader to fail
      const file = new File([""], "test.mp4", { type: "video/mp4" });

      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader;
      global.FileReader = class {
        readAsArrayBuffer() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Event("error"));
          }, 0);
        }
      } as any;

      const storage = queueStorage as any;

      await expect(storage.fileToArrayBuffer(file)).rejects.toThrow(
        "Failed to read file"
      );

      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });

  describe("Browser Environment Handling", () => {
    it("should handle server-side rendering gracefully", async () => {
      // Mock window as undefined (SSR environment)
      const originalWindow = global.window;
      delete (global as any).window;

      // These should not throw errors
      await expect(queueStorage.init()).resolves.toBeUndefined();
      await expect(queueStorage.storeItem(testItem)).resolves.toBeUndefined();
      await expect(queueStorage.getStoredItems()).resolves.toEqual([]);
      await expect(queueStorage.removeItem("test")).resolves.toBeUndefined();
      await expect(queueStorage.clear()).resolves.toBeUndefined();
      await expect(queueStorage.clearOldItems()).resolves.toBeUndefined();

      // Restore window
      global.window = originalWindow;
    });
  });
});

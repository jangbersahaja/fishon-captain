// IndexedDB storage for video upload queue persistence
// Stores non-terminal queue items with File objects as ArrayBuffers

interface StoredQueueItem {
  id: string;
  status: "pending" | "error" | "canceled";
  progress: number;
  sizeBytes: number;
  createdAt: number;
  startedAt?: number;
  canceledAt?: number;
  error?: string;
  // File data
  fileName: string;
  fileType: string;
  fileBuffer: ArrayBuffer;
  // Trim metadata
  trim?: {
    startSec: number;
    endSec: number;
    didFallback?: boolean;
    fallbackReason?: string | null;
  };
}

class QueueStorageManager {
  private dbName = "video_queue_db";
  private version = 1;
  private storeName = "queue_items";
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === "undefined") return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new Error("Failed to open IndexedDB"));

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  async storeItem(item: {
    id: string;
    file: File;
    status: "pending" | "error" | "canceled";
    progress: number;
    sizeBytes: number;
    createdAt: number;
    startedAt?: number;
    canceledAt?: number;
    error?: string;
    trim?: {
      startSec: number;
      endSec: number;
      didFallback?: boolean;
      fallbackReason?: string | null;
    };
  }): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("IndexedDB not available");

    const fileBuffer = await this.fileToArrayBuffer(item.file);

    const storedItem: StoredQueueItem = {
      id: item.id,
      status: item.status,
      progress: item.progress,
      sizeBytes: item.sizeBytes,
      createdAt: item.createdAt,
      startedAt: item.startedAt,
      canceledAt: item.canceledAt,
      error: item.error,
      fileName: item.file.name,
      fileType: item.file.type,
      fileBuffer,
      trim: item.trim,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(storedItem);

      request.onerror = () => reject(new Error("Failed to store queue item"));
      request.onsuccess = () => resolve();
    });
  }

  async getStoredItems(): Promise<
    Array<{
      id: string;
      file: File;
      status: "pending" | "error" | "canceled";
      progress: number;
      sizeBytes: number;
      createdAt: number;
      startedAt?: number;
      canceledAt?: number;
      error?: string;
      trim?: {
        startSec: number;
        endSec: number;
        didFallback?: boolean;
        fallbackReason?: string | null;
      };
    }>
  > {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () =>
        reject(new Error("Failed to retrieve queue items"));

      request.onsuccess = () => {
        const items = request.result as StoredQueueItem[];
        const restored = items.map((item) => ({
          id: item.id,
          file: new File([item.fileBuffer], item.fileName, {
            type: item.fileType,
          }),
          status: item.status,
          progress: item.progress,
          sizeBytes: item.sizeBytes,
          createdAt: item.createdAt,
          startedAt: item.startedAt,
          canceledAt: item.canceledAt,
          error: item.error,
          trim: item.trim,
        }));
        resolve(restored);
      };
    });
  }

  async removeItem(id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(new Error("Failed to remove queue item"));
      request.onsuccess = () => resolve();
    });
  }

  async clearOldItems(
    olderThanMs: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const cutoff = Date.now() - olderThanMs;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("createdAt");
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onerror = () => reject(new Error("Failed to clear old items"));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(new Error("Failed to clear storage"));
      request.onsuccess = () => resolve();
    });
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }
}

export const queueStorage = new QueueStorageManager();

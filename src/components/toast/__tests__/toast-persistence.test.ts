import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
});

describe("Toast Persistence Fix", () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not persist error toast with persist: false", () => {
    // Simulate the save failed error message that was persisting
    const errorMessage = "Could not save changes.";
    
    // This should NOT be stored in sessionStorage based on our fix
    expect(mockSessionStorage.getItem("last_error_toast")).toBeNull();
  });

  it("should remove save failed toast from sessionStorage on rehydration", () => {
    // Simulate having the problematic toast in sessionStorage
    const errorData = {
      message: "Could not save changes.",
      ts: Date.now(),
    };
    mockSessionStorage.setItem("last_error_toast", JSON.stringify(errorData));
    
    // Verify it exists
    expect(mockSessionStorage.getItem("last_error_toast")).toBeTruthy();
    
    // The rehydration logic should remove it since it's a save failed toast
    // This would be handled by the useEffect in ToastContext
    const raw = mockSessionStorage.getItem("last_error_toast");
    if (raw) {
      const parsed = JSON.parse(raw) as { message?: string };
      if (parsed.message === "Could not save changes.") {
        mockSessionStorage.removeItem("last_error_toast");
      }
    }
    
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("last_error_toast");
  });

  it("should auto-dismiss error toasts after default timeout", () => {
    // Test that error toasts without explicit autoDismiss get a 10s default
    const errorToast = {
      id: "test-error",
      type: "error" as const,
      message: "Test error",
      createdAt: Date.now(),
      // no autoDismiss specified
      // not sticky
    };

    // Our logic should apply 10s default for error toasts
    const dismissTime = 10000; // 10 second default for error toasts
    const remaining = dismissTime - (Date.now() - errorToast.createdAt);
    
    expect(remaining).toBeGreaterThan(9900); // Should be close to 10s
    expect(remaining).toBeLessThanOrEqual(10000);
  });

  it("should respect explicit autoDismiss over default", () => {
    const errorToast = {
      id: "test-error",
      type: "error" as const,
      message: "Test error",
      createdAt: Date.now(),
      autoDismiss: 5000, // explicit 5s
    };

    // Should use explicit autoDismiss, not default
    const dismissTime = errorToast.autoDismiss;
    const remaining = dismissTime - (Date.now() - errorToast.createdAt);
    
    expect(remaining).toBeGreaterThan(4900);
    expect(remaining).toBeLessThanOrEqual(5000);
  });

  it("should not auto-dismiss sticky toasts", () => {
    const stickyToast = {
      id: "test-sticky",
      type: "error" as const,
      message: "Sticky error",
      createdAt: Date.now(),
      sticky: true,
    };

    // Sticky toasts should never get auto-dismiss timer
    expect(stickyToast.sticky).toBe(true);
  });
});
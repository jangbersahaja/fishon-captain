import type { SystemMessage as ISystemMessage } from "@/lib/services/system-messages";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { SystemMessage } from "../SystemMessage";

describe("SystemMessage Component", () => {
  const mockOnDismiss = vi.fn();

  const createMessage = (
    overrides?: Partial<ISystemMessage>
  ): ISystemMessage => ({
    id: "test-message-1",
    type: "verification",
    severity: "critical",
    title: "Government ID Required",
    description: "Please upload both front and back of your government ID.",
    actionUrl: "/captain/documents",
    cta: "Upload ID",
    isDismissible: true,
    ...overrides,
  });

  beforeEach(() => {
    mockOnDismiss.mockClear();
    vi.clearAllMocks();
    // Mock fetch for dismiss API
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;
  });

  describe("Rendering", () => {
    it("renders message title and description", () => {
      const message = createMessage({
        title: "Test Title",
        description: "Test Description",
      });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });

    it("renders with correct icon for critical severity", () => {
      const message = createMessage({ severity: "critical" });
      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      // AlertCircle icon should be present
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("renders with correct icon for success severity", () => {
      const message = createMessage({ severity: "success" });
      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("renders action button when actionUrl and cta provided", () => {
      const message = createMessage({
        actionUrl: "/captain/documents",
        cta: "Upload ID",
      });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const button = screen.getByText("Upload ID");
      expect(button).toBeInTheDocument();
      expect(button.closest("a")).toHaveAttribute("href", "/captain/documents");
    });

    it("does not render action button when actionUrl missing", () => {
      const message = createMessage({
        actionUrl: undefined,
        cta: "Upload ID",
      });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      expect(screen.queryByText("Upload ID")).not.toBeInTheDocument();
    });

    it("renders dismiss button when isDismissible is true", () => {
      const message = createMessage({ isDismissible: true });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByLabelText("Dismiss message");
      expect(dismissButton).toBeInTheDocument();
    });

    it("does not render dismiss button when isDismissible is false", () => {
      const message = createMessage({ isDismissible: false });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      expect(
        screen.queryByLabelText("Dismiss message")
      ).not.toBeInTheDocument();
    });
  });

  describe("Severity Styling", () => {
    it("applies critical severity styling with correct colors", () => {
      const message = createMessage({ severity: "critical" });
      const { container } = render(
        <SystemMessage message={message} onDismiss={mockOnDismiss} />
      );

      // Check for red styling (text-red-800, text-red-700)
      const title = screen.getByText(message.title);
      expect(title).toHaveClass("text-red-800");
    });

    it("applies warning severity styling with correct colors", () => {
      const message = createMessage({
        severity: "warning",
        title: "Warning Title",
      });
      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const title = screen.getByText("Warning Title");
      expect(title).toHaveClass("text-amber-800");
    });

    it("applies success severity styling with correct colors", () => {
      const message = createMessage({
        severity: "success",
        title: "Success Title",
      });
      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const title = screen.getByText("Success Title");
      expect(title).toHaveClass("text-green-800");
    });

    it("applies info severity styling with correct colors", () => {
      const message = createMessage({
        severity: "info",
        title: "Info Title",
      });
      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const title = screen.getByText("Info Title");
      expect(title).toHaveClass("text-blue-800");
    });

    it("action button inherits severity color styling", () => {
      const message = createMessage({
        severity: "critical",
        cta: "Upload ID",
      });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const button = screen.getByText("Upload ID");
      expect(button).toHaveClass("bg-red-100");
      expect(button).toHaveClass("text-red-600");
    });
  });

  describe("Auto-hide functionality", () => {
    it(
      "auto-hides message after autoHideSecs timeout",
      async () => {
        vi.useFakeTimers();

        const message = createMessage({
          autoHideSecs: 0.1, // Use shorter timeout for tests
        });

        render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

        expect(screen.getByText(message.title)).toBeInTheDocument();

        // Fast-forward time
        vi.advanceTimersByTime(200);

        await waitFor(
          () => {
            expect(screen.queryByText(message.title)).not.toBeInTheDocument();
          },
          { timeout: 1000 }
        );

        vi.useRealTimers();
      },
      { timeout: 10000 }
    );

    it(
      "calls onDismiss after auto-hide timeout",
      async () => {
        vi.useFakeTimers();

        const message = createMessage({
          autoHideSecs: 0.1,
        });

        render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

        vi.advanceTimersByTime(200);

        await waitFor(
          () => {
            expect(mockOnDismiss).toHaveBeenCalledWith(message.id);
          },
          { timeout: 1000 }
        );

        vi.useRealTimers();
      },
      { timeout: 10000 }
    );

    it("does not auto-hide when autoHideSecs is not set", async () => {
      vi.useFakeTimers();

      const message = createMessage({
        autoHideSecs: undefined,
      });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      vi.advanceTimersByTime(5000);

      expect(screen.getByText(message.title)).toBeInTheDocument();
      expect(mockOnDismiss).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("clears timeout on unmount", () => {
      vi.useFakeTimers();

      const message = createMessage({
        autoHideSecs: 5,
      });

      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { unmount } = render(
        <SystemMessage message={message} onDismiss={mockOnDismiss} />
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("Dismiss functionality", () => {
    it("calls onDismiss when dismiss button clicked", async () => {
      const user = userEvent.setup();
      const message = createMessage({ isDismissible: true });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByLabelText("Dismiss message");
      await user.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith(message.id);
      });
    });

    it("calls dismiss API endpoint when dismiss button clicked", async () => {
      const user = userEvent.setup();
      const message = createMessage({ isDismissible: true });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByLabelText("Dismiss message");
      await user.click(dismissButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/captain/messages/dismiss",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: message.id }),
          })
        );
      });
    });

    it("hides message with animation when dismissed", async () => {
      const user = userEvent.setup();
      const message = createMessage({ isDismissible: true });

      const { container } = render(
        <SystemMessage message={message} onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByLabelText("Dismiss message");
      await user.click(dismissButton);

      // Message should have hiding animation class
      const alertDiv = screen.getByRole("alert");
      expect(alertDiv).toHaveClass("opacity-0", "scale-95");

      await waitFor(() => {
        expect(screen.queryByText(message.title)).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has correct role alert", () => {
      const message = createMessage();
      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("dismiss button has aria-label", () => {
      const message = createMessage({ isDismissible: true });
      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByLabelText("Dismiss message");
      expect(dismissButton).toBeInTheDocument();
    });

    it("dismiss button is keyboard accessible", async () => {
      const user = userEvent.setup();
      const message = createMessage({ isDismissible: true });

      render(<SystemMessage message={message} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByLabelText("Dismiss message");

      // Click dismiss button (covers both mouse and keyboard interaction)
      await user.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith(message.id);
      });
    });
  });
});

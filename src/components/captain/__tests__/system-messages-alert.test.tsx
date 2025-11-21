import type { SystemMessage as ISystemMessage } from "@/lib/services/system-messages";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { SystemMessagesAlert } from "../SystemMessagesAlert";

describe("SystemMessagesAlert Component", () => {
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
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;
  });

  describe("Empty state", () => {
    it("renders nothing when messages array is empty", () => {
      const { container } = render(
        <SystemMessagesAlert messages={[]} onDismiss={mockOnDismiss} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders nothing after all messages dismissed", async () => {
      const user = userEvent.setup();
      const message = createMessage();

      const { rerender } = render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByLabelText("Dismiss message");
      await user.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith(message.id);
      });

      // Rerender with empty messages
      rerender(<SystemMessagesAlert messages={[]} onDismiss={mockOnDismiss} />);

      expect(screen.queryByText(message.title)).not.toBeInTheDocument();
    });
  });

  describe("Single message", () => {
    it("displays single message in expanded state", () => {
      const message = createMessage();

      render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(message.title)).toBeInTheDocument();
      expect(screen.getByText(message.description)).toBeInTheDocument();
    });

    it("does not show collapse button for single message", () => {
      const message = createMessage();

      render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      expect(screen.queryByText(/more alert/)).not.toBeInTheDocument();
    });
  });

  describe("Multiple messages", () => {
    it("shows first message expanded and rest collapsed", () => {
      const message1 = createMessage({
        id: "msg-1",
        title: "First Message",
      });
      const message2 = createMessage({
        id: "msg-2",
        title: "Second Message",
      });

      render(
        <SystemMessagesAlert
          messages={[message1, message2]}
          onDismiss={mockOnDismiss}
        />
      );

      // First message should be visible
      expect(screen.getByText("First Message")).toBeInTheDocument();

      // Rest badge should show
      expect(screen.getByText("+1 more alert")).toBeInTheDocument();

      // Second message should NOT be visible initially
      expect(screen.queryByText("Second Message")).not.toBeInTheDocument();
    });

    it("shows correct count of remaining messages", () => {
      const messages = [
        createMessage({ id: "msg-1", title: "Message 1" }),
        createMessage({ id: "msg-2", title: "Message 2" }),
        createMessage({ id: "msg-3", title: "Message 3" }),
        createMessage({ id: "msg-4", title: "Message 4" }),
      ];

      render(
        <SystemMessagesAlert messages={messages} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText("+3 more alerts")).toBeInTheDocument();
    });

    it("collapses and expands remaining messages on toggle", async () => {
      const user = userEvent.setup();
      const message1 = createMessage({
        id: "msg-1",
        title: "First Message",
      });
      const message2 = createMessage({
        id: "msg-2",
        title: "Second Message",
      });

      render(
        <SystemMessagesAlert
          messages={[message1, message2]}
          onDismiss={mockOnDismiss}
        />
      );

      // Initially collapsed
      expect(screen.queryByText("Second Message")).not.toBeInTheDocument();

      // Click toggle to expand
      const toggleButton = screen.getByText("+1 more alert");
      await user.click(toggleButton);

      // Now should see second message
      await waitFor(() => {
        expect(screen.getByText("Second Message")).toBeInTheDocument();
      });

      // Click again to collapse
      await user.click(toggleButton);

      // Should be hidden again
      await waitFor(() => {
        expect(screen.queryByText("Second Message")).not.toBeInTheDocument();
      });
    });

    it("rotates chevron icon on collapse/expand", async () => {
      const user = userEvent.setup();
      const message1 = createMessage({
        id: "msg-1",
        title: "First Message",
      });
      const message2 = createMessage({
        id: "msg-2",
        title: "Second Message",
      });

      const { container } = render(
        <SystemMessagesAlert
          messages={[message1, message2]}
          onDismiss={mockOnDismiss}
        />
      );

      const toggleButton = screen.getByText("+1 more alert");

      // Get chevron from button (it's the sibling)
      const chevronInButton = toggleButton.parentElement?.querySelector("svg");
      expect(chevronInButton).toBeInTheDocument();

      // Initially no rotation
      await user.click(toggleButton);

      // After click, should have rotate-180 class
      await waitFor(() => {
        expect(chevronInButton).toHaveClass("rotate-180");
      });

      // Click again
      await user.click(toggleButton);

      // Should remove rotation
      await waitFor(() => {
        expect(chevronInButton).not.toHaveClass("rotate-180");
      });
    });
  });

  describe("Severity-based styling", () => {
    it("applies critical severity styling (red) to first message", () => {
      const message = createMessage({
        severity: "critical",
      });

      const { container } = render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      // Container should have border-red-200 bg-red-50
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("border-red-200", "bg-red-50");
    });

    it("applies warning severity styling (amber) to first message", () => {
      const message = createMessage({
        severity: "warning",
      });

      const { container } = render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("border-amber-200", "bg-amber-50");
    });

    it("applies success severity styling (green) to first message", () => {
      const message = createMessage({
        severity: "success",
      });

      const { container } = render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("border-green-200", "bg-green-50");
    });

    it("applies info severity styling (blue) to first message", () => {
      const message = createMessage({
        severity: "info",
      });

      const { container } = render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("border-blue-200", "bg-blue-50");
    });
  });

  describe("Collapse/expand animation", () => {
    it("smoothly animates when expanding messages", async () => {
      const user = userEvent.setup();
      const messages = [
        createMessage({ id: "msg-1", title: "First" }),
        createMessage({ id: "msg-2", title: "Second" }),
      ];

      const { container } = render(
        <SystemMessagesAlert messages={messages} onDismiss={mockOnDismiss} />
      );

      const toggleButton = screen.getByText("+1 more alert");
      await user.click(toggleButton);

      // Check for transition classes
      const collapsibleContent = container.querySelector(".max-h-96");
      expect(collapsibleContent).toHaveClass("transition-all", "duration-200");
    });

    it("has correct max-height when expanded", async () => {
      const user = userEvent.setup();
      const messages = [
        createMessage({ id: "msg-1", title: "First" }),
        createMessage({ id: "msg-2", title: "Second" }),
      ];

      const { container } = render(
        <SystemMessagesAlert messages={messages} onDismiss={mockOnDismiss} />
      );

      const toggleButton = screen.getByText("+1 more alert");
      await user.click(toggleButton);

      const collapsibleDiv = container.querySelector(".max-h-96");
      expect(collapsibleDiv).toHaveClass("max-h-96");
    });
  });

  describe("Message dismissal", () => {
    it("removes message from list when dismissed", async () => {
      const user = userEvent.setup();
      const message1 = createMessage({
        id: "msg-1",
        title: "First Message",
      });
      const message2 = createMessage({
        id: "msg-2",
        title: "Second Message",
      });

      render(
        <SystemMessagesAlert
          messages={[message1, message2]}
          onDismiss={mockOnDismiss}
        />
      );

      // Dismiss first message
      const dismissButton = screen.getByLabelText("Dismiss message");
      await user.click(dismissButton);

      await waitFor(() => {
        // First message should be gone
        expect(screen.queryByText("First Message")).not.toBeInTheDocument();
      });

      // Toggle should now show second message
      const toggleButton = screen.getByText("+1 more alert");
      await user.click(toggleButton);

      expect(screen.getByText("Second Message")).toBeInTheDocument();
    });

    it("calls onDismiss callback when message dismissed", async () => {
      const user = userEvent.setup();
      const message = createMessage();

      render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByLabelText("Dismiss message");
      await user.click(dismissButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith(message.id);
      });
    });

    it("handles dismissing collapsed message", async () => {
      const user = userEvent.setup();
      const message1 = createMessage({
        id: "msg-1",
        title: "First Message",
      });
      const message2 = createMessage({
        id: "msg-2",
        title: "Second Message",
      });

      render(
        <SystemMessagesAlert
          messages={[message1, message2]}
          onDismiss={mockOnDismiss}
        />
      );

      // Expand collapsed messages
      const toggleButton = screen.getByText("+1 more alert");
      await user.click(toggleButton);

      // Get all dismiss buttons (first and second message)
      const dismissButtons = screen.getAllByLabelText("Dismiss message");
      expect(dismissButtons).toHaveLength(2);

      // Click second dismiss button
      await user.click(dismissButtons[1]);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith("msg-2");
      });
    });
  });

  describe("Auto-hide in alert", () => {
    it(
      "auto-hides success message with autoHideSecs",
      async () => {
        vi.useFakeTimers();

        const message = createMessage({
          severity: "success",
          autoHideSecs: 0.1, // Use shorter timeout
        });

        render(
          <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
        );

        expect(screen.getByText(message.title)).toBeInTheDocument();

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
  });

  describe("Action buttons", () => {
    it("renders action button for first message", () => {
      const message = createMessage({
        actionUrl: "/captain/documents",
        cta: "Upload ID",
      });

      render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      const actionButton = screen.getByText("Upload ID");
      expect(actionButton).toBeInTheDocument();
      expect(actionButton.closest("a")).toHaveAttribute(
        "href",
        "/captain/documents"
      );
    });

    it("renders action buttons for expanded messages", async () => {
      const user = userEvent.setup();
      const message1 = createMessage({
        id: "msg-1",
        title: "First",
        cta: "Action 1",
      });
      const message2 = createMessage({
        id: "msg-2",
        title: "Second",
        cta: "Action 2",
      });

      render(
        <SystemMessagesAlert
          messages={[message1, message2]}
          onDismiss={mockOnDismiss}
        />
      );

      // First action visible
      expect(screen.getByText("Action 1")).toBeInTheDocument();

      // Second action not visible
      expect(screen.queryByText("Action 2")).not.toBeInTheDocument();

      // Expand
      await user.click(screen.getByText("+1 more alert"));

      // Now second action visible
      expect(screen.getByText("Action 2")).toBeInTheDocument();
    });
  });

  describe("Layout and structure", () => {
    it("has correct container styling", () => {
      const message = createMessage();
      const { container } = render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass("border", "rounded-2xl", "shadow-sm");
    });

    it("renders messages with proper spacing", () => {
      const message1 = createMessage({ id: "msg-1", title: "First" });
      const message2 = createMessage({ id: "msg-2", title: "Second" });

      render(
        <SystemMessagesAlert
          messages={[message1, message2]}
          onDismiss={mockOnDismiss}
        />
      );

      // First message visible
      expect(screen.getByText("First")).toBeInTheDocument();

      // Badge for remaining messages
      expect(screen.getByText("+1 more alert")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles message with no action button gracefully", () => {
      const message = createMessage({
        actionUrl: undefined,
        cta: undefined,
      });

      render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(message.title)).toBeInTheDocument();
      expect(screen.getByLabelText("Dismiss message")).toBeInTheDocument();
    });

    it("handles message with no dismiss button", () => {
      const message = createMessage({
        isDismissible: false,
      });

      render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(message.title)).toBeInTheDocument();
      expect(
        screen.queryByLabelText("Dismiss message")
      ).not.toBeInTheDocument();
    });

    it("handles very long message text", () => {
      const message = createMessage({
        title: "A".repeat(100),
        description: "B".repeat(200),
      });

      render(
        <SystemMessagesAlert messages={[message]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText("A".repeat(100))).toBeInTheDocument();
      expect(screen.getByText("B".repeat(200))).toBeInTheDocument();
    });

    it("handles many messages (10+)", async () => {
      const user = userEvent.setup();
      const messages = Array.from({ length: 15 }, (_, i) =>
        createMessage({
          id: `msg-${i}`,
          title: `Message ${i}`,
        })
      );

      render(
        <SystemMessagesAlert messages={messages} onDismiss={mockOnDismiss} />
      );

      // First message visible
      expect(screen.getByText("Message 0")).toBeInTheDocument();

      // Badge shows 14 more
      expect(screen.getByText("+14 more alerts")).toBeInTheDocument();
    });
  });
});

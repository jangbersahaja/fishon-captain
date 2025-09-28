import { MediaGrid } from "@features/charter-onboarding/components/MediaGrid";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("MediaGrid video processing indicator", () => {
  it("renders a processing badge for in-flight videos", () => {
    render(
      <MediaGrid
        kind="video"
        emptyLabel="No items"
        items={[
          {
            name: "temp-video",
            url: "blob:test",
            processing: true,
          },
        ]}
        onRemove={vi.fn()}
      />
    );

    // Badge text
    expect(screen.getByText(/^processing$/i)).toBeInTheDocument();
    // Body copy changed in component to "Optimizing video & thumbnail"; keep test resilient
    expect(screen.getByText(/optimizing video/i)).toBeInTheDocument();
    const altInput = screen.getByPlaceholderText(
      /alt text/i
    ) as HTMLInputElement;
    expect(altInput).toBeDisabled();
    const removeButton = screen.getByRole("button", { name: /remove/i });
    expect(removeButton).toBeDisabled();
  });
});

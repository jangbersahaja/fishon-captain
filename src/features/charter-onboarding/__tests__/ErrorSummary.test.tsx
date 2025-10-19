import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorSummary } from "../components/ErrorSummary";

describe("ErrorSummary", () => {
  it("renders provided errors with heading and list", () => {
    render(<ErrorSummary errors={["Charter Name", "Description"]} />);
    const heading = screen.getByText(/Please fix/i);
    expect(heading).toBeInTheDocument();
    // Each error should appear as a list item for accessibility
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(
      expect.arrayContaining(["Charter Name", "Description"])
    );
  });
  it("renders nothing when empty", () => {
    const { container } = render(<ErrorSummary errors={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

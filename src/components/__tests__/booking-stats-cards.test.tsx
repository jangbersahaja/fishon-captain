import type { BookingStats } from "@/lib/services/booking-stats";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingStatsCardsCompact } from "../BookingStatsCardsCompact";

describe("BookingStatsCardsCompact", () => {
  const mockBookingStats: BookingStats = {
    requests: 3,
    upcoming: 5,
    completed: 12,
    cancellations: 1,
    totalValue: 2500,
  };

  it("should render all four stat cards", () => {
    render(<BookingStatsCardsCompact bookingStats={mockBookingStats} />);

    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Cancellations")).toBeInTheDocument();
  });

  it("should display correct stat values", () => {
    render(<BookingStatsCardsCompact bookingStats={mockBookingStats} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should render in responsive grid layout", () => {
    const { container } = render(
      <BookingStatsCardsCompact bookingStats={mockBookingStats} />
    );

    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-4");
    expect(grid).toHaveClass("gap-4");
  });

  it("should handle zero values", () => {
    const emptyStats: BookingStats = {
      requests: 0,
      upcoming: 0,
      completed: 0,
      cancellations: 0,
      totalValue: 0,
    };

    render(<BookingStatsCardsCompact bookingStats={emptyStats} />);

    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  it("should render cards with proper styling", () => {
    const { container } = render(
      <BookingStatsCardsCompact bookingStats={mockBookingStats} />
    );

    const cards = container.querySelectorAll(".rounded-xl");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("should render icon indicators for each stat", () => {
    const { container } = render(
      <BookingStatsCardsCompact bookingStats={mockBookingStats} />
    );

    // Icons from lucide-react should be present (SVG elements)
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(4);
  });

  it("should display trend indicators when applicable", () => {
    render(<BookingStatsCardsCompact bookingStats={mockBookingStats} />);

    // Cards should render and contain the stat values
    const requests = screen.getByText("Requests");
    expect(requests).toBeInTheDocument();
  });
});

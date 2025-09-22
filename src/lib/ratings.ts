// lib/reviews.ts
import { receipts } from "@/dummy/receipts";

export function getCharterReviews(charterId: number) {
  return receipts.filter((r) => r.charterId === charterId);
}

export function getAverageRating(charterId: number) {
  const reviews = getCharterReviews(charterId);
  if (!reviews.length) return null;
  const avg =
    reviews.reduce((a, r) => a + (r.overallRating || 0), 0) / reviews.length;
  return Math.round(avg * 10) / 10; // 1 decimal
}

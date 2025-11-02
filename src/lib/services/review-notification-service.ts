/**
 * Review Notification Helper for Captains
 *
 * This function should be called from the webhook handler when
 * fishon-market sends a "review.created" webhook event
 */

import { createNotification } from "./notification-service";

/**
 * Notify captain when they receive a new review
 *
 * This should be called from the webhook handler:
 * POST /api/webhooks/fishon-market
 */
export async function notifyReviewReceived(params: {
  captainUserId: string;
  reviewId: string;
  charterName: string;
  charterId: string;
  anglerName: string;
  rating: number;
}) {
  const {
    captainUserId,
    reviewId,
    charterName,
    charterId,
    anglerName,
    rating,
  } = params;

  const stars = "⭐".repeat(rating);

  return createNotification({
    userId: captainUserId,
    type: "REVIEW_RECEIVED",
    title: "New Review Received! ⭐",
    message: `${anglerName} left a ${rating}-star review for ${charterName}. ${stars}`,
    actionUrl: `/captain/charters/${charterId}?tab=reviews`,
    actionLabel: "View Review",
    charterId,
    metadata: {
      charterName,
      anglerName,
      rating,
      reviewId,
    },
  });
}

/**
 * Example usage in webhook handler:
 *
 * // POST /api/webhooks/fishon-market
 * if (webhookData.type === "review.created") {
 *   const { reviewId, charterId, charterName, anglerName, rating } = webhookData.review;
 *
 *   // Find captain user ID from charter
 *   const charter = await prisma.charter.findUnique({
 *     where: { id: charterId },
 *     include: { captain: { include: { user: true } } }
 *   });
 *
 *   if (charter?.captain?.user?.id) {
 *     await notifyReviewReceived({
 *       captainUserId: charter.captain.user.id,
 *       reviewId,
 *       charterName,
 *       charterId,
 *       anglerName,
 *       rating
 *     });
 *   }
 * }
 */

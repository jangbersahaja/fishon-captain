/**
 * Pricing Calculation Service
 *
 * Handles all pricing calculations for bookings including:
 * - Platform fees
 * - Payment gateway fees
 * - Discounts/promo codes
 * - Captain earnings
 *
 * NOTE: This is a copy of fishon-market's pricing-service.ts
 * Keep both in sync for consistent calculations across apps
 */

export interface PricingBreakdown {
  tripPrice: number; // Base price per day
  days: number; // Number of days
  subtotal: number; // tripPrice * days
  platformFee: number; // 10% of subtotal
  discount: number; // Promo code discount amount
  paymentGatewayFee: number; // 1.5% of (subtotal + platformFee - discount)
  sst: number; // Future: SST tax (currently 0)
  finalPrice: number; // What angler pays
  captainEarnings: number; // What captain receives (subtotal - platformFee)
}

export interface PricingInput {
  tripPrice: number;
  days: number;
  promoCode?: {
    code: string;
    percentage: number; // e.g., 10 for 10%
  };
}

/**
 * Calculate complete pricing breakdown for a booking
 *
 * Formula:
 * 1. Subtotal = tripPrice * days
 * 2. Platform Fee = 10% of subtotal
 * 3. Discount = promoCode percentage of subtotal (if applicable)
 * 4. Amount Before Gateway = subtotal + platformFee - discount
 * 5. Payment Gateway Fee = 1.5% of amount before gateway
 * 6. SST = 0 (not applicable yet)
 * 7. Final Price = amount before gateway + payment gateway fee + SST
 * 8. Captain Earnings = subtotal - platform fee
 *
 * Example:
 * - Trip Price: RM500
 * - Days: 1
 * - Subtotal: RM500
 * - Platform Fee (10%): +RM50
 * - Discount (10%): -RM50
 * - Payment Gateway Fee (1.5%): +RM7.50
 * - Final Price: RM507.50
 * - Captain Earnings: RM450
 */
export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { tripPrice, days, promoCode } = input;

  // Step 1: Subtotal (trip price * days)
  const subtotal = tripPrice * days;

  // Step 2: Platform Fee (always 10% for now - no package system yet)
  const platformFee = Math.round(subtotal * 0.1 * 100) / 100;

  // Step 3: Discount (if promo code applied)
  const discount = promoCode
    ? Math.round(subtotal * (promoCode.percentage / 100) * 100) / 100
    : 0;

  // Step 4: Amount before gateway fee
  const amountBeforeGateway = subtotal + platformFee - discount;

  // Step 5: Payment Gateway Fee (1.5% of amount before gateway)
  const paymentGatewayFee = Math.round(amountBeforeGateway * 0.015 * 100) / 100;

  // Step 6: SST (future - currently 0)
  const sst = 0;

  // Step 7: Final Price (what angler pays)
  const finalPrice =
    Math.round((amountBeforeGateway + paymentGatewayFee + sst) * 100) / 100;

  // Step 8: Captain Earnings (what captain receives: subtotal - platform fee)
  const captainEarnings = subtotal;

  return {
    tripPrice,
    days,
    subtotal,
    platformFee,
    discount,
    paymentGatewayFee,
    sst,
    finalPrice,
    captainEarnings,
  };
}

/**
 * Format a pricing breakdown for display
 */
export function formatPricingBreakdown(breakdown: PricingBreakdown): Array<{
  label: string;
  amount: number;
  isNegative?: boolean;
}> {
  const items: Array<{
    label: string;
    amount: number;
    isNegative?: boolean;
  }> = [
    {
      label: `Trip Price (${breakdown.days} ${breakdown.days > 1 ? "days" : "day"})`,
      amount: breakdown.subtotal,
    },
    {
      label: "Platform Fee (10%)",
      amount: breakdown.platformFee,
    },
  ];

  if (breakdown.discount > 0) {
    items.push({
      label: "Discount",
      amount: breakdown.discount,
      isNegative: true,
    });
  }

  items.push({
    label: "Payment Gateway Fee (1.5%)",
    amount: breakdown.paymentGatewayFee,
  });

  if (breakdown.sst > 0) {
    items.push({
      label: "SST",
      amount: breakdown.sst,
    });
  }

  return items;
}

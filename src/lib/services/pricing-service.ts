/**
 * Pricing Calculation Service
 *
 * Handles all pricing calculations for bookings including:
 * - Platform fees (commission)
 * - Service fees (payment gateway + Fishon)
 * - Discounts/promo codes
 * - Captain earnings (with configurable promo split)
 *
 * NOTE: This must stay in sync with fishon-market's pricing-service.ts
 * Keep both files aligned for consistent calculations across apps
 *
 * PRICING MODEL (Updated Dec 2025):
 * - Commission: 10% of captain's base price, CAPPED at RM100
 * - Commission is HIDDEN from anglers (baked into displayed trip price)
 * - Service Fee: 2% of amount before service fee
 *   - 1.5% goes to SenangPay (payment gateway)
 *   - 0.5% goes to Fishon (service revenue)
 * - Promo Split: Configurable via SystemSettings (default 50/50)
 *   - Captain contribution = promoDiscount × captainPercent / 100
 *   - Platform contribution = promoDiscount × platformPercent / 100
 * - Captain Earnings = subtotal - captain promo contribution
 */

import { getPromoSplitConfig } from "./settings-service";

export interface PricingBreakdown {
  tripPrice: number; // Base price per day (captain's base)
  days: number; // Number of days
  subtotal: number; // tripPrice * days
  platformFee: number; // 10% of subtotal (capped at RM100)
  discount: number; // Promo code discount amount
  serviceFee: number; // 2% of (subtotal + platformFee - discount)
  sst: number; // Future: SST tax (currently 0)
  finalPrice: number; // What angler pays
  captainEarnings: number; // What captain receives (subtotal - captain promo contribution)
  displayPrice: number; // Trip price shown to angler (tripPrice + platformFee per day)
  captainPromoContribution?: number; // Captain's share of promo discount
  platformPromoContribution?: number; // Platform's share of promo discount
}

export interface PricingInput {
  tripPrice: number;
  days: number;
  promoDiscount?: number; // Direct discount amount from promo validation
  promoCode?: {
    // DEPRECATED: Use promoDiscount instead
    code: string;
    percentage: number; // e.g., 10 for 10%
  };
}

/**
 * Calculate complete pricing breakdown for a booking
 *
 * Formula (Updated Nov 2025):
 * 1. Subtotal = tripPrice * days (captain's base price)
 * 2. Platform Fee = min(10% of subtotal, RM100) - CAPPED!
 * 3. Discount = promo discount amount (if applicable)
 * 4. Amount Before Service Fee = subtotal + platformFee - discount
 * 5. Service Fee = 2% of amount before service fee (1.5% SenangPay + 0.5% Fishon)
 * 6. SST = 0 (not applicable yet)
 * 7. Final Price = amount before service fee + service fee + SST
 * 8. Captain Earnings = subtotal (unchanged)
 * 9. Display Price = (tripPrice + platformFee / days) per day (for UI)
 *
 * Example (RM500 trip, 1 day):
 * - Trip Price: RM500 (captain's base)
 * - Subtotal: RM500
 * - Platform Fee (10%, capped): RM50
 * - Display Price (UI): RM550 (RM500 + RM50)
 * - Discount (if any): -RM50
 * - Service Fee (2%): RM11
 * - Final Price: RM511
 * - Captain Earnings: RM500 (unchanged)
 *
 * Example (RM2000 trip, 1 day):
 * - Trip Price: RM2000
 * - Subtotal: RM2000
 * - Platform Fee (capped at RM100): RM100 (not RM200!)
 * - Display Price (UI): RM2100
 * - Service Fee (2%): RM42
 * - Final Price: RM2142
 * - Captain Earnings: RM2000 (if no promo)
 *
 * With Promo (50/50 split, RM100 discount):
 * - Captain Promo Contribution: RM50
 * - Platform Promo Contribution: RM50
 * - Captain Earnings: RM1950 (RM2000 - RM50)
 */
export async function calculatePricing(
  input: PricingInput
): Promise<PricingBreakdown> {
  const { tripPrice, days, promoDiscount, promoCode } = input;

  // Step 1: Subtotal (captain's base price * days)
  const subtotal = tripPrice * days;

  // Step 2: Platform Fee (10% with RM100 cap - NEW!)
  const platformFeeUncapped = subtotal * 0.1;
  const platformFee =
    Math.round(Math.min(platformFeeUncapped, 100) * 100) / 100;

  // Step 3: Discount (prefer direct promoDiscount over deprecated promoCode)
  let discount = 0;
  if (promoDiscount !== undefined && promoDiscount > 0) {
    discount = Math.round(promoDiscount * 100) / 100;
  } else if (promoCode) {
    // DEPRECATED: Legacy promoCode object support
    discount = Math.round(subtotal * (promoCode.percentage / 100) * 100) / 100;
  }

  // Step 4: Amount before service fee
  const amountBeforeServiceFee = subtotal + platformFee - discount;

  // Step 5: Service Fee (2% of amount before service fee)
  // Breakdown: 1.5% SenangPay + 0.5% Fishon service
  const serviceFee = Math.round(amountBeforeServiceFee * 0.02 * 100) / 100;

  // Step 6: SST (future - currently 0)
  const sst = 0;

  // Step 7: Final Price (what angler pays)
  const finalPrice =
    Math.round((amountBeforeServiceFee + serviceFee + sst) * 100) / 100;

  // Step 8: Promo Split (if discount applied)
  let captainPromoContribution = 0;
  let platformPromoContribution = 0;

  if (discount > 0) {
    const splitConfig = await getPromoSplitConfig();
    captainPromoContribution =
      Math.round(discount * (splitConfig.captainPercent / 100) * 100) / 100;
    platformPromoContribution =
      Math.round(discount * (splitConfig.platformPercent / 100) * 100) / 100;
  }

  // Step 9: Captain Earnings (subtotal minus captain's promo contribution)
  const captainEarnings =
    Math.round((subtotal - captainPromoContribution) * 100) / 100;

  // Step 10: Display Price (trip price shown to angler per day: base + commission per day)
  const displayPrice = Math.round((tripPrice + platformFee / days) * 100) / 100;

  return {
    tripPrice,
    days,
    subtotal,
    platformFee,
    discount,
    serviceFee,
    sst,
    finalPrice,
    captainEarnings,
    displayPrice,
    captainPromoContribution,
    platformPromoContribution,
  };
}

/**
 * Format a pricing breakdown for display to angler
 *
 * NEW: Hides platform fee (commission) from angler view
 * Shows trip price with commission baked in
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
      // Show display price (base + commission) instead of just base
      label: `Trip Price (${breakdown.days} ${breakdown.days > 1 ? "days" : "day"})`,
      amount: breakdown.subtotal + breakdown.platformFee, // Combined amount
    },
    // Platform Fee line REMOVED - hidden from angler
  ];

  if (breakdown.discount > 0) {
    items.push({
      label: "Discount",
      amount: breakdown.discount,
      isNegative: true,
    });
  }

  items.push({
    label: "Service Fee (2%)",
    amount: breakdown.serviceFee,
  });

  if (breakdown.sst > 0) {
    items.push({
      label: "SST",
      amount: breakdown.sst,
    });
  }

  return items;
}

/**
 * Format a pricing breakdown for captain/admin dashboard
 *
 * Shows full breakdown including commission (for transparency)
 */
export function formatPricingBreakdownForCaptain(
  breakdown: PricingBreakdown
): Array<{
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
      label: `Base Trip Price (${breakdown.days} ${breakdown.days > 1 ? "days" : "day"})`,
      amount: breakdown.subtotal,
    },
    {
      label: `Platform Fee (10%, capped at RM100)`,
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
    label: "Service Fee (2%)",
    amount: breakdown.serviceFee,
  });

  if (breakdown.sst > 0) {
    items.push({
      label: "SST",
      amount: breakdown.sst,
    });
  }

  return items;
}

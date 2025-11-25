"use client";

/**
 * Price Configuration Modal
 * Modal for editing base price and promo price for individual trips
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";

interface TripPricing {
  id: string;
  name: string;
  tripType: string;
  durationHours: number;
  basePrice: number;
  minPrice: number | null; // Captain's minimum acceptable (semantic: promoPrice in DB)
  currentPrice: number | null; // Admin's active override (priceOverride in DB)
  charter: {
    id: string;
    name: string;
    state: string;
    city: string;
  };
}

interface PriceConfigModalProps {
  trip: TripPricing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PriceConfigModal({
  trip,
  open,
  onOpenChange,
  onSuccess,
}: PriceConfigModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [basePrice, setBasePrice] = useState<string>("");
  const [hasMinPrice, setHasMinPrice] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<string>("");

  // Reset form when trip changes or modal opens
  useEffect(() => {
    if (trip && open) {
      setBasePrice(trip.basePrice.toFixed(2));
      setHasMinPrice(trip.minPrice !== null);
      setMinPrice(trip.minPrice?.toFixed(2) || "");
      setCurrentPrice(trip.currentPrice?.toFixed(2) || "");
      setError(null);
    }
  }, [trip, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    setIsLoading(true);
    setError(null);

    try {
      const basePriceNum = parseFloat(basePrice);
      const minPriceNum = hasMinPrice && minPrice ? parseFloat(minPrice) : null;
      const currentPriceNum =
        currentPrice && currentPrice.trim() !== ""
          ? parseFloat(currentPrice)
          : null;

      // Validation
      if (isNaN(basePriceNum) || basePriceNum <= 0) {
        throw new Error("Base price must be a positive number");
      }

      if (hasMinPrice) {
        if (!minPriceNum || isNaN(minPriceNum) || minPriceNum <= 0) {
          throw new Error("Min price must be a positive number");
        }
        if (minPriceNum > basePriceNum) {
          throw new Error("Min price must be less than or equal to base price");
        }
      }

      if (currentPriceNum !== null && currentPriceNum !== undefined) {
        if (isNaN(currentPriceNum) || currentPriceNum <= 0) {
          throw new Error("Current price must be a positive number");
        }
        if (hasMinPrice && minPriceNum && currentPriceNum < minPriceNum) {
          throw new Error("Current price cannot be below min price");
        }
      }

      const payload = {
        basePrice: basePriceNum,
        minPrice: minPriceNum,
        currentPrice: currentPriceNum,
      };

      console.log("[PriceConfigModal] Submitting pricing update:", payload);

      const response = await fetch(`/api/admin/pricing/${trip.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("[PriceConfigModal] Response status:", response.status);

      if (!response.ok) {
        let errorMessage = "Failed to update pricing";
        try {
          const data = await response.json();
          console.error("[PriceConfigModal] Update failed:", {
            status: response.status,
            data,
          });
          errorMessage = data.error || data.message || errorMessage;
        } catch (parseError) {
          console.error(
            "[PriceConfigModal] Failed to parse error response:",
            parseError
          );
          const text = await response.text();
          console.error("[PriceConfigModal] Response text:", text);
          errorMessage =
            text || `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      console.log("[PriceConfigModal] Update successful");

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDiscount = (original: number, discounted: number) => {
    if (original > 0) {
      return (((original - discounted) / original) * 100).toFixed(0);
    }
    return "0";
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Trip Pricing</DialogTitle>
            <DialogDescription>
              Update pricing for <strong>{trip.name}</strong>
              <span className="mt-1 text-xs text-slate-500">
                {trip.charter.name} • {trip.tripType} • {trip.durationHours}h
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Base Price */}
            <div className="space-y-2">
              <Label htmlFor="basePrice">
                Base Price <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-slate-500">
                Captain&apos;s normal price for this trip
              </p>
              <div className="relative">
                <span className="absolute transform -translate-y-1/2 left-3 top-1/2 text-slate-500">
                  RM
                </span>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="pl-12"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Min Price Toggle */}
            <div className="flex items-center justify-between pt-4 space-x-2 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="hasMinPrice">Minimum Price Floor</Label>
                <p className="text-sm text-slate-500">
                  Set captain&apos;s minimum acceptable price
                </p>
              </div>
              <Switch
                id="hasMinPrice"
                checked={hasMinPrice}
                onCheckedChange={setHasMinPrice}
                disabled={isLoading}
              />
            </div>

            {/* Min Price */}
            {hasMinPrice && (
              <div className="space-y-2 duration-200 animate-in fade-in-50">
                <Label htmlFor="minPrice">
                  Minimum Price <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-500">
                  Lowest price captain will accept (price floor)
                </p>
                <div className="relative">
                  <span className="absolute transform -translate-y-1/2 left-3 top-1/2 text-slate-500">
                    RM
                  </span>
                  <Input
                    id="minPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="pl-12"
                    required
                    disabled={isLoading}
                  />
                </div>
                {minPrice && basePrice && (
                  <p className="text-sm text-amber-600">
                    {calculateDiscount(
                      parseFloat(basePrice),
                      parseFloat(minPrice)
                    )}
                    % below base price
                  </p>
                )}
              </div>
            )}

            {/* Current Price (Admin Override) */}
            <div className="pt-4 space-y-2 border-t">
              <Label htmlFor="currentPrice">
                Current Active Price (Optional)
              </Label>
              <p className="text-xs text-slate-500">
                Override the active price shown to customers. Leave empty to use
                base price.
              </p>
              <div className="relative">
                <span className="absolute transform -translate-y-1/2 left-3 top-1/2 text-slate-500">
                  RM
                </span>
                <Input
                  id="currentPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="pl-12"
                  placeholder="Leave empty for base price"
                  disabled={isLoading}
                />
              </div>
              {currentPrice && basePrice && (
                <div className="mt-2">
                  {parseFloat(currentPrice) > parseFloat(basePrice) ? (
                    <p className="text-sm text-red-600">
                      +
                      {calculateDiscount(
                        parseFloat(basePrice),
                        parseFloat(currentPrice)
                      )}
                      % surge pricing
                    </p>
                  ) : parseFloat(currentPrice) < parseFloat(basePrice) ? (
                    <p className="text-sm text-emerald-600">
                      {calculateDiscount(
                        parseFloat(basePrice),
                        parseFloat(currentPrice)
                      )}
                      % discount active
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">Same as base price</p>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="p-4 border rounded-lg bg-slate-50 border-slate-200">
              <h4 className="mb-3 text-sm font-semibold text-slate-700">
                Current Pricing
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Base Price:</span>
                  <span className="font-semibold text-slate-900">
                    RM {trip.basePrice.toFixed(2)}
                  </span>
                </div>
                {trip.minPrice && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Min Price:</span>
                    <span className="font-semibold text-amber-600">
                      RM {trip.minPrice.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 text-sm border-t border-slate-200">
                  <span className="font-medium text-slate-700">
                    Customer Sees:
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    RM {(trip.currentPrice ?? trip.basePrice).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Future Enhancement: Date Range */}
            <div className="p-4 border border-dashed rounded-lg border-slate-300 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">
                    Promotional Period
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Date range selection coming soon. For now, promotional
                    prices are active immediately upon saving.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

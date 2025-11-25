"use client";

/**
 * Price History Component
 * Displays audit trail of price changes for trips
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface PriceChange {
  id: string;
  timestamp: string;
  actorName: string;
  tripId: string;
  tripName: string;
  charterName: string;
  before: {
    basePrice: number;
    promoPrice: number | null;
  };
  after: {
    basePrice: number;
    promoPrice: number | null;
  };
}

interface PriceHistoryProps {
  charterId?: string;
  tripId?: string;
  limit?: number;
}

export function PriceHistory({
  charterId,
  tripId,
  limit = 50,
}: PriceHistoryProps) {
  const [changes, setChanges] = useState<PriceChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "price-increase" | "price-decrease"
  >("all");

  useEffect(() => {
    fetchHistory();
  }, [charterId, tripId, limit]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      if (charterId) params.append("charterId", charterId);
      if (tripId) params.append("tripId", tripId);

      const response = await fetch(
        `/api/admin/pricing/history?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch price history");
      }

      const data = await response.json();
      setChanges(data.changes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateChange = (before: number, after: number) => {
    const diff = after - before;
    const percent = ((diff / before) * 100).toFixed(1);
    return { diff, percent };
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toFixed(2)}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Apply filter
  const filteredChanges = changes.filter((change) => {
    if (filter === "all") return true;

    const basePriceChange = change.after.basePrice - change.before.basePrice;

    if (filter === "price-increase") {
      return basePriceChange > 0;
    } else if (filter === "price-decrease") {
      return basePriceChange < 0;
    }

    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Price Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="text-slate-500">Loading price history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Price Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Price Change History
          </CardTitle>
          <Select
            value={filter}
            onValueChange={(val) =>
              setFilter(val as "all" | "price-increase" | "price-decrease")
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Changes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Changes</SelectItem>
              <SelectItem value="price-increase">Price Increases</SelectItem>
              <SelectItem value="price-decrease">Price Decreases</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredChanges.length === 0 ? (
          <div className="py-12 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No price changes recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredChanges.map((change) => {
              const basePriceChange = calculateChange(
                change.before.basePrice,
                change.after.basePrice
              );
              const isIncrease = basePriceChange.diff > 0;

              return (
                <div
                  key={change.id}
                  className="p-4 transition-colors border rounded-lg border-slate-200 hover:bg-slate-50"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {change.tripName}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {change.charterName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {formatDate(change.timestamp)}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        by {change.actorName}
                      </p>
                    </div>
                  </div>

                  {/* Base Price Changes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-3">
                        {isIncrease ? (
                          <TrendingUp className="w-5 h-5 text-red-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-emerald-600" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-slate-600">
                            Base Price
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="line-through text-slate-500">
                              {formatCurrency(change.before.basePrice)}
                            </span>
                            <span>→</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(change.after.basePrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-semibold ${
                            isIncrease ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {isIncrease ? "+" : ""}
                          {formatCurrency(basePriceChange.diff)}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isIncrease ? "+" : ""}
                          {basePriceChange.percent}%
                        </p>
                      </div>
                    </div>

                    {/* Promo Price Changes */}
                    {(change.before.promoPrice !== null ||
                      change.after.promoPrice !== null) && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50">
                        <div>
                          <p className="text-xs font-medium text-emerald-800">
                            Promo Price
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-emerald-700">
                              {change.before.promoPrice
                                ? formatCurrency(change.before.promoPrice)
                                : "None"}
                            </span>
                            <span className="text-emerald-600">→</span>
                            <span className="font-semibold text-emerald-900">
                              {change.after.promoPrice
                                ? formatCurrency(change.after.promoPrice)
                                : "Removed"}
                            </span>
                          </div>
                        </div>
                        {change.before.promoPrice &&
                          change.after.promoPrice && (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                                {calculateChange(
                                  change.before.promoPrice,
                                  change.after.promoPrice
                                ).diff > 0
                                  ? "+"
                                  : ""}
                                {formatCurrency(
                                  calculateChange(
                                    change.before.promoPrice,
                                    change.after.promoPrice
                                  ).diff
                                )}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

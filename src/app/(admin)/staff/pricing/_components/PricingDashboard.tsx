"use client";

/**
 * Pricing Dashboard Component
 * Main client component for pricing management
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, Percent, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PriceHistory } from "./PriceHistory";
import { PricingTable } from "./PricingTable";

interface PricingStats {
  totalTrips: number;
  avgBasePrice: number;
  avgPromoPrice: number;
  promoAdoptionRate: number;
  priceRange: {
    min: number;
    max: number;
  };
}

interface TripPricing {
  id: string;
  name: string;
  tripType: string;
  durationHours: number;
  basePrice: number;
  minPrice: number | null;
  currentPrice: number | null;
  charter: {
    id: string;
    name: string;
    state: string;
    city: string;
  };
}

export function PricingDashboard() {
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [trips, setTrips] = useState<TripPricing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricingData();
  }, []);

  async function fetchPricingData() {
    try {
      const response = await fetch("/api/admin/pricing");
      if (!response.ok) throw new Error("Failed to fetch pricing data");

      const data = await response.json();
      setStats(data.stats);
      setTrips(data.trips);
    } catch (error) {
      console.error("Error fetching pricing data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Trips
            </CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.totalTrips || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Across all charters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg Base Price
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              RM {stats?.avgBasePrice.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.priceRange
                ? `Range: RM ${stats.priceRange.min} - ${stats.priceRange.max}`
                : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg Min Price
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.avgPromoPrice
                ? `RM ${stats.avgPromoPrice.toFixed(2)}`
                : "N/A"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.avgPromoPrice && stats?.avgBasePrice
                ? `${(((stats.avgBasePrice - stats.avgPromoPrice) / stats.avgBasePrice) * 100).toFixed(0)}% avg floor`
                : "No min prices set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Min Price Adoption
            </CardTitle>
            <Percent className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.promoAdoptionRate.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Trips with min price floor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <PricingTable trips={trips} onRefresh={fetchPricingData} />

      {/* Price Change History */}
      <PriceHistory limit={20} />
    </div>
  );
}

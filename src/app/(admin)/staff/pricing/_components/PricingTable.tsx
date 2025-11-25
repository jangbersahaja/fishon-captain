"use client";

/**
 * Pricing Table Component
 * Displays all trips with pricing information grouped by charter
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  MapPin,
  Search,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { PriceConfigModal } from "./PriceConfigModal";

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

interface PricingTableProps {
  trips: TripPricing[];
  onRefresh: () => void;
}

export function PricingTable({ trips, onRefresh }: PricingTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [promoFilter, setPromoFilter] = useState<string>("all");
  const [expandedCharters, setExpandedCharters] = useState<Set<string>>(
    new Set()
  );
  const [selectedTrip, setSelectedTrip] = useState<TripPricing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Group trips by charter
  const groupedTrips = trips.reduce(
    (acc, trip) => {
      const charterId = trip.charter.id;
      if (!acc[charterId]) {
        acc[charterId] = {
          charter: trip.charter,
          trips: [],
        };
      }
      acc[charterId].trips.push(trip);
      return acc;
    },
    {} as Record<
      string,
      { charter: TripPricing["charter"]; trips: TripPricing[] }
    >
  );

  // Get unique states for filter
  const states = Array.from(new Set(trips.map((t) => t.charter.state))).sort();

  // Apply filters
  const filteredCharters = Object.entries(groupedTrips).filter(
    ([, { charter, trips: charterTrips }]) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCharter = charter.name.toLowerCase().includes(query);
        const matchesTrip = charterTrips.some((t) =>
          t.name.toLowerCase().includes(query)
        );
        if (!matchesCharter && !matchesTrip) return false;
      }

      // State filter
      if (stateFilter !== "all" && charter.state !== stateFilter) {
        return false;
      }

      // Promo filter
      if (promoFilter === "with-promo") {
        const hasMinPrice = charterTrips.some((t) => t.minPrice !== null);
        if (!hasMinPrice) return false;
      } else if (promoFilter === "without-promo") {
        const hasMinPrice = charterTrips.some((t) => t.minPrice !== null);
        if (hasMinPrice) return false;
      }

      return true;
    }
  );

  const toggleCharter = (charterId: string) => {
    const newExpanded = new Set(expandedCharters);
    if (newExpanded.has(charterId)) {
      newExpanded.delete(charterId);
    } else {
      newExpanded.add(charterId);
    }
    setExpandedCharters(newExpanded);
  };

  const calculateDiscount = (basePrice: number, promoPrice: number) => {
    return (((basePrice - promoPrice) / basePrice) * 100).toFixed(0);
  };

  const handleEditTrip = (trip: TripPricing) => {
    setSelectedTrip(trip);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    onRefresh();
  };

  return (
    <>
      <PriceConfigModal
        trip={selectedTrip}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleModalSuccess}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trip Pricing</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allCharterIds = Object.keys(groupedTrips);
                if (expandedCharters.size === allCharterIds.length) {
                  setExpandedCharters(new Set());
                } else {
                  setExpandedCharters(new Set(allCharterIds));
                }
              }}
            >
              {expandedCharters.size === Object.keys(groupedTrips).length
                ? "Collapse All"
                : "Expand All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search charters or trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={promoFilter} onValueChange={setPromoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Trips" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trips</SelectItem>
                <SelectItem value="with-promo">With Min Price</SelectItem>
                <SelectItem value="without-promo">Without Min Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {filteredCharters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">
                No trips found matching your filters
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCharters.map(
                ([charterId, { charter, trips: charterTrips }]) => {
                  const isExpanded = expandedCharters.has(charterId);
                  const promoCount = charterTrips.filter(
                    (t) => t.minPrice !== null
                  ).length;
                  return (
                    <div
                      key={charterId}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      {/* Charter Header */}
                      <button
                        onClick={() => toggleCharter(charterId)}
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                          )}
                          <div className="text-left">
                            <div className="font-semibold text-slate-900">
                              {charter.name}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {charter.city}, {charter.state}
                              </span>
                              <span className="mx-2">•</span>
                              <span>{charterTrips.length} trips</span>
                              {promoCount > 0 && (
                                <>
                                  <span className="mx-2">•</span>
                                  <Tag className="h-3 w-3 text-amber-600" />
                                  <span className="text-amber-600">
                                    {promoCount} with min price
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Trip Rows */}
                      {isExpanded && (
                        <div className="bg-white">
                          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100 text-xs font-medium text-slate-600 border-t border-slate-200">
                            <div className="col-span-3">Trip Name</div>
                            <div className="col-span-1">Type</div>
                            <div className="col-span-1">Duration</div>
                            <div className="col-span-2 text-right">Base</div>
                            <div className="col-span-2 text-right">Min</div>
                            <div className="col-span-2 text-right">Current</div>
                            <div className="col-span-1"></div>
                          </div>
                          {charterTrips.map((trip) => (
                            <div
                              key={trip.id}
                              className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-slate-200 hover:bg-slate-50 items-center"
                            >
                              <div className="col-span-3">
                                <div className="font-medium text-slate-900">
                                  {trip.name}
                                </div>
                              </div>
                              <div className="col-span-1 text-sm text-slate-600">
                                {trip.tripType}
                              </div>
                              <div className="col-span-1 text-sm text-slate-600">
                                {trip.durationHours}h
                              </div>
                              <div className="col-span-2 text-right font-medium text-slate-900">
                                RM {trip.basePrice.toFixed(2)}
                              </div>
                              <div className="col-span-2 text-right">
                                {trip.minPrice ? (
                                  <div>
                                    <div className="font-medium text-amber-600">
                                      RM {trip.minPrice.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-amber-600">
                                      {calculateDiscount(
                                        trip.basePrice,
                                        trip.minPrice
                                      )}
                                      % floor
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    —
                                  </span>
                                )}
                              </div>
                              <div className="col-span-2 text-right">
                                {trip.currentPrice ? (
                                  <div>
                                    <div className="font-bold text-blue-600">
                                      RM {trip.currentPrice.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-blue-600">
                                      {trip.currentPrice > trip.basePrice
                                        ? `+${calculateDiscount(
                                            trip.basePrice,
                                            trip.currentPrice
                                          )}% surge`
                                        : trip.currentPrice < trip.basePrice
                                          ? `${calculateDiscount(
                                              trip.basePrice,
                                              trip.currentPrice
                                            )}% off`
                                          : "base"}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    base
                                  </span>
                                )}
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Edit pricing"
                                  onClick={() => handleEditTrip(trip)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

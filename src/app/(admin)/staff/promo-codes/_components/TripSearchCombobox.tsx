"use client";

/**
 * Trip Search Combobox Component
 * Searchable combobox for selecting trips with autocomplete
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  Clock,
  Loader2,
  MapPin,
  Tag,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Trip {
  id: string;
  name: string;
  tripType: string;
  price: number;
  durationHours: number;
  charterName: string;
  charterLocation: string;
  charterId: string;
}

interface TripSearchComboboxProps {
  selectedTrips: string[];
  onSelect: (tripIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Optional: filter trips by specific charter */
  charterId?: string;
}

export function TripSearchCombobox({
  selectedTrips,
  onSelect,
  placeholder = "Search trips by name, type, or charter...",
  disabled = false,
  charterId,
}: TripSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTripDetails, setSelectedTripDetails] = useState<
    Map<string, Trip>
  >(new Map());
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setTrips([]);
        return;
      }

      setIsLoading(true);
      try {
        let url = `/api/admin/trips/search?q=${encodeURIComponent(query)}&limit=20`;
        if (charterId) {
          url += `&charterId=${encodeURIComponent(charterId)}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setTrips(data.trips || []);
        }
      } catch (error) {
        console.error("Failed to search trips:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, charterId]);

  // Load details for selected trips on mount
  useEffect(() => {
    async function loadSelectedTrips() {
      const missingIds = selectedTrips.filter(
        (id) => !fetchedIdsRef.current.has(id)
      );
      if (missingIds.length === 0) return;

      // Mark as fetching to prevent duplicate requests
      missingIds.forEach((id) => fetchedIdsRef.current.add(id));

      // Fetch each missing trip
      const newDetails = new Map<string, Trip>();
      for (const id of missingIds) {
        try {
          const response = await fetch(
            `/api/admin/trips/search?q=${id}&limit=5`
          );
          if (response.ok) {
            const data = await response.json();
            const found = data.trips?.find((t: Trip) => t.id === id);
            if (found) {
              newDetails.set(id, found);
            }
          }
        } catch {
          // Ignore errors for individual trips
        }
      }
      if (newDetails.size > 0) {
        setSelectedTripDetails((prev) => {
          const merged = new Map(prev);
          newDetails.forEach((trip, id) => merged.set(id, trip));
          return merged;
        });
      }
    }

    loadSelectedTrips();
  }, [selectedTrips]);

  const handleSelect = useCallback(
    (trip: Trip) => {
      if (selectedTrips.includes(trip.id)) {
        // Remove if already selected
        onSelect(selectedTrips.filter((id) => id !== trip.id));
      } else {
        // Add to selection
        onSelect([...selectedTrips, trip.id]);
        // Store details for display
        setSelectedTripDetails((prev) => {
          const next = new Map(prev);
          next.set(trip.id, trip);
          return next;
        });
      }
      setQuery("");
    },
    [selectedTrips, onSelect]
  );

  const handleRemove = useCallback(
    (tripId: string) => {
      onSelect(selectedTrips.filter((id) => id !== tripId));
    },
    [selectedTrips, onSelect]
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full font-normal"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 text-slate-500">
              <Tag className="w-4 h-4" />
              <span>{placeholder}</span>
            </div>
            <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type trip name, type, or charter name..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">
                    Searching...
                  </span>
                </div>
              ) : query.length < 2 ? (
                <div className="py-6 text-sm text-center text-slate-500">
                  Type at least 2 characters to search
                </div>
              ) : trips.length === 0 ? (
                <CommandEmpty>No trips found.</CommandEmpty>
              ) : (
                <CommandGroup heading="Trips">
                  {trips.map((trip) => {
                    const isSelected = selectedTrips.includes(trip.id);
                    return (
                      <CommandItem
                        key={trip.id}
                        value={trip.id}
                        onSelect={() => handleSelect(trip)}
                        className="flex items-start gap-3 py-3"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border mt-0.5",
                            isSelected
                              ? "bg-[#ec2227] border-[#ec2227] text-white"
                              : "border-slate-300"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate text-slate-900">
                              {trip.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-blue-50 text-blue-700"
                            >
                              {trip.tripType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="font-medium text-emerald-600">
                              {formatPrice(trip.price)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {trip.durationHours}h
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span className="truncate">{trip.charterName}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {trip.charterLocation}
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-xs truncate text-slate-400">
                            {trip.id}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected trips display */}
      {selectedTrips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTrips.map((tripId) => {
            const details = selectedTripDetails.get(tripId);
            return (
              <div
                key={tripId}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm transition-colors border rounded-lg group bg-slate-50 border-slate-200 hover:bg-slate-100"
              >
                <Tag className="w-4 h-4 text-slate-400" />
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900 truncate max-w-[200px]">
                    {details?.name || "Loading..."}
                  </span>
                  {details && (
                    <>
                      <span className="text-xs text-slate-500">
                        {details.charterName} • {formatPrice(details.price)}
                      </span>
                    </>
                  )}
                  <span className="font-mono text-xs text-slate-400 truncate max-w-[200px]">
                    {tripId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(tripId)}
                  className="p-1 ml-1 rounded hover:bg-slate-200"
                  disabled={disabled}
                >
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

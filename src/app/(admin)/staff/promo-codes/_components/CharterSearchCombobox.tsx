"use client";

/**
 * Charter Search Combobox Component
 * Searchable combobox for selecting charters with autocomplete
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
import { Check, ChevronsUpDown, Loader2, MapPin, Ship, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Charter {
  id: string;
  name: string;
  location: string;
  captainName: string;
  isActive: boolean;
}

interface CharterSearchComboboxProps {
  selectedCharters: string[];
  onSelect: (charterIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CharterSearchCombobox({
  selectedCharters,
  onSelect,
  placeholder = "Search charters by name or location...",
  disabled = false,
}: CharterSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [charters, setCharters] = useState<Charter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCharterDetails, setSelectedCharterDetails] = useState<
    Map<string, Charter>
  >(new Map());

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setCharters([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/admin/charters/search?q=${encodeURIComponent(query)}&limit=20`
        );
        if (response.ok) {
          const data = await response.json();
          setCharters(data.charters || []);
        }
      } catch (error) {
        console.error("Failed to search charters:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Load details for selected charters on mount
  useEffect(() => {
    async function loadSelectedCharters() {
      const missingIds = selectedCharters.filter(
        (id) => !selectedCharterDetails.has(id)
      );
      if (missingIds.length === 0) return;

      // Fetch each missing charter
      const newDetails = new Map(selectedCharterDetails);
      for (const id of missingIds) {
        try {
          const response = await fetch(
            `/api/admin/charters/search?q=${id}&limit=1`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.charters?.[0]?.id === id) {
              newDetails.set(id, data.charters[0]);
            }
          }
        } catch {
          // Ignore errors for individual charters
        }
      }
      setSelectedCharterDetails(newDetails);
    }

    loadSelectedCharters();
  }, [selectedCharters, selectedCharterDetails]);

  const handleSelect = useCallback(
    (charter: Charter) => {
      if (selectedCharters.includes(charter.id)) {
        // Remove if already selected
        onSelect(selectedCharters.filter((id) => id !== charter.id));
      } else {
        // Add to selection
        onSelect([...selectedCharters, charter.id]);
        // Store details for display
        setSelectedCharterDetails((prev) => {
          const next = new Map(prev);
          next.set(charter.id, charter);
          return next;
        });
      }
      setQuery("");
    },
    [selectedCharters, onSelect]
  );

  const handleRemove = useCallback(
    (charterId: string) => {
      onSelect(selectedCharters.filter((id) => id !== charterId));
    },
    [selectedCharters, onSelect]
  );

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
              <Ship className="w-4 h-4" />
              <span>{placeholder}</span>
            </div>
            <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type charter name or location..."
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
              ) : charters.length === 0 ? (
                <CommandEmpty>No charters found.</CommandEmpty>
              ) : (
                <CommandGroup heading="Charters">
                  {charters.map((charter) => {
                    const isSelected = selectedCharters.includes(charter.id);
                    return (
                      <CommandItem
                        key={charter.id}
                        value={charter.id}
                        onSelect={() => handleSelect(charter)}
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
                              {charter.name}
                            </span>
                            {!charter.isActive && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-amber-100 text-amber-700"
                              >
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {charter.location}
                            </span>
                            <span>•</span>
                            <span>Capt. {charter.captainName}</span>
                          </div>
                          <div className="mt-1 font-mono text-xs truncate text-slate-400">
                            {charter.id}
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

      {/* Selected charters display */}
      {selectedCharters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCharters.map((charterId) => {
            const details = selectedCharterDetails.get(charterId);
            return (
              <div
                key={charterId}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm transition-colors border rounded-lg group bg-slate-50 border-slate-200 hover:bg-slate-100"
              >
                <Ship className="w-4 h-4 text-slate-400" />
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900 truncate max-w-[200px]">
                    {details?.name || "Loading..."}
                  </span>
                  {details && (
                    <span className="text-xs text-slate-500">
                      {details.location}
                    </span>
                  )}
                  <span className="font-mono text-xs text-slate-400 truncate max-w-[200px]">
                    {charterId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(charterId)}
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

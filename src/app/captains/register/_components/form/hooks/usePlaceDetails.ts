"use client";
import { useCallback, useRef, useState } from "react";

interface PlaceDetailsState {
  loading: boolean;
  error: string | null;
}

export interface ParsedPlaceDetails {
  location: { lat: number; lng: number } | null;
  addressComponents: GoogleAddressComponent[];
  formattedAddress: string | null;
}

export interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export function usePlaceDetails() {
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<PlaceDetailsState>({
    loading: false,
    error: null,
  });

  const fetchDetails = useCallback(
    async (placeId: string): Promise<ParsedPlaceDetails | null> => {
      if (!placeId) return null;
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setState({ loading: true, error: null });
      try {
        const res = await fetch(
          `/api/places/details?placeId=${encodeURIComponent(placeId)}`,
          {
            signal: ac.signal,
          }
        );
        if (!res.ok) throw new Error("Failed to fetch details");
        const data = await res.json();
        setState({ loading: false, error: null });
        return {
          location: data.location ?? null,
          addressComponents: data.addressComponents ?? [],
          formattedAddress: data.formattedAddress ?? null,
        };
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return null;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setState({ loading: false, error: msg });
        return null;
      }
    },
    []
  );

  return { fetchDetails, ...state };
}

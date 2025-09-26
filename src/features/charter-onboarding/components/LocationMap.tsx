"use client";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  active: boolean;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

const FALLBACK_CENTER = { lat: 3.139, lng: 101.6869 };

export function LocationMap({
  lat,
  lng,
  active,
  onChange,
  className,
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Helper to (re)inject script if user retries after failure.
  const injectScript = useCallback(() => {
    if (typeof window === "undefined") return;
    // Basic validation: ensure env key present or show explicit error.
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setScriptError("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY env variable.");
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-maps]"
    );
    if (existing) {
      // If an existing script errored previously, remove and re-add
      if ((existing as HTMLElement).dataset.retry !== "1") {
        existing.remove();
      } else {
        return; // already attempting retry
      }
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMaps = "true";
    s.dataset.retry = "1";
    s.addEventListener("load", () => {
      setScriptError(null);
      setLoaded(true);
    });
    s.addEventListener("error", () => {
      setScriptError("Failed to load Google Maps script (network or invalid key).");
    });
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (loaded) return;
    if (scriptError) return; // don't auto re-attempt until user retries
    interface ScriptEl extends HTMLScriptElement { _loaded?: boolean }
    const existing = document.querySelector<ScriptEl>(
      "script[data-google-maps]"
    );
    if (existing) {
      if (existing._loaded) {
        setLoaded(true);
      } else {
        existing.addEventListener(
          "load",
          () => {
            setLoaded(true);
          },
          { once: true }
        );
        existing.addEventListener(
          "error",
          () => {
            setScriptError(
              "Failed to load Google Maps script (network or invalid key)."
            );
          },
          { once: true }
        );
      }
      return;
    }
    injectScript();
  }, [active, loaded, scriptError, injectScript]);

  useEffect(() => {
    if (!active || !loaded || !mapRef.current) return;
    if (mapInstanceRef.current) return;
    interface GWin extends Window { google?: typeof google }
    if (typeof window === "undefined" || typeof (window as GWin).google === "undefined") {
      setScriptError("Google Maps library not available after load (likely blocked or invalid key).");
      return;
    }
    const g = (window as GWin).google as typeof google;
    if (!g?.maps) {
      setScriptError("google.maps namespace missing. Check API key permissions.");
      return;
    }
    try {
      const center = lat && lng ? { lat, lng } : FALLBACK_CENTER;
      const map = new g.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstanceRef.current = map;
      const marker = new g.maps.Marker({
        position: center,
        map,
        draggable: true,
      });
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) onChange(pos.lat(), pos.lng());
      });
      markerRef.current = marker;
    } catch (e) {
      // Surface a friendly message
      setScriptError(
        e instanceof Error ? e.message : "Failed to initialize Google Map."
      );
    }
  }, [active, loaded, lat, lng, onChange]);

  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current) return;
    if (lat == null || lng == null) return;
    const pos = { lat, lng };
    markerRef.current.setPosition(pos);
    mapInstanceRef.current.setCenter(pos);
  }, [lat, lng]);

  if (!active) {
    return (
      <div
        className={clsx(
          "h-64 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 flex items-center justify-center",
          className
        )}
      >
        Enter a starting point to enable the map.
      </div>
    );
  }
  if (scriptError) {
    return (
      <div
        className={clsx(
          "h-72 w-full rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 flex flex-col gap-3",
          className
        )}
      >
        <p className="font-medium">Map unavailable</p>
        <p>{scriptError}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setScriptError(null);
              setLoaded(false);
              injectScript();
            }}
            className="rounded bg-red-600 px-3 py-1 text-white text-xs font-semibold hover:bg-red-500"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
            className="rounded border border-red-400 px-3 py-1 text-red-700 text-xs font-semibold hover:bg-red-100"
          >
            Manage API Keys
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={clsx("space-y-2", className)}>
      <div
        ref={mapRef}
        className="h-72 w-full rounded-xl border border-slate-300"
      />
      <p className="text-xs text-slate-500">
        Drag the pin to fine-tune exact pickup location.
      </p>
    </div>
  );
}

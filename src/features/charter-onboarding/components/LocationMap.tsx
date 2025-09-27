"use client";
import clsx from "clsx";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  active: boolean;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

const FALLBACK_CENTER = { lat: 3.139, lng: 101.6869 };
const DEBUG = process.env.NEXT_PUBLIC_CHARTER_MAP_DEBUG === "1";

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
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    // Use Google's recommended loading pattern with loading=async and callback
    const callbackName = `initMap_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    // Set up the callback function
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      if (DEBUG) console.info("[map] script loaded via callback", s.src);
      setScriptError(null);
      setLoaded(true);
      // Mark the script element so future mounts know it was loaded.
      (s as unknown as { _loaded?: boolean })._loaded = true;
      s.dataset.loaded = "1";
      // Clean up the callback
      delete (window as unknown as Record<string, unknown>)[callbackName];
    };

    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&channel=fishon-onboarding&loading=async&callback=${callbackName}`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMaps = "true";
    s.dataset.retry = "1";
    s.addEventListener("error", () => {
      if (DEBUG) console.error("[map] script tag error", s.src);
      setScriptError(
        "Failed to load Google Maps script (network or invalid key)."
      );
      // Clean up the callback on error
      delete (window as unknown as Record<string, unknown>)[callbackName];
    });
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (loaded) return;
    if (scriptError) return; // don't auto re-attempt until user retries
    interface ScriptEl extends HTMLScriptElement {
      _loaded?: boolean;
    }
    const existing = document.querySelector<ScriptEl>(
      "script[data-google-maps]"
    );
    if (existing) {
      // If script previously loaded OR google namespace already exists mark loaded.
      if (existing._loaded || existing.dataset.loaded === "1") {
        setLoaded(true);
      } else {
        interface GWin extends Window {
          google?: typeof google;
        }
        const gwin = window as GWin;
        if (typeof gwin.google !== "undefined" && gwin.google?.maps) {
          // Defensive: script tag existed before component mount; treat as loaded.
          (existing as ScriptEl)._loaded = true;
          existing.dataset.loaded = "1";
          setLoaded(true);
        } else {
          existing.addEventListener(
            "load",
            () => {
              (existing as ScriptEl)._loaded = true;
              existing.dataset.loaded = "1";
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
      }
      return;
    }
    if (DEBUG) console.info("[map] injecting script...");
    injectScript();
  }, [active, loaded, scriptError, injectScript]);

  // Capture global script/runtime errors referencing Google Maps to surface.
  useEffect(() => {
    if (!active) return;
    const handler = (ev: ErrorEvent) => {
      if (
        typeof ev.message === "string" &&
        ev.message.includes("Google Maps JavaScript API")
      ) {
        if (DEBUG) console.error("[map] window error captured", ev.message);
        setScriptError(ev.message);
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, [active]);

  useEffect(() => {
    if (!active || !loaded || !mapRef.current) return;
    if (mapInstanceRef.current) return;
    interface GWin extends Window {
      google?: typeof google;
    }
    if (typeof window === "undefined") return;
    if (typeof (window as GWin).google === "undefined") {
      if (DEBUG)
        console.warn(
          "[map] google undefined after script load; retrying short delay"
        );
      // Sometimes the script 'load' fires before google namespace attached (rare); give a micro retry window.
      setTimeout(() => {
        if (typeof (window as GWin).google === "undefined") {
          setScriptError(
            "Google Maps library not available after load (likely blocked or invalid key)."
          );
        } else {
          setLoaded((l) => l); // trigger downstream effect
        }
      }, 150);
      return;
    }
    const g = (window as GWin).google as typeof google;
    if (!g?.maps) {
      setScriptError(
        "google.maps namespace missing. Check API key permissions."
      );
      return;
    }
    try {
      const center = lat && lng ? { lat, lng } : FALLBACK_CENTER;
      const map = new g.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        keyboardShortcuts: false,
        streetView: null,
        gestureHandling: "greedy",
        disableDoubleClickZoom: true,
        // Disable controls for a cleaner look
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      if (DEBUG) console.info("[map] map instance created", center);
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
      if (DEBUG) console.error("[map] init error", e);
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
    const staticMapUrl = (() => {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!key) return null;
      const cLat = lat ?? FALLBACK_CENTER.lat;
      const cLng = lng ?? FALLBACK_CENTER.lng;
      return `https://maps.googleapis.com/maps/api/staticmap?center=${cLat},${cLng}&zoom=13&size=600x300&markers=color:red|${cLat},${cLng}&key=${key}`;
    })();
    return (
      <div
        className={clsx(
          "h-72 w-full rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 flex flex-col gap-3",
          className
        )}
      >
        <p className="font-medium">Map unavailable</p>
        <p>{scriptError}</p>
        {staticMapUrl && (
          <div className="relative h-40 w-full max-w-full rounded border border-red-200 overflow-hidden">
            <Image
              src={staticMapUrl}
              alt="Static map fallback"
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}
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
            onClick={() =>
              window.open(
                "https://console.cloud.google.com/apis/credentials",
                "_blank"
              )
            }
            className="rounded border border-red-400 px-3 py-1 text-red-700 text-xs font-semibold hover:bg-red-100"
          >
            Manage API Keys
          </button>
          {DEBUG && (
            <button
              type="button"
              onClick={() => {
                console.group("[map debug]");
                console.log("active", active, "loaded", loaded);
                console.log("lat", lat, "lng", lng);
                const el = document.querySelector("script[data-google-maps]");
                console.log("script tag", el?.getAttribute("src"));
                interface GWin extends Window {
                  google?: typeof google;
                }
                console.log(
                  "google defined?",
                  typeof (window as GWin).google !== "undefined"
                );
                console.groupEnd();
              }}
              className="rounded border border-red-400 px-3 py-1 text-red-700 text-xs font-semibold hover:bg-red-100"
            >
              Debug Log
            </button>
          )}
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

"use client";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (!active) return;
    if (loaded) return;
    interface ScriptWithLoaded extends HTMLScriptElement {
      _loaded?: boolean;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-maps]"
    ) as ScriptWithLoaded | null;
    if (existing) {
      if (existing._loaded) {
        setLoaded(true);
      } else {
        existing.addEventListener("load", () => setLoaded(true), {
          once: true,
        });
      }
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    s.async = true;
    s.defer = true;
    (s as ScriptWithLoaded)._loaded = false;
    s.dataset.googleMaps = "true";
    s.addEventListener("load", () => {
      (s as ScriptWithLoaded)._loaded = true;
      setLoaded(true);
    });
    document.head.appendChild(s);
  }, [active, loaded]);

  useEffect(() => {
    if (!active || !loaded || !mapRef.current) return;
    if (mapInstanceRef.current) return;
    const center = lat && lng ? { lat, lng } : FALLBACK_CENTER;
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;
    const marker = new google.maps.Marker({
      position: center,
      map,
      draggable: true,
    });
    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) onChange(pos.lat(), pos.lng());
    });
    markerRef.current = marker;
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

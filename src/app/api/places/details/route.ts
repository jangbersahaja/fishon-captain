import { env } from "@/lib/env";
import { applySecurityHeaders } from "@/lib/headers";
import { NextResponse } from "next/server";

const API_KEY = env.GOOGLE_PLACES_API_KEY;

export async function GET(request: Request) {
  if (!API_KEY) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Server not configured" }, { status: 500 })
    );
  }
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  if (!placeId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "placeId is required" }, { status: 400 })
    );
  }
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "geometry,name,address_component,formatted_address",
    key: API_KEY,
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Upstream error" }, { status: 502 })
      );
    }
    const data = await res.json();
    const result = data?.result;
    const geometry = result?.geometry?.location;
    const addressComponents = result?.address_components ?? [];
    const formattedAddress = result?.formatted_address ?? null;
    return applySecurityHeaders(
      NextResponse.json(
        {
          location: geometry
            ? { lat: geometry.lat as number, lng: geometry.lng as number }
            : null,
          name: result?.name ?? null,
          addressComponents,
          formattedAddress,
        },
        { status: 200 }
      )
    );
  } catch (e) {
    console.error("Place details error", e);
    return applySecurityHeaders(
      NextResponse.json({ error: "Request failed" }, { status: 500 })
    );
  }
}

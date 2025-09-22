import { NextResponse } from "next/server";

// Note: Ensure you have enabled Places API in Google Cloud Console and set GOOGLE_PLACES_API_KEY in env.
// This endpoint keeps the API key server-side. Frontend calls: /api/places/autocomplete?input=Jetty+Langkawi

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  // We don't throw at import time in production builds — runtime guard in handler.
  console.warn(
    "GOOGLE_PLACES_API_KEY is not set. /api/places/autocomplete will return 500."
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input");
  const sessionToken = searchParams.get("sessiontoken"); // optional to group keystrokes
  const region = searchParams.get("region") ?? "my"; // default Malaysia

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  if (!input || !input.trim()) {
    return NextResponse.json({ predictions: [] });
  }

  const params = new URLSearchParams({
    input: input.trim(),
    key: API_KEY,
    language: "en",
    components: "country:my", // restrict to Malaysia; adjust if needed
  });
  if (sessionToken) params.set("sessiontoken", sessionToken);
  if (region) params.set("region", region);

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
    interface GoogleAutocompletePrediction {
      description: string;
      place_id: string;
      types?: string[];
      structured_formatting?: unknown;
    }
    const data: { predictions?: GoogleAutocompletePrediction[] } =
      await res.json();
    // Only return essentials
    const predictions = (data.predictions || []).map((p) => ({
      description: p.description,
      place_id: p.place_id,
      types: p.types,
      structured_formatting: p.structured_formatting,
    }));
    return NextResponse.json({ predictions }, { status: 200 });
  } catch (e) {
    console.error("Places autocomplete error", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

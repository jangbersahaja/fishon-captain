import { NextRequest, NextResponse } from "next/server";

// Lightweight thumbnail derivation for known video providers.
// For YouTube: derive img.youtube.com URL.
// For Vimeo: we return a placeholder (could be extended to call oEmbed if allowed).
// For direct MP4/WebM: return null (client will fallback to video URL or default image).

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  if (!url) {
    return NextResponse.json({ thumbnailUrl: null }, { status: 200 });
  }
  try {
    let thumbnailUrl: string | null = null;
    if (/youtube.com|youtu.be/.test(url)) {
      const id =
        url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)/)?.[1] ||
        url.split("/").pop();
      if (id) thumbnailUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    } else if (/vimeo.com/.test(url)) {
      // Could call Vimeo oEmbed; to keep server lightweight, provide generic placeholder for now.
      thumbnailUrl = null;
    }
    return NextResponse.json({ thumbnailUrl });
  } catch {
    return NextResponse.json({ thumbnailUrl: null }, { status: 200 });
  }
}

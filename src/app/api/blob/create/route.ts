// POST /api/blob/create
// Issues a direct upload URL for Vercel Blob for a forthcoming 30s trimmed clip.
import { CreateUploadSchema } from "@fishon/schemas";
import { NextRequest, NextResponse } from "next/server";
// NOTE: Depending on @vercel/blob version, generateUploadURL may reside under '@vercel/blob' root export.
// If this import continues to error, consider dynamic import or upgrading the package.

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = CreateUploadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  // With current @vercel/blob API we don't have generateUploadURL helper; we'll let client PUT directly is not trivial without exposing token.
  // Interim: client will upload via forthcoming /api/blob/upload route which calls put(). Return a provisional blobKey the client must echo back.
  const { fileName, fileType } = parsed.data;
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const safeFileName = fileName ?? "unnamed";
  const sanitized = safeFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobKey = `captain-videos/${unique}-${sanitized}`;
  return NextResponse.json({
    uploadUrl: "/api/blob/upload",
    blobKey,
    fileType,
  });
}

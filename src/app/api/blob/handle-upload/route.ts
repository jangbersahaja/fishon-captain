// POST /api/blob/handle-upload
// Issues a short-lived client token so the browser can upload directly to Vercel Blob.
import authOptions from "@/lib/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  // Authenticate user before issuing token
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    console.warn("[blob/handle-upload] unauthorized - no valid session");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Parse JSON body from the client upload() call
  const body = (await request
    .json()
    .catch(() => null)) as HandleUploadBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Authorize uploads by the authenticated user.
        return {
          // Allow videos and images
          allowedContentTypes: [
            // Videos
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/ogg",
            "video/3gpp",
            "video/x-m4v",
            // Images
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
            "image/heic",
            "image/heif",
          ],
          addRandomSuffix: false, // we control the key/pathname from the client
          tokenPayload: JSON.stringify({
            userId: session.user.id,
          }),
        };
      },
      // Note: onUploadCompleted removed - we use /api/blob/finish for post-upload processing
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

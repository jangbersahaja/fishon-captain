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
        // Optionally, validate clientPayload (e.g., docType/charterId) here.
        return {
          // Restrict to videos; extend if needed
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/ogg",
            "video/3gpp",
            "video/x-m4v",
          ],
          addRandomSuffix: false, // we control the key/pathname from the client
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            // Pass-thru fields can be added if you want them echoed in onUploadCompleted
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: observe completed uploads. The pipeline continues via /api/blob/finish.
        console.log("[blob] client upload completed", {
          url: blob.url,
          pathname: blob.pathname,
          tokenPayload,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

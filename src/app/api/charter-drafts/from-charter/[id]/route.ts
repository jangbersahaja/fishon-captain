import { applySecurityHeaders } from "@/lib/headers";
import { NextResponse } from "next/server";

export async function POST() {
  return applySecurityHeaders(
    NextResponse.json(
      { error: "deprecated", message: "Edit drafts disabled" },
      { status: 410 }
    )
  );
}

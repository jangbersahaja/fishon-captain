import { NextResponse } from "next/server";

export function GET(req: Request) {
  const src = new URL(req.url);
  const dest = new URL(`/captain/form${src.search}`, src.origin);
  return NextResponse.redirect(dest);
}

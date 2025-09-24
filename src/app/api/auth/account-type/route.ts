import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Lightweight endpoint to determine if an email corresponds to an OAuth-only account
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ exists: false, oauthOnly: false });
    const oauthAccounts = await prisma.account.findMany({
      where: { userId: user.id, provider: { not: "credentials" } },
      select: { id: true },
      take: 1,
    });
    const oauthOnly = !!oauthAccounts.length && !user.passwordHash;
    return NextResponse.json({ exists: true, oauthOnly });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

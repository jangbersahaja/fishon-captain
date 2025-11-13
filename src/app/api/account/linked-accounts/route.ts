/**
 * GET /api/account/linked-accounts
 * Fetch user's linked OAuth accounts
 * - Must be authenticated
 * - Returns list of linked providers with metadata
 */

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        passwordHash: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accounts = user.accounts.map((account) => ({
      provider: account.provider,
      email: session.user.email || "",
      linkedAt: new Date().toISOString(), // Use current timestamp since createdAt not available
    }));

    return NextResponse.json({
      accounts,
      hasPassword: !!user.passwordHash,
    });
  } catch (error) {
    console.error("[linked-accounts] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch linked accounts" },
      { status: 500 }
    );
  }
}

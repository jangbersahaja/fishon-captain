/**
 * DELETE /api/account/link-oauth/unlink
 * Unlink OAuth account from user
 * - Must be authenticated
 * - Must have password set (cannot unlink if OAuth-only account)
 * - Removes Account record for specified provider
 */

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { provider } = body;

    if (provider !== "google") {
      return NextResponse.json(
        { error: "Only Google OAuth unlinking is supported" },
        { status: 400 }
      );
    }

    // Verify user has password (cannot unlink if OAuth-only account)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
        accounts: {
          where: { provider },
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Cannot unlink OAuth account. You must set a password first to maintain account access.",
        },
        { status: 400 }
      );
    }

    const linkedAccount = user.accounts.find((a) => a.provider === provider);
    if (!linkedAccount) {
      return NextResponse.json(
        { error: "Google account is not linked" },
        { status: 400 }
      );
    }

    // Delete the Account record
    await prisma.account.delete({
      where: { id: linkedAccount.id },
    });

    console.info("[link-oauth] Successfully unlinked account", {
      userId: user.id,
      provider,
    });

    return NextResponse.json({
      success: true,
      message: "Google account unlinked successfully",
    });
  } catch (error) {
    console.error("[link-oauth] unlink error:", error);
    return NextResponse.json(
      { error: "Failed to unlink OAuth account" },
      { status: 500 }
    );
  }
}

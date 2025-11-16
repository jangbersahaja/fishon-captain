/**
 * POST /api/account/link-oauth/initiate
 * Step 1: User initiates OAuth account linking
 * - Must be authenticated with email/password
 * - Creates a secure linking token
 * - Returns OAuth authorization URL with state parameter
 */

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists and has password (not OAuth-only account)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
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

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Account linking only available for email/password accounts" },
        { status: 400 }
      );
    }

    // Check if Google account already linked
    const hasGoogleAccount = user.accounts.some((a) => a.provider === "google");
    if (hasGoogleAccount) {
      return NextResponse.json(
        { error: "Google account already linked" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { provider } = body;

    if (provider !== "google") {
      return NextResponse.json(
        { error: "Only Google OAuth linking is supported" },
        { status: 400 }
      );
    }

    // Generate secure linking token (expires in 10 minutes)
    const linkingToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store linking token in database (you may want to create a LinkingToken table)
    // For now, we'll use a simple approach with session storage
    // In production, store in Redis or database table
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // Store linking token in user record temporarily
        // You may want to create a separate LinkingToken table for better security
        resetPasswordToken: linkingToken, // Repurposing for linking token
        resetPasswordExpires: expiresAt,
      },
    });

    // Generate OAuth authorization URL with state parameter
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/account/link-oauth/callback`;
    
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        token: linkingToken,
        provider,
      })
    ).toString("base64");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: googleClientId!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    }).toString()}`;

    return NextResponse.json({
      success: true,
      authUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[link-oauth] initiate error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth linking" },
      { status: 500 }
    );
  }
}

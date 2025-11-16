/**
 * GET /api/account/link-oauth/callback
 * Step 2: OAuth provider redirects back with authorization code
 * - Validates state parameter and linking token
 * - Exchanges code for OAuth tokens
 * - Links OAuth account to existing user
 * - Redirects to account settings with success/error message
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/captain/account/settings?linkError=${encodeURIComponent(error === "access_denied" ? "You cancelled the linking process" : "OAuth authorization failed")}`,
          req.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Invalid+callback+parameters",
          req.url
        )
      );
    }

    // Decode and validate state parameter
    let stateData: { userId: string; token: string; provider: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Invalid+state+parameter",
          req.url
        )
      );
    }

    const { userId, token, provider } = stateData;

    if (provider !== "google") {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Unsupported+provider",
          req.url
        )
      );
    }

    // Verify linking token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        resetPasswordToken: true,
        resetPasswordExpires: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/captain/account/settings?linkError=User+not+found", req.url)
      );
    }

    if (!user.passwordHash) {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Invalid+account+type",
          req.url
        )
      );
    }

    if (user.resetPasswordToken !== token) {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Invalid+linking+token",
          req.url
        )
      );
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Linking+token+expired",
          req.url
        )
      );
    }

    // Check if Google account already linked
    const hasGoogleAccount = user.accounts.some((a) => a.provider === "google");
    if (hasGoogleAccount) {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Google+account+already+linked",
          req.url
        )
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/account/link-oauth/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error(
        "[link-oauth] Token exchange failed:",
        await tokenResponse.text()
      );
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Failed+to+exchange+authorization+code",
          req.url
        )
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      console.error("[link-oauth] User info fetch failed");
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Failed+to+fetch+user+info",
          req.url
        )
      );
    }

    const googleUser = await userInfoResponse.json();

    // Security check: Verify email matches
    if (googleUser.email !== user.email) {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=Google+email+does+not+match+your+account+email",
          req.url
        )
      );
    }

    // Check if this Google account is already linked to another user
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleUser.id,
        },
      },
    });

    if (existingAccount) {
      return NextResponse.redirect(
        new URL(
          "/captain/account/settings?linkError=This+Google+account+is+already+linked+to+another+user",
          req.url
        )
      );
    }

    // Create Account record (link OAuth to user)
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: "google",
        providerAccountId: googleUser.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in
          ? Math.floor(Date.now() / 1000) + tokens.expires_in
          : null,
        token_type: tokens.token_type,
        scope: tokens.scope,
        id_token: tokens.id_token,
      },
    });

    // Clear linking token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    console.info("[link-oauth] Successfully linked Google account", {
      userId: user.id,
      googleEmail: googleUser.email,
    });

    return NextResponse.redirect(
      new URL(
        "/captain/account/settings?linkSuccess=Google+account+linked+successfully",
        req.url
      )
    );
  } catch (error) {
    console.error("[link-oauth] callback error:", error);
    return NextResponse.redirect(
      new URL(
        "/captain/account/settings?linkError=An+unexpected+error+occurred",
        req.url
      )
    );
  }
}

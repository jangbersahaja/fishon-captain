/**
 * DEBUG: Test password hashing and comparison
 * This endpoint is for debugging password issues
 */

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password, hash } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // If hash provided, test comparison
    if (hash) {
      const isValid = await bcrypt.compare(password, hash);
      return NextResponse.json({
        password,
        hash,
        isValid,
        message: isValid
          ? "Password matches hash"
          : "Password does not match hash",
      });
    }

    // Otherwise, create a hash with 12 rounds (same as production)
    const newHash = await bcrypt.hash(password, 12);
    const testComparison = await bcrypt.compare(password, newHash);

    return NextResponse.json({
      password,
      generatedHash: newHash,
      testComparison,
      message: testComparison
        ? "Hash generation working correctly"
        : "Hash generation failed",
    });
  } catch (error) {
    console.error("[test-password] Error:", error);
    return NextResponse.json(
      { error: "Failed to test password", details: (error as Error).message },
      { status: 500 }
    );
  }
}

import { createOTP } from "@/lib/auth/otp";
import { sendVerificationOTP } from "@/lib/email";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import type { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

interface SignupBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

export async function POST(req: Request) {
  let body: SignupBody = {};
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    );
  }
  const { email, password, firstName, lastName } = body;

  // Trim and validate fields
  const trimmedEmail = email?.trim();
  const trimmedPassword = password?.trim();
  const trimmedFirstName = firstName?.trim();
  const trimmedLastName = lastName?.trim();

  if (
    !trimmedEmail ||
    !trimmedPassword ||
    !trimmedFirstName ||
    !trimmedLastName
  ) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            "Missing required fields: email, password, firstName, lastName",
        },
        { status: 400 }
      )
    );
  }

  const normalizedEmail = trimmedEmail.toLowerCase();

  // Rate limiting: 3 signup attempts per hour per IP
  const rateLimitResult = await rateLimit({
    key: `signup:${normalizedEmail}`,
    windowMs: 60 * 60 * 1000,
    max: 3,
  });

  if (!rateLimitResult.allowed) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      )
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Email already in use" }, { status: 409 })
    );
  }
  const passwordHash = await hash(trimmedPassword, 12);
  const compositeName = `${trimmedFirstName} ${trimmedLastName}`.trim();
  const createData: Prisma.UserCreateInput = {
    email: normalizedEmail,
    passwordHash,
    name: compositeName,
    firstName: trimmedFirstName,
    lastName: trimmedLastName,
    role: "CAPTAIN", // default
    // emailVerified is null by default (unverified), set to DateTime after OTP verification
  };

  // Create user with unverified email
  const user = await prisma.user.create({
    data: createData,
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  // Create CaptainProfile immediately after user creation
  const displayName =
    body.displayName?.trim() || `${trimmedFirstName} ${trimmedLastName}`.trim();
  // Only create if not exists (should always be new)
  await prisma.captainProfile.create({
    data: {
      userId: user.id,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      displayName,
      phone: "", // can be updated later
      bio: "",
      experienceYrs: 0,
      avatarUrl: null,
    },
  });

  // Generate and send OTP
  const otpResult = await createOTP(user.email, "email_verification");
  if (!otpResult.success || !otpResult.code) {
    // Failed to create OTP, but user created - still return success
    // User can request resend from verification page
    console.error("[signup] Failed to generate OTP:", otpResult.error);
    return applySecurityHeaders(
      NextResponse.json({
        ok: true,
        id: user.id,
        requiresVerification: true,
        email: user.email,
      })
    );
  }

  // Send verification email
  const emailSent = await sendVerificationOTP(
    user.email,
    user.firstName || "there",
    otpResult.code
  );

  if (!emailSent) {
    console.error("[signup] Failed to send verification email");
  }

  return applySecurityHeaders(
    NextResponse.json({
      ok: true,
      id: user.id,
      requiresVerification: true,
      email: user.email,
    })
  );
}

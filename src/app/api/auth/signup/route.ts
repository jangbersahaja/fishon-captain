import { createOTP } from "@/lib/auth/otp";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import {
  sendVerificationCode,
  sendWelcomeEmail,
} from "@/lib/services/email-service";
import {
  onInviteeRegistered,
  validateReferralCode,
} from "@/lib/services/referral-service";
import type { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

interface SignupBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  referralCode?: string;
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

  // Process referral attribution if referral code provided
  if (body.referralCode) {
    try {
      const validation = await validateReferralCode(
        body.referralCode,
        normalizedEmail,
        user.id
      );
      if (validation.valid && validation.referralCodeId) {
        // Find the pending referral for this code (created on click)
        const pendingReferral = await prisma.referral.findFirst({
          where: {
            referralCodeId: validation.referralCodeId,
            status: "PENDING",
            inviteeId: null,
          },
          orderBy: { createdAt: "desc" },
        });

        if (pendingReferral) {
          // Update existing referral
          await onInviteeRegistered({
            referralId: pendingReferral.id,
            inviteeId: user.id,
            inviteeEmail: normalizedEmail,
          });
          console.log(
            `[signup] Referral attributed: ${body.referralCode} -> ${user.id}`
          );
        } else {
          // No pending referral from click, create direct attribution
          // This handles case where user manually enters code without clicking link
          const referralCode = await prisma.referralCode.findUnique({
            where: { code: body.referralCode.toUpperCase() },
          });
          if (referralCode) {
            const newReferral = await prisma.referral.create({
              data: {
                referralCodeId: referralCode.id,
                invitorId: referralCode.ownerId,
                inviteeId: user.id,
                inviteeEmail: normalizedEmail,
                status: "REGISTERED",
                registeredAt: new Date(),
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
              },
            });
            // Update user's referredById
            await prisma.user.update({
              where: { id: user.id },
              data: { referredById: referralCode.ownerId },
            });
            // Increment signup count
            await prisma.referralCode.update({
              where: { id: referralCode.id },
              data: { signupCount: { increment: 1 } },
            });
            console.log(
              `[signup] Direct referral created: ${body.referralCode} -> ${user.id}, referral: ${newReferral.id}`
            );
          }
        }
      }
    } catch (referralError) {
      // Log but don't fail signup if referral processing fails
      console.error("[signup] Referral processing error:", referralError);
    }
  }

  // Send welcome email to captain
  await sendWelcomeEmail({
    to: user.email,
    captainName: displayName,
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://fishon-captain.vercel.app"}/captain/login`,
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
  const emailSent = await sendVerificationCode({
    to: user.email,
    userName: user.firstName || "there",
    code: otpResult.code,
    purpose: "registration",
    expiryMinutes: 5,
  });

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

/**
 * Email Service - @fishon/email Integration
 *
 * This service uses the new @fishon/email package with React Email templates.
 * Replaces legacy email templates from src/lib/email.ts
 *
 * Migration Date: October 28, 2025
 * Package: @fishon/email (git+https://github.com/jangbersahaja/fishon-email)
 */

import {
  renderBookingConfirmedCaptainEmail,
  renderBookingReceivedCaptainEmail,
  renderCharterRegistrationEmail,
  renderPasswordChangedEmail,
  renderVerificationCodeEmail,
  renderWelcomeEmail,
} from "@fishon/email";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

const FROM_EMAIL = process.env.EMAIL_FROM || "no-reply@fishon.my";
const SMTP_HOST = process.env.SMTP_HOST || "smtppro.zoho.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

let transporter: Transporter | null = null;

if (SMTP_USER && SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  console.info("[email-service] Zoho SMTP transporter initialized");
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.warn("[email-service] SMTP not configured - email would be sent:", {
      to: options.to,
      subject: options.subject,
    });
    return true;
  }

  try {
    const result = await transporter.sendMail({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
    });

    console.info("[email-service] Email sent successfully via Zoho SMTP", {
      to: options.to,
      subject: options.subject,
      messageId: result.messageId,
    });

    return true;
  } catch (error) {
    console.error("[email-service] Failed to send email", {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ============================================================================
// CHARTER REGISTRATION & ONBOARDING
// ============================================================================

interface SendCharterRegistrationParams {
  to: string;
  captainName: string;
  charterName: string;
  dashboardUrl: string;
  ccAdmin?: string; // Optional CC to admin
}

export async function sendCharterRegistration(
  params: SendCharterRegistrationParams
) {
  const html = await renderCharterRegistrationEmail({
    captainName: params.captainName,
    charterName: params.charterName,
    dashboardUrl: params.dashboardUrl,
  });

  const mailOptions: EmailOptions = {
    to: params.to,
    subject: "Charter Registration Successful - Get Started",
    html,
    cc: params.ccAdmin,
  };

  return sendEmail(mailOptions);
}

// ============================================================================
// BOOKING EMAILS (CAPTAIN)
// ============================================================================

interface SendBookingReceivedCaptainParams {
  to: string;
  captainName: string;
  charterName: string;
  anglerName: string;
  tripName: string;
  tripDate: string;
  tripDays: number;
  durationHours: number;
  startTime?: string;
  totalPrice: string;
  bookingUrl: string;
}

export async function sendBookingReceivedCaptainEmail(
  params: SendBookingReceivedCaptainParams
) {
  const html = await renderBookingReceivedCaptainEmail({
    captainName: params.captainName,
    charterName: params.charterName,
    anglerName: params.anglerName,
    tripName: params.tripName,
    tripDate: params.tripDate,
    tripDays: params.tripDays,
    durationHours: params.durationHours,
    startTime: params.startTime,
    totalPrice: params.totalPrice,
    bookingUrl: params.bookingUrl,
  });

  return sendEmail({
    to: params.to,
    subject: `New Booking Request - ${params.charterName}`,
    html,
  });
}

interface SendBookingConfirmedCaptainParams {
  to: string;
  captainName: string;
  charterName: string;
  tripName: string;
  tripDate: string;
  tripDays: number;
  durationHours: number;
  startTime?: string;
  finalPrice: string;
  anglerName: string;
  anglerEmail: string;
  anglerPhone: string;
  bookingUrl: string;
}

export async function sendBookingConfirmedCaptainEmail(
  params: SendBookingConfirmedCaptainParams
) {
  const html = await renderBookingConfirmedCaptainEmail({
    captainName: params.captainName,
    charterName: params.charterName,
    tripName: params.tripName,
    tripDate: params.tripDate,
    tripDays: params.tripDays,
    durationHours: params.durationHours,
    startTime: params.startTime,
    finalPrice: params.finalPrice,
    anglerName: params.anglerName,
    anglerEmail: params.anglerEmail,
    anglerPhone: params.anglerPhone,
    bookingUrl: params.bookingUrl,
  });

  return sendEmail({
    to: params.to,
    subject: `Booking Confirmed - ${params.charterName}`,
    html,
  });
}

interface SendWelcomeParams {
  to: string;
  captainName: string;
  loginUrl: string;
}

export async function sendWelcomeEmail(params: SendWelcomeParams) {
  const html = await renderWelcomeEmail({
    userName: params.captainName,
    userType: "captain",
    loginUrl: params.loginUrl,
  });

  return sendEmail({
    to: params.to,
    subject: "Welcome to Fishon Captain!",
    html,
  });
}

// ============================================================================
// VERIFICATION & AUTH EMAILS
// ============================================================================

interface SendVerificationCodeParams {
  to: string;
  userName?: string;
  code: string;
  purpose: "registration" | "login" | "forgot_password" | "profile_update";
  expiryMinutes?: number;
}

export async function sendVerificationCode(params: SendVerificationCodeParams) {
  const html = await renderVerificationCodeEmail({
    userName: params.userName,
    code: params.code,
    purpose:
      params.purpose === "profile_update"
        ? "email_verification"
        : params.purpose,
    expiryMinutes: params.expiryMinutes || 5,
  });

  const subjects = {
    registration: "Your Captain Registration Code",
    login: "Your Captain Login Code",
    forgot_password: "Reset Your Captain Password",
    profile_update: "Verify Your Profile Update",
  };

  return sendEmail({
    to: params.to,
    subject: subjects[params.purpose],
    html,
  });
}

interface SendPasswordChangedParams {
  to: string;
  userName: string;
  changeType: "reset" | "changed";
  timestamp: string;
}

export async function sendPasswordChangedEmail(
  params: SendPasswordChangedParams
) {
  const html = await renderPasswordChangedEmail({
    userName: params.userName,
    changeType: params.changeType,
    timestamp: params.timestamp,
    supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
  });

  const subject =
    params.changeType === "reset"
      ? "Your Captain Password Was Reset"
      : "Your Captain Password Was Changed";

  return sendEmail({
    to: params.to,
    subject,
    html,
  });
}

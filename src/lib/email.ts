/**
 * Email service using Zoho SMTP via nodemailer
 */

import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

const FROM_EMAIL = process.env.EMAIL_FROM || "no-reply@fishon.my";
const APP_NAME = "Fishon Captain";

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

  console.info("[email] Zoho SMTP transporter initialized");
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.warn("[email] SMTP not configured - email would be sent:", {
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
    });

    console.info("[email] Email sent successfully via Zoho SMTP", {
      to: options.to,
      subject: options.subject,
      messageId: result.messageId,
    });

    return true;
  } catch (error) {
    console.error("[email] Failed to send email", {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function sendVerificationOTP(
  email: string,
  firstName: string,
  code: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ec2227 0%, #c81e23 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${APP_NAME}!</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${firstName},</p>
          
          <p style="font-size: 16px;">Thank you for signing up! To complete your registration, please enter this verification code:</p>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #fef2f2; border-radius: 8px; border: 2px dashed #ec2227;">
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ec2227; font-family: monospace;">${code}</div>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            <strong>Security Note:</strong><br>
            • This code expires in 5 minutes<br>
            • Never share this code with anyone
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Best regards,<br>
            The ${APP_NAME} Team
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Your ${APP_NAME} verification code`,
    html,
  });
}

export async function sendPasswordResetOTP(
  email: string,
  firstName: string,
  code: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ec2227 0%, #c81e23 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${firstName},</p>
          
          <p style="font-size: 16px;">We received a request to reset your password. Enter this code to reset it:</p>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #fef2f2; border-radius: 8px; border: 2px dashed #ec2227;">
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ec2227; font-family: monospace;">${code}</div>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            <strong>Security Note:</strong><br>
            • This code expires in 5 minutes<br>
            • If you didn't request this, ignore this email
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html,
  });
}

export async function sendPasswordChangedNotification(
  email: string,
  firstName: string,
  changeSource: "reset" | "change" = "change"
): Promise<boolean> {
  const action = changeSource === "reset" ? "reset" : "changed";

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ec2227 0%, #c81e23 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password ${
            action.charAt(0).toUpperCase() + action.slice(1)
          }</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${firstName},</p>
          
          <p style="font-size: 16px;">Your ${APP_NAME} password was successfully ${action}.</p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #166534;"><strong>✓ Password ${
              action.charAt(0).toUpperCase() + action.slice(1)
            } Successfully</strong></p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
            <p style="font-size: 14px; color: #991b1b; margin: 0;"><strong>⚠️ Didn't ${action} your password?</strong></p>
            <p style="font-size: 14px; color: #991b1b; margin: 10px 0 0 0;">
              If you didn't make this change, contact support immediately.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Your ${APP_NAME} password was ${action}`,
    html,
  });
}

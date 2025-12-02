/**
 * Referral Webhook Handler
 *
 * POST - Process referral events from fishon-market
 *
 * Events:
 * - invitee.registered: New captain registered with referral
 * - invitee.charter_created: Invitee created their first charter
 * - invitee.first_booking: Invitee received their first booking
 * - invitee.trip_completed: Invitee's first trip completed (triggers commission)
 */

import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  sendReferralCommissionEarnedEmail,
  sendReferralSignupEmail,
} from "@/lib/services/email-service";
import {
  getReferralEarnings,
  onInviteeCharterCreated,
  onInviteeFirstBooking,
  onInviteeFirstTripCompleted,
  onInviteeRegistered,
} from "@/lib/services/referral-service";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Webhook secret for verification (shared with fishon-market)
const WEBHOOK_SECRET = process.env.CAPTAIN_API_SECRET;

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  if (!WEBHOOK_SECRET || !signature) {
    return false;
  }

  // Simple HMAC verification
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === signature;
}

/**
 * POST /api/webhooks/referral
 *
 * Process referral lifecycle events
 */
export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const signature = headersList.get("x-webhook-signature");

    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify signature (skip in development)
    if (process.env.NODE_ENV === "production") {
      const isValid = await verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        logger.warn("referral_webhook_invalid_signature", {
          signature: signature?.substring(0, 10) + "...",
        });
        return applySecurityHeaders(
          NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        );
      }
    }

    // Parse body
    let body: {
      event: string;
      data: Record<string, unknown>;
      timestamp: string;
    };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return applySecurityHeaders(
        NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      );
    }

    const { event, data, timestamp } = body;

    logger.info("referral_webhook_received", {
      event,
      timestamp,
      dataKeys: Object.keys(data || {}),
    });

    // Process event
    switch (event) {
      case "invitee.registered": {
        const { referralId, inviteeId, inviteeEmail, inviteeName } = data as {
          referralId: string;
          inviteeId: string;
          inviteeEmail: string;
          inviteeName?: string;
        };

        if (!referralId || !inviteeId || !inviteeEmail) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Missing required fields" },
              { status: 400 }
            )
          );
        }

        const referral = await onInviteeRegistered({
          referralId,
          inviteeId,
          inviteeEmail,
        });

        // Send email notification to invitor
        try {
          const invitor = await prisma.user.findUnique({
            where: { id: referral.invitorId },
            include: {
              captainProfile: true,
              referralsGiven: { select: { id: true } },
            },
          });

          if (invitor?.email) {
            await sendReferralSignupEmail({
              to: invitor.email,
              invitorName:
                invitor.captainProfile?.displayName ||
                invitor.name ||
                "Captain",
              inviteeName: inviteeName || inviteeEmail.split("@")[0],
              registeredAt: new Date().toLocaleDateString("en-MY", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              totalReferrals: invitor.referralsGiven.length,
            });
            logger.info("referral_signup_email_sent", {
              invitorId: invitor.id,
              inviteeId,
            });
          }
        } catch (emailError) {
          logger.error("referral_signup_email_failed", {
            error:
              emailError instanceof Error
                ? emailError.message
                : "Unknown error",
          });
          // Don't fail the webhook for email errors
        }

        logger.info("referral_invitee_registered", {
          referralId,
          inviteeId,
        });
        break;
      }

      case "invitee.charter_created": {
        const { inviteeId, charterId } = data as {
          inviteeId: string;
          charterId: string;
        };

        if (!inviteeId || !charterId) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Missing required fields" },
              { status: 400 }
            )
          );
        }

        await onInviteeCharterCreated({
          inviteeId,
          charterId,
        });

        logger.info("referral_charter_created", {
          inviteeId,
          charterId,
        });
        break;
      }

      case "invitee.first_booking": {
        const { inviteeId, bookingId } = data as {
          inviteeId: string;
          bookingId: string;
        };

        if (!inviteeId || !bookingId) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Missing required fields" },
              { status: 400 }
            )
          );
        }

        await onInviteeFirstBooking({
          inviteeId,
          bookingId,
        });

        logger.info("referral_first_booking", {
          inviteeId,
          bookingId,
        });
        break;
      }

      case "invitee.trip_completed": {
        const { inviteeId, bookingId, captainEarnings, tripName } = data as {
          inviteeId: string;
          bookingId: string;
          captainEarnings: number;
          tripName?: string;
        };

        if (!inviteeId || !bookingId || captainEarnings === undefined) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Missing required fields" },
              { status: 400 }
            )
          );
        }

        const earning = await onInviteeFirstTripCompleted({
          inviteeId,
          bookingId,
          captainEarnings,
        });

        if (earning) {
          logger.info("referral_commission_created", {
            inviteeId,
            bookingId,
            commissionAmount: Number(earning.commissionAmount),
          });

          // Send commission earned email to invitor
          try {
            const referral = await prisma.referral.findUnique({
              where: { inviteeId },
              include: {
                invitor: {
                  include: {
                    captainProfile: true,
                  },
                },
                invitee: {
                  include: {
                    captainProfile: true,
                  },
                },
              },
            });

            if (referral?.invitor?.email) {
              // Get earnings summary for the invitor
              const earningsSummary = await getReferralEarnings({
                earnerId: referral.invitorId,
              });

              const formatCurrency = (amount: number) =>
                `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

              await sendReferralCommissionEarnedEmail({
                to: referral.invitor.email,
                invitorName:
                  referral.invitor.captainProfile?.displayName ||
                  referral.invitor.name ||
                  "Captain",
                inviteeName:
                  referral.invitee?.captainProfile?.displayName ||
                  referral.invitee?.name ||
                  "New Captain",
                tripName: tripName || "Fishing Trip",
                tripEarnings: formatCurrency(captainEarnings),
                commissionAmount: formatCurrency(
                  Number(earning.commissionAmount)
                ),
                totalReferralEarnings: formatCurrency(
                  earningsSummary.summary.totalEarned
                ),
                pendingEarnings: formatCurrency(
                  earningsSummary.summary.totalPending
                ),
                earnedAt: new Date().toLocaleDateString("en-MY", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              });
              logger.info("referral_commission_email_sent", {
                invitorId: referral.invitorId,
                inviteeId,
                commissionAmount: Number(earning.commissionAmount),
              });
            }
          } catch (emailError) {
            logger.error("referral_commission_email_failed", {
              error:
                emailError instanceof Error
                  ? emailError.message
                  : "Unknown error",
            });
            // Don't fail the webhook for email errors
          }
        }
        break;
      }

      default:
        logger.warn("referral_webhook_unknown_event", { event });
        return applySecurityHeaders(
          NextResponse.json({ error: "Unknown event type" }, { status: 400 })
        );
    }

    return applySecurityHeaders(NextResponse.json({ success: true, event }));
  } catch (error) {
    logger.error("referral_webhook_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

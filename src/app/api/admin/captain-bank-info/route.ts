import authOptions from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/server/audit";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/captain-bank-info
 *
 * Admin endpoint to add/update bank information for a captain.
 * Used when a captain has pending payouts but missing bank details.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, bankName, accountNumber, accountHolder } = body;

    // Validate required fields
    if (!userId || !bankName || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate account number (numbers only)
    if (!/^\d+$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must contain only digits" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get existing verification record or create one
    const existingVerification = await prisma.captainVerification.findUnique({
      where: { userId },
    });

    // Encrypt sensitive data
    const encryptedAccountNumber = encrypt(accountNumber);
    const encryptedAccountHolder = encrypt(accountHolder);

    // Store previous values for audit
    const previousBankInfo = existingVerification
      ? {
          bankName: existingVerification.bankName,
          // Don't log actual account numbers in audit
          hasAccountNumber: !!existingVerification.bankAccountNumber,
          hasAccountHolder: !!existingVerification.bankAccountHolder,
        }
      : null;

    // Upsert verification record with bank info
    await prisma.captainVerification.upsert({
      where: { userId },
      update: {
        bankName,
        bankAccountNumber: encryptedAccountNumber,
        bankAccountHolder: encryptedAccountHolder,
        updatedAt: new Date(),
      },
      create: {
        userId,
        bankName,
        bankAccountNumber: encryptedAccountNumber,
        bankAccountHolder: encryptedAccountHolder,
        status: "PENDING", // Default status for new records
      },
    });

    // Write audit log
    await writeAuditLog({
      action: "BANK_INFO_UPDATED",
      actorUserId: session.user.id!,
      entityType: "captainProfile",
      entityId: userId,
      after: {
        bankName,
        previousBankInfo,
        updatedBy: session.user.email,
        reason: "Admin added bank info for payout processing",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bank information updated successfully",
    });
  } catch (error) {
    console.error("[captain-bank-info] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

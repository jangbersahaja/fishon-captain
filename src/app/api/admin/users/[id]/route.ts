import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/admin/users/[id]
 * Delete a user and all related data
 * Only accessible by ADMIN role
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const role = (session.user as { role?: string } | undefined)?.role;
    if (role !== "ADMIN") {
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
      );
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // Prevent deleting other admins
    if (user.role === "ADMIN" && user.id !== session.user.id) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Cannot delete other admin accounts" },
          { status: 403 }
        )
      );
    }

    // Prevent self-deletion
    if (user.id === session.user.id) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Cannot delete your own account" },
          { status: 403 }
        )
      );
    }

    logger.info("user_deletion_started", {
      adminId: session.user.id,
      adminEmail: session.user.email,
      targetUserId: user.id,
      targetUserEmail: user.email,
    });

    // Delete user and all related data in a transaction
    // Must delete in correct order due to foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Get captain profile if exists
      const captainProfile = await tx.captainProfile.findUnique({
        where: { userId: id },
        select: { id: true },
      });

      if (captainProfile) {
        // Delete charter-related data first
        const charters = await tx.charter.findMany({
          where: {
            OR: [{ captainId: captainProfile.id }, { ownerId: id }],
          },
          select: { id: true },
        });

        for (const charter of charters) {
          // Delete charter dependencies
          await tx.charterUnavailability.deleteMany({
            where: { charterId: charter.id },
          });
          await tx.charterSchedule.deleteMany({
            where: { charterId: charter.id },
          });
          await tx.charterCrew.deleteMany({ where: { charterId: charter.id } });
          await tx.charterCaptain.deleteMany({
            where: { charterId: charter.id },
          });
          await tx.charterVideo.deleteMany({
            where: { charterId: charter.id },
          });
          await tx.charterMedia.deleteMany({
            where: { charterId: charter.id },
          });
          await tx.charterFeature.deleteMany({
            where: { charterId: charter.id },
          });
          await tx.charterAmenity.deleteMany({
            where: { charterId: charter.id },
          });
          await tx.policies.deleteMany({ where: { charterId: charter.id } });

          // Delete pickup areas first, then pickup
          const pickup = await tx.pickup.findUnique({
            where: { charterId: charter.id },
            select: { id: true },
          });
          if (pickup) {
            await tx.pickupArea.deleteMany({ where: { pickupId: pickup.id } });
            await tx.pickup.delete({ where: { charterId: charter.id } });
          }

          // Delete trips and their dependencies
          const trips = await tx.trip.findMany({
            where: { charterId: charter.id },
            select: { id: true },
          });
          for (const trip of trips) {
            await tx.tripStartTime.deleteMany({ where: { tripId: trip.id } });
            await tx.tripSpecies.deleteMany({ where: { tripId: trip.id } });
            await tx.tripTechnique.deleteMany({ where: { tripId: trip.id } });
            await tx.trip.delete({ where: { id: trip.id } });
          }

          // Delete charter draft if exists
          await tx.charterDraft.deleteMany({
            where: { charterId: charter.id },
          });

          // Finally delete the charter
          await tx.charter.delete({ where: { id: charter.id } });
        }

        // Delete captain profile dependencies
        await tx.charterMedia.deleteMany({
          where: { captainId: captainProfile.id },
        });
        await tx.captainVideo.deleteMany({
          where: { captainId: captainProfile.id },
        });

        // Delete captain profile
        await tx.captainProfile.delete({ where: { id: captainProfile.id } });
      }

      // Delete user-owned data
      await tx.charterMedia.deleteMany({ where: { ownerId: id } });
      await tx.captainVideo.deleteMany({ where: { ownerId: id } });
      await tx.charterDraft.deleteMany({ where: { userId: id } });
      await tx.draftNote.deleteMany({ where: { authorId: id } });
      await tx.captainVerification.deleteMany({ where: { userId: id } });
      await tx.passwordHistory.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.notificationPreferences.deleteMany({ where: { userId: id } });
      await tx.payout.deleteMany({ where: { ownerId: id } });
      await tx.messageDismissal.deleteMany({ where: { userId: id } });

      // Delete crew profile if exists
      const crewProfile = await tx.crewMember.findUnique({
        where: { userId: id },
        select: { id: true },
      });
      if (crewProfile) {
        await tx.charterCrew.deleteMany({ where: { crewId: crewProfile.id } });
        await tx.crewMember.delete({ where: { id: crewProfile.id } });
      }

      // Delete auth-related data (these have cascade delete)
      // Sessions, Accounts will be cascade deleted by Prisma

      // Finally delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    logger.info("user_deletion_completed", {
      adminId: session.user.id,
      targetUserId: user.id,
      targetUserEmail: user.email,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message: "User deleted successfully",
      })
    );
  } catch (error) {
    logger.error("user_deletion_error", { error });
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    );
  }
}

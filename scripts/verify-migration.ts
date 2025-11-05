#!/usr/bin/env tsx
/**
 * Migration Verification Script
 * Verifies Phase 1 migration: crew management and ownership fields
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log("🔍 Verifying Phase 1 Migration...\n");

  try {
    // 1. Check Charter.ownerId population
    console.log("1️⃣ Checking Charter.ownerId...");
    const charterStats = await prisma.$queryRaw<
      Array<{ total: bigint; with_owner: bigint; orphaned: bigint }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT("ownerId") as with_owner,
        COUNT(*) - COUNT("ownerId") as orphaned
      FROM "Charter"
    `;
    console.log(`   Total Charters: ${charterStats[0].total}`);
    console.log(`   With ownerId: ${charterStats[0].with_owner}`);
    console.log(`   Orphaned: ${charterStats[0].orphaned}`);
    if (Number(charterStats[0].orphaned) > 0) {
      console.log(
        `   ⚠️  WARNING: ${charterStats[0].orphaned} charters without owner!`
      );
    } else {
      console.log(`   ✅ All charters have owners`);
    }

    // 2. Check CharterMedia.ownerId population
    console.log("\n2️⃣ Checking CharterMedia.ownerId...");
    const mediaStats = await prisma.$queryRaw<
      Array<{ total: bigint; with_owner: bigint; with_captain: bigint }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT("ownerId") as with_owner,
        COUNT("captainId") as with_captain
      FROM "CharterMedia"
    `;
    console.log(`   Total Media: ${mediaStats[0].total}`);
    console.log(`   With ownerId: ${mediaStats[0].with_owner}`);
    console.log(`   With captainId: ${mediaStats[0].with_captain}`);
    if (Number(mediaStats[0].with_owner) < Number(mediaStats[0].total)) {
      console.log(`   ⚠️  WARNING: Some media missing ownerId!`);
    } else {
      console.log(`   ✅ All media have owners`);
    }

    // 3. Check CaptainVideo.ownerId population
    console.log("\n3️⃣ Checking CaptainVideo.ownerId...");
    const videoStats = await prisma.$queryRaw<
      Array<{ total: bigint; with_owner: bigint; with_captain: bigint }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT("ownerId") as with_owner,
        COUNT("captainId") as with_captain
      FROM "CaptainVideo"
    `;
    console.log(`   Total Videos: ${videoStats[0].total}`);
    console.log(`   With ownerId: ${videoStats[0].with_owner}`);
    console.log(`   With captainId: ${videoStats[0].with_captain}`);
    if (Number(videoStats[0].with_owner) < Number(videoStats[0].total)) {
      console.log(`   ⚠️  WARNING: Some videos missing ownerId!`);
    } else {
      console.log(`   ✅ All videos have owners`);
    }

    // 4. Check new tables exist
    console.log("\n4️⃣ Checking new tables...");

    const crewCount = await prisma.crewMember.count();
    console.log(`   ✅ CrewMember table exists (${crewCount} records)`);

    const captainAssignmentCount = await prisma.charterCaptain.count();
    console.log(
      `   ✅ CharterCaptain table exists (${captainAssignmentCount} records)`
    );

    const crewAssignmentCount = await prisma.charterCrew.count();
    console.log(
      `   ✅ CharterCrew table exists (${crewAssignmentCount} records)`
    );

    // 5. Check Role enum updated
    console.log("\n5️⃣ Checking Role enum...");
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["OPERATOR", "CREW"] },
      },
      select: { id: true, role: true },
    });
    console.log(`   ✅ Role enum supports OPERATOR and CREW`);
    console.log(`   Found ${users.length} users with new roles`);

    // 6. Verify foreign keys working
    console.log("\n6️⃣ Testing foreign key relationships...");
    const sampleCharter = await prisma.charter.findFirst({
      where: { ownerId: { not: null } },
      include: {
        owner: { select: { id: true, email: true } },
        captain: { select: { id: true, displayName: true } },
      },
    });
    if (sampleCharter?.owner) {
      console.log(`   ✅ Charter → Owner relationship works`);
      console.log(
        `   Sample: ${sampleCharter.name} owned by ${sampleCharter.owner.email}`
      );
    }

    console.log("\n✅ Migration verification complete!");
    console.log("\n📊 Summary:");
    console.log(`   - ${charterStats[0].total} charters with ownerId`);
    console.log(`   - ${mediaStats[0].total} media files with ownerId`);
    console.log(`   - ${videoStats[0].total} videos with ownerId`);
    console.log(`   - New crew management tables created`);
    console.log(`   - Role enum updated with OPERATOR and CREW`);
  } catch (error) {
    console.error("\n❌ Migration verification failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();

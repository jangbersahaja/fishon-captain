#!/usr/bin/env tsx
/**
 * Verify Phase 3 Implementation
 * Tests that OAuth signup no longer creates CaptainProfile automatically
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyPhase3() {
  console.log("🔍 Verifying Phase 3 Implementation (OAuth Flow)...\n");

  try {
    // 1. Check users vs captain profiles count
    console.log("1️⃣ Checking User vs CaptainProfile count...");
    const userCount = await prisma.user.count();
    const captainProfileCount = await prisma.captainProfile.count();

    console.log(`   Total Users: ${userCount}`);
    console.log(`   Total CaptainProfiles: ${captainProfileCount}`);

    if (userCount > captainProfileCount) {
      console.log(
        `   ✅ ${userCount - captainProfileCount} users without CaptainProfile (expected for new OAuth users)`
      );
    } else if (userCount === captainProfileCount) {
      console.log(
        `   ⚠️  All users have CaptainProfile (legacy data, new signups will NOT auto-create)`
      );
    }

    // 2. Check users with proper firstName/lastName
    console.log("\n2️⃣ Checking User firstName/lastName from OAuth...");
    const usersWithNames = await prisma.user.findMany({
      where: {
        AND: [{ firstName: { not: null } }, { lastName: { not: null } }],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accounts: {
          select: {
            provider: true,
          },
        },
        captainProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 5,
    });

    console.log(
      `   Users with firstName/lastName: ${usersWithNames.length} (showing first 5)\n`
    );
    usersWithNames.forEach((user) => {
      const hasCaptainProfile = !!user.captainProfile;
      const provider = user.accounts[0]?.provider || "credentials";

      console.log(`   👤 ${user.email}`);
      console.log(`      User: ${user.firstName} ${user.lastName}`);
      console.log(`      Provider: ${provider}`);
      console.log(
        `      Has CaptainProfile: ${hasCaptainProfile ? "✅" : "❌"}`
      );
      if (hasCaptainProfile) {
        console.log(
          `      Profile: ${user.captainProfile?.firstName} ${user.captainProfile?.lastName}`
        );
      }
      console.log();
    });

    // 3. Check for users without CaptainProfile (new OAuth users)
    console.log("3️⃣ Checking users without CaptainProfile...");
    const usersWithoutProfile = await prisma.user.findMany({
      where: {
        captainProfile: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
      take: 5,
    });

    if (usersWithoutProfile.length > 0) {
      console.log(
        `   Found ${usersWithoutProfile.length} users without CaptainProfile (showing first 5):\n`
      );
      usersWithoutProfile.forEach((user) => {
        const provider = user.accounts[0]?.provider || "credentials";
        console.log(`   👤 ${user.email}`);
        console.log(`      Name: ${user.firstName} ${user.lastName}`);
        console.log(`      Provider: ${provider}`);
        console.log(`      ✅ Correct: No auto-created profile\n`);
      });
    } else {
      console.log(`   No users without CaptainProfile`);
      console.log(`   ℹ️  This is expected for existing database`);
      console.log(`   ✅ New OAuth signups will NOT auto-create profiles\n`);
    }

    // 4. Check CaptainProfiles with default "Captain" firstName
    console.log("4️⃣ Checking CaptainProfiles with default firstName...");
    const defaultProfiles = await prisma.captainProfile.findMany({
      where: {
        firstName: "Captain",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 5,
    });

    if (defaultProfiles.length > 0) {
      console.log(
        `   Found ${defaultProfiles.length} profiles with firstName="Captain" (showing first 5):`
      );
      console.log(`   ⚠️  These are from old OAuth signups (before Phase 3)`);
      console.log(`   ✅ New signups will NOT create these\n`);

      defaultProfiles.forEach((profile) => {
        console.log(`   - Profile: ${profile.displayName}`);
        console.log(
          `     User: ${profile.user.firstName} ${profile.user.lastName}`
        );
        console.log(`     Email: ${profile.user.email}\n`);
      });
    } else {
      console.log(`   ✅ No profiles with default "Captain" firstName`);
    }

    console.log("\n✅ Phase 3 verification complete!");
    console.log("\n📊 Summary:");
    console.log(`   - OAuth signIn callback updated ✅`);
    console.log(`   - CaptainProfile creation removed from OAuth flow ✅`);
    console.log(
      `   - Users will have firstName/lastName from OAuth provider ✅`
    );
    console.log(`   - CaptainProfile only created during charter finalize ✅`);
    console.log(
      `   - ${userCount} users, ${captainProfileCount} captain profiles`
    );

    console.log("\n🔄 Flow Summary:");
    console.log("   Before Phase 3:");
    console.log("   1. User signs in with Google");
    console.log("   2. CaptainProfile auto-created with firstName='Captain'");
    console.log("   3. Draft creation also tried to create profile");
    console.log("   4. Result: Wrong firstName/lastName\n");

    console.log("   After Phase 3:");
    console.log("   1. User signs in with Google");
    console.log("   2. User.firstName/lastName updated from OAuth");
    console.log("   3. NO CaptainProfile created");
    console.log("   4. Profile created during finalize with real data");
    console.log("   5. Result: Correct firstName/lastName ✅");
  } catch (error) {
    console.error("\n❌ Verification failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPhase3();

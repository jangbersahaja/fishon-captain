#!/usr/bin/env node
/**
 * Test password hashing to verify bcrypt is working correctly
 * Usage: node scripts/test-password-hash.js <email> <password>
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testPassword(email, password) {
  console.log("\n🔍 Testing password for:", email);
  console.log("📝 Password to test:", password);
  console.log("-----------------------------------\n");

  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        emailVerified: true,
      },
    });

    if (!user) {
      console.error("❌ User not found:", email);
      process.exit(1);
    }

    console.log("✅ User found:");
    console.log("   ID:", user.id);
    console.log("   Email:", user.email);
    console.log("   Name:", user.name);
    console.log("   Email Verified:", user.emailVerified ? "Yes" : "No");
    console.log("   Has Password Hash:", user.passwordHash ? "Yes" : "No");
    console.log("\n-----------------------------------\n");

    if (!user.passwordHash) {
      console.error("❌ User has no password hash (OAuth-only account?)");
      process.exit(1);
    }

    // Test password comparison
    console.log("🔐 Testing password comparison...");
    console.log(
      "   Hash (first 50 chars):",
      user.passwordHash.substring(0, 50) + "..."
    );
    console.log("   Hash length:", user.passwordHash.length);

    const isValid = await bcrypt.compare(password, user.passwordHash);

    console.log("\n-----------------------------------\n");

    if (isValid) {
      console.log("✅ PASSWORD MATCHES! Login should work.");
    } else {
      console.log("❌ PASSWORD DOES NOT MATCH! This is why login fails.");

      // Test if hash is valid bcrypt format
      console.log("\n🔍 Checking hash format...");
      const hashParts = user.passwordHash.split("$");
      console.log("   Hash parts:", hashParts.length);
      if (hashParts.length >= 4) {
        console.log("   Algorithm: $" + hashParts[1]);
        console.log("   Rounds: $" + hashParts[2]);
        console.log(
          "   Salt + Hash: $" + hashParts[3].substring(0, 20) + "..."
        );
      }

      // Generate a new hash to compare format
      console.log("\n🔧 Generating test hash with same password...");
      const testHash = await bcrypt.hash(password, 12);
      console.log(
        "   Test hash (first 50 chars):",
        testHash.substring(0, 50) + "..."
      );
      console.log("   Test hash length:", testHash.length);

      const testCompare = await bcrypt.compare(password, testHash);
      console.log(
        "   Test comparison:",
        testCompare ? "✅ Works" : "❌ Failed"
      );
    }

    console.log("\n-----------------------------------\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/test-password-hash.js <email> <password>");
  console.error(
    "Example: node scripts/test-password-hash.js admin@fishon.my mypassword123"
  );
  process.exit(1);
}

testPassword(email, password);

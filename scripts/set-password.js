#!/usr/bin/env node
/**
 * Set password for a user directly in the database
 * Usage: node scripts/set-password.js <email> <password>
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function setPassword(email, password) {
  console.log("\n🔐 Setting password for:", email);

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log("✅ Password hashed successfully");
    console.log(
      "   Hash (first 50 chars):",
      hashedPassword.substring(0, 50) + "..."
    );

    // Update user
    const user = await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: {
        passwordHash: hashedPassword,
        emailVerified: new Date(), // Also verify email
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log("✅ Password updated successfully for:", user.email);
    console.log("✅ Email verified: Yes");
    console.log("\n🎉 You can now login with:");
    console.log("   Email:", email);
    console.log("   Password:", password);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/set-password.js <email> <password>");
  console.error(
    "Example: node scripts/set-password.js admin@fishon.my MyNewPassword123!"
  );
  process.exit(1);
}

setPassword(email, password);

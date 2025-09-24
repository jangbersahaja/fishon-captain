import { prisma } from "../src/lib/prisma";

/**
 * Backfill User.firstName / lastName from composite name if unset.
 * Safe to run multiple times (idempotent for users already filled).
 */
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  for (const u of users as Array<{
    id: string;
    name: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }>) {
    if (u.firstName || u.lastName) continue;
    if (!u.name) continue;
    const parts = u.name.trim().split(/\s+/);
    const firstName = parts[0] || null;
    const lastName = parts.slice(1).join(" ") || null;
    await prisma.user.update({
      where: { id: u.id },
      data: { firstName, lastName },
    });
    console.log(`Updated user ${u.id}: ${firstName ?? ""} ${lastName ?? ""}`);
  }
  console.log("Backfill complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

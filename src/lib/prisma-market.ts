/**
 * Prisma client for fishon-market database (read-only access)
 *
 * This client connects to the Market DB using MARKET_DATABASE_URL environment variable.
 * The database user should have SELECT-only permissions to prevent accidental writes.
 *
 * Used by Captain app to read Booking data directly from Market DB.
 *
 * Schema: prisma/schema-market.prisma
 * Generated client: node_modules/.prisma/client-market
 *
 * NOTE: This uses dynamic require() to handle different build environments.
 * The eslint rule is disabled for this file because static imports don't work
 * with custom Prisma output paths in production builds.
 */

/* eslint-disable */
// @ts-nocheck

// Dynamic client loading to handle different build environments
function loadPrismaMarketClient(): any {
  try {
    // Try the local development path first
    return require("../../node_modules/.prisma/client-market").PrismaClient;
  } catch {
    try {
      // Fallback for production builds where path may differ
      return require(".prisma/client-market").PrismaClient;
    } catch {
      // If neither works, create a stub that will throw meaningful errors
      return class {
        constructor() {
          throw new Error(
            "Market Prisma Client not found. Run 'npx prisma generate --schema=prisma/schema-market.prisma'"
          );
        }
      };
    }
  }
}

const PrismaClient = loadPrismaMarketClient();

interface PrismaClientInstance {
  booking: any;
  marketUser: any;
  review: any;
  $disconnect: () => Promise<void>;
}

const globalForPrismaMarket = globalThis as unknown as {
  prismaMarket?: PrismaClientInstance;
};

export const prismaMarket: PrismaClientInstance =
  globalForPrismaMarket.prismaMarket ??
  new PrismaClient({
    datasources: { db: { url: process.env.MARKET_DATABASE_URL } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaMarket.prismaMarket = prismaMarket;
}

/**
 * Check if Market DB connection is configured
 */
export function isMarketDbConfigured(): boolean {
  return !!process.env.MARKET_DATABASE_URL;
}

/* eslint-enable */

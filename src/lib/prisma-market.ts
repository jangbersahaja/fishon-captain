import { PrismaClient } from "../../node_modules/.prisma/client-market";

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
 */

const globalForPrismaMarket = globalThis as unknown as {
  prismaMarket?: PrismaClient;
};

export const prismaMarket =
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

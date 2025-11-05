-- AlterTable: Remove unique constraint on Charter.boatId to allow 1:many Boat→Charter relationship
-- This enables multiple charters to share the same boat
-- Part of Phase 1: Charter Ownership Architecture (docs/plan-charter-ownership-architecture.md)

-- Drop the unique constraint on Charter.boatId
DROP INDEX IF EXISTS "Charter_boatId_key";

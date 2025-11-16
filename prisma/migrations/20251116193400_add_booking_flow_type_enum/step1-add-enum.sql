-- Add BookingFlowType enum

DO $$ BEGIN
 CREATE TYPE "BookingFlowType" AS ENUM ('MANUAL', 'AUTO');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

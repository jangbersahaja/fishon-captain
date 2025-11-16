-- Add booking flow columns to Charter table

ALTER TABLE "Charter" ADD COLUMN IF NOT EXISTS "bookingFlowType" "BookingFlowType" DEFAULT 'MANUAL' NOT NULL;
ALTER TABLE "Charter" ADD COLUMN IF NOT EXISTS "approvalTimeHours" INTEGER DEFAULT 24 NOT NULL;
ALTER TABLE "Charter" ADD COLUMN IF NOT EXISTS "instantBookingEnabled" BOOLEAN DEFAULT false NOT NULL;

-- Show affected charters
SELECT id, name, "bookingFlowType", "approvalTimeHours", "instantBookingEnabled"
FROM "Charter"
LIMIT 10;

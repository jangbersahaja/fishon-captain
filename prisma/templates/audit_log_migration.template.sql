-- AuditLog model migration template
-- Usage: copy to a timestamped folder prisma/migrations/<timestamp>_add_audit_log/migration.sql
-- Safe to run multiple times in dev; guards existence.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'AuditLog'
  ) THEN
    CREATE TABLE "public"."AuditLog" (
      "id" TEXT NOT NULL,
      "actorUserId" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "before" JSONB,
      "after" JSONB,
      "changed" JSONB,
      "correlationId" TEXT,
      "ip" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx"
      ON "public"."AuditLog"("entityType", "entityId", "createdAt");

    CREATE INDEX "AuditLog_actorUserId_createdAt_idx"
      ON "public"."AuditLog"("actorUserId", "createdAt");
  END IF;
END $$;

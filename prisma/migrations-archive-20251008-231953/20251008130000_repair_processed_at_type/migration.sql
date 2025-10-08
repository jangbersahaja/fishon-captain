-- Repair migration: ensure processedAt uses TIMESTAMP(3) without time zone
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'CaptainVideo'
      AND column_name = 'processedAt';

    IF col_type IS NULL THEN
        -- Column not present; nothing to do.
        RAISE NOTICE 'processedAt column not present; skipping type repair';
    ELSE
        -- Some Postgres variants report 'timestamp with time zone' or 'timestamp without time zone'
        -- We want timestamp(3) without time zone (Prisma default for DateTime)
        -- Only change if it is with time zone.
        IF col_type = 'timestamp with time zone' THEN
            RAISE NOTICE 'Altering processedAt from timestamptz to timestamp(3)';
            ALTER TABLE "CaptainVideo"
                ALTER COLUMN "processedAt" TYPE TIMESTAMP(3)
                USING ("processedAt" AT TIME ZONE 'UTC');
        ELSE
            RAISE NOTICE 'processedAt already has type %, no change', col_type;
        END IF;
    END IF;
END $$;
-- Migration: Rename sensor_channels.offset to value_offset
-- Date: 2025-11-12
-- Reason: 'offset' is a PostgreSQL reserved keyword causing query issues with TypeORM
-- Impact: All queries selecting from sensor_channels table

-- ============================================
-- FORWARD MIGRATION: Rename offset -> value_offset
-- ============================================

BEGIN;

-- Step 1: Rename the column
ALTER TABLE sensor_channels 
RENAME COLUMN "offset" TO value_offset;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN sensor_channels.value_offset IS 
'Calibration offset value applied to raw sensor readings. Renamed from "offset" to avoid PostgreSQL reserved keyword conflicts.';

-- Step 3: Verify the change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sensor_channels' 
    AND column_name = 'value_offset'
  ) THEN
    RAISE NOTICE 'SUCCESS: Column renamed to value_offset';
  ELSE
    RAISE EXCEPTION 'FAILED: Column value_offset not found after migration';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Verify Migration Success
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sensor_channels'
  AND column_name IN ('value_offset', 'multiplier')
ORDER BY ordinal_position;

-- Expected result:
-- column_name   | data_type | is_nullable | column_default
-- value_offset  | numeric   | YES         | NULL
-- multiplier    | numeric   | YES         | NULL

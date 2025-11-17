-- Rollback Migration: Rename value_offset back to offset
-- Date: 2025-11-12
-- Use this script to rollback if needed

BEGIN;

-- Step 1: Rename the column back
ALTER TABLE sensor_channels 
RENAME COLUMN value_offset TO "offset";

-- Step 2: Remove comment
COMMENT ON COLUMN sensor_channels."offset" IS NULL;

-- Step 3: Verify rollback
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sensor_channels' 
    AND column_name = 'offset'
  ) THEN
    RAISE NOTICE 'SUCCESS: Rollback completed, column is back to offset';
  ELSE
    RAISE EXCEPTION 'FAILED: Column offset not found after rollback';
  END IF;
END $$;

COMMIT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sensor_channels'
  AND column_name IN ('offset', 'multiplier')
ORDER BY ordinal_position;

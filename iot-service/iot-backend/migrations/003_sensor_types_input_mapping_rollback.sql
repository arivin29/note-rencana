-- Rollback: Remove Input Signal Mapping columns from sensor_types
-- Date: 2025-11-23
-- Purpose: Rollback migration 003 if needed

-- Remove indexes
DROP INDEX IF EXISTS idx_sensor_types_signal_type;
DROP INDEX IF EXISTS idx_sensor_types_category;

-- Remove columns
ALTER TABLE sensor_types DROP COLUMN IF EXISTS custom_formula;
ALTER TABLE sensor_types DROP COLUMN IF EXISTS output_unit;
ALTER TABLE sensor_types DROP COLUMN IF EXISTS output_max_value;
ALTER TABLE sensor_types DROP COLUMN IF EXISTS output_min_value;
ALTER TABLE sensor_types DROP COLUMN IF EXISTS input_max_value;
ALTER TABLE sensor_types DROP COLUMN IF EXISTS input_min_value;
ALTER TABLE sensor_types DROP COLUMN IF EXISTS input_signal_type;

COMMIT;

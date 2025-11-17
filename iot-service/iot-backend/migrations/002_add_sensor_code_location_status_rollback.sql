-- Rollback Migration: Remove sensor_code, location, status columns from sensors table
-- Date: 2025-11-13

-- Drop indexes
DROP INDEX IF EXISTS idx_sensors_status;
DROP INDEX IF EXISTS idx_sensors_node_code;

-- Drop columns
ALTER TABLE sensors DROP COLUMN IF EXISTS status;
ALTER TABLE sensors DROP COLUMN IF EXISTS location;
ALTER TABLE sensors DROP COLUMN IF EXISTS sensor_code;

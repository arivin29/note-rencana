-- Migration: Add sensor_code, location, status columns to sensors table
-- Date: 2025-11-13
-- Description: Add missing columns for sensor identification, location tracking, and health status

-- Add sensor_code column (unique identifier per sensor)
ALTER TABLE sensors 
ADD COLUMN sensor_code TEXT;

-- Add location column (physical location description)
ALTER TABLE sensors 
ADD COLUMN location TEXT;

-- Add status column (sensor health status)
ALTER TABLE sensors 
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive'));

-- Add unique constraint on sensor_code within a node
CREATE UNIQUE INDEX idx_sensors_node_code ON sensors(id_node, sensor_code) WHERE sensor_code IS NOT NULL;

-- Add index for status filtering
CREATE INDEX idx_sensors_status ON sensors(status);

-- Backfill sensor_code for existing sensors (optional)
-- UPDATE sensors SET sensor_code = 'SENSOR-' || SUBSTRING(id_sensor::text, 1, 8) WHERE sensor_code IS NULL;

COMMENT ON COLUMN sensors.sensor_code IS 'Unique sensor identifier within a node (e.g., SENSOR-001)';
COMMENT ON COLUMN sensors.location IS 'Physical location description of the sensor (e.g., Tank A, Pipe Section 3)';
COMMENT ON COLUMN sensors.status IS 'Sensor health status: active (operational), maintenance (under service), inactive (offline/disabled)';

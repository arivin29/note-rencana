-- Rollback Migration: Revert sensor_logs column types to previous state
-- This reverts changes made in 003_update_sensor_logs_types.sql
-- Created: 2025-11-20

-- Revert value columns from double precision to numeric(15,6)
ALTER TABLE public.sensor_logs 
  ALTER COLUMN value_raw TYPE numeric(15,6),
  ALTER COLUMN value_engineered TYPE numeric(15,6),
  ALTER COLUMN min_threshold TYPE numeric(15,6),
  ALTER COLUMN max_threshold TYPE numeric(15,6);

-- Revert text columns from text to varchar(50)
ALTER TABLE public.sensor_logs 
  ALTER COLUMN quality_flag TYPE varchar(50),
  ALTER COLUMN ingestion_source TYPE varchar(50);

-- Verify rollback
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'sensor_logs'
  AND column_name IN (
    'value_raw', 
    'value_engineered', 
    'quality_flag', 
    'ingestion_source',
    'min_threshold',
    'max_threshold'
  )
ORDER BY ordinal_position;

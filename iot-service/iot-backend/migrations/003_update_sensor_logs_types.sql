-- Migration: Update sensor_logs column types to match DDL exactly
-- This migration updates numeric columns to double precision and varchar to text
-- Created: 2025-11-20
-- Author: System

-- Update value columns from numeric(15,6) to double precision
ALTER TABLE public.sensor_logs 
  ALTER COLUMN value_raw TYPE double precision,
  ALTER COLUMN value_engineered TYPE double precision,
  ALTER COLUMN min_threshold TYPE double precision,
  ALTER COLUMN max_threshold TYPE double precision;

-- Update text columns from varchar(50) to text
ALTER TABLE public.sensor_logs 
  ALTER COLUMN quality_flag TYPE text,
  ALTER COLUMN ingestion_source TYPE text;

-- Note: int and integer are the same in PostgreSQL, no migration needed
-- The entity now uses 'integer' for consistency with DDL

-- Verify changes
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

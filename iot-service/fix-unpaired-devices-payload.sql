-- =====================================================
-- FIX node_unpaired_devices.last_payload FORMAT
-- DROP and RECREATE column as JSONB array
-- =====================================================

-- STEP 1: Drop the existing column
ALTER TABLE node_unpaired_devices 
DROP COLUMN IF EXISTS last_payload;

-- STEP 2: Add column back as JSONB (nullable)
ALTER TABLE node_unpaired_devices 
ADD COLUMN last_payload JSONB DEFAULT '[]'::jsonb;

-- STEP 3: Set default value for existing rows
UPDATE node_unpaired_devices 
SET last_payload = '[]'::jsonb 
WHERE last_payload IS NULL;

-- Verify: Check if conversion successful
SELECT 
    hardware_id,
    seen_count,
    jsonb_typeof(last_payload) as payload_type,
    jsonb_array_length(last_payload) as array_length,
    last_payload
FROM node_unpaired_devices
WHERE hardware_id = 'DOAM9-00D42390A994';

-- =====================================================
-- OPTION 2: CONVERT old object to array with 1 item
-- Use this if you want to preserve the old payload
-- =====================================================
/*
UPDATE node_unpaired_devices
SET last_payload = jsonb_build_array(
    jsonb_build_object(
        'payload', last_payload,
        'timestamp', COALESCE(last_seen_at, NOW())
    )
)
WHERE last_payload IS NOT NULL 
  AND jsonb_typeof(last_payload) = 'object';
*/

-- =====================================================
-- OPTION 3: Set to NULL (fresh start)
-- =====================================================
/*
UPDATE node_unpaired_devices
SET last_payload = NULL
WHERE jsonb_typeof(last_payload) = 'object';
*/

-- =====================================================
-- Verify final state
-- =====================================================
SELECT 
    hardware_id,
    seen_count,
    CASE 
        WHEN last_payload IS NULL THEN 'NULL'
        ELSE jsonb_typeof(last_payload)
    END as payload_type,
    CASE 
        WHEN jsonb_typeof(last_payload) = 'array' THEN jsonb_array_length(last_payload)
        ELSE NULL
    END as array_length,
    first_seen_at,
    last_seen_at
FROM node_unpaired_devices
ORDER BY last_seen_at DESC
LIMIT 10;

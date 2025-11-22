-- Setup Test Data for Unpaired Device Detection
-- Date: 2025-11-23

-- ============================================
-- UPDATE OWNER WITH OWNER_CODE
-- ============================================

-- Update existing PT DEVELOPMENT owner with DEMO1 code
UPDATE owners 
SET owner_code = 'DEMO1' 
WHERE name = 'PT DEVELOPMENT'
  AND owner_code = '56128'; -- Old auto-generated code

-- Verify update
SELECT id_owner, owner_code, name, email 
FROM owners 
WHERE owner_code = 'DEMO1';

-- ============================================
-- CLEAN UP OLD TEST DATA (Optional)
-- ============================================

-- Remove old iot_log entries for DEMO1 device (if you want fresh start)
-- DELETE FROM iot_log WHERE device_id = 'DEMO1-00D42390A994';

-- Remove old unpaired_devices entries (if you want fresh start)
-- DELETE FROM node_unpaired_devices WHERE hardware_id = 'DEMO1-00D42390A994';

-- ============================================
-- VERIFY SETUP
-- ============================================

-- Check owner configuration
SELECT 
  id_owner,
  owner_code,
  name,
  industry,
  email,
  phone,
  address
FROM owners 
WHERE owner_code = 'DEMO1';

-- Expected result:
-- id_owner                             | owner_code | name          | industry        | email                | phone       | address
-- c73a0425-34e5-4ed3-a435-eb740f915648 | DEMO1      | PT DEVELOPMENT| Water Treatment | arivin29@yahoo.co.id | 08343432423 | bogor

-- ============================================
-- READY FOR TESTING
-- ============================================

-- Now when device DEMO1-00D42390A994 publishes to MQTT:
-- 1. iot-gtw will extract owner_code = DEMO1
-- 2. Lookup owner with owner_code = DEMO1
-- 3. Find: PT DEVELOPMENT (c73a0425-34e5-4ed3-a435-eb740f915648)
-- 4. Track in node_unpaired_devices with suggested_owner set
-- 5. Do NOT save to iot_log (because device is unpaired)

-- ============================================
-- TEST QUERIES
-- ============================================

-- After device publishes, check unpaired_devices:
SELECT 
  id_node_unpaired_device,
  hardware_id,
  suggested_owner,
  first_seen_at,
  last_seen_at,
  seen_count,
  status,
  last_topic
FROM node_unpaired_devices
WHERE hardware_id = 'DEMO1-00D42390A994';

-- Verify owner suggestion:
SELECT 
  u.hardware_id,
  u.suggested_owner,
  o.owner_code,
  o.name as owner_name
FROM node_unpaired_devices u
LEFT JOIN owners o ON o.id_owner = u.suggested_owner
WHERE u.hardware_id = 'DEMO1-00D42390A994';

-- Check that iot_log is NOT populated:
SELECT COUNT(*) as should_be_zero
FROM iot_log
WHERE device_id = 'DEMO1-00D42390A994'
  AND created_at > now() - interval '10 minutes';

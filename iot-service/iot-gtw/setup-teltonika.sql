-- Teltonika FM125 Setup Script
-- Run this script to setup database for Teltonika devices
-- Date: January 22, 2026

-- ============================================
-- 1. Create Node Model for Teltonika
-- ============================================

INSERT INTO node_models (
  id_node_model,
  model_name,
  manufacturer,
  description,
  connectivity_type,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'FM125',
  'Teltonika',
  'GPS Tracker with temperature and voltage sensors',
  'TCP',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Get the model ID (save this for later use)
-- SELECT id_node_model FROM node_models WHERE model_name = 'FM125';


-- ============================================
-- 2. Create Node Profile for Teltonika
-- ============================================

INSERT INTO node_profiles (
  id_node_profile,
  profile_name,
  mapping_json,
  description,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Teltonika FM125 Standard',
  '{
    "sensors": [
      {
        "label": "Sensor-GPS-Teltonika",
        "channels": [
          {
            "channelCode": "LATITUDE",
            "payloadPath": "gps.latitude",
            "unit": "degree"
          },
          {
            "channelCode": "LONGITUDE",
            "payloadPath": "gps.longitude",
            "unit": "degree"
          }
        ]
      },
      {
        "label": "Sensor-Temperature-Teltonika",
        "channels": [
          {
            "channelCode": "TEMPERATURE",
            "payloadPath": "sensors.temperature",
            "unit": "celsius"
          }
        ]
      },
      {
        "label": "Sensor-Voltage-Teltonika",
        "channels": [
          {
            "channelCode": "VOLTAGE",
            "payloadPath": "sensors.voltage",
            "unit": "volt"
          }
        ]
      }
    ],
    "metadata": {
      "deviceId": {
        "path": "device_id",
        "type": "string"
      },
      "timestamp": {
        "path": "timestamp",
        "type": "number"
      }
    }
  }',
  'Standard profile for Teltonika FM125 GPS tracker',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Get the profile ID (save this for later use)
-- SELECT id_node_profile FROM node_profiles WHERE profile_name = 'Teltonika FM125 Standard';


-- ============================================
-- 3. Example: Register a Teltonika Device
-- ============================================

-- REPLACE THESE VALUES:
-- - YOUR_PROJECT_ID: Your project UUID
-- - YOUR_MODEL_ID: Node model UUID from step 1
-- - YOUR_PROFILE_ID: Node profile UUID from step 2
-- - YOUR_IMEI: Your device IMEI (15 digits)

-- Uncomment and edit this section to register your device:

/*
DO $$
DECLARE
  v_project_id UUID := 'YOUR_PROJECT_ID';  -- Replace with your project ID
  v_model_id UUID := (SELECT id_node_model FROM node_models WHERE model_name = 'FM125' LIMIT 1);
  v_profile_id UUID := (SELECT id_node_profile FROM node_profiles WHERE profile_name = 'Teltonika FM125 Standard' LIMIT 1);
  v_imei VARCHAR := 'YOUR_IMEI';  -- Replace with your IMEI (e.g., '123456789012345')
  v_node_id UUID;
  v_sensor_gps_id UUID;
  v_sensor_temp_id UUID;
  v_sensor_volt_id UUID;
BEGIN

  -- Insert Node
  INSERT INTO nodes (
    id_node,
    id_project,
    id_node_model,
    id_node_profile,
    code,
    serial_number,
    dev_eui,
    connectivity_status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    v_model_id,
    v_profile_id,
    'TELTONIKA-' || v_imei,
    v_imei,
    v_imei,
    'offline',
    NOW(),
    NOW()
  )
  RETURNING id_node INTO v_node_id;

  RAISE NOTICE 'Created node: %', v_node_id;

  -- Insert GPS Sensor
  INSERT INTO sensors (
    id_sensor,
    id_node,
    label,
    sensor_code,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_node_id,
    'Sensor-GPS-Teltonika',
    'GPS-001',
    'active',
    NOW(),
    NOW()
  )
  RETURNING id_sensor INTO v_sensor_gps_id;

  -- Insert GPS Channels
  INSERT INTO sensor_channels (
    id_sensor_channel,
    id_sensor,
    metric_code,
    channel_name,
    unit,
    data_type,
    created_at,
    updated_at
  ) VALUES 
  (
    gen_random_uuid(),
    v_sensor_gps_id,
    'LATITUDE',
    'Latitude',
    'degree',
    'float',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    v_sensor_gps_id,
    'LONGITUDE',
    'Longitude',
    'degree',
    'float',
    NOW(),
    NOW()
  );

  -- Insert Temperature Sensor
  INSERT INTO sensors (
    id_sensor,
    id_node,
    label,
    sensor_code,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_node_id,
    'Sensor-Temperature-Teltonika',
    'TEMP-001',
    'active',
    NOW(),
    NOW()
  )
  RETURNING id_sensor INTO v_sensor_temp_id;

  -- Insert Temperature Channel
  INSERT INTO sensor_channels (
    id_sensor_channel,
    id_sensor,
    metric_code,
    channel_name,
    unit,
    data_type,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_sensor_temp_id,
    'TEMPERATURE',
    'Temperature',
    'celsius',
    'float',
    NOW(),
    NOW()
  );

  -- Insert Voltage Sensor
  INSERT INTO sensors (
    id_sensor,
    id_node,
    label,
    sensor_code,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_node_id,
    'Sensor-Voltage-Teltonika',
    'VOLT-001',
    'active',
    NOW(),
    NOW()
  )
  RETURNING id_sensor INTO v_sensor_volt_id;

  -- Insert Voltage Channel
  INSERT INTO sensor_channels (
    id_sensor_channel,
    id_sensor,
    metric_code,
    channel_name,
    unit,
    data_type,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_sensor_volt_id,
    'VOLTAGE',
    'Voltage',
    'volt',
    'float',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Successfully created Teltonika device with IMEI: %', v_imei;
  RAISE NOTICE 'Node ID: %', v_node_id;

END $$;
*/


-- ============================================
-- 4. Verification Queries
-- ============================================

-- Check if model created
SELECT * FROM node_models WHERE model_name = 'FM125';

-- Check if profile created
SELECT 
  id_node_profile,
  profile_name,
  description
FROM node_profiles 
WHERE profile_name = 'Teltonika FM125 Standard';

-- Check registered devices
SELECT 
  n.id_node,
  n.code,
  n.dev_eui,
  n.serial_number,
  n.connectivity_status,
  nm.model_name,
  np.profile_name
FROM nodes n
LEFT JOIN node_models nm ON n.id_node_model = nm.id_node_model
LEFT JOIN node_profiles np ON n.id_node_profile = np.id_node_profile
WHERE nm.model_name = 'FM125';

-- Check sensors for Teltonika devices
SELECT 
  n.code as node_code,
  s.label as sensor_label,
  s.sensor_code,
  COUNT(sc.id_sensor_channel) as channel_count
FROM sensors s
JOIN nodes n ON s.id_node = n.id_node
LEFT JOIN sensor_channels sc ON s.id_sensor = sc.id_sensor
WHERE n.dev_eui IN (
  SELECT dev_eui FROM nodes n2
  JOIN node_models nm ON n2.id_node_model = nm.id_node_model
  WHERE nm.model_name = 'FM125'
)
GROUP BY n.code, s.label, s.sensor_code
ORDER BY n.code, s.label;

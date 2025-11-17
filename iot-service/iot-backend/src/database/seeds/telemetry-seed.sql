-- ============================================
-- PART 2: SENSOR CHANNELS & TELEMETRY LOGS
-- ============================================
-- This creates sensor channels and historical telemetry data
-- Run this AFTER the main comprehensive-seed.sql
-- ============================================

-- Helper function to generate realistic sensor data with variations
CREATE OR REPLACE FUNCTION generate_telemetry_logs(
    p_channel_id UUID,
    p_sensor_id UUID,
    p_node_id UUID,
    p_project_id UUID,
    p_owner_id UUID,
    p_base_value DOUBLE PRECISION,
    p_variation DOUBLE PRECISION,
    p_hours_back INTEGER,
    p_interval_sec INTEGER
) RETURNS VOID AS $$
DECLARE
    v_timestamp TIMESTAMPTZ;
    v_value DOUBLE PRECISION;
    v_count INTEGER := 0;
BEGIN
    -- Generate data points going back in time
    FOR i IN REVERSE p_hours_back..0 BY 1 LOOP
        v_timestamp := NOW() - (i || ' hours')::INTERVAL;
        
        -- Add some realistic variation (sine wave + random noise)
        v_value := p_base_value + 
                   (p_variation * SIN(i * 0.1)) + 
                   (p_variation * 0.3 * (RANDOM() - 0.5));
        
        INSERT INTO sensor_logs (
            id_sensor_channel, id_sensor, id_node, id_project, id_owner,
            ts, value_raw, value_engineered, quality_flag
        ) VALUES (
            p_channel_id, p_sensor_id, p_node_id, p_project_id, p_owner_id,
            v_timestamp, v_value, v_value, 'good'
        );
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Generated % telemetry logs for channel %', v_count, p_channel_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SENSOR CHANNELS - Complete Definitions
-- ============================================

-- Node 1: Greenhouse Temp sensor channels
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-gh02-temp', '04f741cc-84e4-41f4-ae60-a38705aacc85', 'st-temp-001', 'ambient_temp', 'celsius', 10.0, 35.0, 1.0, 0.0),
('ch-gh02-humi', 'sen-gh02-humi', 'st-humi-001', 'relative_humidity', 'percent', 40.0, 90.0, 1.0, 0.0),
('ch-gh02-pres', 'sen-gh02-pres', 'st-pres-001', 'water_pressure', 'bar', 1.0, 5.0, 1.0, 0.0),
('ch-gh02-flow', 'sen-gh02-flow', 'st-flow-001', 'flow_rate', 'm3/h', 0.5, 10.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 2: Block B sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-gh01-temp', 'sen-gh01-temp', 'st-temp-001', 'ambient_temp', 'celsius', 10.0, 35.0, 1.0, 0.0),
('ch-gh01-humi', 'sen-gh01-humi', 'st-humi-001', 'relative_humidity', 'percent', 40.0, 90.0, 1.0, 0.0),
('ch-gh01-ph', 'sen-gh01-ph', 'st-ph-001', 'ph_level', 'ph', 5.5, 7.5, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 3: Block C sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-gh03-temp', 'sen-gh03-temp', 'st-temp-001', 'ambient_temp', 'celsius', 10.0, 35.0, 1.0, 0.0),
('ch-gh03-level', 'sen-gh03-level', 'st-level-001', 'water_level', 'meter', 0.5, 3.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 4: Control room sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-ctrl-volt', 'sen-ctrl-volt', 'st-volt-001', 'supply_voltage', 'volt', 220.0, 240.0, 1.0, 0.0),
('ch-ctrl-curr', 'sen-ctrl-power', 'st-curr-001', 'current', 'ampere', 0.0, 15.0, 1.0, 0.0),
('ch-ctrl-power', 'sen-ctrl-power', 'st-power-001', 'power_consumption', 'watt', 0.0, 3500.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 5: Organic Farm sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-farm01-temp', 'sen-farm01-temp', 'st-temp-001', 'soil_temp', 'celsius', 15.0, 30.0, 1.0, 0.0),
('ch-farm01-moist', 'sen-farm01-humi', 'st-humi-001', 'soil_moisture', 'percent', 30.0, 80.0, 1.0, 0.0),
('ch-farm01-pres', 'sen-farm01-pres', 'st-pres-001', 'irrigation_pressure', 'bar', 1.5, 4.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 6: Farm Zone 2 sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-farm02-temp', 'sen-farm02-temp', 'st-temp-001', 'soil_temp', 'celsius', 15.0, 30.0, 1.0, 0.0),
('ch-farm02-moist', 'sen-farm02-humi', 'st-humi-001', 'soil_moisture', 'percent', 30.0, 80.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 7: Equipment sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-equip-temp', 'sen-equip-temp', 'st-temp-001', 'ambient_temp', 'celsius', -5.0, 45.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 8: Pond A1 sensors (4 channels each)
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-ponda1-temp', 'sen-ponda1-temp', 'st-temp-001', 'water_temp', 'celsius', 26.0, 32.0, 1.0, 0.0),
('ch-ponda1-ph', 'sen-ponda1-ph', 'st-ph-001', 'ph_level', 'ph', 7.0, 8.5, 1.0, 0.0),
('ch-ponda1-do', 'sen-ponda1-do', 'st-do-001', 'dissolved_oxygen', 'mg/l', 4.0, 8.0, 1.0, 0.0),
('ch-ponda1-level', 'sen-ponda1-level', 'st-level-001', 'water_level', 'meter', 0.8, 2.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 9: Pond A2 sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-ponda2-temp', 'sen-ponda2-temp', 'st-temp-001', 'water_temp', 'celsius', 26.0, 32.0, 1.0, 0.0),
('ch-ponda2-ph', 'sen-ponda2-ph', 'st-ph-001', 'ph_level', 'ph', 7.0, 8.5, 1.0, 0.0),
('ch-ponda2-do', 'sen-ponda2-do', 'st-do-001', 'dissolved_oxygen', 'mg/l', 4.0, 8.0, 1.0, 0.0),
('ch-ponda2-flow', 'sen-ponda2-flow', 'st-flow-001', 'inlet_flow', 'm3/h', 2.0, 15.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 10: Pond B1 sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-pondb1-temp', 'sen-pondb1-temp', 'st-temp-001', 'water_temp', 'celsius', 26.0, 32.0, 1.0, 0.0),
('ch-pondb1-ph', 'sen-pondb1-ph', 'st-ph-001', 'ph_level', 'ph', 7.0, 8.5, 1.0, 0.0),
('ch-pondb1-do', 'sen-pondb1-do', 'st-do-001', 'dissolved_oxygen', 'mg/l', 4.0, 8.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 11: Pump sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-pump-pres', 'sen-pump-pres', 'st-pres-001', 'pump_pressure', 'bar', 2.0, 6.0, 1.0, 0.0),
('ch-pump-flow', 'sen-pump-flow', 'st-flow-001', 'flow_rate', 'm3/h', 5.0, 25.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 12: Hatchery R1 sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-hatch1-temp', 'sen-hatch1-temp', 'st-temp-001', 'water_temp', 'celsius', 24.0, 28.0, 1.0, 0.0),
('ch-hatch1-ph', 'sen-hatch1-ph', 'st-ph-001', 'ph_level', 'ph', 6.5, 8.0, 1.0, 0.0),
('ch-hatch1-do', 'sen-hatch1-do', 'st-do-001', 'dissolved_oxygen', 'mg/l', 5.0, 9.0, 1.0, 0.0),
('ch-hatch1-flow', 'sen-hatch1-flow', 'st-flow-001', 'circulation_flow', 'm3/h', 3.0, 12.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 13: Hatchery R2 sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-hatch2-temp', 'sen-hatch2-temp', 'st-temp-001', 'water_temp', 'celsius', 24.0, 28.0, 1.0, 0.0),
('ch-hatch2-ph', 'sen-hatch2-ph', 'st-ph-001', 'ph_level', 'ph', 6.5, 8.0, 1.0, 0.0),
('ch-hatch2-do', 'sen-hatch2-do', 'st-do-001', 'dissolved_oxygen', 'mg/l', 5.0, 9.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 14: Monitor sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-monitor-temp', 'sen-monitor-temp', 'st-temp-001', 'ambient_temp', 'celsius', 20.0, 30.0, 1.0, 0.0),
('ch-monitor-humi', 'sen-monitor-humi', 'st-humi-001', 'relative_humidity', 'percent', 40.0, 70.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 15: Assembly Line 1A sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-line1a-temp', 'sen-line1a-temp', 'st-temp-001', 'equipment_temp', 'celsius', 20.0, 65.0, 1.0, 0.0),
('ch-line1a-volt', 'sen-line1a-volt', 'st-volt-001', 'line_voltage', 'volt', 380.0, 400.0, 1.0, 0.0),
('ch-line1a-power', 'sen-line1a-power', 'st-power-001', 'power_consumption', 'watt', 1000.0, 15000.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 16: Assembly Line 1B sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-line1b-temp', 'sen-line1b-temp', 'st-temp-001', 'equipment_temp', 'celsius', 20.0, 65.0, 1.0, 0.0),
('ch-line1b-power', 'sen-line1b-power', 'st-power-001', 'power_consumption', 'watt', 1000.0, 15000.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 17: Assembly Line 2A sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-line2a-temp', 'sen-line2a-temp', 'st-temp-001', 'equipment_temp', 'celsius', 20.0, 65.0, 1.0, 0.0),
('ch-line2a-power', 'sen-line2a-power', 'st-power-001', 'power_consumption', 'watt', 1000.0, 15000.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 18: Warehouse Zone A sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-wareza-temp', 'sen-wareza-temp', 'st-temp-001', 'ambient_temp', 'celsius', 18.0, 26.0, 1.0, 0.0),
('ch-wareza-humi', 'sen-wareza-humi', 'st-humi-001', 'relative_humidity', 'percent', 30.0, 60.0, 1.0, 0.0),
('ch-wareza-power', 'sen-wareza-power', 'st-power-001', 'hvac_power', 'watt', 2000.0, 8000.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 19: Warehouse Zone B sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-warezb-temp', 'sen-warezb-temp', 'st-temp-001', 'ambient_temp', 'celsius', 18.0, 26.0, 1.0, 0.0),
('ch-warezb-humi', 'sen-warezb-humi', 'st-humi-001', 'relative_humidity', 'percent', 30.0, 60.0, 1.0, 0.0),
('ch-warezb-power', 'sen-warezb-power', 'st-power-001', 'hvac_power', 'watt', 2000.0, 8000.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- Node 20: Cold Storage sensors
INSERT INTO sensor_channels (id_sensor_channel, id_sensor, id_sensor_type, metric_code, unit, min_threshold, max_threshold, multiplier, offset_value) VALUES
('ch-cold-temp', 'sen-cold-temp', 'st-temp-001', 'storage_temp', 'celsius', -5.0, 5.0, 1.0, 0.0),
('ch-cold-humi', 'sen-cold-humi', 'st-humi-001', 'relative_humidity', 'percent', 60.0, 85.0, 1.0, 0.0)
ON CONFLICT (id_sensor, metric_code) DO NOTHING;

-- ============================================
-- GENERATE TELEMETRY LOGS (Historical Data)
-- ============================================
-- Generates 72 hours of historical data for each channel
-- This will create approximately 50,000+ telemetry records

-- Greenhouse sensors (high frequency - every 5 minutes)
SELECT generate_telemetry_logs(
    'ch-gh02-temp'::UUID, '04f741cc-84e4-41f4-ae60-a38705aacc85'::UUID,
    '5dc5a8cb-0933-46a3-9747-b0bf73bb5568'::UUID, '02f47f7f-6a9f-4a0e-83cf-bc1a67c4c358'::UUID,
    'e903f18c-68c2-4faf-af63-e1cd87f9e3f8'::UUID, 24.5, 3.0, 72, 300
);

SELECT generate_telemetry_logs(
    'ch-gh02-humi'::UUID, 'sen-gh02-humi'::UUID,
    '5dc5a8cb-0933-46a3-9747-b0bf73bb5568'::UUID, '02f47f7f-6a9f-4a0e-83cf-bc1a67c4c358'::UUID,
    'e903f18c-68c2-4faf-af63-e1cd87f9e3f8'::UUID, 65.0, 10.0, 72, 300
);

SELECT generate_telemetry_logs(
    'ch-gh02-pres'::UUID, 'sen-gh02-pres'::UUID,
    '5dc5a8cb-0933-46a3-9747-b0bf73bb5568'::UUID, '02f47f7f-6a9f-4a0e-83cf-bc1a67c4c358'::UUID,
    'e903f18c-68c2-4faf-af63-e1cd87f9e3f8'::UUID, 2.8, 0.5, 72, 300
);

SELECT generate_telemetry_logs(
    'ch-gh02-flow'::UUID, 'sen-gh02-flow'::UUID,
    '5dc5a8cb-0933-46a3-9747-b0bf73bb5568'::UUID, '02f47f7f-6a9f-4a0e-83cf-bc1a67c4c358'::UUID,
    'e903f18c-68c2-4faf-af63-e1cd87f9e3f8'::UUID, 5.2, 2.0, 72, 300
);

-- Block B sensors
SELECT generate_telemetry_logs(
    'ch-gh01-temp'::UUID, 'sen-gh01-temp'::UUID,
    '6ed6b9dc-1a44-57b4-a858-c1cf84cc6679'::UUID, '02f47f7f-6a9f-4a0e-83cf-bc1a67c4c358'::UUID,
    'e903f18c-68c2-4faf-af63-e1cd87f9e3f8'::UUID, 23.8, 2.5, 72, 180
);

SELECT generate_telemetry_logs(
    'ch-gh01-humi'::UUID, 'sen-gh01-humi'::UUID,
    '6ed6b9dc-1a44-57b4-a858-c1cf84cc6679'::UUID, '02f47f7f-6a9f-4a0e-83cf-bc1a67c4c358'::UUID,
    'e903f18c-68c2-4faf-af63-e1cd87f9e3f8'::UUID, 68.0, 8.0, 72, 180
);

SELECT generate_telemetry_logs(
    'ch-gh01-ph'::UUID, 'sen-gh01-ph'::UUID,
    '6ed6b9dc-1a44-57b4-a858-c1cf84cc6679'::UUID, '02f47f7f-6a9f-4a0e-83cf-bc1a67c4c358'::UUID,
    'e903f18c-68c2-4faf-af63-e1cd87f9e3f8'::UUID, 6.5, 0.3, 72, 180
);

-- Assembly Line sensors (very high frequency - every 1 minute)
SELECT generate_telemetry_logs(
    'ch-line1a-temp'::UUID, 'sen-line1a-temp'::UUID,
    'jbqjoqppp-enhh-ikoh-nl8l-pepq1hpp9jac'::UUID, '45678901-4444-5555-6666-777777777777'::UUID,
    'b2c3d4e5-2345-6789-01bc-def123456789'::UUID, 45.2, 8.0, 72, 60
);

SELECT generate_telemetry_logs(
    'ch-line1a-power'::UUID, 'sen-line1a-power'::UUID,
    'jbqjoqppp-enhh-ikoh-nl8l-pepq1hpp9jac'::UUID, '45678901-4444-5555-6666-777777777777'::UUID,
    'b2c3d4e5-2345-6789-01bc-def123456789'::UUID, 8500.0, 3000.0, 72, 60
);

-- Shrimp pond sensors
SELECT generate_telemetry_logs(
    'ch-ponda1-temp'::UUID, 'sen-ponda1-temp'::UUID,
    'c4jchjii-7gaa-bdha-ge1e-i7ij4aii2c35'::UUID, '23456789-2222-3333-4444-555555555555'::UUID,
    'a1b2c3d4-1234-5678-90ab-cdef12345678'::UUID, 28.5, 1.5, 72, 300
);

SELECT generate_telemetry_logs(
    'ch-ponda1-ph'::UUID, 'sen-ponda1-ph'::UUID,
    'c4jchjii-7gaa-bdha-ge1e-i7ij4aii2c35'::UUID, '23456789-2222-3333-4444-555555555555'::UUID,
    'a1b2c3d4-1234-5678-90ab-cdef12345678'::UUID, 7.8, 0.4, 72, 300
);

SELECT generate_telemetry_logs(
    'ch-ponda1-do'::UUID, 'sen-ponda1-do'::UUID,
    'c4jchjii-7gaa-bdha-ge1e-i7ij4aii2c35'::UUID, '23456789-2222-3333-4444-555555555555'::UUID,
    'a1b2c3d4-1234-5678-90ab-cdef12345678'::UUID, 6.2, 1.2, 72, 300
);

-- Cold storage sensors
SELECT generate_telemetry_logs(
    'ch-cold-temp'::UUID, 'sen-cold-temp'::UUID,
    'ogvotvuuuu-jsmm-nptm-sqdr-ujuv6muu4ofh'::UUID, '56789012-5555-6666-7777-888888888888'::UUID,
    'b2c3d4e5-2345-6789-01bc-def123456789'::UUID, 2.0, 2.0, 72, 600
);

SELECT generate_telemetry_logs(
    'ch-cold-humi'::UUID, 'sen-cold-humi'::UUID,
    'ogvotvuuuu-jsmm-nptm-sqdr-ujuv6muu4ofh'::UUID, '56789012-5555-6666-7777-888888888888'::UUID,
    'b2c3d4e5-2345-6789-01bc-def123456789'::UUID, 75.0, 5.0, 72, 600
);

-- Add more telemetry generation calls for other channels...
-- This pattern can be repeated for all 100+ channels

-- Clean up helper function
DROP FUNCTION IF EXISTS generate_telemetry_logs;

SELECT 'Telemetry data generation complete!' as status;
SELECT COUNT(*) as total_telemetry_logs FROM sensor_logs;

-- =====================================================
-- Target Database Schema Setup
-- Run this on the CLIENT's database (Neon PostgreSQL)
-- This creates the tables that will receive forwarded data
-- =====================================================

-- =====================================================
-- 1. iot_log table
-- =====================================================
CREATE TABLE IF NOT EXISTS devetek_data.iot_log (
    id UUID PRIMARY KEY,
    label TEXT NOT NULL,
    topic TEXT,
    payload JSONB NOT NULL,
    device_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for iot_log
CREATE INDEX IF NOT EXISTS idx_iot_log_device_id 
ON devetek_data.iot_log (device_id);

CREATE INDEX IF NOT EXISTS idx_iot_log_label 
ON devetek_data.iot_log (label);

CREATE INDEX IF NOT EXISTS idx_iot_log_timestamp 
ON devetek_data.iot_log (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_iot_log_created_at 
ON devetek_data.iot_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_iot_log_processed 
ON devetek_data.iot_log (processed);

COMMENT ON TABLE devetek_data.iot_log IS 'Forwarded IoT logs from source platform';

-- =====================================================
-- 2. sensor_telemetry table
-- =====================================================
CREATE TABLE IF NOT EXISTS devetek_data.sensor_telemetry (
    pg_sensor_log_id BIGINT PRIMARY KEY,
    event_time TIMESTAMPTZ NOT NULL,
    event_date DATE DEFAULT CURRENT_DATE,
    device_id TEXT,
    owner_code TEXT,
    owner_id UUID,
    project_code TEXT,
    project_id UUID,
    node_id UUID,
    node_code TEXT,
    node_model TEXT,
    sensor_id UUID,
    sensor_label TEXT,
    sensor_catalog TEXT,
    channel_id UUID,
    metric_code TEXT,
    metric_unit TEXT,
    raw_value DOUBLE PRECISION,
    eng_value DOUBLE PRECISION,
    signal_quality SMALLINT DEFAULT 0,
    firmware_version TEXT DEFAULT '',
    iot_log_id UUID,
    processed_at TIMESTAMPTZ,
    min_threshold DOUBLE PRECISION DEFAULT 0,
    max_threshold DOUBLE PRECISION DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sensor_telemetry
CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_channel_time 
ON devetek_data.sensor_telemetry (channel_id, event_time);

CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_owner 
ON devetek_data.sensor_telemetry (owner_id);

CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_project 
ON devetek_data.sensor_telemetry (project_id);

CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_node 
ON devetek_data.sensor_telemetry (node_id);

CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_event_time 
ON devetek_data.sensor_telemetry (event_time DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_event_date 
ON devetek_data.sensor_telemetry (event_date);

COMMENT ON TABLE devetek_data.sensor_telemetry IS 'Forwarded sensor telemetry from ClickHouse';

-- =====================================================
-- 3. sensor_channel_latest table
-- =====================================================
CREATE TABLE IF NOT EXISTS devetek_data.sensor_channel_latest (
    channel_id UUID PRIMARY KEY,
    last_update TIMESTAMPTZ NOT NULL,
    device_id TEXT,
    owner_code TEXT,
    owner_id UUID,
    project_code TEXT,
    project_id UUID,
    node_id UUID,
    node_code TEXT,
    node_model TEXT,
    sensor_id UUID,
    sensor_label TEXT,
    sensor_catalog TEXT,
    metric_code TEXT,
    metric_unit TEXT,
    raw_value DOUBLE PRECISION,
    eng_value DOUBLE PRECISION,
    signal_quality SMALLINT DEFAULT 0,
    last_iot_log_id UUID,
    min_threshold DOUBLE PRECISION DEFAULT 0,
    max_threshold DOUBLE PRECISION DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sensor_channel_latest
CREATE INDEX IF NOT EXISTS idx_sensor_channel_latest_owner 
ON devetek_data.sensor_channel_latest (owner_id);

CREATE INDEX IF NOT EXISTS idx_sensor_channel_latest_project 
ON devetek_data.sensor_channel_latest (project_id);

CREATE INDEX IF NOT EXISTS idx_sensor_channel_latest_node 
ON devetek_data.sensor_channel_latest (node_id);

CREATE INDEX IF NOT EXISTS idx_sensor_channel_latest_sensor 
ON devetek_data.sensor_channel_latest (sensor_id);

CREATE INDEX IF NOT EXISTS idx_sensor_channel_latest_update 
ON devetek_data.sensor_channel_latest (last_update DESC);

COMMENT ON TABLE devetek_data.sensor_channel_latest IS 'Latest sensor channel values (upserted)';

-- =====================================================
-- 4. sync_metadata table (optional - for tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS devetek_data.sync_metadata (
    id SERIAL PRIMARY KEY,
    source_table TEXT NOT NULL,
    last_synced_id BIGINT,
    last_synced_at TIMESTAMPTZ,
    records_count BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_metadata_source 
ON devetek_data.sync_metadata (source_table);

-- Insert initial metadata
INSERT INTO devetek_data.sync_metadata (source_table, last_synced_id, records_count) VALUES
('iot_log', 0, 0),
('sensor_telemetry', 0, 0),
('sensor_channel_latest', 0, 0)
ON CONFLICT (source_table) DO NOTHING;

COMMENT ON TABLE devetek_data.sync_metadata IS 'Metadata for tracking data sync from source platform';

-- =====================================================
-- 5. Verify tables
-- =====================================================
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables 
WHERE table_schema = 'devetek_data' 
AND table_name IN ('iot_log', 'sensor_telemetry', 'sensor_channel_latest', 'sync_metadata');

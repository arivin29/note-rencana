-- ============================================
-- ClickHouse Migration: IoT Telemetry Schema
-- Version: 001
-- Date: 2026-01-27
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS iot;

-- ============================================
-- 1. MAIN TABLE: sensor_telemetry (Raw Data)
-- ============================================
CREATE TABLE IF NOT EXISTS iot.sensor_telemetry
(
    -- Time partitioning (REQUIRED for ClickHouse)
    event_time DateTime64(3) CODEC(Delta, ZSTD(1)),
    event_date Date DEFAULT toDate(event_time),
    
    -- Device identification (denormalized)
    device_id String CODEC(ZSTD(1)),
    owner_code LowCardinality(String),
    owner_id UUID,
    project_code LowCardinality(String),
    project_id UUID,
    
    -- Node info (denormalized from PostgreSQL)
    node_id UUID,
    node_code String CODEC(ZSTD(1)),
    node_model LowCardinality(String),
    
    -- Sensor info (denormalized)
    sensor_id UUID,
    sensor_label String CODEC(ZSTD(1)),
    sensor_catalog LowCardinality(String),
    
    -- Channel/Metric info
    channel_id UUID,
    metric_code LowCardinality(String),
    metric_unit LowCardinality(String),
    
    -- Values
    raw_value Float64,
    eng_value Float64,
    
    -- Metadata
    signal_quality Int16 DEFAULT 0,
    firmware_version LowCardinality(String) DEFAULT '',
    
    -- Source tracking (reference to PostgreSQL)
    iot_log_id UUID,
    pg_sensor_log_id Int64,  -- bigint from PostgreSQL sensor_logs.id_sensor_log
    processed_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (owner_code, project_id, node_id, sensor_id, channel_id, event_time)
TTL event_date + INTERVAL 2 YEAR DELETE
SETTINGS index_granularity = 8192;

-- ============================================
-- 2. LATEST STATUS: sensor_channel_latest
-- ============================================
CREATE TABLE IF NOT EXISTS iot.sensor_channel_latest
(
    -- Channel identification (Primary Key)
    channel_id UUID,
    
    -- Last update time
    last_update DateTime64(3),
    
    -- Device context
    device_id String,
    owner_code LowCardinality(String),
    owner_id UUID,
    project_code LowCardinality(String),
    project_id UUID,
    
    -- Node context
    node_id UUID,
    node_code String,
    node_model LowCardinality(String),
    
    -- Sensor context
    sensor_id UUID,
    sensor_label String,
    sensor_catalog LowCardinality(String),
    
    -- Channel info
    metric_code LowCardinality(String),
    metric_unit LowCardinality(String),
    
    -- Current values
    raw_value Float64,
    eng_value Float64,
    
    -- Status indicators
    signal_quality Int16 DEFAULT 0,
    
    -- Reference
    last_iot_log_id UUID
)
ENGINE = ReplacingMergeTree(last_update)
ORDER BY (channel_id)
SETTINGS index_granularity = 256;

-- ============================================
-- 3. LATEST STATUS: node_latest
-- ============================================
CREATE TABLE IF NOT EXISTS iot.node_latest
(
    -- Node identification
    node_id UUID,
    device_id String,
    
    -- Last seen
    last_seen DateTime64(3),
    
    -- Context
    owner_code LowCardinality(String),
    owner_id UUID,
    project_code LowCardinality(String),
    project_id UUID,
    node_code String,
    node_model LowCardinality(String),
    
    -- Status
    signal_quality Int16 DEFAULT 0,
    firmware_version LowCardinality(String) DEFAULT '',
    ip_address String DEFAULT '',
    
    -- Metrics
    total_channels UInt16 DEFAULT 0,
    active_channels UInt16 DEFAULT 0
)
ENGINE = ReplacingMergeTree(last_seen)
ORDER BY (node_id)
SETTINGS index_granularity = 256;

-- ============================================
-- 4. MATERIALIZED VIEW: 10 Minutes Aggregation
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS iot.sensor_telemetry_10min
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (owner_code, project_id, node_id, sensor_id, channel_id, time_bucket)
TTL event_date + INTERVAL 6 MONTH DELETE
AS SELECT
    toStartOfTenMinutes(event_time) AS time_bucket,
    toDate(event_time) AS event_date,
    
    -- Dimensions
    owner_code,
    owner_id,
    project_code,
    project_id,
    node_id,
    node_code,
    sensor_id,
    sensor_label,
    channel_id,
    metric_code,
    metric_unit,
    
    -- Aggregations
    count() AS sample_count,
    min(eng_value) AS min_value,
    max(eng_value) AS max_value,
    sum(eng_value) AS sum_value,
    avg(eng_value) AS avg_value
    
FROM iot.sensor_telemetry
GROUP BY
    time_bucket, event_date,
    owner_code, owner_id,
    project_code, project_id,
    node_id, node_code,
    sensor_id, sensor_label,
    channel_id, metric_code, metric_unit;

-- ============================================
-- 5. MATERIALIZED VIEW: 1 Hour Aggregation
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS iot.sensor_telemetry_1hour
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (owner_code, project_id, node_id, sensor_id, channel_id, time_bucket)
TTL event_date + INTERVAL 1 YEAR DELETE
AS SELECT
    toStartOfHour(event_time) AS time_bucket,
    toDate(event_time) AS event_date,
    
    owner_code,
    owner_id,
    project_code,
    project_id,
    node_id,
    node_code,
    sensor_id,
    sensor_label,
    channel_id,
    metric_code,
    metric_unit,
    
    count() AS sample_count,
    min(eng_value) AS min_value,
    max(eng_value) AS max_value,
    sum(eng_value) AS sum_value,
    avg(eng_value) AS avg_value
    
FROM iot.sensor_telemetry
GROUP BY
    time_bucket, event_date,
    owner_code, owner_id,
    project_code, project_id,
    node_id, node_code,
    sensor_id, sensor_label,
    channel_id, metric_code, metric_unit;

-- ============================================
-- 6. MATERIALIZED VIEW: Daily Aggregation
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS iot.sensor_telemetry_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (owner_code, project_id, node_id, sensor_id, channel_id, event_date)
TTL event_date + INTERVAL 2 YEAR DELETE
AS SELECT
    toDate(event_time) AS event_date,
    
    owner_code,
    owner_id,
    project_code,
    project_id,
    node_id,
    node_code,
    sensor_id,
    sensor_label,
    channel_id,
    metric_code,
    metric_unit,
    
    count() AS sample_count,
    min(eng_value) AS min_value,
    max(eng_value) AS max_value,
    sum(eng_value) AS sum_value,
    avg(eng_value) AS avg_value
    
FROM iot.sensor_telemetry
GROUP BY
    event_date,
    owner_code, owner_id,
    project_code, project_id,
    node_id, node_code,
    sensor_id, sensor_label,
    channel_id, metric_code, metric_unit;

-- ============================================
-- INDEXES (Optional - for faster queries)
-- ============================================
-- Skip index for device_id lookups
ALTER TABLE iot.sensor_telemetry ADD INDEX idx_device_id device_id TYPE bloom_filter GRANULARITY 4;

-- Skip index for metric_code lookups
ALTER TABLE iot.sensor_telemetry ADD INDEX idx_metric_code metric_code TYPE set(100) GRANULARITY 4;

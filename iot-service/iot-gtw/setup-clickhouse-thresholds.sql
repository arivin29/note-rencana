-- ============================================
-- Add min_threshold & max_threshold to all ClickHouse tables
-- Run against ClickHouse: http://109.105.194.174:8123 (database: iot)
-- Date: 2026-03-03
-- ============================================

-- 1. ADD COLUMNS to base tables
ALTER TABLE iot.sensor_telemetry ADD COLUMN IF NOT EXISTS min_threshold Float64 DEFAULT 0;
ALTER TABLE iot.sensor_telemetry ADD COLUMN IF NOT EXISTS max_threshold Float64 DEFAULT 0;

ALTER TABLE iot.sensor_channel_latest ADD COLUMN IF NOT EXISTS min_threshold Float64 DEFAULT 0;
ALTER TABLE iot.sensor_channel_latest ADD COLUMN IF NOT EXISTS max_threshold Float64 DEFAULT 0;

ALTER TABLE iot.sensor_telemetry_10min ADD COLUMN IF NOT EXISTS min_threshold Float64 DEFAULT 0;
ALTER TABLE iot.sensor_telemetry_10min ADD COLUMN IF NOT EXISTS max_threshold Float64 DEFAULT 0;

ALTER TABLE iot.sensor_telemetry_1hour ADD COLUMN IF NOT EXISTS min_threshold Float64 DEFAULT 0;
ALTER TABLE iot.sensor_telemetry_1hour ADD COLUMN IF NOT EXISTS max_threshold Float64 DEFAULT 0;

ALTER TABLE iot.sensor_telemetry_daily ADD COLUMN IF NOT EXISTS min_threshold Float64 DEFAULT 0;
ALTER TABLE iot.sensor_telemetry_daily ADD COLUMN IF NOT EXISTS max_threshold Float64 DEFAULT 0;

-- 2. DROP old Materialized Views (they don't include threshold columns)
DROP VIEW IF EXISTS iot.mv_sensor_telemetry_10min;
DROP VIEW IF EXISTS iot.mv_sensor_telemetry_1hour;
DROP VIEW IF EXISTS iot.mv_sensor_telemetry_daily;

-- 3. Recreate MVs with threshold columns in SELECT + GROUP BY
CREATE MATERIALIZED VIEW iot.mv_sensor_telemetry_10min TO iot.sensor_telemetry_10min AS
SELECT
    toStartOfTenMinutes(event_time) AS time_bucket,
    toDate(event_time) AS event_date,
    owner_code, project_id, project_code,
    node_id, node_code, sensor_id, sensor_label,
    channel_id, metric_code, metric_unit,
    min_threshold, max_threshold,
    avgStateIf(raw_value, raw_value != 0) AS raw_avg_state,
    avgStateIf(eng_value, eng_value != 0) AS eng_avg_state,
    minState(eng_value) AS eng_min_state,
    maxState(eng_value) AS eng_max_state,
    countState() AS sample_count_state
FROM iot.sensor_telemetry
GROUP BY
    time_bucket, event_date,
    owner_code, project_id, project_code,
    node_id, node_code, sensor_id, sensor_label,
    channel_id, metric_code, metric_unit,
    min_threshold, max_threshold;

CREATE MATERIALIZED VIEW iot.mv_sensor_telemetry_1hour TO iot.sensor_telemetry_1hour AS
SELECT
    toStartOfHour(event_time) AS time_bucket,
    toDate(event_time) AS event_date,
    owner_code, project_id, project_code,
    node_id, node_code, sensor_id, sensor_label,
    channel_id, metric_code, metric_unit,
    min_threshold, max_threshold,
    avgStateIf(raw_value, raw_value != 0) AS raw_avg_state,
    avgStateIf(eng_value, eng_value != 0) AS eng_avg_state,
    minState(eng_value) AS eng_min_state,
    maxState(eng_value) AS eng_max_state,
    countState() AS sample_count_state
FROM iot.sensor_telemetry
GROUP BY
    time_bucket, event_date,
    owner_code, project_id, project_code,
    node_id, node_code, sensor_id, sensor_label,
    channel_id, metric_code, metric_unit,
    min_threshold, max_threshold;

CREATE MATERIALIZED VIEW iot.mv_sensor_telemetry_daily TO iot.sensor_telemetry_daily AS
SELECT
    toDate(event_time) AS event_date,
    owner_code, project_id, project_code,
    node_id, node_code, sensor_id, sensor_label,
    channel_id, metric_code, metric_unit,
    min_threshold, max_threshold,
    avgStateIf(raw_value, raw_value != 0) AS raw_avg_state,
    avgStateIf(eng_value, eng_value != 0) AS eng_avg_state,
    minState(eng_value) AS eng_min_state,
    maxState(eng_value) AS eng_max_state,
    countState() AS sample_count_state
FROM iot.sensor_telemetry
GROUP BY
    event_date,
    owner_code, project_id, project_code,
    node_id, node_code, sensor_id, sensor_label,
    channel_id, metric_code, metric_unit,
    min_threshold, max_threshold;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Query with thresholds (10min aggregated)
-- SELECT
--     time_bucket,
--     round(avgMerge(eng_avg_state), 3) AS tekanan,
--     min_threshold,
--     max_threshold
-- FROM sensor_telemetry_10min
-- WHERE owner_code = '9VSIK'
--   AND node_code = 'HELIO-353691843831016'
--   AND time_bucket BETWEEN '2026-03-01' AND '2026-03-03'
-- GROUP BY time_bucket, min_threshold, max_threshold
-- ORDER BY time_bucket

-- Detect out-of-threshold readings (raw table)
-- SELECT
--     event_time, node_code, metric_code,
--     eng_value, min_threshold, max_threshold,
--     CASE
--       WHEN eng_value < min_threshold THEN 'BELOW_MIN'
--       WHEN eng_value > max_threshold THEN 'ABOVE_MAX'
--       ELSE 'NORMAL'
--     END AS status
-- FROM sensor_telemetry
-- WHERE owner_code = '9VSIK'
--   AND (eng_value < min_threshold OR eng_value > max_threshold)
--   AND min_threshold > 0
-- ORDER BY event_time DESC
-- LIMIT 50

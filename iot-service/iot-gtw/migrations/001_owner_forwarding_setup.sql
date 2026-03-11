-- =====================================================
-- Owner Data Forwarding Setup
-- Migration: 001_owner_forwarding_setup.sql
-- Date: 2026-03-12
-- =====================================================

-- =====================================================
-- 1. ALTER owner_forwarding_databases - Add tracking columns
-- =====================================================

-- Add source type column
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS source_type text;

COMMENT ON COLUMN public.owner_forwarding_databases.source_type IS 
'Source data type: sensor_logs (PG), sensor_telemetry (CH), sensor_channel_latest (CH)';

-- Add tracking columns for incremental sync
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS last_synced_id bigint DEFAULT 0;

COMMENT ON COLUMN public.owner_forwarding_databases.last_synced_id IS 
'Last synced ID for incremental sync (pg_sensor_log_id for telemetry)';

-- Add owner_code for filtering (extracted from device_id prefix)
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS owner_code text;

COMMENT ON COLUMN public.owner_forwarding_databases.owner_code IS 
'Owner code for filtering data (e.g., DEMO1 from device_id DEMO1-00D42390A994)';

ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

COMMENT ON COLUMN public.owner_forwarding_databases.last_synced_at IS 
'Timestamp of last successful sync';

-- Add sync mode column
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS sync_mode text DEFAULT 'incremental';

COMMENT ON COLUMN public.owner_forwarding_databases.sync_mode IS 
'Sync mode: incremental (track by ID) or full_replace (for latest tables)';

-- Add scheduling column
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS sync_interval_seconds integer DEFAULT 60;

COMMENT ON COLUMN public.owner_forwarding_databases.sync_interval_seconds IS 
'Sync interval in seconds (default: 60 = 1 minute)';

-- Add timeout & retry columns
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS connection_timeout_ms integer DEFAULT 10000;

ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS query_timeout_ms integer DEFAULT 30000;

ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3;

-- Add conflict handling columns
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS conflict_strategy text DEFAULT 'ignore';

COMMENT ON COLUMN public.owner_forwarding_databases.conflict_strategy IS 
'Conflict strategy: ignore (ON CONFLICT DO NOTHING), update (UPSERT), fail';

ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS conflict_columns text[];

COMMENT ON COLUMN public.owner_forwarding_databases.conflict_columns IS 
'Columns to detect conflict for UPSERT, e.g. {channel_id} or {id_sensor_log}';

-- Add schema management columns
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS auto_create_table boolean DEFAULT false;

COMMENT ON COLUMN public.owner_forwarding_databases.auto_create_table IS 
'Auto create target table if not exists';

-- Add lock column to prevent concurrent runs
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS is_running boolean DEFAULT false;

ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS last_run_started_at timestamptz;

-- Add statistics columns
ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS total_records_synced bigint DEFAULT 0;

ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS total_sync_count integer DEFAULT 0;

ALTER TABLE public.owner_forwarding_databases 
ADD COLUMN IF NOT EXISTS total_error_count integer DEFAULT 0;

-- =====================================================
-- 1b. ALTER owner_forwarding_logs - Add tracking columns
-- =====================================================

ALTER TABLE public.owner_forwarding_logs 
ADD COLUMN IF NOT EXISTS records_read integer;

ALTER TABLE public.owner_forwarding_logs 
ADD COLUMN IF NOT EXISTS records_inserted integer;

ALTER TABLE public.owner_forwarding_logs 
ADD COLUMN IF NOT EXISTS records_skipped integer;

ALTER TABLE public.owner_forwarding_logs 
ADD COLUMN IF NOT EXISTS from_id bigint;

ALTER TABLE public.owner_forwarding_logs 
ADD COLUMN IF NOT EXISTS to_id bigint;

-- =====================================================
-- 2. Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_owner_forwarding_databases_owner 
ON public.owner_forwarding_databases (id_owner);

CREATE INDEX IF NOT EXISTS idx_owner_forwarding_databases_enabled 
ON public.owner_forwarding_databases (enabled) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_owner_forwarding_logs_config 
ON public.owner_forwarding_logs (config_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_owner_forwarding_logs_owner 
ON public.owner_forwarding_logs (id_owner, created_at DESC);

-- =====================================================
-- 3. Insert forwarding configs for Owner: c73a0425-34e5-4ed3-a435-eb740f915648
--    Target: Neon PostgreSQL (logger-data)
-- =====================================================

-- Config 1: Sync iot_log (PostgreSQL -> Neon PostgreSQL)
-- Filter by owner_code (first 5 chars of device_id)
INSERT INTO public.owner_forwarding_databases (
    id_owner,
    label,
    db_type,
    host,
    port,
    database_name,
    username,
    password_cipher,
    target_schema,
    target_table,
    write_mode,
    batch_size,
    enabled,
    source_type,
    sync_mode,
    sync_interval_seconds,
    connection_timeout_ms,
    query_timeout_ms,
    max_retries,
    conflict_strategy,
    conflict_columns,
    auto_create_table,
    owner_code
) VALUES (
    'c73a0425-34e5-4ed3-a435-eb740f915648',
    'Sync iot_log to Neon DB',
    'postgres',
    'ep-nameless-art-a1u2reu7-pooler.ap-southeast-1.aws.neon.tech',
    5432,
    'logger-data',
    'devetek',
    'npg_yWFx51ejfORG', -- TODO: Encrypt this in production
    'public',
    'iot_log',
    'append',
    100,
    true,
    'iot_log',
    'incremental',
    60,
    10000,
    30000,
    3,
    'ignore',
    ARRAY['id'],
    true,
    'DEMO1'  -- Filter device_id starting with DEMO1
) ON CONFLICT DO NOTHING;

-- Config 2: Sync sensor_telemetry (ClickHouse -> Neon PostgreSQL)
-- Filter by owner_code column in ClickHouse
INSERT INTO public.owner_forwarding_databases (
    id_owner,
    label,
    db_type,
    host,
    port,
    database_name,
    username,
    password_cipher,
    target_schema,
    target_table,
    write_mode,
    batch_size,
    enabled,
    source_type,
    sync_mode,
    sync_interval_seconds,
    connection_timeout_ms,
    query_timeout_ms,
    max_retries,
    conflict_strategy,
    conflict_columns,
    auto_create_table,
    owner_code
) VALUES (
    'c73a0425-34e5-4ed3-a435-eb740f915648',
    'Sync sensor_telemetry to Neon DB',
    'postgres',
    'ep-nameless-art-a1u2reu7-pooler.ap-southeast-1.aws.neon.tech',
    5432,
    'logger-data',
    'devetek',
    'npg_yWFx51ejfORG', -- TODO: Encrypt this in production
    'public',
    'sensor_telemetry',
    'append',
    100,
    true,
    'sensor_telemetry',
    'incremental',
    60,
    10000,
    30000,
    3,
    'ignore',
    ARRAY['pg_sensor_log_id'],
    true,
    'DEMO1'  -- Filter by owner_code in ClickHouse
) ON CONFLICT DO NOTHING;

-- Config 3: Sync sensor_channel_latest (ClickHouse -> Neon PostgreSQL) - Full Replace
-- Filter by owner_code column in ClickHouse
INSERT INTO public.owner_forwarding_databases (
    id_owner,
    label,
    db_type,
    host,
    port,
    database_name,
    username,
    password_cipher,
    target_schema,
    target_table,
    write_mode,
    batch_size,
    enabled,
    source_type,
    sync_mode,
    sync_interval_seconds,
    connection_timeout_ms,
    query_timeout_ms,
    max_retries,
    conflict_strategy,
    conflict_columns,
    auto_create_table,
    owner_code
) VALUES (
    'c73a0425-34e5-4ed3-a435-eb740f915648',
    'Sync sensor_channel_latest to Neon DB',
    'postgres',
    'ep-nameless-art-a1u2reu7-pooler.ap-southeast-1.aws.neon.tech',
    5432,
    'logger-data',
    'devetek',
    'npg_yWFx51ejfORG', -- TODO: Encrypt this in production
    'public',
    'sensor_channel_latest',
    'upsert',
    500,
    true,
    'sensor_channel_latest',
    'full_replace',
    60,
    10000,
    30000,
    3,
    'update',
    ARRAY['channel_id'],
    true,
    'DEMO1'  -- Filter by owner_code in ClickHouse
) ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. Verify inserted data
-- =====================================================

SELECT 
    id_owner_forwarding_db,
    label,
    source_type,
    target_table,
    sync_mode,
    enabled
FROM public.owner_forwarding_databases 
WHERE id_owner = 'c73a0425-34e5-4ed3-a435-eb740f915648';

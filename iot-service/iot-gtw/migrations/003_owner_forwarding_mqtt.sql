-- =====================================================
-- MQTT Broadcast — push sensor_channel_latest ke broker PDAM
-- Migration: 003_owner_forwarding_mqtt.sql
-- Date: 2026-07-09
-- Ref: iot-angular/docs/design/mqtt-broadcast-spec.md
-- Dijalankan manual via psql (repo tak punya migration runner).
-- =====================================================

-- =====================================================
-- 1. owner_forwarding_mqtt — config broker per-PDAM
--    CRUD ditulis iot-backend-go; dibaca (eksekusi) iot-gtw.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.owner_forwarding_mqtt (
    id_owner_forwarding_mqtt uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner                 uuid NOT NULL,
    owner_code               varchar(5),                 -- diisi Go dari owners.owner_code (bukan input user)
    label                    text NOT NULL,

    -- Koneksi broker (milik PDAM; kita = client publisher)
    broker_url               text NOT NULL,              -- mqtts://host:8883
    username                 text,
    password_cipher          text,                       -- AES-256-GCM (§7 spec), diisi Go saat save
    tls_enabled              boolean NOT NULL DEFAULT true,
    tls_insecure             boolean NOT NULL DEFAULT false,

    -- Kontrak topik & QoS
    topic_template           text NOT NULL DEFAULT '{ownerCode}/telemetry/{deviceId}/{metricCode}',
    qos                      smallint NOT NULL DEFAULT 1,
    retained                 boolean NOT NULL DEFAULT true,
    enabled_categories       jsonb NOT NULL DEFAULT '["telemetry"]'::jsonb,

    -- Tuning
    poll_interval_seconds    integer NOT NULL DEFAULT 10,

    -- Status/lock (ditulis iot-gtw)
    is_active                boolean NOT NULL DEFAULT true,
    is_running               boolean NOT NULL DEFAULT false,
    last_run_started_at      timestamptz,
    last_status              text,                        -- connected, sent, failed, ...
    last_success_at          timestamptz,
    last_error               text,
    last_watermark           timestamptz,                 -- high-water mark last_update (anti re-publish, §8-i)
    total_published          bigint NOT NULL DEFAULT 0,
    total_error_count        integer NOT NULL DEFAULT 0,

    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_forwarding_mqtt_owner
    ON public.owner_forwarding_mqtt (id_owner);
CREATE INDEX IF NOT EXISTS idx_owner_forwarding_mqtt_active
    ON public.owner_forwarding_mqtt (is_active) WHERE is_active = true;

COMMENT ON TABLE public.owner_forwarding_mqtt IS
    'Config broker MQTT milik PDAM. Go=CRUD, iot-gtw=eksekutor (baca+push). password_cipher AES-256-GCM.';
COMMENT ON COLUMN public.owner_forwarding_mqtt.owner_code IS
    'Diisi Go dari owners.owner_code (varchar(5) unique). Dipakai iot-gtw untuk WHERE owner_code di sensor_channel_latest.';
COMMENT ON COLUMN public.owner_forwarding_mqtt.last_watermark IS
    'High-water mark max(last_update) yang sudah dipublish. Hanya baris last_update > watermark yang dikirim (anti re-publish).';

-- =====================================================
-- 2. owner_forwarding_mqtt_log — audit eksekusi (retensi 7 hari)
--    Ditulis iot-gtw; dibaca UI via endpoint Go.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.owner_forwarding_mqtt_log (
    id_owner_forwarding_mqtt_log uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner                     uuid NOT NULL,
    config_id                    uuid NOT NULL,
    status                       text NOT NULL,          -- success, failed, connect_error
    messages_published           integer NOT NULL DEFAULT 0,
    error_message                text,
    duration_ms                  integer,
    created_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_forwarding_mqtt_log_config
    ON public.owner_forwarding_mqtt_log (config_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_forwarding_mqtt_log_owner
    ON public.owner_forwarding_mqtt_log (id_owner, created_at DESC);
-- Index created_at untuk cron pembersih retensi 7 hari (delete cepat).
CREATE INDEX IF NOT EXISTS idx_owner_forwarding_mqtt_log_created
    ON public.owner_forwarding_mqtt_log (created_at);

COMMENT ON TABLE public.owner_forwarding_mqtt_log IS
    'Audit push MQTT. RETENSI MAKS 7 HARI — cron harian DELETE WHERE created_at < now()-interval 7 day.';

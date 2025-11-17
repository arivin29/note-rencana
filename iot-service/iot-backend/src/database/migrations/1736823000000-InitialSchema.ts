import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1736823000000 implements MigrationInterface {
  name = 'InitialSchema1736823000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE owners (
        id_owner UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        industry TEXT,
        contact_person TEXT,
        sla_level TEXT,
        forwarding_settings JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE projects (
        id_project UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
        name TEXT NOT NULL,
        area_type TEXT,
        geofence JSONB,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE node_locations (
        id_node_location UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_project UUID NOT NULL REFERENCES projects(id_project) ON DELETE CASCADE,
        type TEXT DEFAULT 'manual' CHECK (type IN ('manual','gps','import')),
        coordinates POINT NOT NULL,
        elevation NUMERIC(6,2),
        address TEXT,
        precision_m NUMERIC(6,2),
        source TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      COMMENT ON COLUMN node_locations.coordinates IS 'PostgreSQL POINT type (x,y) where x=longitude, y=latitude';
    `);

    await queryRunner.query(`
      CREATE TABLE node_models (
        id_node_model UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        model_code TEXT UNIQUE,
        vendor TEXT NOT NULL,
        model_name TEXT NOT NULL,
        protocol TEXT NOT NULL,
        communication_band TEXT,
        power_type TEXT,
        hardware_class TEXT,
        hardware_revision TEXT,
        toolchain TEXT,
        build_agent TEXT,
        firmware_repo TEXT,
        flash_protocol TEXT,
        supports_codegen BOOLEAN DEFAULT false,
        default_firmware TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE nodes (
        id_node UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_project UUID NOT NULL REFERENCES projects(id_project) ON DELETE CASCADE,
        id_node_model UUID NOT NULL REFERENCES node_models(id_node_model),
        code TEXT NOT NULL,
        serial_number TEXT,
        dev_eui TEXT,
        ip_address INET,
        install_date DATE,
        firmware_version TEXT,
        battery_type TEXT,
        telemetry_interval_sec INTEGER DEFAULT 300,
        connectivity_status TEXT DEFAULT 'offline',
        last_seen_at TIMESTAMPTZ,
        id_current_location UUID REFERENCES node_locations(id_node_location),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (id_project, code)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE node_assignments (
        id_node_assignment UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_node UUID NOT NULL REFERENCES nodes(id_node) ON DELETE CASCADE,
        id_project UUID NOT NULL REFERENCES projects(id_project),
        id_owner UUID NOT NULL REFERENCES owners(id_owner),
        id_node_location UUID REFERENCES node_locations(id_node_location),
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ,
        reason TEXT,
        assigned_by UUID,
        ticket_ref TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE sensor_types (
        id_sensor_type UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category TEXT NOT NULL,
        default_unit TEXT,
        precision NUMERIC(6,3),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE sensor_catalogs (
        id_sensor_catalog UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor TEXT NOT NULL,
        model_name TEXT NOT NULL,
        icon_asset TEXT,
        icon_color TEXT,
        datasheet_url TEXT,
        firmware TEXT,
        calibration_interval_days INTEGER,
        default_channels_json JSONB,
        default_thresholds_json JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE sensors (
        id_sensor UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_node UUID NOT NULL REFERENCES nodes(id_node) ON DELETE CASCADE,
        id_sensor_catalog UUID REFERENCES sensor_catalogs(id_sensor_catalog),
        label TEXT NOT NULL,
        protocol_channel TEXT,
        calibration_factor NUMERIC(12,6),
        sampling_rate INTEGER,
        install_date DATE,
        calibration_due_at DATE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE sensor_channels (
        id_sensor_channel UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_sensor UUID NOT NULL REFERENCES sensors(id_sensor) ON DELETE CASCADE,
        id_sensor_type UUID NOT NULL REFERENCES sensor_types(id_sensor_type),
        metric_code TEXT NOT NULL,
        unit TEXT,
        min_threshold NUMERIC,
        max_threshold NUMERIC,
        multiplier NUMERIC(12,6),
        offset_value NUMERIC(12,6),
        register_address INTEGER,
        precision NUMERIC(6,3),
        aggregation TEXT,
        alert_suppression_window INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (id_sensor, metric_code)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE sensor_logs (
        id_sensor_log BIGSERIAL PRIMARY KEY,
        id_sensor_channel UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
        id_sensor UUID,
        id_node UUID,
        id_project UUID,
        id_owner UUID,
        ts TIMESTAMPTZ NOT NULL,
        value_raw DOUBLE PRECISION,
        value_engineered DOUBLE PRECISION,
        quality_flag TEXT,
        ingestion_source TEXT,
        status_code INTEGER,
        ingestion_latency_ms INTEGER,
        payload_seq BIGINT,
        min_threshold DOUBLE PRECISION,
        max_threshold DOUBLE PRECISION,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE alert_rules (
        id_alert_rule UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_sensor_channel UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
        rule_type TEXT NOT NULL,
        severity TEXT,
        params_json JSONB,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE alert_events (
        id_alert_event UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_alert_rule UUID NOT NULL REFERENCES alert_rules(id_alert_rule) ON DELETE CASCADE,
        triggered_at TIMESTAMPTZ NOT NULL,
        value DOUBLE PRECISION,
        status TEXT DEFAULT 'open',
        acknowledged_by UUID,
        acknowledged_at TIMESTAMPTZ,
        cleared_by UUID,
        cleared_at TIMESTAMPTZ,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE user_dashboards (
        id_dashboard UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_user UUID NOT NULL,
        id_project UUID REFERENCES projects(id_project) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        layout_type TEXT DEFAULT 'grid',
        grid_cols INTEGER DEFAULT 4,
        is_default BOOLEAN DEFAULT FALSE,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE dashboard_widgets (
        id_widget_instance UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_dashboard UUID NOT NULL REFERENCES user_dashboards(id_dashboard) ON DELETE CASCADE,
        widget_type TEXT NOT NULL,
        id_sensor UUID REFERENCES sensors(id_sensor) ON DELETE CASCADE,
        id_sensor_channel UUID REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
        position_x INTEGER DEFAULT 0,
        position_y INTEGER DEFAULT 0,
        size_width INTEGER DEFAULT 1,
        size_height INTEGER DEFAULT 1,
        config_json JSONB,
        refresh_rate INTEGER DEFAULT 5,
        display_order INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE owner_forwarding_webhooks (
        id_owner_forwarding_webhook UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
        label TEXT NOT NULL,
        endpoint_url TEXT NOT NULL,
        http_method TEXT DEFAULT 'POST',
        headers_json JSONB,
        secret_token TEXT,
        payload_template JSONB,
        max_retry INTEGER DEFAULT 3,
        retry_backoff_ms INTEGER DEFAULT 2000,
        enabled BOOLEAN DEFAULT TRUE,
        last_status TEXT,
        last_delivery_at TIMESTAMPTZ,
        last_error TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE owner_forwarding_databases (
        id_owner_forwarding_db UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
        label TEXT NOT NULL,
        db_type TEXT CHECK (db_type IN ('mysql','postgres')) NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        database_name TEXT NOT NULL,
        username TEXT NOT NULL,
        password_cipher TEXT NOT NULL,
        target_schema TEXT,
        target_table TEXT NOT NULL,
        write_mode TEXT DEFAULT 'append',
        batch_size INTEGER DEFAULT 100,
        enabled BOOLEAN DEFAULT TRUE,
        last_status TEXT,
        last_delivery_at TIMESTAMPTZ,
        last_error TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE owner_forwarding_logs (
        id_owner_forwarding_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_owner UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
        config_type TEXT CHECK (config_type IN ('webhook','database')) NOT NULL,
        config_id UUID NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER DEFAULT 1,
        error_message TEXT,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_sensor_logs_channel_ts ON sensor_logs (id_sensor_channel, ts DESC);
    `);

    await queryRunner.query(`CREATE INDEX idx_user_dashboards_user ON user_dashboards(id_user);`);
    await queryRunner.query(`CREATE INDEX idx_user_dashboards_project ON user_dashboards(id_project);`);
    await queryRunner.query(
      `CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(id_dashboard);`,
    );
    await queryRunner.query(`CREATE INDEX idx_dashboard_widgets_sensor ON dashboard_widgets(id_sensor);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dashboard_widgets_sensor;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dashboard_widgets_dashboard;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_dashboards_project;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_dashboards_user;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sensor_logs_channel_ts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS owner_forwarding_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS owner_forwarding_databases;`);
    await queryRunner.query(`DROP TABLE IF EXISTS owner_forwarding_webhooks;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dashboard_widgets;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_dashboards;`);
    await queryRunner.query(`DROP TABLE IF EXISTS alert_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS alert_rules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sensor_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sensor_channels;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sensors;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sensor_catalogs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sensor_types;`);
    await queryRunner.query(`DROP TABLE IF EXISTS node_assignments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS nodes;`);
    await queryRunner.query(`DROP TABLE IF EXISTS node_models;`);
    await queryRunner.query(`DROP TABLE IF EXISTS node_locations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects;`);
    await queryRunner.query(`DROP TABLE IF EXISTS owners;`);
  }
}

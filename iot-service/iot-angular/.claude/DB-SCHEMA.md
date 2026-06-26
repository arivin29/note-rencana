# IoT Database Schema (verified against live DB)

Source of truth = **the live PostgreSQL DB + the Go GORM models** (`iot-backend-go/app/models/<module>/`). There are **no `.sql` migration files** in the repo (`database/` is empty); a `migrations` table exists in the DB so migrations are applied out-of-band. Verified by direct introspection: PostgreSQL 17.6, DB `iot`, 44 tables, 76 foreign keys.

> Conventions: PK = `id_<entity>` UUID (`gen_random_uuid()`), except `sensor_logs.id_sensor_log` = bigint. Columns snake_case; audit cols `created_by`/`updated_by` → `users`. Telemetry timestamps `ts` / `timestamptz`.

## Core operational chain
```
owners ─< projects ─< nodes ─< sensors ─< sensor_channels ─< sensor_logs (telemetry)
```
- **owners** (tenant root): `id_owner`, `owner_code`, `name`, `industry`, `sla_level`, `email/phone/address`, `forwarding_settings` jsonb.
- **projects**: `id_project`, `id_owner`→owners, `name`, `area_type`, `geofence` jsonb, `status`.
- **nodes** (device): `id_node`, `id_project`→projects, `id_node_model`→node_models, `id_node_profile`→node_profiles, `id_current_location`→node_locations, `code`, `serial_number`, `dev_eui`, `firmware_version`, `battery_type`, `telemetry_interval_sec`, `connectivity_status`, `last_seen_at`, `status`, `power_source`, `enclosure_rating`, `installation_type`, PIC (`pic_name/phone/email`), `tags[]`, and **denormalized location** (`latitude`,`longitude`,`elevation_m`,`address`,`city`,`province`,`postal_code`,`country`). Note location lives BOTH inline and via `id_current_location`.
- **sensors**: `id_sensor`, `id_node`→nodes, `id_sensor_catalog`→sensor_catalogs, `sensor_code`, `label`, `protocol_channel`, `calibration_factor`, `sampling_rate`, `calibration_due_at`, `status`.
- **sensor_channels** (one metric of a sensor): `id_sensor_channel`, `id_sensor`→sensors, `id_sensor_type`→sensor_types, `metric_code`, `unit`, `min_threshold`/`max_threshold`, `multiplier`, `offset_value`, `register_address` (Modbus), `precision`, `aggregation`, `alert_suppression_window`. ← this is the "dynamic Modbus mapping + calibration offset" product feature.
- **sensor_logs** (telemetry, **in PostgreSQL**, ~685k rows): `id_sensor_log` bigint PK, `id_sensor_channel`→sensor_channels, plus **denormalized** `id_sensor`,`id_node`,`id_project`,`id_owner` for fast scoping, `ts`, `value_raw`, `value_engineered`, `quality_flag`, `ingestion_source`, `status_code`, `ingestion_latency_ms`, `payload_seq`. ClickHouse is also enabled for time-series, but Postgres holds sensor_logs too.

## Reference / catalog
- **node_models** (hardware catalog = Type A/B/C/D): `model_code`, `vendor`, `model_name`, `protocol`, `communication_band`, `power_type`, `hardware_class`, firmware/codegen fields (`toolchain`,`build_agent`,`firmware_repo`,`flash_protocol`,`supports_codegen`,`default_firmware`).
- **node_model_commands** → node_models (command templates). **node_profiles** → node_models, projects (payload parsing). **node_locations** → projects. **node_assignments** → nodes/projects/owners/node_locations. **node_unpaired_devices** → node_models, `paired_node_id`→nodes, `suggested_owner`/`suggested_project`.
- **sensor_catalogs** (vendor catalog) → sensors. **sensor_types** (category/unit/precision/conversion_formula) → sensor_channels.

## Alerts & ML
- **alert_rules** → sensor_channels. **alert_events** → alert_rules. **anomaly_results** → sensor_channels, and `id_alert_event`→alert_events (anomaly can raise an alert). **forecast_results** → sensor_channels.

## Dashboards / SCADA / WebGIS
- **user_dashboards** → projects; **dashboard_widgets** (per old doc → user_dashboards/sensors). **custom_dashboards** → owners/projects (+`created_by`); **custom_widgets** → custom_dashboards. **widget_query_templates** → owners.
- **scada_diagrams** → owners/projects; **scada_nodes** → scada_diagrams (+ `id_related_node`→nodes, `id_related_sensor`→sensors); **scada_edges** → scada_diagrams, source/target → scada_nodes; **scada_node_bindings** → scada_nodes, sensor_channels.
- **map_layer** → (owner/project per model); **map_layer_feature** → map_layer; **map_layer_category** self-ref `parent_category_id`; **spatial_upload_file** → map_layer.

## Platform / tenant / ops
- **users**: `id_user`, `id_owner`→owners, `email`, `role` (admin|tenant), `is_active`; self-ref `created_by`/`updated_by`. **user_sessions** → users. **password_reset_tokens** → users.
- **owner_forwarding_webhooks / _databases / _logs** → owners (data forwarding feature). **tenant_api_keys** → owners/users; **tenant_api_logs** → tenant_api_keys.
- **notifications** → users, notification_channels. **notification_channels** (standalone). **audit_logs** → users. **report_templates** → owners/users. **documents** (polymorphic `from_module`+`from_module_id`). **iot_log** (~568k raw device logs). **pengaduan** (legacy, separate MySQL `pengaduan` connection).

## Practical notes for dev
- Multi-tenant scoping: filter by `id_owner` (directly or via project/node). `sensor_logs` already carries `id_owner`/`id_project`/`id_node` so telemetry queries can scope without joins.
- Heavy tables: `sensor_logs` ~685k, `iot_log` ~568k, `owner_forwarding_logs` ~123k, `anomaly_results` ~60k, `audit_logs` ~16k. Current scale: 18 owners, 15 projects, 43 nodes, 70 sensors, 144 channels.
- To re-introspect: `psql "host=109.105.194.174 port=54366 user=postgres dbname=iot sslmode=disable"` (creds in `iot-backend-go/.env`).

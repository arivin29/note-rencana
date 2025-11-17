# Verified Database DDL Structure

## Confirmed from Remote Database: 109.105.194.174:54366

### 1. owners
```sql
- id_owner: uuid (PK, default: gen_random_uuid())
- name: text (NOT NULL)
- industry: text
- contact_person: text
- sla_level: text
- forwarding_settings: jsonb
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

### 2. projects
```sql
- id_project: uuid (PK, default: gen_random_uuid())
- id_owner: uuid (FK -> owners, NOT NULL, ON DELETE CASCADE)
- name: text (NOT NULL)
- area_type: text
- geofence: jsonb
- status: text (default: 'active')
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

### 3. node_models
```sql
- id_node_model: uuid (PK, default: gen_random_uuid())
- model_code: text (UNIQUE)
- vendor: text (NOT NULL)
- model_name: text (NOT NULL)
- protocol: text (NOT NULL)
- communication_band: text
- power_type: text
- hardware_class: text
- hardware_revision: text
- toolchain: text
- build_agent: text
- firmware_repo: text
- flash_protocol: text
- supports_codegen: boolean (default: false)
- default_firmware: text
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

### 4. node_locations
```sql
- id_node_location: uuid (PK, default: gen_random_uuid())
- id_project: uuid (FK -> projects, NOT NULL, ON DELETE CASCADE)
- type: text (default: 'manual', CHECK: 'manual'|'gps'|'import')
- coordinates: point (NOT NULL) -- PostgreSQL POINT(longitude, latitude)
- elevation: numeric(6,2)
- address: text
- precision_m: numeric(6,2)
- source: text
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

### 5. nodes
```sql
- id_node: uuid (PK, default: gen_random_uuid())
- id_project: uuid (FK -> projects, NOT NULL, ON DELETE CASCADE)
- id_node_model: uuid (FK -> node_models, NOT NULL)
- code: text (NOT NULL)
- serial_number: text
- dev_eui: text
- ip_address: inet
- install_date: date
- firmware_version: text
- battery_type: text
- telemetry_interval_sec: integer (default: 300)
- connectivity_status: text (default: 'offline')
- last_seen_at: timestamp with time zone
- id_current_location: uuid (FK -> node_locations)
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
- UNIQUE(id_project, code)
```

### 6. sensor_types
```sql
- id_sensor_type: uuid (PK, default: gen_random_uuid())
- category: text (NOT NULL) -- e.g., 'temperature', 'humidity'
- default_unit: text -- e.g., 'celsius', 'percent'
- precision: numeric(6,3)
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

### 7. sensor_catalogs
```sql
- id_sensor_catalog: uuid (PK, default: gen_random_uuid())
- vendor: text (NOT NULL)
- model_name: text (NOT NULL)
- icon_asset: text
- icon_color: text
- datasheet_url: text
- firmware: text
- calibration_interval_days: integer
- default_channels_json: jsonb
- default_thresholds_json: jsonb
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

### 8. sensors
```sql
- id_sensor: uuid (PK, default: gen_random_uuid())
- id_node: uuid (FK -> nodes, NOT NULL, ON DELETE CASCADE)
- id_sensor_catalog: uuid (FK -> sensor_catalogs)
- label: text (NOT NULL)
- protocol_channel: text
- calibration_factor: numeric(12,6)
- sampling_rate: integer
- install_date: date
- calibration_due_at: date
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

### 9. sensor_channels
```sql
- id_sensor_channel: uuid (PK, default: gen_random_uuid())
- id_sensor: uuid (FK -> sensors, NOT NULL, ON DELETE CASCADE)
- id_sensor_type: uuid (FK -> sensor_types, NOT NULL)
- metric_code: text (NOT NULL)
- unit: text
- min_threshold: numeric
- max_threshold: numeric
- multiplier: numeric(12,6)
- offset_value: numeric(12,6)
- register_address: integer
- precision: numeric(6,3)
- aggregation: text
- alert_suppression_window: integer
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
- UNIQUE(id_sensor, metric_code)
```

### 10. sensor_logs
```sql
- id_sensor_log: bigserial (PK, auto-increment)
- id_sensor_channel: uuid (FK -> sensor_channels, NOT NULL, ON DELETE CASCADE)
- id_sensor: uuid
- id_node: uuid
- id_project: uuid
- id_owner: uuid
- ts: timestamp with time zone (NOT NULL) -- timestamp of measurement
- value_raw: double precision
- value_engineered: double precision
- quality_flag: text
- ingestion_source: text
- status_code: integer
- ingestion_latency_ms: integer
- payload_seq: bigint
- min_threshold: double precision
- max_threshold: double precision
- created_at: timestamp with time zone (default: now())
```

## Important Notes

1. **POINT Type**: `coordinates` uses PostgreSQL POINT(longitude, latitude) format
2. **Unique Constraints**: 
   - `nodes`: UNIQUE(id_project, code)
   - `sensor_channels`: UNIQUE(id_sensor, metric_code)
3. **Foreign Key Cascades**: Most child tables have ON DELETE CASCADE
4. **Auto-generated IDs**: All tables use `gen_random_uuid()` except `sensor_logs` which uses `bigserial`
5. **Denormalized Fields**: `sensor_logs` includes denormalized `id_sensor`, `id_node`, `id_project`, `id_owner` for faster queries

## Seed Data Requirements

For complete testing, we need:
- **3+ Owners** (different industries)
- **6+ Projects** (2 per owner)
- **5+ Node Models** (different protocols: Modbus, MQTT, TCP)
- **20+ Nodes** (distributed across projects)
- **40+ Sensors** (1-4 per node)
- **10+ Sensor Types** (temperature, humidity, pressure, flow, pH, etc.)
- **100+ Sensor Channels** (1-4 per sensor)
- **50,000+ Sensor Logs** (historical data for 48-72 hours)

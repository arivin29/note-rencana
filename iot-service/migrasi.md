## Migrasi Database IoT Dashboard

- **Engine**: PostgreSQL 15 + TimescaleDB extension untuk time-series `sensor_logs`.
- **Konvensi ID**: setiap primary key mengikuti format `id_<nama_tabel>` dan kolom referensi project selalu `id_project`.
- **UUID**: gunakan `UUID` dengan `DEFAULT gen_random_uuid()`; ganti dengan `BIGINT` bila fungsi UUID belum tersedia.
- **Timestamps**: `created_at`/`updated_at` menggunakan trigger atau default `now()`.

### 1. Struktur Organisasi & Lokasi
```sql
CREATE TABLE owners (
  id_owner       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  industry       TEXT,
  contact_person TEXT,
  sla_level      TEXT,
  forwarding_settings JSONB, -- optional legacy storage, prefer child tables below
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
  id_project   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner     UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  area_type    TEXT CHECK (area_type IN ('plant','pipeline','farm','other')),
  geofence     JSONB, -- GeoJSON polygon atau multipolygon
  status       TEXT DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE node_locations (
  id_node_location UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_project        UUID NOT NULL REFERENCES projects(id_project) ON DELETE CASCADE,
  type              TEXT CHECK (type IN ('manual','gps','import')) DEFAULT 'manual',
  coordinates       GEOGRAPHY(POINT, 4326) NOT NULL,
  elevation         NUMERIC(6,2),
  address           TEXT,
  precision_m       NUMERIC(6,2),
  source            TEXT, -- GPS/manual/import
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

**Keterangan**
- `owners`: master klien/tenant; `sla_level` membantu menentukan prioritas penanganan alert.
- `projects`: area kerja per owner; `geofence` menyimpan batas area berbentuk GeoJSON untuk peta.
- `node_locations`: katalog titik koordinat Node; `type` menunjukkan sumber koordinat (manual/GPS/import) dan `precision_m` menjadi indikator akurasi.
- `owner_forwarding_webhooks / owner_forwarding_databases`: konfigurasi forwarding per tenant. Simpan endpoint, kredensial, serta metadata status untuk fitur data delivery.
- `owner_forwarding_logs`: histori tiap percobaan forward (berhasil/gagal) sehingga UI dapat menampilkan insight sinkronisasi.

### 2. Node & Model Perangkat
```sql
CREATE TABLE node_models (
  id_node_model      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code         TEXT UNIQUE, -- kode internal untuk generator
  vendor             TEXT NOT NULL,
  model_name         TEXT NOT NULL,
  protocol           TEXT NOT NULL,
  communication_band TEXT,
  power_type         TEXT,
  hardware_class     TEXT CHECK (hardware_class IN ('mcu','gateway','tracker','custom')),
  hardware_revision  TEXT,
  toolchain          TEXT, -- Arduino IDE / PlatformIO / Teltonika Configurator
  build_agent        TEXT, -- runner internal
  firmware_repo      TEXT,
  flash_protocol     TEXT,
  supports_codegen   BOOLEAN DEFAULT false,
  default_firmware   TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE nodes (
  id_node                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_project             UUID NOT NULL REFERENCES projects(id_project) ON DELETE CASCADE,
  id_node_model          UUID NOT NULL REFERENCES node_models(id_node_model),
  code                   TEXT NOT NULL,
  serial_number          TEXT,
  dev_eui                TEXT,
  ip_address             INET,
  install_date           DATE,
  firmware_version       TEXT,
  battery_type           TEXT,
  telemetry_interval_sec INTEGER NOT NULL DEFAULT 300,
  connectivity_status    TEXT DEFAULT 'offline',
  last_seen_at           TIMESTAMPTZ,
  id_current_location    UUID REFERENCES node_locations(id_node_location),
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id_project, code)
);

CREATE TABLE node_assignments (
  id_node_assignment UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_node            UUID NOT NULL REFERENCES nodes(id_node) ON DELETE CASCADE,
  id_project         UUID NOT NULL REFERENCES projects(id_project),
  id_owner           UUID NOT NULL REFERENCES owners(id_owner),
  id_node_location   UUID REFERENCES node_locations(id_node_location),
  start_at           TIMESTAMPTZ NOT NULL,
  end_at             TIMESTAMPTZ,
  reason             TEXT,
  assigned_by        UUID, -- user id
  ticket_ref         TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
```

**Keterangan**
- `node_models`: katalog hardware gateway/perangkat yang sekaligus menyimpan metadata platform/toolchain sehingga atribut vendor/band/firmware tidak diulang di setiap node.
- Field `toolchain/build_agent/firmware_repo/flash_protocol/supports_codegen` memastikan setiap model punya pipeline OTA/code generator jelas ketika Node dideploy atau diperbarui.
- `nodes`: representasi perangkat di lapangan. Field penting:
  - `dev_eui`: identitas LoRa/LPWAN unik.
  - `telemetry_interval_sec`: jadwal kirim data untuk mendeteksi keterlambatan telemetri.
  - `id_current_location`: menunjuk titik lokasi terbaru dari tabel `node_locations`.
- `node_assignments`: riwayat perpindahan Node antar project/owner; `ticket_ref` menautkan ke pekerjaan teknisi dan `assigned_by` mencatat siapa yang memindahkan.

### 3. Sensor Master & Kanal
```sql
CREATE TABLE sensor_types (
  id_sensor_type UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category       TEXT NOT NULL,
  default_unit   TEXT,
  precision      NUMERIC(6,3),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sensor_catalogs (
  id_sensor_catalog         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor                    TEXT NOT NULL,
  model_name                TEXT NOT NULL,
  icon_asset                TEXT,
  icon_color                TEXT,
  datasheet_url             TEXT,
  firmware                  TEXT,
  calibration_interval_days INTEGER,
  default_channels_json     JSONB,
  default_thresholds_json   JSONB,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sensors (
  id_sensor          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_node            UUID NOT NULL REFERENCES nodes(id_node) ON DELETE CASCADE,
  id_sensor_catalog  UUID REFERENCES sensor_catalogs(id_sensor_catalog),
  sensor_code        TEXT,
  label              TEXT NOT NULL,
  location           TEXT,
  status             TEXT DEFAULT 'active' CHECK (status IN ('active','maintenance','inactive')),
  protocol_channel   TEXT,
  calibration_factor NUMERIC(12,6),
  sampling_rate      INTEGER,
  install_date       DATE,
  calibration_due_at DATE,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_sensor_code_per_node UNIQUE (id_node, sensor_code)
);

CREATE TABLE sensor_channels (
  id_sensor_channel        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sensor                UUID NOT NULL REFERENCES sensors(id_sensor) ON DELETE CASCADE,
  id_sensor_type           UUID NOT NULL REFERENCES sensor_types(id_sensor_type),
  metric_code              TEXT NOT NULL,
  unit                     TEXT,
  min_threshold            NUMERIC,
  max_threshold            NUMERIC,
  multiplier               NUMERIC(12,6),
  offset                   NUMERIC(12,6),
  register_address         INTEGER,
  precision                NUMERIC(6,3),
  aggregation              TEXT,
  alert_suppression_window INTEGER,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id_sensor, metric_code)
);
```

**Keterangan**
- `sensor_types`: klasifikasi kasar (pressure, flow, voltage) untuk grouping UI/report serta menjaga konsistensi penamaan channel.
- `sensor_catalogs`: master spesifikasi tiap model sensor; `icon_asset` & `icon_color` dipakai untuk konsistensi visual, sementara `default_channels_json` berisi template register/unit bawaan pabrik.
- `sensors`: sensor fisik yang terhubung ke node dengan atribut penting:
  - `sensor_code`: identifier unik per sensor dalam satu node (contoh: SENSOR-001, TEMP-01)
  - `location`: deskripsi lokasi fisik sensor (contoh: Tank A, Pipe Section 3, Panel Control Room)
  - `status`: kondisi kesehatan sensor (`active` = operasional, `maintenance` = sedang servis, `inactive` = nonaktif/offline)
  - `protocol_channel`: detail layer komunikasi (contoh RS485 slave id, kanal analog)
  - Constraint `unique_sensor_code_per_node` memastikan tidak ada duplikasi kode dalam satu node
- `sensor_channels`: parameter individual (flow, voltage, temperature) dalam satu sensor; setiap channel membawa `id_sensor_type` untuk memastikan jenis metrik konsisten, sedangkan `register_address` memetakan alamat Modbus/holding register dan `alert_suppression_window` mencegah spam alert berulang.

### 4. Time-Series & Alerting
```sql
CREATE TABLE sensor_logs (
  id_sensor_log        BIGSERIAL PRIMARY KEY,
  id_sensor_channel    UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
  id_sensor            UUID,
  id_node              UUID,
  id_project           UUID,
  id_owner             UUID,
  ts                   TIMESTAMPTZ NOT NULL,
  value_raw            DOUBLE PRECISION,
  value_engineered     DOUBLE PRECISION,
  quality_flag         TEXT,
  ingestion_source     TEXT,
  status_code          INTEGER,
  ingestion_latency_ms INTEGER,
  payload_seq          BIGINT,
  min_threshold        DOUBLE PRECISION,
  max_threshold        DOUBLE PRECISION
);
-- Jadikan hypertable: SELECT create_hypertable('sensor_logs','ts');

CREATE INDEX idx_sensor_logs_channel_ts
  ON sensor_logs (id_sensor_channel, ts DESC);

> Catatan: kolom `id_sensor/id_node/id_project/id_owner` dan `min/max_threshold` bersifat denormalisasi untuk memudahkan query dashboard tanpa join berat. Isi nilai-nilai ini di pipeline ingestion (atau trigger) berdasarkan metadata channel saat log diterima.

CREATE TABLE alert_rules (
  id_alert_rule      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sensor_channel  UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
  rule_type          TEXT NOT NULL,
  severity           TEXT,
  params_json        JSONB,
  enabled            BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alert_events (
  id_alert_event   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_alert_rule    UUID NOT NULL REFERENCES alert_rules(id_alert_rule) ON DELETE CASCADE,
  triggered_at     TIMESTAMPTZ NOT NULL,
  value            DOUBLE PRECISION,
  status           TEXT DEFAULT 'open',
  acknowledged_by  UUID,
  acknowledged_at  TIMESTAMPTZ,
  cleared_by       UUID,
  cleared_at       TIMESTAMPTZ,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

**Keterangan**
- `sensor_logs`: penyimpanan time-series bernilai besar; `value_engineered` adalah hasil konversi setelah multiplier/offset, sedangkan `ingestion_latency_ms` membantu memantau keterlambatan pipeline.
- `alert_rules`: konfigurasi penjagaan tiap channel; `params_json` menyimpan detail aturan (ambang, slope, dsb) agar fleksibel.
- `alert_events`: histori kejadian; kolom `acknowledged_by/at` dan `cleared_by/at` mendukung workflow tim operasional (acknowledge vs resolve) dan `note` merekam catatan penyelesaian.

### 5. Dashboard & Widget Management
```sql
CREATE TABLE user_dashboards (
  id_dashboard UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user      UUID NOT NULL,
  id_project   UUID REFERENCES projects(id_project) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  layout_type  TEXT DEFAULT 'grid' CHECK (layout_type IN ('grid','free')),
  grid_cols    INTEGER DEFAULT 4,
  is_default   BOOLEAN DEFAULT FALSE,
  is_public    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dashboard_widgets (
  id_widget_instance UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_dashboard       UUID NOT NULL REFERENCES user_dashboards(id_dashboard) ON DELETE CASCADE,
  widget_type        TEXT NOT NULL,
  id_sensor          UUID REFERENCES sensors(id_sensor) ON DELETE CASCADE,
  id_sensor_channel  UUID REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
  position_x         INTEGER DEFAULT 0,
  position_y         INTEGER DEFAULT 0,
  size_width         INTEGER DEFAULT 1,
  size_height        INTEGER DEFAULT 1,
  config_json        JSONB,
  refresh_rate       INTEGER DEFAULT 5,
  display_order      INTEGER,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_dashboards_user ON user_dashboards(id_user);
CREATE INDEX idx_user_dashboards_project ON user_dashboards(id_project);
CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(id_dashboard);
CREATE INDEX idx_dashboard_widgets_sensor ON dashboard_widgets(id_sensor);
```

**Keterangan**
- `user_dashboards`: konfigurasi dashboard custom per user; `layout_type` menentukan grid atau free positioning, `is_default` menandai dashboard utama user, dan `is_public` memungkinkan sharing dashboard antar user.
- `dashboard_widgets`: instance widget di dashboard; `widget_type` merujuk ke katalog widget (radial-gauge, big-number, dll), `config_json` menyimpan konfigurasi khusus (warna, threshold, time range), dan `refresh_rate` mengatur interval update data (dalam detik).
- `id_sensor_channel` opsional jika widget perlu spesifik ke satu channel (misal hanya pressure, bukan semua metrics dari sensor).

### 6. Index & Partisi Tambahan
- Tambahkan indeks tambahan seperti `CREATE INDEX idx_nodes_owner ON nodes(id_project, id_node_model);` sesuai kebutuhan query.
- Partial index `ON sensor_logs (ts)` dengan filter 30 hari membantu panel realtime.
- Tabel `users`, `role_assignments`, `api_keys` tidak dicakup di dokumen ini namun gunakan pola `id_user`, `id_role`, dll.
CREATE TABLE owner_forwarding_webhooks (
  id_owner_forwarding_webhook UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner                    UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
  label                       TEXT NOT NULL,
  endpoint_url                TEXT NOT NULL,
  http_method                 TEXT DEFAULT 'POST',
  headers_json                JSONB,
  secret_token                TEXT,
  payload_template            JSONB,
  max_retry                   INTEGER DEFAULT 3,
  retry_backoff_ms            INTEGER DEFAULT 2000,
  enabled                     BOOLEAN DEFAULT TRUE,
  last_status                 TEXT,
  last_delivery_at            TIMESTAMPTZ,
  last_error                  TEXT,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE owner_forwarding_databases (
  id_owner_forwarding_db UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner               UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
  label                  TEXT NOT NULL,
  db_type                TEXT CHECK (db_type IN ('mysql','postgres')) NOT NULL,
  host                   TEXT NOT NULL,
  port                   INTEGER NOT NULL,
  database_name          TEXT NOT NULL,
  username               TEXT NOT NULL,
  password_cipher        TEXT NOT NULL,
  target_schema          TEXT,
  target_table           TEXT NOT NULL,
  write_mode             TEXT CHECK (write_mode IN ('append','upsert')) DEFAULT 'append',
  batch_size             INTEGER DEFAULT 100,
  enabled                BOOLEAN DEFAULT TRUE,
  last_status            TEXT,
  last_delivery_at       TIMESTAMPTZ,
  last_error             TEXT,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE owner_forwarding_logs (
  id_owner_forwarding_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner                UUID NOT NULL REFERENCES owners(id_owner) ON DELETE CASCADE,
  config_type             TEXT CHECK (config_type IN ('webhook','database')) NOT NULL,
  config_id               UUID NOT NULL,
  status                  TEXT NOT NULL,
  attempts                INTEGER DEFAULT 1,
  error_message           TEXT,
  duration_ms             INTEGER,
  created_at              TIMESTAMPTZ DEFAULT now()
);

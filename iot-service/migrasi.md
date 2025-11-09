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

### 2. Node & Model Perangkat
```sql
CREATE TABLE node_models (
  id_node_model      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor             TEXT NOT NULL,
  model_name         TEXT NOT NULL,
  protocol           TEXT NOT NULL,
  communication_band TEXT,
  power_type         TEXT,
  hardware_revision  TEXT,
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
- `node_models`: katalog hardware gateway/perangkat sehingga atribut vendor/band/firmware tidak diulang di setiap node.
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
  id_sensor_type     UUID NOT NULL REFERENCES sensor_types(id_sensor_type),
  label              TEXT NOT NULL,
  protocol_channel   TEXT,
  calibration_factor NUMERIC(12,6),
  sampling_rate      INTEGER,
  install_date       DATE,
  calibration_due_at DATE,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sensor_channels (
  id_sensor_channel        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sensor                UUID NOT NULL REFERENCES sensors(id_sensor) ON DELETE CASCADE,
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
- `sensor_types`: klasifikasi kasar (pressure, flow, voltage) untuk grouping UI/report.
- `sensor_catalogs`: master spesifikasi tiap model sensor; `icon_asset` & `icon_color` dipakai untuk konsistensi visual, sementara `default_channels_json` berisi template register/unit bawaan pabrik.
- `sensors`: sensor fisik yang terhubung ke node; `protocol_channel` menampung detail layer komunikasi (contoh RS485 slave id, kanal analog).
- `sensor_channels`: parameter individual (flow, voltage, temperature) dalam satu sensor; `register_address` memetakan alamat Modbus/holding register dan `alert_suppression_window` mencegah spam alert berulang.

### 4. Time-Series & Alerting
```sql
CREATE TABLE sensor_logs (
  id_sensor_log        BIGSERIAL PRIMARY KEY,
  id_sensor_channel    UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
  ts                   TIMESTAMPTZ NOT NULL,
  value_raw            DOUBLE PRECISION,
  value_engineered     DOUBLE PRECISION,
  quality_flag         TEXT,
  ingestion_source     TEXT,
  status_code          INTEGER,
  ingestion_latency_ms INTEGER,
  payload_seq          BIGINT
);
-- Jadikan hypertable: SELECT create_hypertable('sensor_logs','ts');

CREATE INDEX idx_sensor_logs_channel_ts
  ON sensor_logs (id_sensor_channel, ts DESC);

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

### 5. Index & Partisi Tambahan
- Tambahkan indeks tambahan seperti `CREATE INDEX idx_nodes_owner ON nodes(id_project, id_node_model);` sesuai kebutuhan query.
- Partial index `ON sensor_logs (ts)` dengan filter 30 hari membantu panel realtime.
- Tabel `users`, `role_assignments`, `api_keys` tidak dicakup di dokumen ini namun gunakan pola `id_user`, `id_role`, dll.

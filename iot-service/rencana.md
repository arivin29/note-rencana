## Rencana Teknis IoT Dashboard

### 1. Konteks & Tujuan
- Menyediakan satu dashboard terpadu untuk manajemen Node (alat IoT) lintas merek dan lokasi proyek.
- Memastikan struktur data siap menampung ribuan Node/Sensor dan jutaan log time-series.
- Memudahkan tim frontend membuat UI mockup berdasarkan entitas dan relasi yang jelas.

### 2. Terminologi & Aktor
- **Owner**: Klien pemilik beberapa proyek (contoh: PT ABC).
- **Project**: Kumpulan Node pada area tertentu (Area A, Kebun 1, dll).
- **Node**: Perangkat fisik di lapangan; bisa terdiri dari multi sensor.
- **Sensor**: Modul pengukuran tertentu pada Node (tekanan, flow, debit, dsb).
- **Sensor Log**: Catatan time-series hasil pembacaan sensor.
- **User Ops**: Admin internal yang memantau semua owner/project.
- **User Client**: Staf milik Owner tertentu; akses dibatasi ke project mereka.

### 3. Use Case Tingkat Tinggi
1. Ops membuat Owner dan struktur project mereka.
2. Ops/Client menambah Node baru, memilih jenis & firmware.
3. Ops/Client menambahkan sensor pada Node dan mengatur ambang batas.
4. UI menampilkan status Node (online/offline), health sensor, dan log grafik.
5. User menelusuri log per sensor (filter waktu, agregasi) dan mengekspor data.

### 4. Model Data & ERD (Konseptual)
```
Owner 1 ── N Project 1 ── N Node 1 ── N Sensor 1 ── N SensorChannel 1 ── N SensorLog
                               │                     │
                               ├── 1 NodeModel       └── 1 SensorType
                               ├── N NodeAssignment (history lokasi/project)
                               ├── N NodeLocation (geo point/segment yang pernah ditempati)
                               └── 1 SensorCatalog (master spesifikasi & ikon)

Project 1 ── N LocationSegment (opsional, misal blok area)

AlertRule N ── 1 Sensor   |   AlertEvent N ── 1 AlertRule
```
- **Cardinality kunci**: Owner→Project (1:N), Project→Node (1:N), Node→Sensor (1:N), Sensor→SensorLog (1:N).
- **Node Assignment** menjaga riwayat jika Node dipindah antar project/owner.
- **Node Model/Sensor Type** memisahkan metadata (merek, protokol, satuan).
- **Alert Rule/Event** opsional untuk dashboard status dan notifikasi.

### 5. Definisi Entitas & Atribut
| Entitas | Atribut Utama | Catatan |
| --- | --- | --- |
| Owner | id, name, industry, contact_person, sla_level | Dipakai untuk hak akses & reporting |
| Project | id, owner_id, name, area_type, geofence (GeoJSON), status | Area_type: plant/pipeline/farm |
| LocationSegment | id, project_id, label, centroid | Membantu grouping Node di UI |
| Node | id, project_id, node_model_id, code, serial_number, dev_eui, ip_address, install_date, firmware_version, battery_type, telemetry_interval_sec, connectivity_status, last_seen_at, current_location_id | `code` ditampilkan di UI & QR; `telemetry_interval_sec` menentukan jadwal kirim data |
| NodeModel | id, vendor, model_name, protocol, communication_band, power_type, hardware_revision, default_firmware | Reusable antar owner |
| NodeAssignment | id, node_id, project_id, owner_id, node_location_id, start_at, end_at, reason | History pemindahan + alasan |
| NodeLocation | id, project_id, type (segment/manual), location_segment_id, coordinates (POINT), elevation, address | Menyimpan koordinat presisi; bisa refer ke segment atau koordinat bebas |
| Sensor | id, node_id, sensor_catalog_id, sensor_type_id, label, protocol_channel, calibration_factor, sampling_rate, install_date, calibration_due_at | Abstraksi perangkat; bisa memuat multi parameter |
| SensorCatalog | id, vendor, model_name, icon_asset, icon_color, datasheet_url, firmware, calibration_interval_days, default_channels_json, default_thresholds_json | Master referensi untuk ikon & template channel |
| SensorChannel | id, sensor_id, metric_code (pressure/voltage), unit, min_threshold, max_threshold, multiplier, offset, register_address | Mewakili masing-masing parameter/registrasi (contoh RS485) |
| SensorType | id, category (pressure/flow/etc), default_unit, precision | Membantu template UI |
| SensorLog | id, sensor_channel_id, ts, value_raw, value_engineered, quality_flag, ingestion_source | Time-series utama |
| AlertRule | id, sensor_channel_id, rule_type (threshold, derivative), severity, params_json | Param fleksibel (JSON schema) |
| AlertEvent | id, alert_rule_id, triggered_at, value, status, acknowledged_by | Untuk riwayat alarm |

### 6. Struktur Data untuk UI Mockup
#### 6.1 Ringkasan Owner → Project
```json
{
  "ownerId": "OWN-123",
  "ownerName": "PT ABC",
  "projects": [
    {
      "projectId": "PRJ-45",
      "projectName": "Area A",
      "nodeCount": 100,
      "sensorCount": 230,
      "onlineNodes": 92,
      "alertsActive": 4
    }
  ]
}
```

#### 6.2 Detail Node & Sensor
```json
{
  "nodeId": "NODE-001",
  "code": "ABCA-001",
  "serialNumber": "SN-2023-8891",
  "devEui": "A84041B6C1D2E3F4",
  "project": { "id": "PRJ-45", "name": "Area A" },
  "location": {
    "label": "Area A - Blok 3",
    "coordinates": { "lat": -6.2213, "lng": 106.8432 },
    "lastMovedAt": "2024-05-15T02:00:00Z"
  },
  "model": {
    "vendor": "VendorX",
    "model": "VX-200",
    "protocol": "LoRaWAN",
    "communicationBand": "915MHz",
    "hardwareRevision": "revC"
  },
  "batteryType": "Li-SOCl2",
  "status": {
    "connectivity": "online",
    "lastSeenAt": "2024-05-27T09:12:00Z",
    "battery": 78
  },
  "telemetry": { "mode": "push", "intervalSeconds": 120 },
  "sensors": [
    {
      "sensorId": "SNS-10",
      "type": "pressure",
      "catalog": {
        "model": "Rosemount 3051",
        "icon": "pressure.svg",
        "iconColor": "#0EA5E9",
        "calibrationIntervalDays": 365,
        "defaultThresholds": { "pressure": { "min": 1.0, "max": 4.0 } }
      },
      "protocol": "4-20mA",
      "installDate": "2024-02-12",
      "calibrationDueAt": "2025-02-12",
      "channels": [
        {
          "channelId": "SNS-10-PR",
          "unit": "bar",
          "threshold": { "min": 1.2, "max": 3.5 },
          "latest": { "timestamp": "2024-05-27T09:11:30Z", "value": 2.4 },
          "trend": "stable",
          "alerts": 0
        }
      ]
    }
  ]
}
```

#### 6.3 Time-Series untuk Grafik
```json
{
  "sensorChannelId": "SNS-10-PR",
  "series": [
    { "ts": "2024-05-27T09:00:00Z", "value": 2.31, "quality": "good" },
    { "ts": "2024-05-27T09:05:00Z", "value": 2.28, "quality": "good" }
  ],
  "aggregation": "5m",
  "stats": { "min": 2.1, "max": 2.5, "avg": 2.32 }
}
```

#### 6.4 Contoh Sensor Multi Parameter (Flow Meter RS485)
```json
{
  "sensorId": "SNS-20",
  "protocol": "RS485-Modbus",
  "channels": [
    {
      "channelId": "SNS-20-FLOW",
      "metric": "flow_rate",
      "unit": "m3/h",
      "register": 30001,
      "latest": { "ts": "2024-05-27T09:10:00Z", "value": 120.4 }
    },
    {
      "channelId": "SNS-20-PRES",
      "metric": "pressure",
      "unit": "bar",
      "register": 30005,
      "latest": { "ts": "2024-05-27T09:10:00Z", "value": 3.2 }
    },
    {
      "channelId": "SNS-20-TEMP",
      "metric": "temperature",
      "unit": "°C",
      "register": 30009,
      "latest": { "ts": "2024-05-27T09:10:00Z", "value": 27.8 }
    }
  ]
}
```

### 7. Pertimbangan Arsitektur & Skala
- **Skalabilitas log**: simpan SensorLog di TSDB (InfluxDB/Timescale) sementara metadata di SQL untuk ACID.
- **Multi-tenant**: Owner_id wajib di setiap tabel; gunakan row-level security untuk frontend multi client.
- **Integrasi device**: Node model menyimpan detail protokol agar pipeline ingestion bisa plug-able.
- **Data Quality**: `quality_flag`/`value_engineered` memisahkan raw vs hasil kalkulasi (misal kalibrasi).
- **Auditable**: NodeAssignment dan AlertEvent menyimpan jejak historis.
- **Mobility Tracking**: NodeLocation menyimpan koordinat + elevasi sehingga reposisi device bisa ditelusuri dan divisualisasikan di peta.
- **Multi-parameter**: SensorChannel memastikan satu sensor fisik dapat mengekspose banyak parameter tanpa membuat objek sensor baru; cocok untuk flow meter RS485, power meter, dsb.
- **Visual Consistency**: SensorCatalog menjadi master ikon, datasheet, dan template channel sehingga dashboard selalu menampilkan simbol/warna yang seragam walau Node berbeda owner.
- **Telemetry Cadence**: Field `telemetry_interval_sec` pada Node membantu backend menjadwalkan polling/push serta menandai Node yang terlambat kirim data.

### 8. Rekomendasi Langkah Lanjut
1. Validasi entitas & field dengan tim lapangan (per merek sensor).
2. Definisikan skema API (REST/GraphQL) berdasar struktur JSON di atas.
3. Siapkan mock data (per node/sensor) untuk prototyping UI.
4. Tentukan limit retensi log & strategi archiving agar cost terkontrol.

### 9. Template Frontend (HUD Angular)
- Gunakan template **HUD Angular** dari SeanTheme (https://seantheme.com/hud-angular/ui/card) sebagai baseline UI dashboard sehingga styling, layout card, dan komponen tabel/grafik konsisten sejak awal.
- Mapping: komponen `analytics` dan `iot` pada template dapat langsung menggambarkan ringkasan Owner→Project (bagian 6.1) dan kartu status Node (6.2), sedangkan komponen `card`/`widget` multi-column cocok untuk channel sensor dan grafik (6.3/6.4).
- Integrasi: definisikan service Angular (`OwnerService`, `NodeService`) yang mengonsumsi skema API di langkah 2, lalu sambungkan ke resolvers/standalone components sesuai struktur module template.
- Tema & akses: manfaatkan variable SCSS bawaan HUD untuk membedakan tenant/owner (warna ikon SensorCatalog) dan aktifkan guard/route-level loader agar role Ops vs Client memiliki layout serta menu yang relevan.

### 10. Arsitektur Teknologi & Infrastruktur
- **Ingestion Layer**: Node IoT (LoRaWAN/WiFi/4G/Ethernet) publish telemetry via MQTT menuju Mosquitto broker (port 1883/9001) dengan autentikasi devEui+password dan ACL per topik (`iot/{owner}/{project}/{node}/telemetry`) agar isolasi multi-tenant terjaga.
- **Processing Layer**: PM2 mengelola tiga proses utama:
  - `iot-api` (cluster 4 workers, NestJS) menyediakan REST+WebSocket, JWT auth, dan integrasi Postgres/Redis.
  - `iot-mqtt-worker` (cluster 2) subscribe ke topic telemetry, melakukan validasi schema, batching, lalu menulis ke TimescaleDB/Influx (field `value_raw/value_engineered`) serta cache ringkasan ke Redis.
  - `iot-alert-worker` (fork) membaca rule di Postgres, menarik data terbaru dari Redis/TSDB, menghitung kondisi threshold/derivative, lalu memicu notifikasi (email/Webhook) dan menulis AlertEvent.
- **Data Stores & Tooling**:
  - *Postgres + Timescale Extension*: metadata relasional plus time-series retention/continuous aggregate.
  - *Redis*: cache session JWT, device status `last_seen_at`, dan queue ringan antar worker.
  - *MinIO (S3 compatible)*: menyimpan lampiran (foto instalasi, dokumentasi kalibrasi) serta export CSV.
  - *Grafana*: observability stack untuk metrik ingestion (lag, throughput), health worker (PM2 metrics), dan dashboard internal tim Ops.
- **Security & Ops**: TLS untuk MQTT/Web API, rate limiting pada Mosquitto & NestJS, backup snapshot Postgres/MinIO harian, serta auto-restart PM2 bila worker gagal. Monitoring di Grafana/Alertmanager memastikan SLA telemetry terpenuhi.

### 11. Rencana Mockup Dashboard (Angular HUD)
- Prioritas minggu ini adalah memulai mockup front-end IoT di repo `iot-service/angular-iot` memakai template HUD Angular v5 (dashboard: https://seantheme.com/hud-angular/dashboard) agar struktur layout langsung menyerupai lingkungan produksi.
- Scope awal: import layout utama (`app.component`, sidebar/top-nav), buat modul halaman `dashboard-iot` yang merender data dummy dari bagian 6 (ringkasan owner, detail node, grafik channel) dengan komponen card/grafik bawaan template.
- Alur kerja: 1) sinkronkan dependency Angular dengan template HUD (Node 22 + `npm install --legacy-peer-deps`), 2) scaffold service mock (`OwnerMockService`, `TelemetryMockService`) yang membaca JSON lokal, 3) binding data ke widget analytics, tabel alarm, dan chart apex.
- Deliverable: preview dashboard yang sudah menunjukkan KPI utama (jumlah node online, alert aktif, grafik sensor multi-parameter) sebagai dasar validasi UI bersama tim Ops/Client sebelum backend siap.

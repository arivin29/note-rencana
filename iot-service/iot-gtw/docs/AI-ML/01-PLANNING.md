# AI-ML Planning: OpenSearch untuk IoT PDAM

**Date:** 2026-02-27  
**Status:** 📋 Planning Phase  
**Version:** Draft v1

---

## 1. Overview

### 1.1 Tujuan
Implementasi sistem anomaly detection dan predictive analytics untuk monitoring IoT PDAM menggunakan OpenSearch ML Plugin.

### 1.2 Scope
- **Domain:** IoT sensor untuk PDAM (Perusahaan Daerah Air Minum)
- **Sensor Types:** Tekanan (pressure), Flow, Level, Temperature, dll
- **Scale:** Target 300 sensor dalam 1 tahun

### 1.3 Arsitektur Target

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DATA PIPELINE                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   [MQTT/Teltonika]                                                   │
│         │                                                            │
│         ▼                                                            │
│   ┌─────────────┐                                                    │
│   │   iot-gtw   │                                                    │
│   └──────┬──────┘                                                    │
│          │                                                           │
│     ┌────┴────────────────────────┐                                  │
│     ▼                             ▼                                  │
│  ┌──────────────┐          ┌─────────────┐                           │
│  │ PostgreSQL   │          │ ClickHouse  │                           │
│  │ (Master)     │          │ (Analytics) │                           │
│  └──────────────┘          └──────┬──────┘                           │
│                                   │                                  │
│                            Every 10 min                              │
│                                   │                                  │
│                                   ▼                                  │
│                         ┌─────────────────┐                          │
│                         │   OpenSearch    │                          │
│                         │    ML Plugin    │                          │
│                         └────────┬────────┘                          │
│                                  │                                   │
│              ┌───────────────────┼───────────────────┐               │
│              ▼                   ▼                   ▼               │
│     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│     │  Anomaly    │     │ Forecasting │     │  Alerting   │          │
│     │  Detection  │     │  Engine     │     │  Engine     │          │
│     └─────────────┘     └─────────────┘     └─────────────┘          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Jenis Data yang Dianalisis

### 2.1 Sensor Metrics

| Metric Code | Unit | Deskripsi | Typical Range |
|-------------|------|-----------|---------------|
| `tekanan` | bar | Tekanan air dalam pipa | 0.5 - 10 bar |
| `flow` | m³/h | Debit air | 0 - 500 m³/h |
| `level` | meter | Ketinggian air (reservoir) | 0 - 20 m |
| `temperature` | °C | Suhu air | 15 - 35 °C |
| `turbidity` | NTU | Kekeruhan air | 0 - 5 NTU |
| `chlorine` | mg/L | Kadar klorin | 0.2 - 2 mg/L |
| `ph` | - | pH air | 6.5 - 8.5 |
| `conductivity` | µS/cm | Konduktivitas | 100 - 1000 |

### 2.2 Device Metrics

| Metric | Deskripsi |
|--------|-----------|
| `signal_quality` | Kualitas sinyal (0-100) |
| `battery_level` | Level baterai (jika ada) |
| `uptime` | Waktu online device |
| `data_rate` | Frekuensi pengiriman data |

---

## 3. Katalog Anomaly Detection

### 3.1 Anomaly Berdasarkan Metrik Tunggal

#### 3.1.1 Pressure Anomalies

| Anomaly ID | Nama | Deskripsi | Severity | Aksi |
|------------|------|-----------|----------|------|
| `PRES-001` | Pressure Spike | Tekanan naik > 20% dalam 10 menit | HIGH | Alert + Notify |
| `PRES-002` | Pressure Drop | Tekanan turun > 30% dalam 10 menit | CRITICAL | Alert + Auto-ticket |
| `PRES-003` | Low Pressure Sustained | Tekanan < threshold selama > 1 jam | MEDIUM | Alert |
| `PRES-004` | High Pressure Sustained | Tekanan > max threshold > 30 menit | HIGH | Alert |
| `PRES-005` | Pressure Oscillation | Fluktuasi > 5x dalam 1 jam | MEDIUM | Alert |
| `PRES-006` | Zero Pressure | Tekanan = 0 selama > 5 menit | CRITICAL | Alert + Escalate |

#### 3.1.2 Flow Anomalies

| Anomaly ID | Nama | Deskripsi | Severity | Aksi |
|------------|------|-----------|----------|------|
| `FLOW-001` | Flow Spike | Debit naik > 50% tiba-tiba | HIGH | Alert (possible pipe burst) |
| `FLOW-002` | Flow Drop | Debit turun > 50% tiba-tiba | HIGH | Alert (possible blockage) |
| `FLOW-003` | No Flow | Debit = 0 saat seharusnya ada | CRITICAL | Alert |
| `FLOW-004` | Night Flow Anomaly | Debit tinggi di jam 00:00-05:00 | MEDIUM | Alert (possible leak) |
| `FLOW-005` | Negative Flow | Aliran terbalik | CRITICAL | Alert |
| `FLOW-006` | Flow Pattern Deviation | Pola berbeda dari baseline | LOW | Log only |

#### 3.1.3 Level Anomalies

| Anomaly ID | Nama | Deskripsi | Severity | Aksi |
|------------|------|-----------|----------|------|
| `LEVL-001` | Low Level Alert | Level < min threshold | HIGH | Alert |
| `LEVL-002` | High Level Alert | Level > max threshold | HIGH | Alert (overflow risk) |
| `LEVL-003` | Rapid Level Drop | Level turun cepat (leak indicator) | CRITICAL | Alert |
| `LEVL-004` | Level Not Changing | Level statis padahal ada flow | MEDIUM | Alert (sensor issue) |
| `LEVL-005` | Level Oscillation | Naik-turun tidak wajar | LOW | Log |

#### 3.1.4 Water Quality Anomalies

| Anomaly ID | Nama | Deskripsi | Severity | Aksi |
|------------|------|-----------|----------|------|
| `QUAL-001` | High Turbidity | Kekeruhan > 4 NTU | HIGH | Alert |
| `QUAL-002` | Low Chlorine | Klorin < 0.2 mg/L | HIGH | Alert |
| `QUAL-003` | High Chlorine | Klorin > 2 mg/L | MEDIUM | Alert |
| `QUAL-004` | pH Out of Range | pH < 6.5 atau > 8.5 | HIGH | Alert |
| `QUAL-005` | Temperature Anomaly | Suhu di luar range normal | LOW | Log |

### 3.2 Anomaly Berdasarkan Korelasi Multi-Metrik

| Anomaly ID | Nama | Metrics | Kondisi | Severity |
|------------|------|---------|---------|----------|
| `CORR-001` | Pipe Burst Indicator | tekanan ↓, flow ↑ | Simultan | CRITICAL |
| `CORR-002` | Valve Stuck | tekanan normal, flow ↓ | > 30 min | HIGH |
| `CORR-003` | Pump Failure | tekanan ↓, flow ↓ | Both drop | CRITICAL |
| `CORR-004` | Water Hammer | tekanan spike, flow oscillation | Pattern | MEDIUM |
| `CORR-005` | Reservoir Leak | level ↓, flow_in > flow_out | Sustained | CRITICAL |

### 3.3 Device/Connectivity Anomalies

| Anomaly ID | Nama | Deskripsi | Severity |
|------------|------|-----------|----------|
| `DEV-001` | Device Offline | Tidak ada data > 15 menit | HIGH |
| `DEV-002` | Intermittent Connection | Data hilang-hilang | MEDIUM |
| `DEV-003` | Signal Degradation | Signal quality menurun trend | LOW |
| `DEV-004` | Sensor Drift | Nilai baseline bergeser | MEDIUM |
| `DEV-005` | Stuck Sensor | Nilai tidak berubah | HIGH |
| `DEV-006` | Data Rate Anomaly | Frekuensi data berubah | LOW |

---

## 4. Forecasting & Dynamic Baseline

### 4.1 Mengapa Forecast Sebagai Baseline?

**Masalah dengan Static Threshold (min/max dari sensor_channel):**

```
sensor_channel.min_threshold = 50 m³/h  
sensor_channel.max_threshold = 300 m³/h

Jam 03:00 (malam) → Flow normalnya ~60 m³/h
Jam 08:00 (pagi)  → Flow normalnya ~200 m³/h

Skenario: Jam 03:00 flow = 150 m³/h
- Static check: 150 dalam range [50, 300] → NORMAL ❌
- Dynamic check: 150 vs expected 60 = +150% deviation → ANOMALY ✅ (mungkin kebocoran!)
```

### 4.2 Forecast Configuration

| Parameter | Value | Keterangan |
|-----------|-------|------------|
| **Horizon** | 7 hari (168 jam) | Cukup untuk planning & pattern recognition |
| **Update Frequency** | Setiap 12 jam | Balance akurasi vs compute |
| **Granularity** | Per 1 jam | 168 data points per channel |
| **Training Window** | 30 hari terakhir | Weekly pattern + monthly trend |
| **Update Schedule** | 00:00 & 12:00 UTC | Konsisten timing |

### 4.3 Anomaly Detection: Dual Mode

```
┌─────────────────────────────────────────────────────────────────┐
│               ANOMALY DETECTION (HYBRID MODE)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Actual Value                                                   │
│       │                                                          │
│       ├────────────────┬────────────────┐                        │
│       ▼                ▼                ▼                        │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│   │ STATIC     │  │ DYNAMIC    │  │ RATE OF    │                │
│   │ THRESHOLD  │  │ BASELINE   │  │ CHANGE     │                │
│   ├────────────┤  ├────────────┤  ├────────────┤                │
│   │ Check:     │  │ Check:     │  │ Check:     │                │
│   │ min < v <  │  │ deviation  │  │ spike/drop │                │
│   │ max        │  │ from       │  │ > threshold│                │
│   │            │  │ forecast   │  │ in short   │                │
│   │            │  │            │  │ time       │                │
│   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                │
│         │               │               │                        │
│         ▼               ▼               ▼                        │
│   THRESHOLD_BREACH  FORECAST_DEVIATION  SUDDEN_CHANGE            │
│   (severe)          (moderate-severe)   (varies)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Dynamic Deviation Thresholds

| Deviation | Grade | Aksi |
|-----------|-------|------|
| < 20% | Normal | No action |
| 20% - 35% | Mild | Log only |
| 35% - 50% | Moderate | Alert (low priority) |
| 50% - 80% | Severe | Alert + Notification |
| > 80% | Critical | Alert + Immediate notification |

### 4.5 Forecast Storage (PostgreSQL)

```sql
-- Table: forecast_results
-- Menyimpan prediksi nilai untuk setiap jam dalam 7 hari ke depan

forecast_results:
  - id_sensor_channel   -- Channel mana
  - forecast_batch_id   -- Batch ID (1 run = 1 batch)
  - generated_at        -- Kapan forecast dibuat
  - forecast_time       -- Waktu yang diprediksi
  - predicted_value     -- Nilai prediksi
  - lower_bound         -- Batas bawah confidence interval
  - upper_bound         -- Batas atas confidence interval
  - confidence          -- Confidence level (e.g., 0.95)
  - is_current          -- Apakah ini forecast terbaru
```

**Migration:** `migrations/004_create_forecast_results.sql`

### 4.6 Anomaly Detection Logic (Updated)

```typescript
// Pseudocode
async function detectAnomaly(channelId: string, actualValue: number, timestamp: Date) {
  // 1. Get static thresholds
  const channel = await getChannel(channelId);
  const { minThreshold, maxThreshold } = channel;
  
  // 2. Get forecast for this time
  const forecast = await getForecast(channelId, timestamp);
  const { predictedValue, lowerBound, upperBound } = forecast;
  
  // 3. Static threshold check
  if (actualValue < minThreshold || actualValue > maxThreshold) {
    return createAnomaly({
      type: 'THRESHOLD_BREACH',
      grade: 'severe',
      expectedValue: predictedValue,
      actualValue,
      deviation: calculateDeviation(actualValue, predictedValue)
    });
  }
  
  // 4. Dynamic baseline check (forecast-based)
  const deviation = Math.abs((actualValue - predictedValue) / predictedValue);
  
  if (deviation > 0.80) {
    return createAnomaly({ type: 'FORECAST_DEVIATION', grade: 'critical', ... });
  } else if (deviation > 0.50) {
    return createAnomaly({ type: 'FORECAST_DEVIATION', grade: 'severe', ... });
  } else if (deviation > 0.35) {
    return createAnomaly({ type: 'FORECAST_DEVIATION', grade: 'moderate', ... });
  } else if (deviation > 0.20) {
    return createAnomaly({ type: 'FORECAST_DEVIATION', grade: 'mild', ... });
  }
  
  // 5. Confidence interval check (alternative)
  if (actualValue < lowerBound || actualValue > upperBound) {
    return createAnomaly({ type: 'OUTSIDE_CONFIDENCE', grade: 'moderate', ... });
  }
  
  return null; // Normal
}
```

### 4.7 Predictive Maintenance (Future)

| PM ID | Nama | Trigger | Aksi |
|-------|------|---------|------|
| `PM-001` | Pump Degradation | Efisiensi menurun trend | Schedule maintenance |
| `PM-002` | Valve Wear | Response time increasing | Inspection |
| `PM-003` | Sensor Calibration Due | Drift detection | Recalibrate |
| `PM-004` | Battery Low Forecast | Predict battery depletion | Replace |

---

## 5. Alert Severity & Escalation

### 5.1 Severity Levels

| Level | Nama | Response Time | Notifikasi |
|-------|------|---------------|------------|
| **CRITICAL** | Kritis | Immediate | SMS + Call + Telegram + Dashboard |
| **HIGH** | Tinggi | < 15 min | Telegram + Dashboard + Email |
| **MEDIUM** | Sedang | < 1 hour | Telegram + Dashboard |
| **LOW** | Rendah | < 24 hours | Dashboard only |
| **INFO** | Informasi | - | Log only |

### 5.2 Escalation Matrix

```
CRITICAL → On-call Engineer → Supervisor → Manager (if no response 15 min)
HIGH     → Team Lead → Supervisor (if no response 30 min)
MEDIUM   → Dashboard notification → Daily report
LOW      → Weekly report only
```

---

## 6. Role-Based Access (Rencana)

### 6.1 User Roles

| Role | Deskripsi | Access |
|------|-----------|--------|
| `admin` | System administrator | Full access ke semua fitur |
| `analyst` | Data analyst | View all, create detectors, manage alerts |
| `operator` | Field operator | View assigned projects, acknowledge alerts |
| `viewer` | Read-only user | View dashboards only |
| `client` | Customer (Owner) | View own project data only |

### 6.2 Permission Matrix

| Permission | admin | analyst | operator | viewer | client |
|------------|-------|---------|----------|--------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All Projects | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Own Project | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Detector | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modify Detector | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Detector | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Alerts | ✅ | ✅ | ✅ | ❌ | ❌ |
| Acknowledge Alert | ✅ | ✅ | ✅ | ❌ | ✅ |
| Configure System | ✅ | ❌ | ❌ | ❌ | ❌ |
| View ML Models | ✅ | ✅ | ❌ | ❌ | ❌ |
| Train Models | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 7. OpenSearch Index Design

### 7.1 Index untuk Telemetry Agregat

```json
{
  "index": "sensor-telemetry-10min-{YYYY.MM}",
  "mappings": {
    "properties": {
      "time_bucket": { "type": "date" },
      "owner_code": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "project_code": { "type": "keyword" },
      "node_id": { "type": "keyword" },
      "node_code": { "type": "keyword" },
      "sensor_id": { "type": "keyword" },
      "sensor_label": { "type": "text", "fields": { "keyword": { "type": "keyword" }}},
      "channel_id": { "type": "keyword" },
      "metric_code": { "type": "keyword" },
      "metric_unit": { "type": "keyword" },
      "avg_raw": { "type": "float" },
      "avg_eng": { "type": "float" },
      "min_eng": { "type": "float" },
      "max_eng": { "type": "float" },
      "sample_count": { "type": "integer" }
    }
  }
}
```

### 7.2 Index untuk Anomaly Results

```json
{
  "index": "anomaly-results-{YYYY.MM}",
  "mappings": {
    "properties": {
      "anomaly_id": { "type": "keyword" },
      "detector_id": { "type": "keyword" },
      "timestamp": { "type": "date" },
      "anomaly_grade": { "type": "float" },
      "confidence": { "type": "float" },
      "severity": { "type": "keyword" },
      "owner_code": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "node_id": { "type": "keyword" },
      "channel_id": { "type": "keyword" },
      "metric_code": { "type": "keyword" },
      "expected_value": { "type": "float" },
      "actual_value": { "type": "float" },
      "description": { "type": "text" },
      "status": { "type": "keyword" }
    }
  }
}
```

### 7.3 Index untuk Alerts

```json
{
  "index": "alerts-history",
  "mappings": {
    "properties": {
      "alert_id": { "type": "keyword" },
      "anomaly_id": { "type": "keyword" },
      "created_at": { "type": "date" },
      "acknowledged_at": { "type": "date" },
      "resolved_at": { "type": "date" },
      "severity": { "type": "keyword" },
      "status": { "type": "keyword" },
      "owner_code": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "title": { "type": "text" },
      "description": { "type": "text" },
      "assigned_to": { "type": "keyword" },
      "notes": { "type": "text" }
    }
  }
}
```

---

## 8. PostgreSQL Schema for ML Results

### 8.1 Table: `anomaly_results`

Menyimpan hasil anomaly detection dari OpenSearch ML ke PostgreSQL.

```sql
CREATE TABLE anomaly_results (
    id_anomaly_result UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_sensor_channel UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
    
    -- Detection timestamp
    detected_at TIMESTAMPTZ NOT NULL,
    
    -- Values
    actual_value DOUBLE PRECISION NOT NULL,
    expected_value DOUBLE PRECISION,
    
    -- Anomaly metrics
    anomaly_score DOUBLE PRECISION NOT NULL,       -- 0.0 - 1.0
    anomaly_grade TEXT NOT NULL,                   -- mild | moderate | severe | critical
    anomaly_type TEXT NOT NULL,                    -- spike, flatline, threshold_breach, etc
    
    -- OpenSearch detector info
    detector_id TEXT,
    detector_name TEXT,
    opensearch_result JSONB,                       -- Raw JSON dari OpenSearch ML
    
    -- Link to alert if generated
    id_alert_event UUID REFERENCES alert_events(id_alert_event) ON DELETE SET NULL,
    
    -- Acknowledgment tracking
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    note TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_anomaly_results_channel_time ON anomaly_results(id_sensor_channel, detected_at DESC);
CREATE INDEX idx_anomaly_results_detector_time ON anomaly_results(detector_id, detected_at DESC);
CREATE INDEX idx_anomaly_results_grade ON anomaly_results(anomaly_grade) WHERE anomaly_grade IN ('severe', 'critical');
CREATE INDEX idx_anomaly_results_unack ON anomaly_results(is_acknowledged) WHERE is_acknowledged = FALSE;
```

### 8.2 Anomaly Grade Classification

| Grade | Score Range | Description |
|-------|-------------|-------------|
| `mild` | 0.50 - 0.70 | Slight deviation, monitor |
| `moderate` | 0.70 - 0.85 | Notable deviation, attention needed |
| `severe` | 0.85 - 0.95 | Significant anomaly, alert required |
| `critical` | > 0.95 | Extreme anomaly, immediate action |

### 8.3 Relationship dengan Tabel Lain

```
sensor_channels
      │
      ├──────────────────┬─────────────────┐
      ▼                  ▼                 ▼
anomaly_results   forecast_results    alert_rules
      │                                    │
      └───────────────►  alert_events  ◄───┘
```

**Migration Files:** 
- `migrations/003_create_anomaly_results.sql`  
- `migrations/004_create_forecast_results.sql`

### 8.4 Table: `forecast_results`

Menyimpan prediksi nilai sensor untuk 7 hari ke depan (per jam).

```sql
CREATE TABLE forecast_results (
    id_forecast_result UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_sensor_channel UUID NOT NULL REFERENCES sensor_channels(id_sensor_channel) ON DELETE CASCADE,
    
    -- Batch info
    forecast_batch_id TEXT NOT NULL,               -- 1 run = 1 batch ID
    generated_at TIMESTAMPTZ NOT NULL,             -- Kapan forecast dibuat
    
    -- Forecast data
    forecast_time TIMESTAMPTZ NOT NULL,            -- Waktu yang diprediksi
    predicted_value DOUBLE PRECISION NOT NULL,     -- Nilai prediksi
    lower_bound DOUBLE PRECISION,                  -- Confidence interval bawah
    upper_bound DOUBLE PRECISION,                  -- Confidence interval atas
    confidence DOUBLE PRECISION,                   -- Confidence level (0.95)
    
    -- Model info
    model_type TEXT,                               -- 'opensearch_rcf', 'arima'
    model_metadata JSONB,                          -- Additional info
    
    -- Status
    is_current BOOLEAN DEFAULT TRUE,               -- Forecast terbaru
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key indexes
CREATE INDEX idx_forecast_channel_time ON forecast_results(id_sensor_channel, forecast_time);
CREATE UNIQUE INDEX idx_forecast_unique_current 
    ON forecast_results(id_sensor_channel, forecast_time) 
    WHERE is_current = TRUE;
```

### 8.5 Forecast Configuration

| Parameter | Value | Keterangan |
|-----------|-------|------------|
| Horizon | 7 hari | 168 data points |
| Update | Setiap 12 jam | 00:00 & 12:00 UTC |
| Granularity | Per 1 jam | Cukup detail untuk pattern |
| Training | 30 hari terakhir | Weekly + monthly pattern |

---

## 9. OpenSearch ML Detector Configuration

### 9.1 Basic Anomaly Detector (Contoh: Pressure)

```json
{
  "name": "pressure-anomaly-detector",
  "description": "Detect pressure anomalies for PDAM sensors",
  "time_field": "time_bucket",
  "indices": ["sensor-telemetry-10min-*"],
  "filter_query": {
    "term": { "metric_code": "tekanan" }
  },
  "feature_attributes": [
    {
      "feature_name": "avg_pressure",
      "feature_enabled": true,
      "aggregation_query": {
        "avg_pressure": { "avg": { "field": "avg_eng" } }
      }
    },
    {
      "feature_name": "max_pressure",
      "feature_enabled": true,
      "aggregation_query": {
        "max_pressure": { "max": { "field": "max_eng" } }
      }
    }
  ],
  "detection_interval": {
    "period": { "interval": 10, "unit": "MINUTES" }
  },
  "window_delay": {
    "period": { "interval": 1, "unit": "MINUTES" }
  },
  "shingle_size": 8,
  "category_field": ["node_id", "channel_id"]
}
```

### 9.2 Forecasting Configuration

```json
{
  "name": "pressure-forecast",
  "description": "24-hour pressure forecast",
  "time_field": "time_bucket",
  "indices": ["sensor-telemetry-10min-*"],
  "horizon": 144,
  "interval": {
    "period": { "interval": 10, "unit": "MINUTES" }
  },
  "feature_attributes": [
    {
      "feature_name": "pressure_trend",
      "aggregation_query": {
        "pressure_trend": { "avg": { "field": "avg_eng" } }
      }
    }
  ],
  "category_field": ["channel_id"]
}
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [x] ClickHouse AggregatingMergeTree migration
- [ ] OpenSearch module di iot-gtw
- [ ] Sync service (ClickHouse → OpenSearch) dengan threshold dari PostgreSQL
- [ ] Basic index template
- [ ] Email service (Nodemailer + Mailtrap)

### Phase 2: Core Detection (Week 3-4)
- [ ] Auto-detect anomaly berdasarkan min/max threshold
- [ ] Alert generation & storage
- [ ] Email notification
- [ ] Alert suppression (update duration)
- [ ] Dashboard di Angular (alert list)

### Phase 3: Advanced Detection (Week 5-6)
- [ ] Multi-metric correlation detectors
- [ ] Device anomaly detectors (offline, drift)
- [ ] Grafana integration (anomaly overlay)

### Phase 4: Forecasting (Week 7-8)
- [ ] Pressure forecasting (24h)
- [ ] Flow forecasting
- [ ] Demand prediction

### Phase 5: Polish & Scale (Week 9-10)
- [ ] Performance tuning
- [ ] Production SMTP setup
- [ ] Documentation
- [ ] Training

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| False Positive Rate | < 5% | Anomalies flagged but not real |
| Detection Latency | < 15 min | Time from event to alert |
| Forecast Accuracy | > 85% | MAPE for 24h forecast |
| System Uptime | > 99.5% | OpenSearch availability |
| Alert Response Time | < 30 min (HIGH) | Time to acknowledge |

---

## 12. Risiko & Mitigasi

| Risiko | Impact | Mitigasi |
|--------|--------|----------|
| RAM tidak cukup (6GB) | ML gagal train | Tune heap, atau upgrade RAM |
| Data tidak konsisten | False positives | Validasi di sync service |
| Terlalu banyak alert | Alert fatigue | Tune threshold, grouping |
| Model drift | Accuracy menurun | Periodic retraining |

---

## 13. Configuration Decisions ✅

**Tanggal Finalized:** 2026-02-27

### 13.1 Threshold Configuration

| Setting | Value |
|---------|-------|
| **Threshold source** | `sensor_channels.min_threshold/max_threshold` (PostgreSQL) |
| **Threshold scope** | Per channel (setiap channel bisa beda) |
| **Sensitivity** | Global config (`ANOMALY_SENSITIVITY=0.8`) |
| **UI** | Client set via Angular (Edit Channel dialog) |

### 13.2 Detector Management

| Setting | Value |
|---------|-------|
| **Mode** | **Auto-detect dari threshold** |
| **Cara kerja** | Sistem otomatis detect anomaly berdasarkan min/max threshold yang diisi di sensor_channel |
| **No manual detector** | Admin tidak perlu buat detector manual |

### 13.3 Alert Configuration

| Setting | Value |
|---------|-------|
| **Primary channel** | Email (SMTP) |
| **SMTP Provider** | Mailtrap (sandbox) - akan diganti production SMTP |
| **Suppression** | Update timestamp (durasi anomaly terlihat) |
| **Escalation** | Tidak diperlukan saat ini |

### 13.4 Data & Storage

| Setting | Value |
|---------|-------|
| **Historical results** | 3 bulan |
| **Threshold sync** | Periodic (setiap 10 menit bersama data sync) |
| **Dashboard** | Angular + Grafana |

### 13.5 Email Configuration (Development)

```typescript
// Mailtrap SMTP (Sandbox - Development Only)
const transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "415ec201e9cc83",
    pass: "****d6da"  // stored in .env
  }
});
```

**Production:** Ganti dengan SMTP production (SendGrid/AWS SES/Custom)

---

## Related Documents

- [CLICKHOUSE-AGGREGATION-V2.md](../CLICKHOUSE-AGGREGATION-V2.md) - ClickHouse schema
- [02-OPENSEARCH-INTEGRATION.md](02-OPENSEARCH-INTEGRATION.md) - OpenSearch setup (TBD)
- [03-DETECTOR-CATALOG.md](03-DETECTOR-CATALOG.md) - Detector configurations (TBD)
- [04-ALERTING-SETUP.md](04-ALERTING-SETUP.md) - Alerting configuration (TBD)

---

**Next Steps:**
1. Review & finalize anomaly catalog
2. Answer pertanyaan di Section 12
3. Mulai implementasi Phase 1

# Data Flow Diagram: IoT ML Pipeline

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              IoT ML SYSTEM ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────┐                                                                       │
│  │   DEVICES    │                                                                       │
│  │  Teltonika   │                                                                       │
│  │    MQTT      │                                                                       │
│  └──────┬───────┘                                                                       │
│         │                                                                               │
│         ▼                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                            iot-gtw (Gateway Service)                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │   │
│  │  │ MQTT        │  │ Telemetry   │  │ OpenSearch  │  │ Scheduler Jobs          │   │   │
│  │  │ Handler     │→ │ Processor   │→ │ Sync        │  │ ├─ Sync (10min)         │   │   │
│  │  │             │  │             │  │ Service     │  │ ├─ Forecast (12h)       │   │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────┘  │ └─ Cleanup (daily)      │   │   │
│  │                          │                          └─────────────────────────┘   │   │
│  └──────────────────────────┼────────────────────────────────────────────────────────┘   │
│                             │                                                           │
│         ┌───────────────────┼───────────────────┐                                       │
│         ▼                   ▼                   ▼                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                               │
│  │  PostgreSQL  │    │  ClickHouse  │    │  OpenSearch  │                               │
│  │  (Master DB) │    │  (Analytics) │    │  (ML/Search) │                               │
│  └──────────────┘    └──────────────┘    └──────────────┘                               │
│         │                                       │                                       │
│         │                                       ▼                                       │
│         │                              ┌──────────────────┐                             │
│         │                              │   ML Plugin      │                             │
│         │                              │ ├─ Anomaly Det.  │                             │
│         │                              │ └─ Forecasting   │                             │
│         │                              └────────┬─────────┘                             │
│         │                                       │                                       │
│         │◄──────────────────────────────────────┘                                       │
│         │         (Results sync back)                                                   │
│         ▼                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          iot-backend (API Service)                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Anomaly     │  │ Forecast    │  │ Alert       │  │ Email       │              │   │
│  │  │ API         │  │ API         │  │ API         │  │ Service     │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                               │
│  │   Angular    │    │   Grafana    │    │    Email     │                               │
│  │  Dashboard   │    │  Dashboard   │    │   Clients    │                               │
│  └──────────────┘    └──────────────┘    └──────────────┘                               │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow: Telemetry Ingestion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLOW 1: TELEMETRY INGESTION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Teltonika Device]                                                         │
│        │                                                                    │
│        │ TCP/UDP (Teltonika Protocol)                                       │
│        ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │ Teltonika   │  Parse Teltonika binary protocol                           │
│  │ Module      │  Extract AVL data, GPS, I/O values                         │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                            │
│  │ Telemetry   │  Apply sensor conversion formulas                          │
│  │ Processor   │  Calculate engineering values                              │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│    ┌────┴────────────────────┐                                              │
│    ▼                         ▼                                              │
│  ┌─────────────┐      ┌─────────────┐                                       │
│  │ PostgreSQL  │      │ ClickHouse  │                                       │
│  │             │      │             │                                       │
│  │ sensor_log  │      │ sensor_     │                                       │
│  │ (latest)    │      │ telemetry   │                                       │
│  └─────────────┘      │ (raw)       │                                       │
│                       └──────┬──────┘                                       │
│                              │                                              │
│                              ▼ (Materialized Views)                         │
│                 ┌────────────┼────────────┐                                 │
│                 ▼            ▼            ▼                                 │
│           ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│           │ 10min    │ │ 1hour    │ │ daily    │                            │
│           │ aggreg.  │ │ aggreg.  │ │ aggreg.  │                            │
│           └──────────┘ └──────────┘ └──────────┘                            │
│                                                                             │
│  Timing: Real-time (< 1 second latency)                                     │
│  Volume: ~300 sensors × 1 msg/min = ~432K records/day                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow: OpenSearch Sync

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLOW 2: OPENSEARCH SYNC                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ ClickHouse  │  Source: sensor_telemetry_10min (aggregated)               │
│  │ (10min agg) │  Data: avg, min, max per 10-minute bucket                  │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ Query: SELECT * WHERE time_bucket > last_sync                     │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     OpenSearchSyncService                           │    │
│  │                                                                     │    │
│  │  1. Query ClickHouse for new 10-min aggregates                      │    │
│  │  2. Enrich with metadata from PostgreSQL:                           │    │
│  │     - owner_code, project_code, node_code                           │    │
│  │     - sensor_label, metric_code, metric_unit                        │    │
│  │     - min_threshold, max_threshold                                  │    │
│  │  3. Transform to OpenSearch document format                          │    │
│  │  4. Bulk index to OpenSearch                                         │    │
│  │  5. Update sync cursor                                               │    │
│  │                                                                     │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        OpenSearch                                    │    │
│  │                                                                     │    │
│  │  Index: sensor-telemetry-10min-{YYYY.MM}                            │    │
│  │                                                                     │    │
│  │  Document:                                                          │    │
│  │  {                                                                  │    │
│  │    "time_bucket": "2026-02-27T10:00:00Z",                          │    │
│  │    "owner_code": "PDAM-JKT",                                        │    │
│  │    "project_code": "WTP-01",                                        │    │
│  │    "node_code": "NODE-001",                                         │    │
│  │    "channel_id": "uuid",                                            │    │
│  │    "metric_code": "tekanan",                                        │    │
│  │    "metric_unit": "bar",                                            │    │
│  │    "avg_eng": 4.5,                                                  │    │
│  │    "min_eng": 4.2,                                                  │    │
│  │    "max_eng": 4.8,                                                  │    │
│  │    "sample_count": 10,                                              │    │
│  │    "min_threshold": 2.0,                                            │    │
│  │    "max_threshold": 8.0                                             │    │
│  │  }                                                                  │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Schedule: Every 10 minutes (aligned with aggregation)                      │
│  Cron: */10 * * * *                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow: Anomaly Detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLOW 3: ANOMALY DETECTION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        OpenSearch ML Plugin                          │    │
│  │                                                                     │    │
│  │  Anomaly Detectors (auto-created per metric type):                  │    │
│  │  ├─ detector-tekanan (pressure)                                     │    │
│  │  ├─ detector-flow                                                   │    │
│  │  ├─ detector-level                                                  │    │
│  │  └─ detector-*                                                      │    │
│  │                                                                     │    │
│  │  Each detector:                                                     │    │
│  │  - Reads from sensor-telemetry-10min-* index                        │    │
│  │  - Groups by channel_id (High Cardinality Detection)                │    │
│  │  - Runs every 10 minutes                                            │    │
│  │  - Uses Random Cut Forest algorithm                                 │    │
│  │                                                                     │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│                                 │ Anomaly Result                            │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     AnomalyResultService                             │    │
│  │                                                                     │    │
│  │  1. Poll OpenSearch for new anomaly results                          │    │
│  │  2. Get forecast value for comparison (dynamic baseline)            │    │
│  │  3. Calculate deviation:                                            │    │
│  │     - actual_value vs predicted_value (from forecast)               │    │
│  │     - actual_value vs min/max threshold (static)                    │    │
│  │  4. Determine anomaly_grade: mild | moderate | severe | critical    │    │
│  │  5. Determine anomaly_type: threshold_breach | forecast_deviation   │    │
│  │  6. Check deduplication (same anomaly within suppression window?)   │    │
│  │  7. Save to PostgreSQL anomaly_results                              │    │
│  │  8. Create alert_event if severity >= configured threshold          │    │
│  │  9. Trigger email notification if conditions met                     │    │
│  │                                                                     │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                   │
│         ▼                       ▼                       ▼                   │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐           │
│  │  PostgreSQL  │        │  PostgreSQL  │        │ Email        │           │
│  │              │        │              │        │ Service      │           │
│  │ anomaly_     │        │ alert_events │        │              │           │
│  │ results      │        │              │        │ (Nodemailer) │           │
│  └──────────────┘        └──────────────┘        └──────────────┘           │
│                                                                             │
│  Schedule: Every 10 minutes (after sync completes)                          │
│  Cron: 2,12,22,32,42,52 * * * * (offset to avoid collision)                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow: Forecasting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLOW 4: FORECASTING                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        ForecastService                               │    │
│  │                                                                     │    │
│  │  Trigger: Every 12 hours (00:00 & 12:00 UTC)                        │    │
│  │                                                                     │    │
│  │  For each active sensor_channel:                                    │    │
│  │                                                                     │    │
│  │  1. Query ClickHouse for 30-day historical data (1-hour aggregates) │    │
│  │  2. Send to OpenSearch ML for forecast generation                   │    │
│  │  3. Receive 168 predictions (7 days × 24 hours)                     │    │
│  │  4. Mark old forecasts as is_current = false                        │    │
│  │  5. Insert new forecasts to PostgreSQL forecast_results             │    │
│  │                                                                     │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│    ┌────────────────────────────┼────────────────────────────────────┐      │
│    ▼                            ▼                                    ▼      │
│  ┌─────────────┐         ┌─────────────┐                     ┌──────────┐   │
│  │ ClickHouse  │         │ OpenSearch  │                     │PostgreSQL│   │
│  │             │         │ ML Plugin   │                     │          │   │
│  │ _1hour agg  │───────► │             │ ────────────────────│forecast_ │   │
│  │ (30 days)   │         │ Forecast    │ 168 predictions     │results   │   │
│  │             │         │ API         │ per channel         │          │   │
│  └─────────────┘         └─────────────┘                     └──────────┘   │
│                                                                             │
│  Output per channel:                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  forecast_time      │ predicted_value │ lower_bound │ upper_bound    │   │
│  │  2026-02-27 13:00   │ 4.52           │ 4.10        │ 4.95           │   │
│  │  2026-02-27 14:00   │ 4.61           │ 4.18        │ 5.04           │   │
│  │  ...                │ ...            │ ...         │ ...            │   │
│  │  2026-03-06 12:00   │ 4.48           │ 4.05        │ 4.91           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Schedule: 0 0,12 * * * (00:00 & 12:00 UTC)                                 │
│  Duration: ~5-10 min for 300 channels                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Flow: Alert & Notification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLOW 5: ALERT & NOTIFICATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       AlertService                                   │    │
│  │                                                                     │    │
│  │  Input: New anomaly detected (from AnomalyResultService)            │    │
│  │                                                                     │    │
│  │  1. Check alert_rules for this channel:                             │    │
│  │     - Is alerting enabled?                                          │    │
│  │     - What is the minimum severity to alert?                        │    │
│  │                                                                     │    │
│  │  2. Check deduplication:                                            │    │
│  │     - Same channel + same anomaly_type within last X minutes?       │    │
│  │     - If yes: Update existing alert (extend duration)               │    │
│  │     - If no: Create new alert_event                                 │    │
│  │                                                                     │    │
│  │  3. Create alert_event record:                                      │    │
│  │     - Link to anomaly_result                                        │    │
│  │     - Set status = 'open'                                           │    │
│  │     - Set triggered_at = now                                        │    │
│  │                                                                     │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    NotificationService                               │    │
│  │                                                                     │    │
│  │  1. Get notification preferences for project/owner                  │    │
│  │  2. Build email content from template                               │    │
│  │  3. Add recipient emails (from users assigned to project)           │    │
│  │  4. Send via Nodemailer                                             │    │
│  │  5. Log notification status                                         │    │
│  │                                                                     │    │
│  │  Email Content:                                                     │    │
│  │  ┌────────────────────────────────────────────────────────────────┐ │    │
│  │  │  Subject: [CRITICAL] Pressure Anomaly - WTP-01 / NODE-001      │ │    │
│  │  │                                                                │ │    │
│  │  │  Anomaly Detected:                                             │ │    │
│  │  │  - Metric: Tekanan                                             │ │    │
│  │  │  - Actual: 9.2 bar                                             │ │    │
│  │  │  - Expected: 4.5 bar (from forecast)                           │ │    │
│  │  │  - Deviation: +104%                                            │ │    │
│  │  │  - Time: 2026-02-27 10:30:00                                   │ │    │
│  │  │                                                                │ │    │
│  │  │  [View Dashboard] [Acknowledge Alert]                          │ │    │
│  │  └────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                     │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────┐                                                            │
│  │   SMTP      │  Mailtrap (dev) / SendGrid (prod)                          │
│  │   Server    │                                                            │
│  └─────────────┘                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Data Flow: API Access

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLOW 6: API ACCESS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────────────────────────────────────┐    │
│  │   Angular   │         │              iot-backend                    │    │
│  │  Dashboard  │◄───────►│                                             │    │
│  └─────────────┘   REST  │  Endpoints:                                 │    │
│                          │                                             │    │
│  ┌─────────────┐         │  GET  /ml/anomalies                         │    │
│  │   Grafana   │◄───────►│       ?channel_id=&from=&to=&grade=         │    │
│  │  Dashboard  │   REST  │                                             │    │
│  └─────────────┘         │  GET  /ml/anomalies/:id                     │    │
│                          │                                             │    │
│                          │  POST /ml/anomalies/:id/acknowledge         │    │
│                          │                                             │    │
│                          │  GET  /ml/forecasts                         │    │
│                          │       ?channel_id=&from=&to=                │    │
│                          │                                             │    │
│                          │  GET  /ml/forecasts/current/:channel_id     │    │
│                          │       → Returns 7-day forecast              │    │
│                          │                                             │    │
│                          │  GET  /ml/alerts                            │    │
│                          │       ?status=open&severity=                │    │
│                          │                                             │    │
│                          │  POST /ml/alerts/:id/acknowledge            │    │
│                          │                                             │    │
│                          │  POST /ml/alerts/:id/clear                  │    │
│                          │                                             │    │
│                          │  GET  /ml/dashboard/summary                 │    │
│                          │       → Active anomalies, alerts count      │    │
│                          │                                             │    │
│                          └─────────────────────────────────────────────┘    │
│                                                                             │
│  Authentication: JWT (existing auth system)                                 │
│  Authorization: Based on user's project assignments                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Timeline & Scheduling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SCHEDULER TIMELINE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Time (every 10 min)   │  Jobs                                              │
│  ──────────────────────┼────────────────────────────────────────────────    │
│                        │                                                    │
│  :00                   │  ┌─ OpenSearch Sync starts                         │
│  :01                   │  │  (query ClickHouse, bulk index)                 │
│  :02                   │  └─ Sync completes                                 │
│  :02                   │  ┌─ Anomaly Detection runs                         │
│  :03                   │  │  (poll results, save, check alerts)             │
│  :04                   │  └─ Detection completes                            │
│                        │                                                    │
│  :10                   │  Repeat...                                         │
│  :20                   │  Repeat...                                         │
│  ...                   │                                                    │
│                                                                             │
│  Special Jobs:                                                              │
│  ──────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  00:00 UTC             │  ┌─ Forecast Generation (all channels)             │
│  00:05                 │  │  (query 30-day history, generate)               │
│  00:10                 │  └─ Forecast completes                             │
│  00:15                 │  ┌─ Daily Cleanup                                  │
│                        │  │  - Delete old anomaly_results (>90 days)        │
│                        │  │  - Delete old forecast_results (>7 days)        │
│                        │  │  - Archive old alerts                           │
│                        │  └─ Cleanup completes                              │
│                        │                                                    │
│  12:00 UTC             │  ┌─ Forecast Generation (repeat)                   │
│                        │  └─                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Volume Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Sensors** | 300 | Target 1 year |
| **Channels per sensor** | ~3 avg | Pressure, flow, level, etc |
| **Total channels** | ~900 | 300 × 3 |
| **Raw telemetry/day** | ~432K records | 900 × 1/min × 1440 min/day |
| **10-min aggregates/day** | ~129.6K records | 900 × 144 buckets/day |
| **OpenSearch docs/day** | ~129.6K | Same as 10-min aggregates |
| **Forecast records/batch** | ~151.2K | 900 channels × 168 hours |
| **Anomalies/day (est.)** | ~100-500 | Depends on data quality |
| **Alerts/day (est.)** | ~10-50 | After deduplication |

---

## 10. Error Scenarios

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| ClickHouse unreachable | Connection timeout | Retry 3x, then skip cycle, alert ops |
| OpenSearch unreachable | Connection timeout | Retry 3x, then skip cycle, buffer data |
| PostgreSQL unreachable | Connection timeout | Critical - stop processing, alert ops |
| SMTP failure | Send timeout | Queue email, retry later |
| ML detector error | API error response | Log error, use static threshold fallback |
| Forecast generation fail | API timeout | Use last known forecast, alert ops |
| Out of memory | Process crash | PM2 auto-restart, reduce batch size |

---

## 11. Related Documents

- [01-PLANNING.md](01-PLANNING.md) - Overall planning
- [03-SERVICE-ARCHITECTURE.md](03-SERVICE-ARCHITECTURE.md) - Module structure
- [04-OPENSEARCH-TEMPLATES.md](04-OPENSEARCH-TEMPLATES.md) - Index templates
- [05-API-DESIGN.md](05-API-DESIGN.md) - API specification
- [06-SCHEDULER-CONFIG.md](06-SCHEDULER-CONFIG.md) - Cron jobs

---

**Next:** Service Architecture (module split between iot-gtw and iot-backend)

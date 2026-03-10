# AI-ML Design Documents Index

**Last Updated:** 2026-02-28  
**Status:** ✅ Phase 1 Design Complete → 🚀 Ready for Implementation

---

## 📚 Document Index

| # | Document | Description | Status |
|---|----------|-------------|--------|
| 01 | [PLANNING.md](01-PLANNING.md) | Comprehensive planning, anomaly catalog, forecasting config | ✅ |
| 02 | [DATA-FLOW.md](02-DATA-FLOW.md) | End-to-end data flow diagrams | ✅ |
| 03 | [SERVICE-ARCHITECTURE.md](03-SERVICE-ARCHITECTURE.md) | Module structure: **iot-gtw** (jobs) + **iot-backend** (API) | ✅ |
| 04 | [OPENSEARCH-TEMPLATES.md](04-OPENSEARCH-TEMPLATES.md) | Index templates, ML detector configs | ✅ |
| 05 | [API-DESIGN.md](05-API-DESIGN.md) | REST API spec → **implement di iot-backend** | ✅ |
| 06 | [ENVIRONMENT-VARIABLES.md](06-ENVIRONMENT-VARIABLES.md) | Complete .env configuration | ✅ |
| 07 | [SCHEDULER-CONFIG.md](07-SCHEDULER-CONFIG.md) | Cron jobs → **iot-gtw** (sync) + **iot-backend** (email) | ✅ |
| 08 | [ALERT-DEDUPLICATION.md](08-ALERT-DEDUPLICATION.md) | Alert deduplication → **iot-backend** | ✅ |
| 09 | [ERROR-HANDLING.md](09-ERROR-HANDLING.md) | Retry, circuit breaker → **both services** | ✅ |
| 10 | [EMAIL-TEMPLATES.md](10-EMAIL-TEMPLATES.md) | Handlebars templates → **iot-backend** | ✅ |
| **11** | **[IMPLEMENTATION-TASKS.md](11-IMPLEMENTATION-TASKS.md)** | **85 tasks, 7 phases, tracking** | 🚀 |
| 12 | [ML-MODULE-README.md](ML-MODULE-README.md) | Module overview & quick start | ✅ |
| 13 | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues & solutions | ✅ |
| 14 | [RUNBOOK.md](RUNBOOK.md) | Operations runbook | ✅ |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          IoT PDAM Architecture                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐     │
│  │  IoT Devices │────►│   iot-gtw    │────►│     PostgreSQL       │     │
│  │  (Teltonika) │     │  (Gateway)   │     │  (Master Database)   │     │
│  └──────────────┘     └──────┬───────┘     └──────────────────────┘     │
│                              │                                          │
│                    ┌─────────┴─────────┐                                │
│                    ▼                   ▼                                │
│           ┌──────────────┐    ┌──────────────┐                          │
│           │  ClickHouse  │    │  OpenSearch  │                          │
│           │  (Analytics) │    │  (ML Only)   │                          │
│           └──────────────┘    └──────────────┘                          │
│                                       │                                 │
│                              ┌────────┴────────┐                        │
│                              ▼                 ▼                        │
│                      ┌──────────────┐  ┌──────────────┐                 │
│                      │ Anomaly Det. │  │  Forecasting │                 │
│                      └──────────────┘  └──────────────┘                 │
│                              │                                          │
│                              ▼                                          │
│                      ┌──────────────┐                                   │
│                      │ iot-backend  │────► Email Alerts                 │
│                      │   (API)      │                                   │
│                      └──────────────┘                                   │
│                              │                                          │
│                              ▼                                          │
│                      ┌──────────────┐                                   │
│                      │   Angular    │                                   │
│                      │  Dashboard   │                                   │
│                      └──────────────┘                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Tables Created

### PostgreSQL

| Table | Migration | Entity |
|-------|-----------|--------|
| `anomaly_results` | [003_create_anomaly_results.sql](../../iot-backend/migrations/003_create_anomaly_results.sql) | [anomaly-result.entity.ts](../../iot-backend/src/entities/anomaly-result.entity.ts) |
| `forecast_results` | [004_create_forecast_results.sql](../../iot-backend/migrations/004_create_forecast_results.sql) | [forecast-result.entity.ts](../../iot-backend/src/entities/forecast-result.entity.ts) |

### ClickHouse

| Table | Engine | Purpose |
|-------|--------|---------|
| `telemetry_agg_10min` | AggregatingMergeTree | 10-min aggregated data |
| `telemetry_agg_hourly` | AggregatingMergeTree | Hourly aggregated data |
| `telemetry_agg_daily` | AggregatingMergeTree | Daily aggregated data |

---

## 📋 Configuration Summary

| Setting | Value | Document |
|---------|-------|----------|
| Anomaly detection | OpenSearch ML (Random Cut Forest) | [04-OPENSEARCH](04-OPENSEARCH-TEMPLATES.md) |
| Sync interval | Every 10 minutes | [07-SCHEDULER](07-SCHEDULER-CONFIG.md) |
| Forecast horizon | 7 days | [01-PLANNING](01-PLANNING.md) |
| Forecast update | Every 12 hours (00:00, 12:00 UTC) | [07-SCHEDULER](07-SCHEDULER-CONFIG.md) |
| Alert suppression | 30 minutes | [08-ALERT-DEDUP](08-ALERT-DEDUPLICATION.md) |
| Retry attempts | 3 with exponential backoff | [09-ERROR-HANDLING](09-ERROR-HANDLING.md) |
| Email provider | Mailtrap (sandbox) | [06-ENVIRONMENT](06-ENVIRONMENT-VARIABLES.md) |

---

## 🚀 Next Steps

### Immediate Implementation

1. **Run migrations** - Create anomaly_results and forecast_results tables
2. **Install dependencies** - @elastic/elasticsearch, handlebars, nodemailer
3. **Configure OpenSearch** - Create index templates and initial detectors
4. **Implement iot-gtw modules** - SyncService, MlOrchestrationService
5. **Implement iot-backend modules** - AnomaliesController, NotificationService

### Phase 2 (After MVP)

- Grafana integration for ML dashboards
- SMS alerts (Twilio/local provider)
- Mobile push notifications (FCM)
- Advanced ML models (LSTM forecasting)

---

## 📞 Infrastructure Details

| Service | Host | Port | Protocol | Notes |
|---------|------|------|----------|-------|
| ClickHouse | 109.105.194.174 | 8123 | HTTP | iot_ingest user |
| **OpenSearch** | **iot-open-api.demo.vm.devetek.com** | **443** | **HTTPS** | Valid SSL, Basic Auth |
| OpenSearch (internal) | 10.0.15.69 | 9200 | HTTPS | Self-signed cert |
| OpenSearch Dashboard | 10.0.15.69 | 5601 | HTTPS | Admin UI |
| PostgreSQL | localhost | 5432 | TCP | Managed by iot-backend |
| SMTP | sandbox.smtp.mailtrap.io | 2525 | TCP | Dev/testing |

### OpenSearch Credentials

```bash
# Connection (use public domain - recommended)
URL: https://iot-open-api.demo.vm.devetek.com
User: admin
Pass: Dev3tek#Helios2026!

# Test
curl -u admin:'Dev3tek#Helios2026!' https://iot-open-api.demo.vm.devetek.com
```

| Property | Value |
|----------|-------|
| Version | 2.19.4 |
| Mode | Single-node production-lite |
| VM | Debian 12, 6 cores, 6 GB RAM, 100 GB SSD |
| Heap | 2g (Xms = Xmx) |

---

**Ready for Implementation!** 🎯

# Implementation Tasks: AI-ML Module

**Date:** 2026-02-28  
**Status:** ✅ Phase 5 Complete (OpenSearch ML Detectors)  
**Version:** 1.6
**Last Updated:** 2026-02-28

---

## Overview

Dokumen ini berisi daftar task implementasi untuk AI-ML module. Tasks diurutkan berdasarkan dependency dan prioritas.

---

## Phase 1: Infrastructure Setup

### 1.1 PostgreSQL Migrations ✅

| # | Task | File | Status |
|---|------|------|--------|
| 1.1.1 | Run anomaly_results migration | `migrations/003_create_anomaly_results.sql` | ✅ |
| 1.1.2 | Run forecast_results migration | `migrations/004_create_forecast_results.sql` | ✅ |
| 1.1.3 | Add columns to alert_events (deduplication) | `migrations/005_alter_alert_events_dedup.sql` | ⏳ |
| 1.1.4 | Verify entities registered in TypeORM | `src/entities/index.ts` | ⏳ |

**Commands:**
```bash
# Run migrations
cd iot-backend
psql -U your_user -d your_db -f migrations/003_create_anomaly_results.sql
psql -U your_user -d your_db -f migrations/004_create_forecast_results.sql
```

### 1.2 OpenSearch Setup ✅

| # | Task | Description | Status |
|---|------|-------------|--------|
| 1.2.1 | Verify ML plugin active | `GET /_plugins/_ml/stats` | ✅ |
| 1.2.2 | Create index template: sensor-telemetry-10min | Template for aggregated telemetry | ✅ |
| 1.2.3 | Create index template: anomaly-results | Template for anomaly output | ✅ |
| 1.2.4 | Create first test index | Test insert & query | ⏳ |

**Commands:**
```bash
# Check ML plugin
curl -u admin:'Dev3tek#Helios2026!' \
  https://iot-open-api.demo.vm.devetek.com/_plugins/_ml/stats

# Create index template (see 04-OPENSEARCH-TEMPLATES.md)
```

### 1.3 Dependencies Installation ✅

| # | Task | Service | Package | Status |
|---|------|---------|---------|--------|
| 1.3.1 | Install OpenSearch client | iot-gtw | `@opensearch-project/opensearch` | ✅ |
| 1.3.2 | Install scheduler | iot-gtw | `@nestjs/schedule` | ✅ |
| 1.3.3 | Install Handlebars | iot-backend | `handlebars` | ✅ |
| 1.3.4 | Install Nodemailer (if not exists) | iot-backend | `nodemailer` | ✅ |

**Commands:**
```bash
# iot-gtw
cd iot-gtw
npm install @opensearch-project/opensearch @nestjs/schedule

# iot-backend
cd iot-backend
npm install handlebars @types/handlebars nodemailer @types/nodemailer
```

---

## Phase 2: iot-gtw Implementation ✅

### 2.1 Core Services ✅

| # | Task | File | Description | Status |
|---|------|------|-------------|--------|
| 2.1.1 | Create OpenSearchService | `src/modules/ml/services/opensearch.service.ts` | Client wrapper, retry, circuit breaker | ✅ |
| 2.1.2 | Create opensearch.config | `src/config/opensearch.config.ts` | Load config from env | ✅ |
| 2.1.3 | Create SyncService | `src/modules/ml/services/sync.service.ts` | ClickHouse → OpenSearch sync | ✅ |
| 2.1.4 | Create MlOrchestrationService | `src/modules/ml/services/ml-orchestration.service.ts` | Poll & process anomalies | ✅ |
| 2.1.5 | Create ForecastService | `src/modules/ml/services/forecast.service.ts` | Generate forecasts | ✅ |

### 2.2 Scheduler Jobs ✅

| # | Task | File | Cron | Status |
|---|------|------|------|--------|
| 2.2.1 | SyncJob | `src/modules/ml/jobs/sync.job.ts` | `*/10 * * * *` | ✅ |
| 2.2.2 | AnomalyPollJob | `src/modules/ml/jobs/anomaly-poll.job.ts` | `2,12,22,32,42,52 * * * *` | ✅ |
| 2.2.3 | ForecastJob | `src/modules/ml/jobs/forecast.job.ts` | `0 0,12 * * *` | ✅ |
| 2.2.4 | CleanupJob | `src/modules/ml/jobs/cleanup.job.ts` | `0 1 * * *` | ✅ |
| 2.2.5 | TestJob | `src/modules/ml/jobs/test.job.ts` | Manual/API | ✅ |

### 2.3 Module Setup ✅

| # | Task | File | Status |
|---|------|------|--------|
| 2.3.1 | Create MlModule | `src/modules/ml/ml.module.ts` | ✅ |
| 2.3.2 | Register in AppModule | `src/app.module.ts` | ✅ |
| 2.3.3 | Add environment variables | `.env.example` | ✅ |
| 2.3.4 | Create config validation | `src/config/opensearch.config.ts` | ✅ |

---

## Phase 3: iot-backend Implementation ✅

### 3.1 ML API Controllers ✅

| # | Task | File | Endpoints | Status |
|---|------|------|-----------|--------|
| 3.1.1 | Create AnomaliesController | `src/modules/ml/controllers/anomalies.controller.ts` | GET /ml/anomalies, POST :id/acknowledge | ✅ |
| 3.1.2 | Create ForecastsController | `src/modules/ml/controllers/forecasts.controller.ts` | GET /ml/forecasts | ✅ |
| 3.1.3 | Create MlDashboardController | `src/modules/ml/controllers/ml-dashboard.controller.ts` | GET /ml/dashboard/summary | ✅ |

### 3.2 Services ✅

| # | Task | File | Description | Status |
|---|------|------|-------------|--------|
| 3.2.1 | Create AnomaliesService | `src/modules/ml/services/anomalies.service.ts` | Query anomaly_results | ✅ |
| 3.2.2 | Create ForecastsService | `src/modules/ml/services/forecasts.service.ts` | Query forecast_results | ✅ |
| 3.2.3 | Create AlertDeduplicationService | `src/notifications/services/alert-deduplication.service.ts` | Suppression logic (30-min window) | ✅ |
| 3.2.4 | Create MlNotificationService | `src/notifications/services/ml-notification.service.ts` | Nodemailer SMTP notifications | ✅ |

### 3.3 Email Templates ✅

| # | Task | File | Status |
|---|------|------|--------|
| 3.3.1 | Create email template service | `src/notifications/services/email-template.service.ts` | ✅ |
| 3.3.2 | Create anomaly-alert.hbs | `src/notifications/templates/anomaly-alert.hbs` | ✅ |
| 3.3.3 | Create daily-summary.hbs | `src/notifications/templates/daily-summary.hbs` | ✅ |
| 3.3.4 | Create system-status.hbs | `src/notifications/templates/system-status.hbs` | ✅ |

### 3.4 Notification Controller ✅

| # | Task | File | Status |
|---|------|------|--------|
| 3.4.1 | Create MlNotificationController | `src/notifications/controllers/ml-notification.controller.ts` | ✅ |
| 3.4.2 | Test/preview endpoints | POST /notifications/test, GET /notifications/preview | ✅ |
| 3.4.3 | Dedup management | GET/DELETE /notifications/dedup | ✅ |

### 3.5 Module Setup ✅

| # | Task | File | Status |
|---|------|------|--------|
| 3.5.1 | Create MlModule | `src/modules/ml/ml.module.ts` | ✅ |
| 3.5.2 | Update NotificationsModule | `src/notifications/notifications.module.ts` | ✅ |
| 3.5.3 | Register in AppModule | `src/app.module.ts` | ✅ |
| 3.5.4 | Add environment variables | `.env` | ✅ |

---

## Phase 4: Angular ML Dashboard ✅

### 4.1 ML Service ✅

| # | Task | File | Status |
|---|------|------|--------|
| 4.1.1 | Create MlService | `src/app/pages/iot/ml-dashboard/ml.service.ts` | ✅ |
| 4.1.2 | HTTP client for anomalies/forecasts | GET /ml/* endpoints | ✅ |

### 4.2 Dashboard Pages ✅

| # | Task | File | Status |
|---|------|------|--------|
| 4.2.1 | Create ML Dashboard component | `src/app/pages/iot/ml-dashboard/ml-dashboard.ts` | ✅ |
| 4.2.2 | KPI cards (total, critical, severe) | Dashboard overview | ✅ |
| 4.2.3 | Grade distribution chart | ApexCharts donut | ✅ |
| 4.2.4 | Recent anomalies table | Latest 10 items | ✅ |

### 4.3 Sub-Components ✅

| # | Task | File | Status |
|---|------|------|--------|
| 4.3.1 | Anomalies List component | `src/app/pages/iot/ml-dashboard/components/anomalies-list.ts` | ✅ |
| 4.3.2 | Bulk acknowledge feature | Multi-select + acknowledge | ✅ |
| 4.3.3 | Forecasts View component | `src/app/pages/iot/ml-dashboard/components/forecasts-view.ts` | ✅ |
| 4.3.4 | Forecast chart (ApexCharts) | Line chart with predictions | ✅ |

### 4.4 Module & Routing ✅

| # | Task | File | Status |
|---|------|------|--------|
| 4.4.1 | Create MlDashboardModule | `src/app/pages/iot/ml-dashboard/ml-dashboard.module.ts` | ✅ |
| 4.4.2 | Add lazy-loaded routes | app-routing.module.ts | ✅ |
| 4.4.3 | Add sidebar menu entry | app-menus.service.ts | ✅ |

---

## Phase 5: OpenSearch ML Detectors ✅

### 5.1 Detector Manager Service ✅

| # | Task | File | Status |
|---|------|------|--------|
| 5.1.1 | Create DetectorManagerService | `src/modules/ml/services/detector-manager.service.ts` | ✅ |
| 5.1.2 | Create DetectorController | `src/modules/ml/controllers/detector.controller.ts` | ✅ |
| 5.1.3 | Create setup-detectors.sh script | `setup-detectors.sh` | ✅ |
| 5.1.4 | Update MlModule | Register service & controller | ✅ |

### 5.2 Predefined Detector Configs ✅

| # | Detector | Filter (metric_unit) | Features | Status |
|---|----------|---------------------|----------|--------|
| 5.2.1 | Pressure Detector | `bar` | pressure_avg (RCF) | ✅ Running |
| 5.2.2 | Flow Detector | `m3/h`, `m³/h` | flow_avg (RCF) | ✅ Running |
| 5.2.3 | Level Detector | `m`, `meter`, `cm` | level_avg (RCF) | ⏸️ No data |
| 5.2.4 | Debit Detector | `m3/h`, `m³/h` | debit_avg (RCF) | ⏸️ Alias of Flow |

**Note:** Changed from `metric_code` to `metric_unit` for more consistent filtering.
User-defined `metric_code` values are inconsistent (e.g., "tekanan", "Tekanan", "pressure").
`metric_unit` is more reliable (e.g., "bar", "volt", "m3/h").

### 5.4 ON HOLD - Future Detectors ⏸️

| # | Detector | Filter (metric_unit) | Notes |
|---|----------|---------------------|-------|
| 5.4.1 | Voltage Detector | `volt` | Power meter - implement later |
| 5.4.2 | Current Detector | `ampere`, `A` | Power meter - implement later |
| 5.4.3 | Power Detector | `kW`, `kWh` | Power meter - implement later |
| 5.4.4 | Frequency Detector | `Hz` | VSD - implement later |

**TODO:** Implement when:
- Data dari power meter tersedia dan stabil
- Kebutuhan monitoring VSD sudah jelas
- Unit metrics sudah konsisten

### 5.3 Detector API Endpoints ✅

| # | Endpoint | Method | Description | Status |
|---|----------|--------|-------------|--------|
| 5.3.1 | `/ml/detectors` | GET | List all detectors | ✅ |
| 5.3.2 | `/ml/detectors/types` | GET | Get available types | ✅ |
| 5.3.3 | `/ml/detectors/:metricCode` | POST | Create detector | ✅ |
| 5.3.4 | `/ml/detectors/all/create` | POST | Create all detectors | ✅ |
| 5.3.5 | `/ml/detectors/:id/start` | POST | Start detector | ✅ |
| 5.3.6 | `/ml/detectors/:id/stop` | POST | Stop detector | ✅ |
| 5.3.7 | `/ml/detectors/all/start` | POST | Start all detectors | ✅ |
| 5.3.8 | `/ml/detectors/:id` | DELETE | Delete detector | ✅ |
| 5.3.9 | `/ml/detectors/:id/results` | GET | Get detector results | ✅ |

---

## Phase 6: Testing & Integration ⏳

### 6.1 Unit Tests ✅

| # | Task | File | Status |
|---|------|------|--------|
| 6.1.1 | Test OpenSearchService | `iot-gtw/src/modules/ml/services/opensearch.service.spec.ts` | ✅ |
| 6.1.2 | Test SyncService | `iot-gtw/src/modules/ml/services/sync.service.spec.ts` | ✅ |
| 6.1.3 | Test DetectorManagerService | `iot-gtw/src/modules/ml/services/detector-manager.service.spec.ts` | ✅ |
| 6.1.4 | Test AlertDeduplicationService | `iot-backend/src/notifications/services/alert-deduplication.service.spec.ts` | ✅ |
| 6.1.5 | Test AnomaliesService | `iot-backend/src/modules/ml/services/anomalies.service.spec.ts` | ✅ |

### 6.2 Integration Tests ✅

| # | Task | File | Status |
|---|------|------|--------|
| 6.2.1 | Create integration test script | `iot-gtw/test-ml-integration.sh` | ✅ |
| 6.2.2 | Test service health | Script: `./test-ml-integration.sh health` | ✅ |
| 6.2.3 | Test detector API | Script: `./test-ml-integration.sh detector` | ✅ |
| 6.2.4 | Test notification API | Script: `./test-ml-integration.sh notification` | ✅ |

### 6.3 Manual Testing ⏳

| # | Task | Method | Status |
|---|------|--------|--------|
| 6.3.1 | Simulate anomaly | Insert test data | ⬜ |
| 6.3.2 | Verify email received | Check Mailtrap | ⬜ |
| 6.3.3 | Verify dashboard data | Angular UI | ⬜ |
| 6.3.4 | Test acknowledge flow | UI action | ⬜ |

---

## Phase 7: Documentation & Deployment 🔄

### 7.1 Documentation ✅

| # | Task | File | Status |
|---|------|------|--------|
| 7.1.1 | Update README | `docs/AI-ML/ML-MODULE-README.md` | ✅ |
| 7.1.2 | Document API in Swagger | Already via decorators | ✅ |
| 7.1.3 | Create troubleshooting guide | `docs/AI-ML/TROUBLESHOOTING.md` | ✅ |
| 7.1.4 | Create runbook | `docs/AI-ML/RUNBOOK.md` | ✅ |

### 7.2 Deployment ⏳

| # | Task | Description | Status |
|---|------|-------------|--------|
| 7.2.1 | Update ecosystem.config.js | PM2 config exists | ✅ |
| 7.2.2 | Configure production env | Environment variables | ⬜ |
| 7.2.3 | Deploy to staging | Test environment | ⬜ |
| 7.2.4 | Deploy to production | Live environment | ⬜ |

---

## Task Summary

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| Phase 1: Infrastructure | 12 | 12 | ✅ 100% |
| Phase 2: iot-gtw | 12 | 12 | ✅ 100% |
| Phase 3: iot-backend | 14 | 14 | ✅ 100% |
| Phase 4: Angular ML | 10 | 10 | ✅ 100% |
| Phase 5: OpenSearch ML | 17 | 17 | ✅ 100% |
| Phase 6: Testing | 12 | 8 | 🔄 67% |
| Phase 7: Documentation | 8 | 5 | 🔄 63% |
| **TOTAL** | **85** | **78** | **92%** |

---

## Quick Start

**Recommended order:**

1. ✅ Design documents (COMPLETE)
2. ✅ **Phase 1** - Infrastructure (PostgreSQL, OpenSearch, dependencies)
3. ✅ **Phase 2** - iot-gtw ML Module (services, jobs, orchestration)
4. ✅ **Phase 3** - iot-backend APIs (controllers, services, notifications)
5. ✅ **Phase 4** - Angular ML Dashboard (UI, components, sidebar)
6. ✅ **Phase 5** - OpenSearch ML Detectors (service, controller, script)
7. 🔄 **Phase 6** - Testing & Integration ← **CURRENT**
8. ⏳ **Phase 7** - Documentation & Deploy

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Completed |
| ❌ | Blocked |
| ⏸️ | On hold |

---

## Related Documents

- [00-INDEX.md](00-INDEX.md) - Document index
- [01-PLANNING.md](01-PLANNING.md) - Planning & anomaly catalog
- [03-SERVICE-ARCHITECTURE.md](03-SERVICE-ARCHITECTURE.md) - Module structure
- [05-API-DESIGN.md](05-API-DESIGN.md) - API specification
- [06-ENVIRONMENT-VARIABLES.md](06-ENVIRONMENT-VARIABLES.md) - Configuration

---

**Let's build!** 🚀

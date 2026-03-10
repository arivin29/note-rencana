# AI/ML Anomaly Detection Module

## Overview

Module ML untuk deteksi anomali real-time pada sensor IoT PDAM menggunakan OpenSearch ML Plugin dengan algoritma Random Cut Forest (RCF).

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   MQTT/Device   │────▶│    iot-gtw       │────▶│   ClickHouse    │
│    Sensors      │     │   (Port 4000)    │     │   Time-series   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                        │
                                │ Sync every 10min       │
                                ▼                        │
                        ┌──────────────────┐             │
                        │   OpenSearch     │◀────────────┘
                        │   ML Plugin      │
                        │   (RCF Detectors)│
                        └──────────────────┘
                                │
                        Anomaly Detection
                                │
                                ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │   iot-backend    │────▶│   PostgreSQL    │
                        │   (Port 3000)    │     │   (Anomalies)   │
                        └──────────────────┘     └─────────────────┘
                                │
                        Email Notifications
                                │
                                ▼
                        ┌──────────────────┐
                        │   Angular UI     │
                        │   ML Dashboard   │
                        └──────────────────┘
```

## Features

- **Real-time Anomaly Detection**: Menggunakan OpenSearch RCF untuk deteksi streaming
- **Multi-sensor Support**: Pressure, flow, level, debit sensors
- **Anomaly Grading**: Normal, Mild, Moderate, Severe, Critical
- **Email Notifications**: Alert deduplication, configurable thresholds
- **Dashboard**: Real-time visualization, trend analysis, acknowledge workflow

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- ClickHouse 25+
- OpenSearch 2.x with ML Plugin

### Environment Variables

```bash
# iot-gtw/.env
OPENSEARCH_URL=https://iot-open-api.demo.vm.devetek.com
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=your_password
OPENSEARCH_SSL_VERIFY=false

CLICKHOUSE_HOST=109.105.194.174
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=iot
CLICKHOUSE_USERNAME=iot_ingest
CLICKHOUSE_PASSWORD=your_password
```

### Running Services

```bash
# iot-gtw (port 4000)
cd iot-gtw
npm install
npm run start:dev

# iot-backend (port 3000)
cd iot-backend
npm install
npm run start:dev

# Angular (port 4200)
cd iot-angular
npm install
ng serve
```

## API Endpoints

### iot-gtw (Port 4000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/detectors` | GET | List all ML detectors |
| `/api/ml/detectors/types` | GET | Get available detector types |
| `/api/ml/detectors/:id` | GET | Get detector details |
| `/api/ml/detectors` | POST | Create new detector |
| `/api/ml/detectors/:id/start` | POST | Start detector |
| `/api/ml/detectors/:id/stop` | POST | Stop detector |
| `/api/ml/sync/status` | GET | Get sync status |
| `/api/ml/sync/trigger` | POST | Trigger manual sync |

### iot-backend (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/anomalies` | GET | List anomalies (paginated) |
| `/api/ml/anomalies/summary` | GET | Get anomaly summary |
| `/api/ml/anomalies/:id` | GET | Get anomaly details |
| `/api/ml/anomalies/:id/acknowledge` | POST | Acknowledge anomaly |
| `/api/ml/dashboard/summary` | GET | Dashboard summary stats |
| `/api/ml/dashboard/anomaly-trend` | GET | Anomaly trend (7 days) |
| `/api/ml/dashboard/top-anomalous-sensors` | GET | Top anomalous sensors |

## Anomaly Grades

| Grade | Deviation | Description |
|-------|-----------|-------------|
| `normal` | < 20% | Within normal range |
| `mild` | 20-35% | Slight deviation |
| `moderate` | 35-50% | Notable deviation |
| `severe` | 50-80% | Significant anomaly |
| `critical` | > 80% | Critical anomaly |

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| SyncJob | Every 10 min | Sync ClickHouse → OpenSearch |
| AnomalyPollJob | Every 2 min | Check for new anomalies |
| ForecastJob | Every 12 hours | Update forecasts |

## Troubleshooting

### OpenSearch Connection Error

```
ERROR [OpenSearchService] OpenSearch error: Connection Error
```

**Solution**: Check OPENSEARCH_URL, credentials, and SSL settings.

### ClickHouse Query Error

```
ERROR [SyncService] ClickHouse query failed
```

**Solution**: Verify CLICKHOUSE_* env vars and table schema.

### No Anomalies Detected

1. Check if detectors are running: `GET /api/ml/detectors`
2. Verify data sync: `GET /api/ml/sync/status`
3. Check OpenSearch has data: Query `sensor-telemetry-10min-*` index

## Documentation

- [00-INDEX.md](docs/AI-ML/00-INDEX.md) - Document index
- [01-PLANNING.md](docs/AI-ML/01-PLANNING.md) - Planning & anomaly catalog
- [03-SERVICE-ARCHITECTURE.md](docs/AI-ML/03-SERVICE-ARCHITECTURE.md) - Module structure
- [05-API-DESIGN.md](docs/AI-ML/05-API-DESIGN.md) - API specification
- [11-IMPLEMENTATION-TASKS.md](docs/AI-ML/11-IMPLEMENTATION-TASKS.md) - Task tracking

## License

Proprietary - Devetek

# ClickHouse Integration - Implementation Complete

**Date:** January 27, 2026  
**Status:** ✅ Ready for Testing

---

## 📋 Summary

Implemented dual-write strategy for IoT telemetry data:
- **PostgreSQL** → Master data, CRUD, relational queries
- **ClickHouse** → Time-series analytics, Grafana, long-term storage

---

## 📁 New Files Created

### ClickHouse Module
```
src/modules/clickhouse/
├── clickhouse.module.ts      # NestJS module (Global)
├── clickhouse.service.ts     # Connection, batch insert, queries
├── index.ts                  # Exports
└── dto/
    ├── clickhouse.dto.ts     # TypeScript interfaces
    └── index.ts
```

### Configuration
```
src/config/clickhouse.config.ts   # ClickHouse config loader
```

### Migration
```
clickhouse/migrations/
└── 001_create_iot_schema.sql     # All tables & materialized views
```

### Documentation
```
docs/CLICKHOUSE-INTEGRATION.md    # Full documentation
```

### Test Scripts
```
scripts/test/test-clickhouse.js   # Connection test script
```

---

## 📝 Modified Files

### `src/app.module.ts`
- Added `clickhouseConfig` to ConfigModule
- Added `ClickhouseModule` to imports

### `src/modules/telemetry-processor/telemetry-processor.service.ts`
- Injected `ClickhouseService`
- After saving to PostgreSQL `sensor_logs`, also inserts to:
  - `iot.sensor_telemetry` (raw data)
  - `iot.sensor_channel_latest` (latest status)
  - `iot.node_latest` (node status)

### `src/modules/health/health.service.ts`
- Added ClickHouse health check to `/api/health`

### `.env.example`
- Added ClickHouse configuration variables

### `package.json`
- Added `test:clickhouse` script
- Added `@clickhouse/client` dependency

---

## 📊 ClickHouse Tables

| Table | Engine | TTL | Purpose |
|-------|--------|-----|---------|
| `sensor_telemetry` | MergeTree | 2 years | Raw telemetry data |
| `sensor_channel_latest` | ReplacingMergeTree | None | Latest channel values |
| `node_latest` | ReplacingMergeTree | None | Latest node status |
| `sensor_telemetry_10min` | SummingMergeTree (MV) | 6 months | 10-min aggregation |
| `sensor_telemetry_1hour` | SummingMergeTree (MV) | 1 year | Hourly aggregation |
| `sensor_telemetry_daily` | SummingMergeTree (MV) | 2 years | Daily aggregation |

---

## 🚀 Setup Steps

### 1. Setup ClickHouse
```bash
# Run migration
cat clickhouse/migrations/001_create_iot_schema.sql | clickhouse-client

# Create users (see docs/CLICKHOUSE-INTEGRATION.md)
```

### 2. Configure Environment
```bash
# Add to .env
CLICKHOUSE_HOST=your-clickhouse-host
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=iot
CLICKHOUSE_USERNAME=iot_ingest
CLICKHOUSE_PASSWORD=your_password
```

### 3. Test Connection
```bash
npm run test:clickhouse
```

### 4. Start Service
```bash
npm run start:dev
# Check logs for: "✅ Connected to ClickHouse"
```

---

## ⚡ Key Features

### Batch Insert
- Buffers data before inserting to ClickHouse
- Configurable batch size (default: 1000)
- Auto-flush every 5 seconds

### Non-Blocking
- ClickHouse insert is async
- PostgreSQL insert takes priority
- If ClickHouse fails, data still saved to PostgreSQL

### Auto-Aggregation
- Materialized Views auto-populate when inserting to main table
- No manual aggregation needed

### Health Check
```bash
curl http://localhost:4000/api/health
# Returns ClickHouse status
```

---

## 📈 Grafana Integration

### Recommended Query Strategy

| Time Range | Use Table |
|------------|-----------|
| < 24 hours | `sensor_telemetry` (raw) |
| 1-7 days | `sensor_telemetry_10min` |
| 7-30 days | `sensor_telemetry_1hour` |
| > 30 days | `sensor_telemetry_daily` |

### Sample Dashboard Query
```sql
SELECT 
    node_code,
    sensor_label,
    metric_code,
    eng_value,
    metric_unit,
    last_update
FROM iot.sensor_channel_latest FINAL
WHERE owner_code = '$owner'
ORDER BY node_code, sensor_label
```

---

## ✅ Testing Checklist

- [ ] ClickHouse server running
- [ ] Migration executed successfully
- [ ] Users & roles created
- [ ] `npm run test:clickhouse` passes
- [ ] Service starts without errors
- [ ] Health check shows ClickHouse connected
- [ ] Send test MQTT message
- [ ] Verify data in `sensor_telemetry`
- [ ] Verify data in `sensor_channel_latest`
- [ ] Verify materialized views populated
- [ ] Setup Grafana datasource
- [ ] Test Grafana queries

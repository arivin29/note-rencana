# ClickHouse Migration Guide

## Prerequisites

User `iot_ingest` tidak memiliki privilege untuk CREATE TABLE.
Migrasi ini perlu dijalankan menggunakan **admin user** ClickHouse.

## Quick Migration (Admin Required)

### Option 1: Via HTTP API (dengan admin user)

```bash
# Ganti ADMIN_USER dan ADMIN_PASSWORD dengan credential admin
curl -s "http://ADMIN_USER:ADMIN_PASSWORD@109.105.194.174:8123/" --data-binary @clickhouse/migrations/001_create_iot_schema.sql
```

### Option 2: Via clickhouse-client (jika terinstall)

```bash
# SSH ke server dan jalankan:
clickhouse-client --user ADMIN_USER --password ADMIN_PASSWORD < clickhouse/migrations/001_create_iot_schema.sql
```

### Option 3: Manual via DBeaver / DataGrip

1. Buka file `clickhouse/migrations/001_create_iot_schema.sql`
2. Connect ke ClickHouse dengan admin user
3. Execute seluruh script

## Grant Permissions (Admin Required)

Setelah tabel dibuat, jalankan grant ini untuk user `iot_ingest`:

```sql
-- Grant INSERT untuk tables
GRANT INSERT ON iot.sensor_telemetry TO iot_ingest;
GRANT INSERT ON iot.sensor_channel_latest TO iot_ingest;
GRANT INSERT ON iot.node_latest TO iot_ingest;

-- Grant SELECT untuk health check
GRANT SELECT ON iot.* TO iot_ingest;
```

## Verify Tables

```sql
SHOW TABLES FROM iot;
```

Expected output:
```
node_latest
sensor_channel_latest
sensor_telemetry
sensor_telemetry_10min
sensor_telemetry_1hour
sensor_telemetry_daily
```

## Test Connection

Dari project directory:

```bash
npm run test:clickhouse
```

## Tables Created

| Table | Engine | Purpose |
|-------|--------|---------|
| `sensor_telemetry` | MergeTree | Raw telemetry data (2 year TTL) |
| `sensor_channel_latest` | ReplacingMergeTree | Latest value per channel |
| `node_latest` | ReplacingMergeTree | Latest status per node |
| `sensor_telemetry_10min` | SummingMergeTree (MV) | 10-minute aggregation |
| `sensor_telemetry_1hour` | SummingMergeTree (MV) | 1-hour aggregation |
| `sensor_telemetry_daily` | SummingMergeTree (MV) | Daily aggregation |

## Notes

- Materialized Views (`_10min`, `_1hour`, `_daily`) are auto-populated when data is inserted to `sensor_telemetry`
- No manual insert needed for MVs
- TTL: Raw data 2 years, 10min 6 months, 1hour 1 year, daily 3 years

# ClickHouse Integration for IoT Gateway

## 📋 Overview

IoT Gateway menggunakan **dual-write strategy** untuk menyimpan data telemetry:
- **PostgreSQL**: Master data, relational queries, CRUD operations
- **ClickHouse**: Time-series analytics, Grafana dashboards, long-term storage

## 🏗️ Architecture

```
MQTT Message
     │
     ▼
┌─────────────────┐
│   MqttService   │
│   (save raw)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    iot_log      │ ◄── PostgreSQL (buffer)
│   (processed=   │
│     false)      │
└────────┬────────┘
         │
         ▼ @Cron('*/30 * * * * *')
┌─────────────────────────────────────────┐
│      TelemetryProcessorService          │
│                                          │
│  1. Parse payload                        │
│  2. Match sensors & channels             │
│  3. Apply engineering conversion         │
│  4. Save to sensor_logs (PostgreSQL)     │
│  5. Insert to sensor_telemetry (CH)      │
│  6. Update sensor_channel_latest (CH)    │
│  7. Update node_latest (CH)              │
│  8. Mark iot_log as processed            │
└─────────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌──────────────────────────────┐
│ Postgre│  │        ClickHouse            │
│   SQL  │  │                              │
│        │  │  sensor_telemetry (raw)      │
│ sensor_│  │       │                      │
│ logs   │  │       ├─► sensor_telemetry   │
│        │  │       │   _10min (MV)        │
│        │  │       ├─► sensor_telemetry   │
│        │  │       │   _1hour (MV)        │
│        │  │       └─► sensor_telemetry   │
│        │  │           _daily (MV)        │
│        │  │                              │
│        │  │  sensor_channel_latest       │
│        │  │  node_latest                 │
└────────┘  └──────────────────────────────┘
```

## 📊 ClickHouse Tables

### 1. `iot.sensor_telemetry` (Main Table)
Raw telemetry data dengan TTL 2 tahun.

| Column | Type | Description |
|--------|------|-------------|
| event_time | DateTime64(3) | Timestamp dari device |
| device_id | String | Device identifier |
| owner_code | LowCardinality(String) | Owner code (5 char) |
| project_id | UUID | Project ID |
| node_id | UUID | Node ID |
| sensor_id | UUID | Sensor ID |
| channel_id | UUID | Channel ID |
| metric_code | LowCardinality(String) | Metric name |
| raw_value | Float64 | Raw sensor value |
| eng_value | Float64 | Engineering converted value |

### 2. `iot.sensor_channel_latest` (ReplacingMergeTree)
Status terakhir setiap sensor channel untuk dashboard realtime.

### 3. `iot.node_latest` (ReplacingMergeTree)
Status terakhir setiap node untuk monitoring.

### 4. Materialized Views (Auto-aggregated)
- `iot.sensor_telemetry_10min` - TTL 6 bulan
- `iot.sensor_telemetry_1hour` - TTL 1 tahun
- `iot.sensor_telemetry_daily` - TTL 2 tahun

## 🚀 Setup Instructions

### 1. Create ClickHouse Database & Tables

```bash
# Connect to ClickHouse
clickhouse-client --host localhost --user default

# Run migration
cat clickhouse/migrations/001_create_iot_schema.sql | clickhouse-client
```

### 2. Create Users & Roles

```sql
-- Create roles
CREATE ROLE IF NOT EXISTS role_iot_ingest;
CREATE ROLE IF NOT EXISTS role_iot_read;

-- Grant permissions to roles
GRANT INSERT, SELECT ON iot.* TO role_iot_ingest;
GRANT SELECT ON iot.* TO role_iot_read;

-- Create users
CREATE USER IF NOT EXISTS iot_ingest 
  IDENTIFIED BY 'your_secure_password_here'
  DEFAULT ROLE role_iot_ingest;

CREATE USER IF NOT EXISTS grafana 
  IDENTIFIED BY 'grafana_password_here'
  DEFAULT ROLE role_iot_read
  SETTINGS max_memory_usage = 10000000000,
           max_threads = 4,
           max_execution_time = 60;

-- Assign roles to users
GRANT role_iot_ingest TO iot_ingest;
GRANT role_iot_read TO grafana;
```

### 3. Configure Environment

Add to `.env`:
```bash
CLICKHOUSE_HOST=your-clickhouse-host
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=iot
CLICKHOUSE_USERNAME=iot_ingest
CLICKHOUSE_PASSWORD=your_secure_password_here
CLICKHOUSE_BATCH_SIZE=1000
CLICKHOUSE_FLUSH_INTERVAL_MS=5000
```

### 4. Verify Connection

```bash
npm run start:dev
# Check logs for: "✅ Connected to ClickHouse"
```

## 📈 Grafana Queries

### Realtime Dashboard - Current Values
```sql
SELECT 
    node_code,
    sensor_label,
    metric_code,
    eng_value,
    metric_unit,
    last_update,
    dateDiff('second', last_update, now()) AS age_seconds
FROM iot.sensor_channel_latest FINAL
WHERE owner_code = '$owner'
ORDER BY node_code, sensor_label
```

### Last 24 Hours - Raw Data
```sql
SELECT 
    $__timeInterval(event_time) AS time,
    sensor_label,
    metric_code,
    avg(eng_value) AS value
FROM iot.sensor_telemetry
WHERE 
    owner_code = '$owner'
    AND $__timeFilter(event_time)
GROUP BY time, sensor_label, metric_code
ORDER BY time
```

### Last 7 Days - 10min Aggregation
```sql
SELECT 
    time_bucket AS time,
    sensor_label,
    metric_code,
    avg_value AS value
FROM iot.sensor_telemetry_10min
WHERE 
    owner_code = '$owner'
    AND $__timeFilter(time_bucket)
ORDER BY time
```

### Last 30 Days - Hourly Aggregation
```sql
SELECT 
    time_bucket AS time,
    sensor_label,
    metric_code,
    avg_value AS value,
    min_value,
    max_value
FROM iot.sensor_telemetry_1hour
WHERE 
    owner_code = '$owner'
    AND $__timeFilter(time_bucket)
ORDER BY time
```

### Yearly View - Daily Aggregation
```sql
SELECT 
    event_date AS time,
    sensor_label,
    metric_code,
    avg_value AS value,
    sample_count
FROM iot.sensor_telemetry_daily
WHERE 
    owner_code = '$owner'
    AND event_date >= today() - INTERVAL 1 YEAR
ORDER BY time
```

## 🔧 Maintenance

### Check Table Sizes
```sql
SELECT 
    table,
    formatReadableSize(sum(bytes)) AS size,
    sum(rows) AS rows
FROM system.parts
WHERE database = 'iot' AND active
GROUP BY table
ORDER BY sum(bytes) DESC;
```

### Check Materialized View Status
```sql
SELECT 
    name,
    total_rows,
    formatReadableSize(total_bytes) AS size
FROM system.tables
WHERE database = 'iot'
ORDER BY total_bytes DESC;
```

### Force Merge (Optimize)
```sql
-- Only run during low traffic periods
OPTIMIZE TABLE iot.sensor_telemetry FINAL;
OPTIMIZE TABLE iot.sensor_channel_latest FINAL;
OPTIMIZE TABLE iot.node_latest FINAL;
```

### Manual TTL Cleanup
```sql
-- Force TTL cleanup
ALTER TABLE iot.sensor_telemetry MATERIALIZE TTL;
```

## ⚠️ Troubleshooting

### ClickHouse Connection Failed
1. Check host/port accessibility
2. Verify user credentials
3. Check firewall rules

### Data Not Appearing in ClickHouse
1. Check `ClickhouseService.isReady()` returns true
2. Check buffer flush: `ClickhouseService.getBufferStats()`
3. Manual flush: Service restart will trigger flush

### Slow Queries in Grafana
1. Use appropriate aggregation table based on time range
2. Add proper WHERE filters (owner_code, project_id)
3. Check query uses partition pruning

## 📝 Notes

- ClickHouse insert is **non-blocking** - PostgreSQL insert takes priority
- If ClickHouse fails, data is still saved to PostgreSQL
- Use `FINAL` keyword when querying ReplacingMergeTree tables
- Materialized views auto-populate when inserting to main table

# ClickHouse Aggregation v2 - AggregatingMergeTree

**Date:** 2026-02-27  
**Status:** ✅ Production Ready  
**Migration:** 002_fix_aggregating_merge_tree.sql

---

## Overview

Upgrade dari SummingMergeTree ke **AggregatingMergeTree** untuk agregasi data sensor yang benar secara matematis.

### Problem (v1)
```sql
-- SummingMergeTree dengan avg() menyimpan hasil akhir
ENGINE = SummingMergeTree
AS SELECT avg(eng_value) AS avg_eng ...

-- Saat ClickHouse merge parts: avg1 + avg2 = SALAH!
-- Contoh: (10/5) + (20/10) = 2 + 2 = 4 ≠ 30/15 = 2
```

### Solution (v2)
```sql
-- AggregatingMergeTree menyimpan state agregasi
ENGINE = AggregatingMergeTree
AS SELECT avgState(eng_value) AS eng_avg_state ...

-- Saat query: avgMerge(eng_avg_state) = BENAR!
-- ClickHouse menggabungkan state, bukan hasil
```

---

## Database Schema

### Tables

| Table | Engine | TTL | Purpose |
|-------|--------|-----|---------|
| `sensor_telemetry` | MergeTree | 3 months | Raw telemetry data |
| `sensor_telemetry_10min` | AggregatingMergeTree | 6 months | 10-minute aggregation |
| `sensor_telemetry_1hour` | AggregatingMergeTree | 1 year | Hourly aggregation |
| `sensor_telemetry_daily` | AggregatingMergeTree | 3 years | Daily aggregation |
| `node_latest` | ReplacingMergeTree | - | Latest node status |
| `sensor_channel_latest` | ReplacingMergeTree | - | Latest channel values |

### Materialized Views

| MV Name | Target Table | Trigger |
|---------|--------------|---------|
| `mv_sensor_telemetry_10min` | sensor_telemetry_10min | INSERT to sensor_telemetry |
| `mv_sensor_telemetry_1hour` | sensor_telemetry_1hour | INSERT to sensor_telemetry |
| `mv_sensor_telemetry_daily` | sensor_telemetry_daily | INSERT to sensor_telemetry |

---

## Column Structure (Aggregate Tables)

```sql
-- Dimensions (GROUP BY keys)
time_bucket DateTime        -- 10min/1hour bucket (tidak ada di daily)
event_date Date             -- Tanggal
owner_code LowCardinality(String)
project_id UUID
project_code LowCardinality(String)
node_id UUID
node_code String
sensor_id UUID
sensor_label String
channel_id UUID
metric_code LowCardinality(String)
metric_unit LowCardinality(String)

-- Aggregate States (TIDAK bisa di-SELECT langsung!)
raw_avg_state AggregateFunction(avg, Float64)
eng_avg_state AggregateFunction(avg, Float64)
eng_min_state AggregateFunction(min, Float64)
eng_max_state AggregateFunction(max, Float64)
sample_count_state AggregateFunction(count)
```

---

## Query Examples

### ❌ SALAH - Direct Column Access
```sql
-- Ini TIDAK akan bekerja!
SELECT avg_eng FROM iot.sensor_telemetry_10min;
-- Error: column avg_eng tidak ada
```

### ✅ BENAR - Menggunakan Merge Functions

#### Basic Query
```sql
SELECT 
  time_bucket,
  avgMerge(eng_avg_state) AS avg_eng,
  minMerge(eng_min_state) AS min_eng,
  maxMerge(eng_max_state) AS max_eng,
  countMerge(sample_count_state) AS sample_count
FROM iot.sensor_telemetry_10min
WHERE time_bucket >= now() - INTERVAL 1 DAY
GROUP BY time_bucket
ORDER BY time_bucket DESC;
```

#### Filter by Channel
```sql
SELECT 
  time_bucket,
  sensor_label,
  metric_code,
  avgMerge(eng_avg_state) AS avg_value
FROM iot.sensor_telemetry_10min
WHERE 
  channel_id = 'uuid-here'
  AND time_bucket >= now() - INTERVAL 7 DAY
GROUP BY time_bucket, sensor_label, metric_code
ORDER BY time_bucket;
```

#### Filter by Owner/Project
```sql
SELECT 
  time_bucket,
  node_code,
  avgMerge(eng_avg_state) AS avg_tekanan
FROM iot.sensor_telemetry_10min
WHERE 
  owner_code = '9VSIK'
  AND project_id = '1414bdba-000b-4e17-b877-557136f8ef2a'
  AND metric_code = 'tekanan'
  AND time_bucket >= now() - INTERVAL 24 HOUR
GROUP BY time_bucket, node_code
ORDER BY time_bucket;
```

#### Daily Report
```sql
SELECT 
  event_date,
  sensor_label,
  avgMerge(eng_avg_state) AS daily_avg,
  minMerge(eng_min_state) AS daily_min,
  maxMerge(eng_max_state) AS daily_max,
  countMerge(sample_count_state) AS total_samples
FROM iot.sensor_telemetry_daily
WHERE 
  owner_code = '9VSIK'
  AND event_date >= today() - 30
GROUP BY event_date, sensor_label
ORDER BY event_date DESC, sensor_label;
```

---

## Grafana Integration

### Data Source
- Type: ClickHouse
- Host: 109.105.194.174:8123
- Database: iot
- User: iot_ingest (atau read-only user)

### Sample Dashboard Query

```sql
SELECT 
  $__timeInterval(time_bucket) AS time,
  sensor_label,
  avgMerge(eng_avg_state) AS value
FROM iot.sensor_telemetry_10min
WHERE 
  $__timeFilter(time_bucket)
  AND owner_code = '$owner_code'
  AND project_id = '$project_id'
  AND metric_code = '$metric'
GROUP BY time, sensor_label
ORDER BY time
```

### Variables
```sql
-- $owner_code
SELECT DISTINCT owner_code FROM iot.sensor_telemetry_10min

-- $project_id  
SELECT DISTINCT project_id, project_code 
FROM iot.sensor_telemetry_10min 
WHERE owner_code = '$owner_code'

-- $metric
SELECT DISTINCT metric_code 
FROM iot.sensor_telemetry_10min 
WHERE project_id = '$project_id'
```

---

## Fitur: avgStateIf - Ignore Zero Glitches

MVs menggunakan `avgStateIf(value, value != 0)` untuk mengabaikan nilai 0 yang merupakan glitch sensor.

```sql
-- Di MV definition:
avgStateIf(raw_value, raw_value != 0) AS raw_avg_state,
avgStateIf(eng_value, eng_value != 0) AS eng_avg_state,
```

**Catatan:** Jika sensor Anda memiliki nilai 0 yang valid (misal: flow meter di malam hari), perlu modifikasi kondisi filter sesuai kebutuhan.

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   [iot-gtw] ──INSERT──► sensor_telemetry (raw)               │
│                              │                               │
│                              ▼ (auto via MV)                 │
│              ┌───────────────┼───────────────┐               │
│              ▼               ▼               ▼               │
│    sensor_telemetry   sensor_telemetry  sensor_telemetry     │
│         _10min            _1hour           _daily            │
│              │               │               │               │
│              └───────────────┴───────────────┘               │
│                              │                               │
│                              ▼                               │
│                         [Grafana]                            │
│                   avgMerge(), minMerge()                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Storage & Performance

### Estimasi Storage (300 sensor, 5 channel/sensor)

| Table | Records/day | Storage/month |
|-------|-------------|---------------|
| sensor_telemetry (raw) | 2.16M | ~5 GB |
| sensor_telemetry_10min | ~216K | ~500 MB |
| sensor_telemetry_1hour | ~36K | ~100 MB |
| sensor_telemetry_daily | ~1.5K | ~5 MB |

### Query Performance

| Query Type | Table | Expected Time |
|------------|-------|---------------|
| Last 24 hours | _10min | < 100ms |
| Last 7 days | _10min | < 500ms |
| Last 30 days | _1hour | < 200ms |
| Last 1 year | _daily | < 100ms |

---

## Maintenance

### Check Table Sizes
```sql
SELECT 
  table,
  formatReadableSize(sum(bytes_on_disk)) AS size,
  sum(rows) AS rows
FROM system.parts
WHERE database = 'iot' AND active
GROUP BY table
ORDER BY sum(bytes_on_disk) DESC;
```

### Force Merge (if needed)
```sql
OPTIMIZE TABLE iot.sensor_telemetry_10min FINAL;
```

### Check MV Status
```sql
SELECT 
  name, 
  engine,
  total_rows,
  total_bytes
FROM system.tables
WHERE database = 'iot';
```

---

## Migration History

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2026-01-27 | Initial SummingMergeTree implementation |
| v2 | 2026-02-27 | Upgrade to AggregatingMergeTree + avgStateIf |

### v2 Migration Steps Executed
1. ✅ Created new `_agg` tables with AggregatingMergeTree
2. ✅ Created new `mv_*` pointing to `_agg` tables
3. ✅ Backfilled data from raw (last 3 months)
4. ✅ Verified data counts
5. ✅ Dropped old MVs  
6. ✅ Renamed `_agg` → original names
7. ✅ Recreated MVs pointing to renamed tables
8. ✅ Cleaned up old `.inner_id.*` tables

---

## Related Files

- Migration SQL: `clickhouse/migrations/002_fix_aggregating_merge_tree.sql`
- ClickHouse Service: `src/modules/clickhouse/clickhouse.service.ts`
- DTOs: `src/modules/clickhouse/dto/clickhouse.dto.ts`

---

## Next Steps

- [ ] Update Grafana dashboards untuk pakai `avgMerge()`
- [ ] Implementasi OpenSearch sync untuk ML/Anomaly Detection
- [ ] Setup alerting berdasarkan threshold dari agregat

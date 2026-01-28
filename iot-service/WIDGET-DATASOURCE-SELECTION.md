# Data Source Selection for Widget Builder

**Date:** January 28, 2026  
**Status:** ✅ Implemented

---

## Overview

Added dual data source support for Widget Builder, allowing widgets to query data from either:
- **PostgreSQL** - For real-time data, transactions, and complex joins
- **ClickHouse** - For time-series analytics and large aggregations

---

## Architecture

```
┌─────────────────────┐
│   Widget Wizard     │
│   (Data Source)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Backend API       │
│   /widget-builder   │
│   /query/execute    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌──────────┐
│PostgreSQL│ │ClickHouse│
└─────────┘ └──────────┘
```

---

## Backend Changes

### 1. ClickHouse Module
New module at `src/modules/clickhouse/`:
- `clickhouse.module.ts` - Global NestJS module
- `clickhouse.service.ts` - Connection and query execution
- `index.ts` - Exports

### 2. Configuration
New config file: `src/config/clickhouse.config.ts`

Environment variables:
```env
CLICKHOUSE_ENABLED=true
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=iot
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_REQUEST_TIMEOUT=30000
```

### 3. Updated DTOs
`ExecuteQueryDto` now includes:
```typescript
export enum DataSource {
  POSTGRESQL = 'postgresql',
  CLICKHOUSE = 'clickhouse',
}

export class ExecuteQueryDto {
  sql: string;
  dataSource?: DataSource;  // NEW
  from?: number;
  to?: number;
  variables?: Record<string, any>;
}
```

### 4. New Endpoint
`GET /widget-builder/datasources` - Returns available data sources with status:
```json
{
  "postgresql": {
    "available": true,
    "name": "PostgreSQL",
    "description": "Relational database for real-time data"
  },
  "clickhouse": {
    "available": true,
    "name": "ClickHouse",
    "description": "Time-series analytics database",
    "status": "healthy",
    "latency": 5
  }
}
```

### 5. Query Routing
`WidgetBuilderService.executeQuery()` now routes queries based on `dataSource`:
- `postgresql` → TypeORM DataSource
- `clickhouse` → ClickHouse HTTP API

---

## Frontend Changes

### 1. Widget Wizard
- Added data source dropdown selector in Query Card header
- Info banner shows recommendations for each data source
- `selectedDataSource` state tracked and sent with query
- Data source saved in widget config

### 2. Widget Container
- Reads `config.dataSource` from widget
- Sends `dataSource` parameter when executing query

### 3. Widget Models
Updated `WidgetConfig` interface:
```typescript
export interface WidgetConfig {
  dataSource?: 'postgresql' | 'clickhouse';
  // ... other fields
}
```

---

## Usage

### Creating a Widget with ClickHouse

1. Open Widget Wizard
2. Select **ClickHouse** from Data Source dropdown
3. Write ClickHouse-compatible SQL:
```sql
SELECT 
  toStartOfHour(ts) as time,
  avg(value) as avg_value,
  count() as count
FROM iot.sensor_telemetry
WHERE ts >= '${fromTime}' AND ts <= '${toTime}'
GROUP BY time
ORDER BY time
```

4. Click "Run Query" to test
5. Configure visualization
6. Save widget

### SQL Syntax Differences

| Feature | PostgreSQL | ClickHouse |
|---------|------------|------------|
| Interval | `INTERVAL '6 hours'` | `INTERVAL 6 HOUR` |
| Time truncate | `date_trunc('hour', ts)` | `toStartOfHour(ts)` |
| Count | `COUNT(*)` | `count()` |
| Array access | `array[1]` | `arrayElement(array, 1)` |

---

## ClickHouse Tables (from iot-gtw)

| Table | Purpose | Best For |
|-------|---------|----------|
| `sensor_telemetry` | Raw telemetry | Recent detailed data |
| `sensor_telemetry_10min` | 10-min aggregation | Short-term trends |
| `sensor_telemetry_1hour` | Hourly aggregation | Daily patterns |
| `sensor_telemetry_daily` | Daily aggregation | Long-term analysis |
| `sensor_channel_latest` | Latest values | Current status |
| `node_latest` | Node status | Node overview |

---

## Recommendations

### Use PostgreSQL for:
- Real-time dashboards (< 1 hour data)
- Complex JOINs with master data
- Transactional queries
- Smaller datasets

### Use ClickHouse for:
- Historical analytics (days/weeks/months)
- Large aggregations
- Time-series trends
- High-cardinality data

---

## Files Modified

### Backend
- `src/app.module.ts` - Added ClickhouseModule
- `src/config/clickhouse.config.ts` - NEW
- `src/modules/clickhouse/` - NEW module
- `src/modules/widget-builder/dto/query.dto.ts` - Added DataSource enum
- `src/modules/widget-builder/widget-builder.service.ts` - Query routing
- `src/modules/widget-builder/widget-builder.controller.ts` - GET /datasources

### Frontend
- `widget-wizard.component.ts` - Data source state & methods
- `widget-wizard.component.html` - Data source selector UI
- `widget-wizard.component.css` - Styling
- `widget-container.component.ts` - Send dataSource in query
- `models/widget.models.ts` - Added dataSource to WidgetConfig

---

## Testing

1. Enable ClickHouse in `.env`:
```env
CLICKHOUSE_ENABLED=true
```

2. Restart backend

3. Check data sources endpoint:
```bash
curl http://localhost:3000/widget-builder/datasources
```

4. Create widget with ClickHouse data source

5. Verify query execution in ClickHouse logs

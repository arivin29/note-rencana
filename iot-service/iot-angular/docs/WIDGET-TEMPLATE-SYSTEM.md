# Widget Template System - Design Document

## Overview

Sistem template widget untuk mempermudah user membuat widget **tanpa perlu menulis SQL**.
User cukup pilih jenis widget, template, dan data source - sistem akan **auto-generate SQL**.

> **Penting**: Backend tidak berubah! Yang disimpan tetap SQL query.
> Frontend yang bertanggung jawab generate SQL dari pilihan user.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Input          Template Engine         Output             │
│   ───────────        ───────────────         ──────────          │
│                                                                  │
│   ┌─────────┐        ┌─────────────┐        ┌──────────┐        │
│   │ Widget  │───────▶│  Generate   │───────▶│   SQL    │        │
│   │ Type    │        │  SQL Query  │        │  Query   │        │
│   └─────────┘        └─────────────┘        └──────────┘        │
│                             │                     │              │
│   ┌─────────┐               │                     │              │
│   │Template │───────────────┤                     │              │
│   │ Style   │               │                     │              │
│   └─────────┘               │                     │              │
│                             │                     │              │
│   ┌─────────┐               │                     │              │
│   │ Filters │───────────────┘                     │              │
│   │(Node,   │                                     │              │
│   │Sensor,  │                                     │              │
│   │Channel) │                                     ▼              │
│   └─────────┘                              ┌──────────┐         │
│                                            │  Save to │         │
│                                            │  Backend │         │
│                                            └──────────┘         │
│                                                  │               │
└──────────────────────────────────────────────────│───────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (No Changes)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Widget Entity:                                                 │
│   {                                                              │
│     id: "uuid",                                                  │
│     name: "Temperature Gauge",                                   │
│     type: "gauge",                                              │
│     sql: "SELECT value FROM ... WHERE ...",  ◀── Generated SQL  │
│     config: { ... },                                            │
│     ...                                                          │
│   }                                                              │
│                                                                  │
│   Execution: Same as before - just run the SQL query            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Widget Types & Templates

### 1. GAUGE Widget

**Use Case**: Monitor single sensor channel value dengan threshold warning/critical.

**Required Filters**: Node → Sensor → Channel (cascade, semua wajib)

**Templates**:

| Template ID | Name | Preview | Description |
|------------|------|---------|-------------|
| `speedometer` | Speedometer | ![speedometer] | Classic gauge dengan jarum |
| `semicircle` | Semicircle | ![semicircle] | Half-circle gauge |
| `radial-bar` | Radial Bar | ![radial] | Circular progress bar |
| `vertical-bar` | Vertical Bar | ![vbar] | Vertical thermometer style |
| `horizontal-bar` | Horizontal Bar | ![hbar] | Progress bar horizontal |
| `number-display` | Number Display | ![number] | Big number dengan unit |

**Generated SQL Pattern**:
```sql
-- PostgreSQL
SELECT 
  sl.value as value,
  sl.timestamp as timestamp,
  sc.min_value,
  sc.max_value,
  sc.unit
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id
WHERE sl.id_sensor_channel = '${channelId}'
ORDER BY sl.timestamp DESC
LIMIT 1

-- ClickHouse
SELECT 
  value,
  timestamp
FROM iot.sensor_channel_latest
WHERE id_sensor_channel = '${channelId}'
LIMIT 1
```

**Config Schema**:
```typescript
interface GaugeConfig {
  // Data
  channelId: string;       // Required
  
  // Display
  templateId: string;      // speedometer, semicircle, etc.
  title: string;           // Widget title
  unit: string;            // Auto from channel, editable
  
  // Thresholds
  minValue: number;        // Auto from channel config
  maxValue: number;        // Auto from channel config
  warningThreshold?: number;
  criticalThreshold?: number;
  
  // Colors
  normalColor: string;     // Default: green
  warningColor: string;    // Default: yellow
  criticalColor: string;   // Default: red
  
  // Refresh
  refreshInterval: number; // seconds, default 30
}
```

---

### 2. TIME SERIES Widget

**Use Case**: Visualize sensor data over time, bisa multiple channels.

**Required Filters**: Node (minimal)
**Optional Filters**: Sensor, Channel (bisa multi-select)

**Templates**:

| Template ID | Name | Preview | Description |
|------------|------|---------|-------------|
| `line-chart` | Line Chart | ![line] | Standard line chart |
| `area-chart` | Area Chart | ![area] | Filled area under line |
| `bar-chart` | Bar Chart | ![bar] | Vertical bars |
| `stacked-area` | Stacked Area | ![stacked] | Multiple series stacked |
| `multi-line` | Multi Line | ![multi] | Multiple lines comparison |
| `sparkline` | Sparkline | ![spark] | Minimal compact chart |

**Generated SQL Pattern**:
```sql
-- PostgreSQL (single channel)
SELECT 
  sl.timestamp as time,
  sl.value as value
FROM sensor_logs sl
WHERE sl.id_sensor_channel = '${channelId}'
  AND sl.timestamp BETWEEN '${fromTime}' AND '${toTime}'
ORDER BY sl.timestamp ASC

-- PostgreSQL (multiple channels)
SELECT 
  sl.timestamp as time,
  sc.label as metric,
  sl.value as value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id
WHERE sl.id_sensor_channel IN (${channelIds})
  AND sl.timestamp BETWEEN '${fromTime}' AND '${toTime}'
ORDER BY sl.timestamp ASC

-- ClickHouse (with aggregation)
SELECT 
  toStartOfHour(timestamp) as time,
  metric,
  avg(value) as value
FROM iot.sensor_telemetry
WHERE id_sensor_channel IN (${channelIds})
  AND timestamp BETWEEN '${fromTime}' AND '${toTime}'
GROUP BY time, metric
ORDER BY time ASC
```

**Config Schema**:
```typescript
interface TimeSeriesConfig {
  // Data
  nodeId?: string;
  sensorId?: string;
  channelIds: string[];    // Can be multiple
  
  // Display
  templateId: string;      // line-chart, area-chart, etc.
  title: string;
  
  // Time Range
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
  customFrom?: string;     // ISO date if custom
  customTo?: string;
  
  // Aggregation (optional)
  aggregation?: 'none' | '1min' | '5min' | '15min' | '1hour' | '1day';
  aggregationFunc?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  
  // Series Config
  series: Array<{
    channelId: string;
    label: string;         // Auto from channel
    color: string;         // Auto-assigned or custom
    yAxisId?: 'left' | 'right';
  }>;
  
  // Chart Options
  showLegend: boolean;
  showGrid: boolean;
  smoothCurve: boolean;
  fillArea: boolean;
  
  // Refresh
  refreshInterval: number;
}
```

---

### 3. SINGLE VALUE Widget

**Use Case**: Display latest value dengan trend indicator.

**Required Filters**: Node → Sensor → Channel

**Templates**:

| Template ID | Name | Description |
|------------|------|-------------|
| `big-number` | Big Number | Large value display |
| `with-sparkline` | With Sparkline | Value + mini chart |
| `with-trend` | With Trend | Value + up/down arrow |
| `with-comparison` | With Comparison | Value vs previous period |
| `card-style` | Card Style | Full card with icon |

**Generated SQL Pattern**:
```sql
-- Get latest value with trend
WITH current_val AS (
  SELECT value, timestamp
  FROM sensor_logs
  WHERE id_sensor_channel = '${channelId}'
  ORDER BY timestamp DESC
  LIMIT 1
),
previous_val AS (
  SELECT value
  FROM sensor_logs
  WHERE id_sensor_channel = '${channelId}'
  ORDER BY timestamp DESC
  LIMIT 1 OFFSET 1
)
SELECT 
  c.value as current_value,
  c.timestamp,
  p.value as previous_value,
  CASE 
    WHEN c.value > p.value THEN 'up'
    WHEN c.value < p.value THEN 'down'
    ELSE 'stable'
  END as trend
FROM current_val c, previous_val p
```

**Config Schema**:
```typescript
interface SingleValueConfig {
  channelId: string;
  templateId: string;
  title: string;
  unit: string;
  
  // Trend
  showTrend: boolean;
  trendPeriod: '1min' | '5min' | '1hour' | '1day';
  
  // Sparkline (if template supports)
  sparklinePoints: number;  // Default 20
  
  // Thresholds
  warningThreshold?: number;
  criticalThreshold?: number;
  
  // Display
  decimals: number;        // Default 2
  prefix?: string;         // e.g., "$"
  suffix?: string;         // e.g., " kg"
  
  refreshInterval: number;
}
```

---

### 4. TABLE Widget

**Use Case**: Tabular view of sensor data atau summary.

**Required Filters**: Node (minimal)

**Templates**:

| Template ID | Name | Description |
|------------|------|-------------|
| `simple-table` | Simple Table | Basic data table |
| `sensor-summary` | Sensor Summary | All channels latest values |
| `node-overview` | Node Overview | All nodes status |
| `alert-log` | Alert Log | Recent alerts |
| `paginated` | Paginated Table | With pagination |

**Generated SQL Pattern**:
```sql
-- Sensor Summary (all channels for a sensor)
SELECT 
  sc.label as channel,
  sc.metric,
  sc.unit,
  scl.value as latest_value,
  scl.timestamp as last_update,
  CASE 
    WHEN scl.value > sc.max_value THEN 'critical'
    WHEN scl.value > sc.warning_value THEN 'warning'
    ELSE 'normal'
  END as status
FROM sensor_channels sc
LEFT JOIN sensor_channel_latest scl ON sc.id = scl.id_sensor_channel
WHERE sc.id_sensor = '${sensorId}'
ORDER BY sc.label
```

**Config Schema**:
```typescript
interface TableConfig {
  // Data
  nodeId?: string;
  sensorId?: string;
  
  // Display
  templateId: string;
  title: string;
  
  // Columns (auto-detected from SQL result)
  columns: Array<{
    field: string;
    label: string;
    visible: boolean;
    width?: number;
    format?: 'text' | 'number' | 'date' | 'status';
  }>;
  
  // Pagination
  pageSize: number;
  showPagination: boolean;
  
  // Features
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
  
  refreshInterval: number;
}
```

---

### 5. MAP Widget

**Use Case**: Geographic visualization of nodes/sensors.

**Required Filters**: Project atau Owner (untuk scope)

**Templates**:

| Template ID | Name | Description |
|------------|------|-------------|
| `marker-map` | Marker Map | Nodes as markers |
| `heatmap` | Heatmap | Value density map |
| `cluster-map` | Cluster Map | Grouped markers |

**Config Schema**:
```typescript
interface MapConfig {
  projectId?: string;
  ownerId?: string;
  
  templateId: string;
  title: string;
  
  // Map Settings
  centerLat: number;
  centerLng: number;
  zoomLevel: number;
  
  // Marker Config
  markerStyle: 'pin' | 'circle' | 'icon';
  showNodeName: boolean;
  showLatestValue: boolean;
  colorByStatus: boolean;
  
  refreshInterval: number;
}
```

---

### 6. ALERT STATUS Widget

**Use Case**: Display current alert/alarm status.

**Required Filters**: Node atau Sensor

**Templates**:

| Template ID | Name | Description |
|------------|------|-------------|
| `alert-list` | Alert List | List of active alerts |
| `status-grid` | Status Grid | Grid of status indicators |
| `alert-count` | Alert Count | Count by severity |

---

### 7. EXPERT MODE (SQL)

**Use Case**: Full SQL control untuk advanced user.

**Required Filters**: None (user controls everything)

**This is the current implementation** - user writes raw SQL.

---

## User Flow

### Flow 1: Create Gauge Widget (Simple)

```
Step 1: Select Widget Type
┌─────────────────────────────────────────────────────────┐
│  What kind of widget do you want to create?             │
│                                                         │
│  [🎯 Gauge]  [📈 Chart]  [📊 Value]  [📋 Table]  [💻 SQL] │
│     ▲                                                   │
│     └── User clicks Gauge                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
Step 2: Select Template
┌─────────────────────────────────────────────────────────┐
│  Choose a gauge style:                                  │
│                                                         │
│  [Speedometer]  [Semicircle]  [Radial]  [Progress]     │
│       ▲                                                 │
│       └── User clicks Speedometer                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
Step 3: Select Data Source (Cascade Filters)
┌─────────────────────────────────────────────────────────┐
│  Select the sensor channel to monitor:                  │
│                                                         │
│  Node:    [▼ ESP-CS-F03 - Gedung A              ]      │
│  Sensor:  [▼ Temperature Sensor                  ]      │
│  Channel: [▼ Temperature (°C)                    ]      │
│                                                         │
│  ───────────────────────────────────────────────        │
│  Auto-detected from channel config:                     │
│  • Min Value: 0                                         │
│  • Max Value: 100                                       │
│  • Unit: °C                                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
Step 4: Configure Thresholds (Optional)
┌─────────────────────────────────────────────────────────┐
│  Set alert thresholds (optional):                       │
│                                                         │
│  Warning Level:  [ 70 ] °C  → Yellow                   │
│  Critical Level: [ 90 ] °C  → Red                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
Step 5: Preview & Save
┌─────────────────────────────────────────────────────────┐
│  Preview:                                               │
│  ┌─────────────────┐                                   │
│  │   ╭───────╮     │  Widget Name: [Temperature Gauge] │
│  │  ╱   ▲    ╲    │                                   │
│  │ │   28.5   │   │  Refresh: [30 seconds ▼]          │
│  │  ╲   °C   ╱    │                                   │
│  │   ╰───────╯     │                                   │
│  └─────────────────┘                                   │
│                                                         │
│  Generated SQL (read-only):                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ SELECT value, timestamp FROM sensor_logs       │   │
│  │ WHERE id_sensor_channel = 'xxx'                │   │
│  │ ORDER BY timestamp DESC LIMIT 1                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [← Back]  [💾 Save Widget] │
└─────────────────────────────────────────────────────────┘
```

### Flow 2: Create Time Series Widget

```
Step 1: Select Widget Type → Chart
Step 2: Select Template → Line Chart
Step 3: Select Data Source
┌─────────────────────────────────────────────────────────┐
│  Select data to visualize:                              │
│                                                         │
│  Node:    [▼ ESP-CS-F03                          ]     │
│  Sensor:  [▼ All Sensors (optional)              ]     │
│                                                         │
│  ───────────────────────────────────────────────        │
│  Select channels to display:              [+ Add More]  │
│                                                         │
│  ☑ Temperature (°C)    Color: [🔵]                     │
│  ☑ Humidity (%)        Color: [🟢]                     │
│  ☐ Pressure (hPa)      Color: [🟡]                     │
│                                                         │
│  ───────────────────────────────────────────────        │
│  Time Range:    [▼ Last 24 Hours      ]                │
│  Aggregation:   [▼ Average per Hour   ]  (optional)    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
Step 4: Preview & Save
```

---

## SQL Generation Engine

### Core Concept

```typescript
class WidgetSqlGenerator {
  
  /**
   * Generate SQL based on widget type, template, and config
   */
  generate(widgetType: string, config: any, dbType: 'postgresql' | 'clickhouse'): string {
    switch (widgetType) {
      case 'gauge':
        return this.generateGaugeSql(config, dbType);
      case 'timeseries':
        return this.generateTimeSeriesSql(config, dbType);
      case 'singlevalue':
        return this.generateSingleValueSql(config, dbType);
      case 'table':
        return this.generateTableSql(config, dbType);
      default:
        throw new Error(`Unknown widget type: ${widgetType}`);
    }
  }
  
  private generateGaugeSql(config: GaugeConfig, dbType: string): string {
    if (dbType === 'clickhouse') {
      return `
SELECT value, timestamp
FROM iot.sensor_channel_latest
WHERE id_sensor_channel = '${config.channelId}'
LIMIT 1`;
    }
    
    // PostgreSQL
    return `
SELECT sl.value, sl.timestamp
FROM sensor_logs sl
WHERE sl.id_sensor_channel = '${config.channelId}'
ORDER BY sl.timestamp DESC
LIMIT 1`;
  }
  
  private generateTimeSeriesSql(config: TimeSeriesConfig, dbType: string): string {
    const channelIds = config.channelIds.map(id => `'${id}'`).join(', ');
    const timeFilter = this.buildTimeFilter(config.timeRange, dbType);
    
    if (config.aggregation && config.aggregation !== 'none') {
      return this.buildAggregatedQuery(config, dbType);
    }
    
    if (dbType === 'clickhouse') {
      return `
SELECT 
  timestamp as time,
  metric,
  value
FROM iot.sensor_telemetry
WHERE id_sensor_channel IN (${channelIds})
  AND ${timeFilter}
ORDER BY timestamp ASC`;
    }
    
    // PostgreSQL
    return `
SELECT 
  sl.timestamp as time,
  sc.label as metric,
  sl.value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id
WHERE sl.id_sensor_channel IN (${channelIds})
  AND ${timeFilter}
ORDER BY sl.timestamp ASC`;
  }
  
  private buildTimeFilter(timeRange: string, dbType: string): string {
    // Use template variables that backend will replace
    return `timestamp BETWEEN '\${fromTime}' AND '\${toTime}'`;
  }
  
  private buildAggregatedQuery(config: TimeSeriesConfig, dbType: string): string {
    const func = config.aggregationFunc || 'avg';
    const interval = this.mapInterval(config.aggregation, dbType);
    
    if (dbType === 'clickhouse') {
      return `
SELECT 
  ${interval} as time,
  metric,
  ${func}(value) as value
FROM iot.sensor_telemetry
WHERE id_sensor_channel IN (${config.channelIds.map(id => `'${id}'`).join(', ')})
  AND timestamp BETWEEN '\${fromTime}' AND '\${toTime}'
GROUP BY time, metric
ORDER BY time ASC`;
    }
    
    // PostgreSQL
    return `
SELECT 
  date_trunc('${config.aggregation}', sl.timestamp) as time,
  sc.label as metric,
  ${func}(sl.value) as value
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id
WHERE sl.id_sensor_channel IN (${config.channelIds.map(id => `'${id}'`).join(', ')})
  AND sl.timestamp BETWEEN '\${fromTime}' AND '\${toTime}'
GROUP BY time, metric
ORDER BY time ASC`;
  }
}
```

---

## Data Model (No Backend Changes!)

Widget entity tetap sama:

```typescript
// Existing Widget Entity - NO CHANGES
interface Widget {
  id: string;
  name: string;
  description?: string;
  
  // Widget type & template (NEW fields, but just stored as-is)
  type: string;           // 'gauge' | 'timeseries' | 'table' | 'expert'
  templateId?: string;    // 'speedometer' | 'line-chart' | etc.
  
  // SQL Query - GENERATED by frontend for template widgets
  sql: string;            // This is what backend executes
  
  // Config - stores all widget configuration
  config: any;            // JSON with all settings
  
  // Existing fields
  idOwner: string;
  idProject?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Point**: 
- `sql` field tetap diisi dengan SQL yang valid
- Frontend generate SQL dari template config
- Backend tidak perlu tahu bahwa SQL itu di-generate dari template

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

- [ ] Create `WidgetSqlGenerator` service
- [ ] Define widget type constants & interfaces
- [ ] Create template registry

### Phase 2: Gauge Widget (Week 1-2)

- [ ] Gauge wizard component (3 steps)
- [ ] 5 gauge templates (speedometer, semicircle, etc.)
- [ ] SQL generation for gauge
- [ ] Gauge renderer component

### Phase 3: Time Series Widget (Week 2-3)

- [ ] Time series wizard component
- [ ] Multi-channel selection
- [ ] Time range & aggregation options
- [ ] 4 chart templates (line, area, bar, multi-line)

### Phase 4: Single Value & Table (Week 3-4)

- [ ] Single value wizard
- [ ] Table wizard
- [ ] Templates for each

### Phase 5: Polish & Integration (Week 4)

- [ ] Unified widget creation flow
- [ ] Edit mode for template widgets
- [ ] Migration of existing widgets (optional)
- [ ] Documentation

---

## File Structure

```
src/app/pages/iot/widget-builder/
├── widget-wizard/
│   ├── widget-wizard.component.ts        # Main wizard (existing)
│   ├── widget-wizard.component.html
│   └── widget-wizard.component.scss
│
├── wizards/                               # NEW: Per-type wizards
│   ├── gauge-wizard/
│   │   ├── gauge-wizard.component.ts
│   │   ├── gauge-wizard.component.html
│   │   ├── gauge-templates.ts             # Template definitions
│   │   └── gauge-sql-generator.ts
│   │
│   ├── timeseries-wizard/
│   │   ├── timeseries-wizard.component.ts
│   │   ├── timeseries-wizard.component.html
│   │   ├── timeseries-templates.ts
│   │   └── timeseries-sql-generator.ts
│   │
│   ├── singlevalue-wizard/
│   │   └── ...
│   │
│   └── table-wizard/
│       └── ...
│
├── templates/                             # NEW: Template renderers
│   ├── gauge/
│   │   ├── speedometer.component.ts
│   │   ├── semicircle.component.ts
│   │   └── ...
│   │
│   └── chart/
│       ├── line-chart.component.ts
│       └── ...
│
├── services/                              # NEW: Shared services
│   ├── widget-sql-generator.service.ts   # SQL generation engine
│   ├── widget-template.service.ts        # Template registry
│   └── widget-data-loader.service.ts     # Data source helpers
│
└── models/
    ├── widget-types.ts                    # Type definitions
    └── widget-templates.ts                # Template constants
```

---

## Summary

| Aspect | Current (Expert Mode) | New (Template Mode) |
|--------|----------------------|---------------------|
| Target User | Developer | All users |
| Input | Write SQL | Select from dropdowns |
| SQL | Written by user | Auto-generated |
| Backend | Execute SQL | Execute SQL (same!) |
| Stored | SQL string | SQL string (same!) |
| Flexibility | Full | Limited but sufficient |
| Error Risk | High (syntax) | Low (validated) |
| Time to Create | 5-10 minutes | < 1 minute |

**The key insight**: Template mode is just a UI layer that generates SQL. 
Backend doesn't need to know or care how the SQL was created!

---

## Next Steps

1. Review & approve this design
2. Start with Gauge Widget (simplest, 1 channel)
3. Build SQL generator service
4. Create gauge wizard UI
5. Test end-to-end
6. Proceed to other widget types

---

*Document Version: 1.0*
*Created: 2026-02-19*
*Author: Development Team*

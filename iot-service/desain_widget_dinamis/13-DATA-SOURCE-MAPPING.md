# 📊 13 - Data Source Mapping

> **Document:** Data Source Mapping & Widget Data Flow  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 13.1 Database Schema Recap

### Entity Relationship (Relevant for Widgets)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   owners    │──1:N─│  projects   │──1:N─│    nodes    │
│             │      │             │      │             │
│ id_owner    │      │ id_project  │      │ id_node     │
│ name        │      │ id_owner    │      │ id_project  │
│ industry    │      │ name        │      │ code        │
└─────────────┘      │ area_type   │      │ dev_eui     │
                     └─────────────┘      │ conn_status │
                                          └──────┬──────┘
                                                 │
                          ┌──────────────────────┴──────────────────────┐
                          │                                             │
                          ▼                                             ▼
                 ┌─────────────────┐                          ┌─────────────────┐
                 │    sensors      │                          │  node_profiles  │
                 │                 │                          │                 │
                 │ id_sensor       │                          │ parser_type     │
                 │ id_node         │                          │ mapping_json    │
                 │ label           │                          └─────────────────┘
                 │ location        │
                 │ status          │
                 └────────┬────────┘
                          │
                          ▼ 1:N
                 ┌─────────────────┐
                 │ sensor_channels │
                 │                 │
                 │ id_sensor_channel│
                 │ id_sensor       │
                 │ id_sensor_type  │───────► sensor_types (category, unit)
                 │ metric_code     │
                 │ unit            │
                 │ min_threshold   │
                 │ max_threshold   │
                 └────────┬────────┘
                          │
                          ▼ 1:N
                 ┌─────────────────┐
                 │  sensor_logs    │  ← Time-series data!
                 │                 │
                 │ id_sensor_log   │
                 │ id_sensor_channel│
                 │ ts              │  ← Timestamp
                 │ value_raw       │
                 │ value_engineered│  ← Calibrated value
                 │ quality_flag    │
                 └─────────────────┘
```

---

## 13.2 Widget Data Source Types

### Type A: Single Channel (Real-time Value)
```
Widget: Gauge, Value Card, Status Indicator
Data: Latest value dari 1 sensor_channel
```

### Type B: Single Channel Time-Series
```
Widget: Line Chart, Area Chart
Data: Historical data dari 1 sensor_channel over time
```

### Type C: Multi-Channel Comparison
```
Widget: Multi-line Chart, Grouped Bar
Data: Multiple sensor_channels pada 1 chart (same or different sensors)
```

### Type D: Aggregation
```
Widget: Pie Chart, Stats Card
Data: Aggregated data (count, avg, sum) dari multiple channels/nodes
```

### Type E: Status Overview
```
Widget: Heatmap, Status Grid
Data: Node/Sensor connectivity status
```

---

## 13.3 Data Source Configuration Schema

### Widget Data Source Interface

```typescript
interface WidgetDataSource {
  // Source Type
  type: 'single-channel' | 'multi-channel' | 'aggregation' | 'node-status';
  
  // Single Channel Config
  channel?: {
    idSensorChannel: string;
    // Denormalized for display
    channelInfo?: {
      metricCode: string;
      unit: string;
      sensorLabel: string;
      nodeCode: string;
      projectName: string;
    };
  };
  
  // Multi-Channel Config
  channels?: Array<{
    idSensorChannel: string;
    alias?: string;         // Display name on chart
    color?: string;         // Line/bar color
    yAxisIndex?: number;    // For dual-axis charts
  }>;
  
  // Aggregation Config
  aggregation?: {
    scope: 'project' | 'owner' | 'node' | 'sensor';
    scopeId: string;
    metric: 'count' | 'avg' | 'sum' | 'min' | 'max';
    groupBy?: 'sensor_type' | 'status' | 'node' | 'hour' | 'day';
    metricCode?: string;    // Filter by specific metric
  };
  
  // Node Status Config  
  nodeStatus?: {
    scope: 'project' | 'owner';
    scopeId: string;
    showOfflineOnly?: boolean;
  };
  
  // Time Range
  timeRange?: {
    type: 'relative' | 'absolute';
    relative?: {
      value: number;
      unit: 'minute' | 'hour' | 'day' | 'week' | 'month';
    };
    absolute?: {
      start: string;  // ISO datetime
      end: string;
    };
  };
  
  // Refresh
  refreshIntervalSec?: number;  // 0 = no auto-refresh
  enableRealtime?: boolean;     // WebSocket subscription
}
```

---

## 13.4 Cascading Filter Flow

### UI Filter Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Widget Configuration                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Select Project                                     │
│  ┌─────────────────────────────────────┐                   │
│  │ Project: [Solar Farm Jakarta    ▼]  │                   │
│  └─────────────────────────────────────┘                   │
│                        │                                    │
│                        ▼                                    │
│  Step 2: Select Node(s)                                    │
│  ┌─────────────────────────────────────┐                   │
│  │ Node: [NODE-001                 ▼]  │                   │
│  │       [NODE-002                 ☐]  │  ← Multi-select   │
│  │       [NODE-003                 ☐]  │    for comparison │
│  └─────────────────────────────────────┘                   │
│                        │                                    │
│                        ▼                                    │
│  Step 3: Select Sensor(s)                                  │
│  ┌─────────────────────────────────────┐                   │
│  │ Sensor: [Temperature Sensor A   ▼]  │                   │
│  └─────────────────────────────────────┘                   │
│                        │                                    │
│                        ▼                                    │
│  Step 4: Select Channel(s)                                 │
│  ┌─────────────────────────────────────┐                   │
│  │ ☑ temperature (°C)                  │                   │
│  │ ☑ humidity (%)                      │  ← Multi for      │
│  │ ☐ pressure (hPa)                    │    dual-axis      │
│  └─────────────────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### API Endpoints for Cascading

```typescript
// 1. Get Projects (filtered by user's owner)
GET /api/projects?idOwner={idOwner}

// 2. Get Nodes by Project
GET /api/nodes?idProject={idProject}

// 3. Get Sensors by Node(s)
GET /api/sensors?idNode={idNode}
GET /api/sensors?idNode[]={idNode1}&idNode[]={idNode2}

// 4. Get Channels by Sensor(s)
GET /api/sensor-channels?idSensor={idSensor}
GET /api/sensor-channels?idSensor[]={idSensor1}&idSensor[]={idSensor2}
```

---

## 13.5 Widget Data Query Examples

### A. Single Gauge Widget

**Config:**
```json
{
  "dataSource": {
    "type": "single-channel",
    "channel": {
      "idSensorChannel": "uuid-channel-temperature-1"
    },
    "enableRealtime": true
  }
}
```

**Query:**
```sql
SELECT 
  sl.value_engineered as value,
  sl.ts as timestamp,
  sc.unit,
  sc.min_threshold,
  sc.max_threshold
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
WHERE sl.id_sensor_channel = $1
ORDER BY sl.ts DESC
LIMIT 1
```

---

### B. Line Chart (Single Channel, Time-Series)

**Config:**
```json
{
  "dataSource": {
    "type": "single-channel",
    "channel": {
      "idSensorChannel": "uuid-channel-temperature-1"
    },
    "timeRange": {
      "type": "relative",
      "relative": { "value": 24, "unit": "hour" }
    }
  }
}
```

**Query:**
```sql
SELECT 
  sl.ts as timestamp,
  sl.value_engineered as value,
  sl.quality_flag
FROM sensor_logs sl
WHERE sl.id_sensor_channel = $1
  AND sl.ts >= NOW() - INTERVAL '24 hours'
ORDER BY sl.ts ASC
```

---

### C. Multi-Line Chart (Comparison)

**Config:**
```json
{
  "dataSource": {
    "type": "multi-channel",
    "channels": [
      { "idSensorChannel": "uuid-temp-1", "alias": "Tank A", "color": "#1890ff" },
      { "idSensorChannel": "uuid-temp-2", "alias": "Tank B", "color": "#52c41a" },
      { "idSensorChannel": "uuid-temp-3", "alias": "Tank C", "color": "#faad14" }
    ],
    "timeRange": {
      "type": "relative",
      "relative": { "value": 6, "unit": "hour" }
    }
  }
}
```

**Query (per channel, parallelized):**
```sql
SELECT 
  sl.ts as timestamp,
  sl.value_engineered as value,
  sl.id_sensor_channel
FROM sensor_logs sl
WHERE sl.id_sensor_channel = ANY($1::uuid[])
  AND sl.ts >= NOW() - INTERVAL '6 hours'
ORDER BY sl.id_sensor_channel, sl.ts ASC
```

---

### D. Dual-Axis Chart (Temperature & Humidity)

**Config:**
```json
{
  "dataSource": {
    "type": "multi-channel",
    "channels": [
      { "idSensorChannel": "uuid-temp-1", "alias": "Temperature", "yAxisIndex": 0 },
      { "idSensorChannel": "uuid-humidity-1", "alias": "Humidity", "yAxisIndex": 1 }
    ]
  }
}
```

**ECharts Option:**
```javascript
{
  xAxis: { type: 'time' },
  yAxis: [
    { type: 'value', name: 'Temperature (°C)', position: 'left' },
    { type: 'value', name: 'Humidity (%)', position: 'right' }
  ],
  series: [
    { name: 'Temperature', type: 'line', yAxisIndex: 0, data: [...] },
    { name: 'Humidity', type: 'line', yAxisIndex: 1, data: [...] }
  ]
}
```

---

### E. Aggregation (Pie Chart - Nodes by Status)

**Config:**
```json
{
  "dataSource": {
    "type": "aggregation",
    "aggregation": {
      "scope": "project",
      "scopeId": "uuid-project-1",
      "metric": "count",
      "groupBy": "status"
    }
  }
}
```

**Query:**
```sql
SELECT 
  n.connectivity_status as status,
  COUNT(*) as count
FROM nodes n
WHERE n.id_project = $1
GROUP BY n.connectivity_status
```

---

### F. Node Status Heatmap

**Config:**
```json
{
  "dataSource": {
    "type": "node-status",
    "nodeStatus": {
      "scope": "owner",
      "scopeId": "uuid-owner-1"
    },
    "enableRealtime": true
  }
}
```

**Query:**
```sql
SELECT 
  n.id_node,
  n.code,
  n.connectivity_status,
  n.last_seen_at,
  p.name as project_name,
  EXTRACT(EPOCH FROM (NOW() - n.last_seen_at)) / 60 as minutes_since_seen
FROM nodes n
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = $1
ORDER BY p.name, n.code
```

---

## 13.6 Data Downsampling Strategy

### For Large Time Ranges

```typescript
interface DownsamplingConfig {
  maxPoints: number;        // Max data points per series (default: 1000)
  method: 'lttb' | 'average' | 'min-max' | 'first';
}
```

**SQL with Time Bucket (PostgreSQL):**
```sql
-- For data > 24 hours, bucket by hour
SELECT 
  time_bucket('1 hour', sl.ts) as bucket,
  AVG(sl.value_engineered) as avg_value,
  MIN(sl.value_engineered) as min_value,
  MAX(sl.value_engineered) as max_value
FROM sensor_logs sl
WHERE sl.id_sensor_channel = $1
  AND sl.ts >= $2 AND sl.ts <= $3
GROUP BY bucket
ORDER BY bucket
```

**TimescaleDB Extension (Recommended for Production):**
```sql
-- If using TimescaleDB
SELECT time_bucket('5 minutes', ts) as bucket,
       avg(value_engineered) as value
FROM sensor_logs
WHERE id_sensor_channel = $1
  AND ts > NOW() - INTERVAL '7 days'
GROUP BY bucket
ORDER BY bucket;
```

---

## 13.7 Real-time Data Subscription

### WebSocket Event Structure

```typescript
// Subscribe to channel updates
interface SubscribeChannelEvent {
  event: 'subscribe:channel';
  data: {
    channels: string[];  // array of id_sensor_channel
  };
}

// Receive real-time update
interface ChannelDataEvent {
  event: 'channel:data';
  data: {
    idSensorChannel: string;
    ts: string;
    valueEngineered: number;
    valueRaw: number;
    qualityFlag: string;
  };
}

// Node status change
interface NodeStatusEvent {
  event: 'node:status';
  data: {
    idNode: string;
    code: string;
    status: 'online' | 'offline' | 'warning';
    lastSeenAt: string;
  };
}
```

---

## 13.8 ECharts Option Templates

### Line Chart with DataZoom

```typescript
const lineChartOption: EChartsCoreOption = {
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' }
  },
  toolbox: {
    feature: {
      dataZoom: { yAxisIndex: 'none' },
      restore: {},
      saveAsImage: {}
    }
  },
  dataZoom: [
    { type: 'inside', start: 0, end: 100 },
    { type: 'slider', start: 0, end: 100 }
  ],
  xAxis: {
    type: 'time',
    boundaryGap: false
  },
  yAxis: {
    type: 'value',
    name: 'Temperature (°C)',
    axisLabel: { formatter: '{value}°C' }
  },
  series: [{
    name: 'Temperature',
    type: 'line',
    smooth: true,
    symbol: 'none',
    areaStyle: { opacity: 0.1 },
    data: [] // [[timestamp, value], ...]
  }]
};
```

### Gauge Chart

```typescript
const gaugeOption: EChartsCoreOption = {
  series: [{
    type: 'gauge',
    startAngle: 200,
    endAngle: -20,
    min: 0,
    max: 100,
    splitNumber: 10,
    itemStyle: {
      color: '#1890ff'
    },
    progress: {
      show: true,
      width: 20
    },
    pointer: {
      show: true
    },
    axisLine: {
      lineStyle: {
        width: 20,
        color: [
          [0.3, '#67e0e3'],
          [0.7, '#37a2da'],
          [1, '#fd666d']
        ]
      }
    },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    detail: {
      valueAnimation: true,
      formatter: '{value}°C',
      fontSize: 24
    },
    data: [{ value: 0 }]
  }]
};
```

---

## Navigation

⬅️ [Previous: Testing Strategy](./12-TESTING-STRATEGY.md) | [Back to Index](./00-INDEX.md) | ➡️ [Next: Chart Library Guide](./14-CHART-LIBRARY-GUIDE.md)

# 🎯 Analisis Kebutuhan Endpoint Backend untuk Angular Frontend

> **Status**: Review & Recommendations
> **Date**: November 12, 2025
> **Backend Version**: NestJS IoT Platform v1.0
> **Frontend**: Angular IoT Dashboard

---

## 📊 Executive Summary

Berdasarkan analisis struktur Angular yang ada, berikut adalah **gap analysis** dan rekomendasi endpoint yang perlu ditambahkan untuk mendukung semua fitur frontend yang sudah diimplementasikan.

### Current Status
- ✅ **14 Backend Modules** (100% CRUD complete)
- ✅ **85+ REST Endpoints**
- 🔄 **Enhanced Endpoints** (In Progress: Sensors, Pending: Nodes, Sensor Channels)
- ⚠️ **Dashboard-Specific Endpoints** (MISSING - Critical for frontend)
- ⚠️ **Real-time Telemetry Endpoints** (MISSING - Critical for widgets)

---

## 🎨 Angular Frontend Structure Analysis

### Existing Pages & Features

```
iot-angular/src/app/pages/iot/
├── dashboard/              ← Main IoT Dashboard (KPI cards, charts, tables)
├── widgets-showcase/       ← Widget library showcase
├── telemetry/             ← Telemetry list & aggregation view
├── alerts/                ← Alert monitoring
├── owners/                ← Owner CRUD (✅ Supported)
├── projects/              ← Project CRUD (✅ Supported)
├── nodes/                 ← Node CRUD + Detail view
│   ├── sensor-chanel-detail/  ← Channel detail page
│   └── nodes-detail/          ← Node detail with sensors
├── iot-config/            ← Configuration management
│   ├── node-models/
│   ├── sensor-types/
│   └── sensor-catalogs/
└── iot-dashboard-example/ ← Dashboard builder example
```

---

## 🚨 CRITICAL GAPS - High Priority

### 1. **Main Dashboard Endpoints** (iot-dashboard.ts)

**Current Frontend Needs:**
- KPI Cards: Nodes Online, Active Alerts, Telemetry Rate, Forwarded Payloads
- Telemetry Overview Chart (24h hourly data)
- Owner Leaderboard (SLA, nodes, telemetry rate, alerts, health)
- Delivery Health Status
- Alert Summary (recent critical/warning/info)
- Node Health Table (status, battery, last seen)
- Activity Log (recent events)

**Missing Backend Endpoints:**

```typescript
// ❌ MISSING - Dashboard Overview
GET /api/dashboard/overview
Query: ?ownerId=uuid&projectId=uuid&timeRange=24h|7d|30d
Response: {
  kpis: {
    nodesOnline: { value: 168, delta: "+3", trend: "up", percentage: 91 },
    activeAlerts: { value: 7, critical: 3, warning: 4 },
    telemetryRate: { value: 12400, unit: "per_minute", trend: "up" },
    forwardedPayloads: { value: 4900, webhooks: 2800, databases: 1400 }
  },
  timeSeriesData: {
    telemetry: [{timestamp, flowChannels, pressureChannels, ...}],
    alerts: [{timestamp, count, critical, warning}]
  }
}

// ❌ MISSING - Owner Leaderboard
GET /api/dashboard/owner-leaderboard
Query: ?limit=10&sortBy=telemetryRate|alerts|nodes
Response: [{
  ownerId, ownerName, slaType,
  nodesCount, telemetryRate, alertsCount,
  healthStatus: "healthy"|"attention"|"risk",
  uptimePercentage, lastActivity
}]

// ❌ MISSING - Node Health Summary
GET /api/dashboard/node-health
Query: ?projectId=uuid&status=online|offline|degraded
Response: [{
  nodeId, nodeCode, projectName,
  status, lastSeen, batteryLevel,
  sensorCount, activeAlertsCount
}]

// ❌ MISSING - Activity Feed
GET /api/dashboard/activity-feed
Query: ?limit=20&types=alert,node,webhook,sync
Response: [{
  type: "alert"|"node"|"webhook"|"sync"|"owner",
  title, description, timestamp,
  entityId, severity, metadata
}]

// ❌ MISSING - Delivery Health
GET /api/dashboard/delivery-health
Response: [{
  targetId, targetName, targetType: "webhook"|"mysql"|"postgresql",
  status: "healthy"|"degraded"|"failed",
  successRate, lastSync, enabled,
  errorCount, avgLatency
}]
```

**Recommendation**:
- Create new module: `src/modules/dashboard/`
- Service aggregates data from multiple modules
- Cache strategy for performance (Redis recommended)

---

### 2. **Real-Time Telemetry Endpoints** (telemetry-list.ts + widgets)

**Current Frontend Needs:**
- Telemetry list with aggregation (5m, 15m, 1h)
- Min/Max/Avg statistics per channel
- Real-time data for widgets (gauge, big-number, info-card)
- Filter by owner, project, node, sensor
- Time-series data for charts

**Missing Backend Endpoints:**

```typescript
// ❌ MISSING - Telemetry Aggregated Query
GET /api/telemetry/aggregated
Query: ?
  aggregation=5m|15m|1h|6h|1d
  &startTime=ISO8601
  &endTime=ISO8601
  &channelIds[]=uuid
  &nodeIds[]=uuid
  &projectId=uuid
  &ownerId=uuid
Response: [{
  idSensorChannel, channelCode, sensorName, nodeName,
  unit, aggregation,
  statistics: { min, max, avg, count, stdDev },
  dataPoints: [{timestamp, value}]
}]

// ❌ MISSING - Latest Values for Widgets
GET /api/telemetry/latest
Query: ?channelIds[]=uuid&nodeIds[]=uuid
Response: [{
  idSensorChannel, channelCode,
  value, unit, timestamp,
  status: "normal"|"warning"|"critical",
  trend: { direction: "up"|"down"|"stable", percentage }
}]

// ❌ MISSING - Time-Series Data
GET /api/sensor-channels/:id/timeseries
Query: ?startTime=ISO8601&endTime=ISO8601&aggregation=raw|5m|1h
Response: {
  channel: { id, code, unit, sensorName, nodeName },
  dataPoints: [{timestamp, value, quality}],
  statistics: { min, max, avg, count },
  gaps: [{start, end, reason}]
}

// ❌ MISSING - Multi-Channel Comparison
GET /api/telemetry/compare
Query: ?channelIds[]=uuid&startTime=ISO8601&endTime=ISO8601
Response: {
  channels: [{id, code, unit, color}],
  alignedData: [{timestamp, channel1Value, channel2Value, ...}]
}
```

**Recommendation**:
- Create new module: `src/modules/telemetry/`
- Direct integration with TimescaleDB for efficient time-series queries
- Implement caching for latest values (Redis/in-memory)
- Use continuous aggregates for pre-computed statistics

---

### 3. **Widget Data Endpoints** (widgets-showcase.ts)

**Current Frontend Needs:**
- Widget configuration per sensor channel
- Real-time data binding
- Historical data for trends
- Threshold status (normal/warning/critical)
- Statistics (min/max for range indicators)

**Missing Backend Endpoints:**

```typescript
// ❌ MISSING - Widget Data by Dashboard
GET /api/dashboard-widgets/:dashboardId/data
Response: [{
  widgetId, widgetType, position,
  channelId, channelCode, sensorName,
  currentValue, unit, timestamp,
  status, trend,
  config: { min, max, thresholds, refreshRate }
}]

// ❌ MISSING - Widget Historical Data
GET /api/dashboard-widgets/:widgetId/history
Query: ?duration=1h|6h|24h|7d
Response: {
  widget: { id, type, channelCode },
  dataPoints: [{timestamp, value}],
  statistics: { min, max, avg },
  annotations: [{timestamp, type, text}] // For alerts
}

// ❌ MISSING - Widget Configuration Presets
GET /api/sensor-channels/:id/widget-config
Response: {
  recommendedWidgetType: "gauge"|"big-number"|"chart",
  defaultConfig: {
    min, max, unit, color,
    thresholds: [{value, color, severity}]
  },
  historicalRange: { min, max, avg }
}
```

**Recommendation**:
- Extend `DashboardWidgetsService` with data fetching methods
- Create aggregation endpoints in `SensorChannelsModule`
- Implement WebSocket for real-time updates (optional but recommended)

---

### 4. **Node Detail Enhancements** (nodes-detail.ts)

**Current Frontend Needs:**
- Node detail with all sensors
- Sensor channel list per node
- Real-time sensor status
- Battery level, connectivity status
- Add sensor/channel drawer support

**Partially Supported, Needs Enhancement:**

```typescript
// ✅ EXISTS (basic): GET /api/nodes/:id/detailed
// 🔄 BEING ADDED: GET /api/nodes/statistics/overview
// 🔄 BEING ADDED: GET /api/nodes/:id/dashboard
// ✅ EXISTS: PATCH /api/nodes/:id/connectivity

// ❌ MISSING - Node's Sensors with Real-time Data
GET /api/nodes/:id/sensors/live
Response: [{
  sensorId, sensorCode, catalogName,
  installDate, status,
  channels: [{
    channelId, metricCode, unit,
    currentValue, timestamp,
    status: "normal"|"warning"|"critical",
    alertsActive: number
  }],
  calibrationStatus: { isCalibrated, daysUntilDue, isOverdue },
  health: "healthy"|"warning"|"critical"
}]

// ❌ MISSING - Node Timeline/History
GET /api/nodes/:id/timeline
Query: ?limit=50&types=connectivity,sensor,alert,calibration
Response: [{
  timestamp, type, title, description,
  severity, metadata, userId
}]

// ❌ MISSING - Node Performance Metrics
GET /api/nodes/:id/metrics
Query: ?period=24h|7d|30d
Response: {
  uptime: { percentage, totalHours, onlineHours },
  telemetryStats: { totalReadings, avgRate, gaps: [{start, end}] },
  alertStats: { total, critical, warning, resolved },
  batteryTrend: [{timestamp, level}],
  sensorHealth: { total, healthy, degraded, failed }
}
```

**Recommendation**:
- Enhance existing `NodesService` with these methods
- Create timeline tracking table for audit logs
- Add battery level history tracking

---

### 5. **Sensor Channel Detail** (sensor-chanel-detail.ts)

**Current Frontend Needs:**
- Channel detail with configuration
- Modbus register mapping
- Threshold configuration
- Real-time value chart
- Alert rules for this channel
- Calibration history

**Missing Backend Endpoints:**

```typescript
// ✅ EXISTS: GET /api/sensor-channels/:id/detailed
// 🔄 NEEDED: GET /api/sensor-channels/:id/timeseries (same as telemetry)

// ❌ MISSING - Channel Configuration Details
GET /api/sensor-channels/:id/configuration
Response: {
  channel: { id, metricCode, unit, multiplier, offset },
  modbusMapping: { registerAddress, dataType, byteOrder },
  thresholds: {
    min: { value, alertSeverity, actions },
    max: { value, alertSeverity, actions }
  },
  sensorType: { category, icon, description },
  calibration: {
    lastDate, nextDue, factor, offset,
    history: [{date, performedBy, notes}]
  }
}

// ❌ MISSING - Channel Alert Rules
GET /api/sensor-channels/:id/alert-rules
Response: [{
  ruleId, ruleName, condition,
  severity, enabled, triggerCount,
  lastTriggered, actions
}]

// ❌ MISSING - Channel Statistics
GET /api/sensor-channels/:id/statistics
Query: ?period=24h|7d|30d
Response: {
  period, dataQuality: { percentage, gaps, errors },
  distribution: { histogram: [{range, count}] },
  bounds: { min, max, avg, stdDev, percentiles: [p25, p50, p75, p95] },
  trends: { slope, direction, volatility },
  anomalies: [{timestamp, value, reason}]
}
```

**Recommendation**:
- Enhance `SensorChannelsService` with detailed configuration
- Create calibration history table
- Add statistics calculation methods

---

## 📈 Medium Priority Enhancements

### 6. **Alert Management**

```typescript
// ✅ EXISTS: CRUD for alert-rules and alert-events
// ✅ EXISTS: PATCH /alert-events/:id/acknowledge
// ✅ EXISTS: PATCH /alert-events/:id/clear

// ❌ MISSING - Alert Dashboard
GET /api/alerts/dashboard
Query: ?ownerId=uuid&projectId=uuid&severity=critical|warning
Response: {
  summary: { total, open, acknowledged, cleared },
  bySeverity: [{severity, count}],
  byChannel: [{channelId, channelCode, alertCount}],
  recent: [{alertId, channel, severity, message, timestamp}],
  trends: [{timestamp, count}]
}

// ❌ MISSING - Alert History with Analytics
GET /api/alert-events/analytics
Query: ?startTime=ISO8601&endTime=ISO8601&groupBy=channel|severity|hour
Response: {
  groups: [{key, count, avgDuration, resolution: {manual, auto}}],
  topChannels: [{channelId, alertCount, criticalCount}],
  responseTime: { avgMinutes, p50, p95 }
}
```

---

### 7. **Project Management Enhancements**

```typescript
// ✅ EXISTS: GET /api/projects/:id/detailed

// ❌ MISSING - Project Dashboard
GET /api/projects/:id/dashboard
Response: {
  project: { id, name, status, owner },
  nodes: { total, online, offline, degraded },
  sensors: { total, active, needingCalibration },
  telemetry: { rate, totalToday, avgValue },
  alerts: { active, critical, warning },
  locations: [{locationId, name, nodeCount, coordinates}],
  recentActivity: [{timestamp, type, description}]
}

// ❌ MISSING - Project Map Data
GET /api/projects/:id/map
Response: {
  geofence: { type: "Polygon", coordinates },
  locations: [{
    id, name, coordinates,
    nodes: [{id, code, status, sensorCount}]
  }],
  alertMarkers: [{coordinates, severity, nodeCode}]
}
```

---

### 8. **Configuration Module Support**

```typescript
// ✅ EXISTS: CRUD for node-models, sensor-types, sensor-catalogs

// ❌ MISSING - Configuration Dashboard
GET /api/iot-config/overview
Response: {
  nodeModels: { total, inUse, available },
  sensorTypes: { total, categories: [{category, count}] },
  sensorCatalogs: { total, vendors: [{vendor, count}] },
  usage: {
    topModels: [{modelId, name, usageCount}],
    topCatalogs: [{catalogId, name, usageCount}]
  }
}

// ❌ MISSING - Compatibility Check
POST /api/iot-config/compatibility-check
Body: { nodeModelId, sensorCatalogIds[] }
Response: {
  compatible: boolean,
  issues: [{sensorId, reason}],
  warnings: [{sensorId, message}]
}
```

---

## 🔧 Technical Recommendations

### 1. **New Modules to Create**

```
src/modules/
├── dashboard/          ← NEW - Main dashboard aggregations
├── telemetry/          ← NEW - Time-series data & aggregations
├── analytics/          ← NEW - Statistics & reporting
└── timeline/           ← NEW - Activity feed & audit logs
```

### 2. **Database Considerations**

**TimescaleDB Queries Needed:**
```sql
-- Continuous aggregates for telemetry
CREATE MATERIALIZED VIEW telemetry_5min AS
SELECT
  time_bucket('5 minutes', timestamp) AS bucket,
  id_sensor_channel,
  MIN(value) as min_value,
  MAX(value) as max_value,
  AVG(value) as avg_value,
  COUNT(*) as data_points
FROM sensor_logs
GROUP BY bucket, id_sensor_channel
WITH DATA;

-- Refresh policy
SELECT add_continuous_aggregate_policy('telemetry_5min',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '5 minutes');
```

### 3. **Caching Strategy**

```typescript
// Redis Cache Keys
dashboard:overview:{ownerId}:{projectId}:{timeRange}  // TTL: 30s
telemetry:latest:{channelId}                          // TTL: 5s
nodes:status:{nodeId}                                 // TTL: 10s
widgets:data:{widgetId}                               // TTL: based on refreshRate
```

### 4. **WebSocket Events** (Optional but Recommended)

```typescript
// Real-time updates for frontend
Socket.IO Events:
- telemetry:update          → Widget updates
- node:status:change        → Node online/offline
- alert:new                 → New alert
- alert:acknowledged        → Alert status change
- dashboard:refresh         → Force dashboard refresh
```

### 5. **Performance Optimization**

- **Pagination**: All list endpoints must support `page` & `limit`
- **Field Selection**: Add `?fields=id,name,status` for minimal responses
- **Caching**: Implement Redis for frequently accessed data
- **Indexes**: Ensure proper database indexes on:
  - `sensor_logs(id_sensor_channel, timestamp)`
  - `nodes(status, updated_at)`
  - `alert_events(severity, status, created_at)`

---

## 📋 Implementation Priority Matrix

| Priority | Module | Endpoint Group | Estimated Effort | Impact |
|----------|--------|----------------|------------------|--------|
| 🔴 P0 | Dashboard | Overview + KPIs | 3-4 hours | Critical - Main dashboard |
| 🔴 P0 | Telemetry | Aggregated queries | 4-5 hours | Critical - All widgets |
| 🟡 P1 | Nodes | Live sensors + metrics | 2-3 hours | High - Detail pages |
| 🟡 P1 | Sensor Channels | Statistics + timeseries | 2-3 hours | High - Channel detail |
| 🟡 P1 | Widgets | Data fetching | 1-2 hours | High - Widget rendering |
| 🟢 P2 | Alerts | Dashboard + analytics | 2-3 hours | Medium - Alert page |
| 🟢 P2 | Projects | Dashboard + map | 2-3 hours | Medium - Project detail |
| 🔵 P3 | Config | Overview + compatibility | 1-2 hours | Low - Nice to have |
| 🔵 P3 | Timeline | Activity feed | 2-3 hours | Low - Can use mocks |

**Total Estimated Effort**: 19-27 hours (2.5-3.5 days)

---

## 🎯 Recommended Next Steps

### Phase 1: Critical Dashboard Support (Day 1)
1. ✅ Complete Sensors module enhancement (already in progress)
2. ⚠️ Complete Nodes module enhancement
3. ⚠️ Complete Sensor Channels module enhancement
4. 🆕 Create `DashboardModule` with overview endpoints
5. 🆕 Create `TelemetryModule` with aggregation endpoints

### Phase 2: Detail Pages Support (Day 2)
1. Add node live sensors endpoint
2. Add sensor channel statistics
3. Add widget data fetching
4. Implement latest values cache

### Phase 3: Analytics & Optimization (Day 3)
1. Add alert analytics
2. Add project dashboard
3. Implement WebSocket (optional)
4. Add Redis caching
5. Performance testing

### Phase 4: Polish & Documentation
1. API documentation update
2. Frontend integration testing
3. Performance benchmarks
4. Deployment guide

---

## 💡 Additional Recommendations

### A. Mock Data Strategy (Short-term)
Jika ada deadline ketat, frontend bisa menggunakan mock data dulu untuk development, kemudian backend menyusul dengan endpoint yang real. Sudah ada struktur mock yang bagus di Angular.

### B. Incremental Migration
Tidak perlu semua endpoint selesai sekaligus. Prioritaskan berdasarkan:
1. Main dashboard page (user pertama kali masuk)
2. Widget showcase (proof of concept)
3. Node detail (most used feature)
4. Configuration pages (admin only)

### C. API Versioning
Consider adding `/api/v1/` prefix untuk semua endpoint baru, untuk memudahkan future changes tanpa breaking existing integrations.

### D. Error Handling
Pastikan semua endpoint return consistent error format:
```typescript
{
  statusCode: 400,
  message: "Invalid time range",
  error: "Bad Request",
  details: { field: "timeRange", constraint: "must be 24h|7d|30d" }
}
```

---

## 📞 Questions for Discussion

1. **Time-series Data**: Apakah `sensor_logs` table sudah ada data? Atau perlu ingestion service dulu?
2. **Real-time Updates**: Apakah perlu WebSocket atau polling cukup?
3. **Caching**: Apakah sudah ada Redis setup atau perlu disiapkan?
4. **Authentication**: Apakah sudah ada JWT/Auth guard? (Belum terlihat di code)
5. **Deployment**: Apakah backend akan di-deploy terpisah atau monolith dengan Angular?

---

## ✅ Conclusion

**Status Sekarang**: Backend sudah **75% ready** untuk Angular
**Yang Perlu Ditambahkan**: Dashboard aggregations + Telemetry endpoints (critical)
**Estimated Time**: 2-3 hari development + 1 hari testing

**Recommendation**: **Mulai dengan Phase 1 (Dashboard + Telemetry)** karena ini foundation untuk semua views di Angular. Setelah ini selesai, frontend sudah bisa mulai integration testing dengan real data.

Mau saya lanjutkan langsung implement Phase 1? 🚀

# 📊 IoT Dashboard - Widget Mapping & Backend Requirements

> **Status:** ✅ IMPLEMENTATION COMPLETE  
> **Date Created:** November 15, 2025  
> **Last Updated:** November 15, 2025  
> **Version:** 1.0.0

## 🎯 Overview

This document maps all widgets in the IoT Dashboard to their required backend endpoints. Each widget has been converted to a separate component that fetches data independently via SDK.

**Dashboard URL:** `/iot/dashboard`  
**Main Component:** `IotDashboardPage`  
**Feature Module:** `IotDashboardModule`

### Implementation Status

- ✅ **Backend:** 8 endpoints implemented with complete DTOs
- ✅ **Frontend:** 8 widget components created and integrated
- ✅ **SDK:** Auto-generated from Swagger (105 models, 17 services)
- ✅ **Compilation:** Backend & frontend compile with 0 errors
- ✅ **Deployment:** Dev servers running successfully

**For complete implementation details, see:** [DASHBOARD-IMPLEMENTATION-COMPLETE.md](./docs/DASHBOARD-IMPLEMENTATION-COMPLETE.md)

---

## 🧩 Widget Breakdown

### 1. **Control Filters** (Top Bar)
**Component:** Already exists in main template (not separated)  
**Type:** Filter controls  
**Backend Endpoints Needed:**
- ✅ **GET `/api/owners`** - List all owners (already exists)
- ✅ **GET `/api/projects`** - List all projects (already exists)

**Current State:** Hardcoded dropdown options
```typescript
ownerFilterOptions = [
  { label: 'All Owners', value: 'all' },
  { label: 'PT Adhi Tirta Utama', value: 'adhi' },
  { label: 'PT Garuda Energi', value: 'garuda' },
  { label: 'Pemda Kota Mataram', value: 'mataram' }
];
```

**Required Response:**
```typescript
// GET /api/owners (simple list)
[
  { idOwner: 'uuid-1', name: 'PT Adhi Tirta Utama' },
  { idOwner: 'uuid-2', name: 'PT Garuda Energi' },
  ...
]
```

**Action:** Use existing SDK methods
- `ownersService.ownersControllerFindAll()`
- `projectsService.projectsControllerFindAll()`

---

### 2. **KPI Cards (4 Metrics)** - Row 1
**Component to Create:** `DashboardKpiCardsComponent`  
**Type:** Statistics cards with sparkline charts  
**Location:** Top section, 4 cards in a row

**Cards:**
1. **Nodes Online** - Total active nodes
2. **Active Alerts** - Current alerts count
3. **Telemetry/min** - Ingestion rate
4. **Forwarded Payloads** - Webhook/DB forwarding success

**Backend Endpoint Needed:**
- 🔴 **NEW: GET `/api/dashboard/kpi-stats`**

**Query Parameters:**
```typescript
{
  ownerId?: string;    // Filter by owner
  projectId?: string;  // Filter by project
  timeRange?: '24h' | '7d' | '30d';  // Time window
}
```

**Required Response:**
```typescript
{
  nodesOnline: {
    current: 168,           // Current value
    delta: '+3',            // Change vs previous period
    trend: 'up' | 'down' | 'flat',
    percentage: 91,         // Healthy percentage
    sparkline: [110, 115, 120, ...],  // 12 data points
    info: {
      healthyPercentage: 91,
      newDeployments: 6
    }
  },
  activeAlerts: {
    current: 7,
    criticalCount: 3,
    warningCount: 4,
    sparkline: [2, 5, 8, 7, ...],
    trend: 'down'
  },
  telemetryRate: {
    current: 12400,         // per minute
    delta: '+1400',
    trend: 'up',
    sparkline: [8000, 9000, 10500, ...],
    info: {
      loraGrowth: 8,        // percentage
      coverage: 'stable'
    }
  },
  forwardedPayloads: {
    current: 4900,
    webhookSuccess: 99.1,   // percentage
    dbBatchSuccess: 92.4,   // percentage
    distribution: {
      webhook: 45,          // percentage
      mysql: 32,
      postgresql: 23
    }
  }
}
```

**Implementation:**
```typescript
@Component({
  selector: 'dashboard-kpi-cards',
  template: '...'
})
export class DashboardKpiCardsComponent {
  @Input() filters: { ownerId?, projectId?, timeRange? };
  
  constructor(private dashboardService: DashboardService) {}
  
  ngOnInit() {
    this.loadKpiStats();
  }
  
  loadKpiStats() {
    this.dashboardService.dashboardControllerGetKpiStats({
      ownerId: this.filters.ownerId,
      projectId: this.filters.projectId,
      timeRange: this.filters.timeRange
    }).subscribe(data => {
      // Transform to chart format
    });
  }
}
```

---

### 3. **Node Health Snapshot** - Row 2 Left
**Component to Create:** `DashboardNodeHealthComponent`  
**Type:** Data table  
**Display:** Top 4-5 nodes with issues

**Current Data:**
```typescript
nodeHealthTable = [
  { code: 'NODE-001', project: 'Area A', status: 'online', lastSeen: '09:12 UTC', battery: 78 },
  { code: 'NODE-014', project: 'Area A', status: 'degraded', lastSeen: '08:59 UTC', battery: 34 },
  ...
];
```

**Backend Endpoint Needed:**
- 🔴 **NEW: GET `/api/dashboard/node-health`**

**Query Parameters:**
```typescript
{
  ownerId?: string;
  projectId?: string;
  limit?: number;        // Default: 5 (top impacted)
  sortBy?: 'lastSeen' | 'battery' | 'status';
}
```

**Required Response:**
```typescript
{
  nodes: [
    {
      idNode: 'uuid',
      code: 'NODE-001',
      projectName: 'Area A Distribution',
      projectId: 'uuid',
      status: 'online' | 'offline' | 'degraded',
      lastSeen: '2025-11-15T09:12:00Z',
      lastSeenFormatted: '09:12 UTC',
      battery: 78,           // percentage
      signalStrength: -65,   // dBm (optional)
      alertCount: 0
    },
    ...
  ],
  summary: {
    totalNodes: 168,
    onlineCount: 153,
    degradedCount: 12,
    offlineCount: 3
  }
}
```

**Data Source:** 
- Aggregate from `nodes` table
- Join with `projects` table
- Filter by status, battery, lastSeen
- Order by priority (offline > degraded > low battery)

---

### 4. **Owner Leaderboard** - Row 2 Right
**Component to Create:** `DashboardOwnerLeaderboardComponent`  
**Type:** Data table  
**Display:** Top owners by telemetry throughput

**Current Data:**
```typescript
ownerLeaderboard = [
  { owner: 'PT Adhi Tirta Utama', sla: 'Gold', nodes: 124, telemetryRate: '12.4K/min', alerts: 3 },
  { owner: 'PT Garuda Energi', sla: 'Silver', nodes: 68, telemetryRate: '4.1K/min', alerts: 5 },
  ...
];
```

**Backend Endpoint Needed:**
- 🔴 **NEW: GET `/api/dashboard/owner-leaderboard`**

**Query Parameters:**
```typescript
{
  timeRange?: '24h' | '7d' | '30d';
  limit?: number;        // Default: 10
  sortBy?: 'telemetry' | 'nodes' | 'alerts';
}
```

**Required Response:**
```typescript
{
  owners: [
    {
      idOwner: 'uuid',
      name: 'PT Adhi Tirta Utama',
      slaLevel: 'Gold',
      nodeCount: 124,
      activeSensorCount: 496,
      telemetryRate: {
        perMinute: 12400,
        formatted: '12.4K/min'
      },
      alertCount: 3,
      criticalAlerts: 1,
      health: 'healthy' | 'attention' | 'risk'
    },
    ...
  ]
}
```

**Data Source:**
- Aggregate from `owners` table
- Count nodes, sensors per owner
- Calculate telemetry rate from `sensor_logs` (last 24h)
- Count alerts from `sensor_alerts` (active)

---

### 5. **Activity Log** - Row 3 Left
**Component to Create:** `DashboardActivityLogComponent`  
**Type:** Timeline/List  
**Display:** Recent system events (last 15 minutes)

**Current Data:**
```typescript
activityLog = [
  { title: 'Forwarding test webhook executed', time: '2 mins ago', badge: 'WEBHOOK', highlight: true },
  { title: 'Node NODE-014 entered degraded state', time: '5 mins ago', badge: 'ALERT', highlight: false },
  ...
];
```

**Backend Endpoint Needed:**
- 🔴 **NEW: GET `/api/dashboard/activity-log`**

**Query Parameters:**
```typescript
{
  ownerId?: string;
  projectId?: string;
  limit?: number;        // Default: 10
  types?: string[];      // Filter by event types
}
```

**Required Response:**
```typescript
{
  activities: [
    {
      id: 'uuid',
      type: 'webhook' | 'alert' | 'sync' | 'node_status' | 'owner_update' | 'sensor_added',
      title: 'Forwarding test webhook executed',
      description: 'Target: Command Center Webhook',
      timestamp: '2025-11-15T09:12:00Z',
      timeAgo: '2 mins ago',
      badge: 'WEBHOOK',
      severity: 'info' | 'warning' | 'success',
      highlight: true,
      relatedEntity: {
        type: 'owner' | 'project' | 'node' | 'sensor',
        id: 'uuid',
        name: 'PT Adhi Tirta Utama'
      }
    },
    ...
  ]
}
```

**Data Source:**
- Create new `activity_logs` table (system-wide events)
- OR aggregate from:
  - `sensor_alerts` (alert events)
  - `nodes` (status changes via updatedAt)
  - `owner_forwarding_webhook_logs` (webhook events)
  - `owner_forwarding_database_logs` (DB sync events)

---

### 6. **Next Release Window** - Row 3 Right
**Component to Create:** `DashboardReleaseWindowComponent`  
**Type:** Static card (configuration-based)  
**Display:** Upcoming maintenance/deployment

**Current Data:**
```html
<div class="display-6 text-white">09:00 — 11:00 WIB</div>
<div class="panel-hint">Firmware batch v2.3.2 · 24 devices</div>
```

**Backend Endpoint Needed:**
- 🔴 **NEW: GET `/api/dashboard/release-schedule`**

**No query parameters**

**Required Response:**
```typescript
{
  nextRelease: {
    startTime: '2025-11-15T09:00:00Z',
    endTime: '2025-11-15T11:00:00Z',
    timezone: 'Asia/Jakarta',
    formattedWindow: '09:00 — 11:00 WIB',
    version: 'v2.3.2',
    type: 'firmware' | 'backend' | 'maintenance',
    affectedDevices: 24,
    description: 'Firmware batch update',
    status: 'scheduled' | 'in_progress' | 'completed'
  },
  upcomingReleases: [...]  // Optional: next 3 releases
}
```

**Data Source:**
- Create new `release_schedules` table
- Admin can configure maintenance windows
- OR return mock/static data for now

---

### 7. **Telemetry Streams** - Row 4 Left (Large Chart)
**Component to Create:** `DashboardTelemetryStreamsComponent`  
**Type:** Area chart + 2 mini radial charts  
**Display:** Real-time telemetry flow

**Current Data:**
```typescript
telemetryOverview = {
  chart: {
    series: [
      { name: 'Flow Channels', data: [90, 95, 100, ...] },
      { name: 'Pressure Channels', data: [40, 45, 50, ...] }
    ]
  },
  stats: [
    {
      name: 'Ingestion Success',
      total: '99.4%',
      progress: '85%',
      info: [
        { title: 'Packets', value: '12.4K/min' },
        { title: 'Dropped', value: '72' }
      ]
    },
    ...
  ]
};
```

**Backend Endpoint Needed:**
- 🔴 **NEW: GET `/api/dashboard/telemetry-streams`**

**Query Parameters:**
```typescript
{
  ownerId?: string;
  projectId?: string;
  timeRange?: '24h' | '7d' | '30d';
  interval?: '1h' | '5m' | '15m';  // Data point interval
}
```

**Required Response:**
```typescript
{
  chart: {
    labels: ['00:00', '01:00', '02:00', ...],  // 24 hours
    series: [
      {
        name: 'Flow Channels',
        data: [90, 95, 100, 105, ...]  // Count per hour
      },
      {
        name: 'Pressure Channels',
        data: [40, 45, 50, 55, ...]
      }
    ]
  },
  stats: {
    ingestion: {
      successRate: 99.4,     // percentage
      totalPackets: 12400,   // per minute
      droppedPackets: 72,
      avgLatency: 420        // milliseconds
    },
    forwarding: {
      totalForwarded: 4200,
      webhookCount: 2800,
      dbBatchCount: 1400,
      webhookSuccessRate: 99.2,
      dbSuccessRate: 92.7
    }
  }
}
```

**Data Source:**
- Aggregate from `sensor_logs` table
- Group by hour/interval
- Filter by sensor_channel.type (Flow vs Pressure)
- Calculate success rate from logs
- Join with `owner_forwarding_webhook_logs` and `owner_forwarding_database_logs`

---

### 8. **Data Delivery Health** - Row 4 Right Top
**Component to Create:** `DashboardDeliveryHealthComponent`  
**Type:** Status list  
**Display:** Webhook & Database forwarding status

**Current Data:**
```typescript
deliveryHealth = [
  { 
    target: 'Command Center Webhook', 
    type: 'Webhook', 
    status: 'healthy', 
    successRate: '99.2%', 
    lastSync: '09:12 UTC',
    enabled: true
  },
  ...
];
```

**Backend Endpoint Needed:**
- 🔴 **NEW: GET `/api/dashboard/delivery-health`**

**Query Parameters:**
```typescript
{
  ownerId?: string;
  timeRange?: '24h' | '7d' | '30d';
}
```

**Required Response:**
```typescript
{
  webhooks: [
    {
      idWebhook: 'uuid',
      ownerName: 'PT Adhi Tirta Utama',
      label: 'Command Center Webhook',
      url: 'https://api.example.com/webhook',
      status: 'healthy' | 'degraded' | 'failed',
      successRate: 99.2,     // percentage (last 24h)
      totalAttempts: 1250,
      successfulAttempts: 1240,
      failedAttempts: 10,
      lastSync: '2025-11-15T09:12:00Z',
      lastSyncFormatted: '09:12 UTC',
      enabled: true,
      avgResponseTime: 320   // milliseconds
    },
    ...
  ],
  databases: [
    {
      idDatabase: 'uuid',
      ownerName: 'PT Garuda Energi',
      label: 'MySQL - Utility Data Lake',
      dbType: 'mysql',
      host: 'db.example.com',
      status: 'degraded',
      successRate: 92.7,
      lastSync: '2025-11-15T09:05:00Z',
      enabled: true
    },
    ...
  ]
}
```

**Data Source:**
- Query `owner_forwarding_webhooks` table
- Query `owner_forwarding_databases` table
- Aggregate logs from `owner_forwarding_webhook_logs`
- Aggregate logs from `owner_forwarding_database_logs` (if exists)
- Calculate success rate: (successful / total) * 100

---

### 9. **Alert Stream** - Row 4 Right Bottom
**Component to Create:** `DashboardAlertStreamComponent`  
**Type:** Alert list  
**Display:** Latest critical/warning alerts

**Current Data:**
```typescript
alertSummary = [
  { 
    channel: 'SNS-20-FLOW', 
    severity: 'critical', 
    message: 'Flow drop >30% vs baseline', 
    ts: '09:05 UTC' 
  },
  ...
];
```

**Backend Endpoint Needed:**
- ✅ **Use existing: GET `/api/sensor-alerts`** (with filters)
- OR 🔴 **NEW: GET `/api/dashboard/alert-stream`** (optimized for dashboard)

**Query Parameters:**
```typescript
{
  ownerId?: string;
  projectId?: string;
  severity?: 'critical' | 'warning' | 'info';
  limit?: number;        // Default: 5 (latest)
  status?: 'active' | 'acknowledged' | 'resolved';
}
```

**Required Response:**
```typescript
{
  alerts: [
    {
      idAlert: 'uuid',
      sensorCode: 'SNS-20-FLOW',
      channelName: 'Flow Rate',
      severity: 'critical' | 'warning' | 'info',
      message: 'Flow drop >30% vs baseline',
      value: 45.2,
      threshold: 65.0,
      unit: 'L/min',
      triggeredAt: '2025-11-15T09:05:00Z',
      triggeredAtFormatted: '09:05 UTC',
      status: 'active',
      projectName: 'Area A Distribution',
      ownerName: 'PT Adhi Tirta Utama'
    },
    ...
  ],
  summary: {
    totalActive: 7,
    criticalCount: 3,
    warningCount: 4,
    infoCount: 0
  }
}
```

**Data Source:**
- Query `sensor_alerts` table
- Join with `sensor_channels`, `sensors`, `nodes`, `projects`, `owners`
- Filter by status = 'active'
- Order by triggeredAt DESC
- Limit to recent alerts

---

## 🗂️ Backend Structure

### Module to Create: `DashboardModule`

```
iot-backend/src/modules/dashboard/
├── dashboard.module.ts
├── dashboard.controller.ts
├── dashboard.service.ts
└── dto/
    ├── kpi-stats-response.dto.ts
    ├── node-health-response.dto.ts
    ├── owner-leaderboard-response.dto.ts
    ├── activity-log-response.dto.ts
    ├── release-schedule-response.dto.ts
    ├── telemetry-streams-response.dto.ts
    ├── delivery-health-response.dto.ts
    └── alert-stream-response.dto.ts
```

### Controller Endpoints Summary

```typescript
@Controller('dashboard')
export class DashboardController {
  
  @Get('kpi-stats')
  @ApiOperation({ summary: 'Get KPI statistics for dashboard cards' })
  getKpiStats(@Query() filters: DashboardFiltersDto) {}

  @Get('node-health')
  @ApiOperation({ summary: 'Get node health snapshot' })
  getNodeHealth(@Query() filters: DashboardFiltersDto) {}

  @Get('owner-leaderboard')
  @ApiOperation({ summary: 'Get owner leaderboard by telemetry' })
  getOwnerLeaderboard(@Query() filters: DashboardFiltersDto) {}

  @Get('activity-log')
  @ApiOperation({ summary: 'Get recent activity log' })
  getActivityLog(@Query() filters: DashboardFiltersDto) {}

  @Get('release-schedule')
  @ApiOperation({ summary: 'Get next release/maintenance window' })
  getReleaseSchedule() {}

  @Get('telemetry-streams')
  @ApiOperation({ summary: 'Get telemetry stream data with charts' })
  getTelemetryStreams(@Query() filters: DashboardFiltersDto) {}

  @Get('delivery-health')
  @ApiOperation({ summary: 'Get webhook/database forwarding health' })
  getDeliveryHealth(@Query() filters: DashboardFiltersDto) {}

  @Get('alert-stream')
  @ApiOperation({ summary: 'Get latest active alerts' })
  getAlertStream(@Query() filters: DashboardFiltersDto) {}
}
```

---

## 📦 Frontend Structure

### Components to Create:

```
iot-angular/src/app/pages/iot/dashboard/
├── iot-dashboard.html           (Main container - use filters)
├── iot-dashboard.ts              (Main component - manage filters)
├── iot-dashboard.scss
└── widgets/
    ├── kpi-cards/
    │   ├── kpi-cards.component.ts
    │   ├── kpi-cards.component.html
    │   └── kpi-cards.component.scss
    ├── node-health/
    │   ├── node-health.component.ts
    │   ├── node-health.component.html
    │   └── node-health.component.scss
    ├── owner-leaderboard/
    │   ├── owner-leaderboard.component.ts
    │   ├── owner-leaderboard.component.html
    │   └── owner-leaderboard.component.scss
    ├── activity-log/
    │   ├── activity-log.component.ts
    │   ├── activity-log.component.html
    │   └── activity-log.component.scss
    ├── release-window/
    │   ├── release-window.component.ts
    │   ├── release-window.component.html
    │   └── release-window.component.scss
    ├── telemetry-streams/
    │   ├── telemetry-streams.component.ts
    │   ├── telemetry-streams.component.html
    │   └── telemetry-streams.component.scss
    ├── delivery-health/
    │   ├── delivery-health.component.ts
    │   ├── delivery-health.component.html
    │   └── delivery-health.component.scss
    └── alert-stream/
        ├── alert-stream.component.ts
        ├── alert-stream.component.html
        └── alert-stream.component.scss
```

---

## 🔄 Implementation Flow

### Phase 1: Backend Setup ✅ NEXT
1. Create `dashboard.module.ts`
2. Create all DTOs (8 response DTOs)
3. Create `dashboard.service.ts` with data aggregation logic
4. Create `dashboard.controller.ts` with 8 endpoints
5. Test endpoints with Postman/Swagger

### Phase 2: SDK Generation
1. Run `ng-openapi-gen` to generate dashboard SDK
2. Verify SDK methods available in Angular

### Phase 3: Frontend Components
1. Create base widget components structure
2. Implement each widget with SDK integration
3. Add loading states, error handling
4. Update main `iot-dashboard.html` to use new components

### Phase 4: Testing & Polish
1. Test with real backend data
2. Verify filters work across all widgets
3. Check performance (parallel loading)
4. Add caching if needed

---

## 📊 Data Aggregation Notes

### For `kpi-stats`:
- **Nodes Online:** `COUNT(*) FROM nodes WHERE status = 'online'`
- **Active Alerts:** `COUNT(*) FROM sensor_alerts WHERE status = 'active'`
- **Telemetry Rate:** `COUNT(*) FROM sensor_logs WHERE createdAt > NOW() - INTERVAL 1 MINUTE` * 60
- **Forwarded Payloads:** `COUNT(*) FROM owner_forwarding_webhook_logs + owner_forwarding_database_logs WHERE createdAt > NOW() - INTERVAL 1 MINUTE`

### For `telemetry-streams`:
```sql
SELECT 
  DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') as hour,
  sc.channelName,
  COUNT(*) as count
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.idSensorChannel = sc.idSensorChannel
WHERE sl.createdAt > NOW() - INTERVAL 24 HOUR
GROUP BY hour, sc.channelName
ORDER BY hour ASC
```

### For `delivery-health`:
```sql
-- Webhook success rate
SELECT 
  w.idOwnerForwardingWebhook,
  w.label,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN l.success = true THEN 1 ELSE 0 END) as successful,
  (SUM(CASE WHEN l.success = true THEN 1 ELSE 0 END) / COUNT(*)) * 100 as success_rate
FROM owner_forwarding_webhooks w
LEFT JOIN owner_forwarding_webhook_logs l ON w.idOwnerForwardingWebhook = l.idOwnerForwardingWebhook
WHERE l.createdAt > NOW() - INTERVAL 24 HOUR
GROUP BY w.idOwnerForwardingWebhook
```

---

## ✅ Completion Checklist

### Backend (8 endpoints)
- [ ] `GET /api/dashboard/kpi-stats`
- [ ] `GET /api/dashboard/node-health`
- [ ] `GET /api/dashboard/owner-leaderboard`
- [ ] `GET /api/dashboard/activity-log`
- [ ] `GET /api/dashboard/release-schedule`
- [ ] `GET /api/dashboard/telemetry-streams`
- [ ] `GET /api/dashboard/delivery-health`
- [ ] `GET /api/dashboard/alert-stream`

### Frontend (8 widget components)
- [ ] `DashboardKpiCardsComponent`
- [ ] `DashboardNodeHealthComponent`
- [ ] `DashboardOwnerLeaderboardComponent`
- [ ] `DashboardActivityLogComponent`
- [ ] `DashboardReleaseWindowComponent`
- [ ] `DashboardTelemetryStreamsComponent`
- [ ] `DashboardDeliveryHealthComponent`
- [ ] `DashboardAlertStreamComponent`

### Integration
- [ ] SDK generated with all dashboard methods
- [ ] Main dashboard passes filters to all widgets
- [ ] All widgets load data independently
- [ ] Loading states implemented
- [ ] Error handling implemented
- [ ] Real data displayed (no more mock)

---

**Total:** 8 backend endpoints + 8 frontend components = **16 new files to create**

This mapping ensures we don't miss anything and can build systematically! 🚀

# Alert System Implementation - COMPLETE ✅

## Overview
Complete node offline monitoring system with automatic detection, alert generation, and real-time dashboard integration.

## System Architecture

### Backend Components (NestJS)

#### 1. Alert Checker Service (Cron Jobs)
**File:** `iot-backend/src/modules/alert-events/alert-checker.service.ts`
- **Schedule:** Every 5 minutes (`*/5 * * * *`)
- **Jobs:**
  - `checkOfflineNodes()`: Detects nodes offline >30min (warning) or >1hr (critical)
  - `checkResolvedOfflineAlerts()`: Auto-resolves alerts when nodes come back online
- **Query Logic:**
  ```typescript
  last_seen_at < now() - interval '30 minutes'
  last_seen_at < now() - interval '1 hour'
  ```
- **Alert Creation:**
  ```typescript
  await this.alertEventsService.create({
    alertRuleId: nodeOfflineRule.idAlertRule,
    severity: 'warning' | 'critical',
    status: 'open',
    note: `Node ${node.code} offline`
  });
  ```

#### 2. Alert Events Controller
**File:** `iot-backend/src/modules/alert-events/alert-events.controller.ts`
- **Endpoints:**
  - `GET /api/alert-events/statistics/summary` - Overall statistics
  - `GET /api/alert-events/statistics/offline-nodes` - Offline summary
  - `GET /api/alert-events?status=open&userId=X` - Alert list
  - `PATCH /api/alert-events/:id/acknowledge` - Acknowledge alert
  - `PATCH /api/alert-events/:id/clear` - Clear alert
- **Route Order Fix:** Statistics routes BEFORE `:id` parameter route

#### 3. Database Seed
**File:** `iot-backend/seed-node-offline-alert-rule.sql`
```sql
INSERT INTO alert_rules (name, description, severity, condition, params_json)
VALUES (
  'node_offline',
  'Detects when a node has not sent data for 30+ minutes',
  'warning',
  'last_seen_at > 30 minutes',
  '{"warning_threshold_minutes": 30, "critical_threshold_minutes": 60}'
);
```

### Frontend Components (Angular)

#### 1. Alert Service Wrapper
**File:** `iot-angular/src/app/service/alert.service.ts`
- **Methods:**
  - `getAlertStatistics(dateRange)` - Dashboard statistics
  - `getOfflineNodesSummary()` - Offline counts
  - `getAlertEvents(status, userId)` - Filtered alerts
  - `acknowledgeAlert(id, userId)` - Mark as acknowledged
  - `clearAlert(id, userId)` - Mark as cleared

#### 2. Alert Center Component
**Files:**
- `iot-angular/src/app/pages/iot/alerts/alert-center.component.ts`
- `iot-angular/src/app/pages/iot/alerts/alert-center.component.html`

**Features:**
- Statistics cards (Open, Acknowledged, Cleared, Total)
- Offline nodes summary (Total, Warning, Critical)
- Alert list with filters (Open/Acknowledged/Cleared)
- Action buttons (Acknowledge, Clear)
- Auto-refresh every 5 minutes
- Owner filter, search by node code

**UI Sections:**
```html
<!-- Statistics Cards -->
<div class="row mb-3">
  <div class="col-md-3">Open: {{ statistics.openCount }}</div>
  <div class="col-md-3">Acknowledged: {{ statistics.acknowledgedCount }}</div>
  <div class="col-md-3">Cleared: {{ statistics.clearedCount }}</div>
  <div class="col-md-3">Total: {{ statistics.totalCount }}</div>
</div>

<!-- Offline Summary -->
<card>Total: {{ offlineSummary.total }}</card>
<card>Warning: {{ offlineSummary.warning }}</card>
<card>Critical: {{ offlineSummary.critical }}</card>

<!-- Alert List -->
<table>
  <tr *ngFor="let alert of filteredAlerts">
    <td>{{ alert.note }}</td>
    <td>{{ alert.severity }}</td>
    <td>{{ alert.createdAt | date }}</td>
    <td>
      <button (click)="acknowledgeAlert(alert)">Acknowledge</button>
      <button (click)="clearAlert(alert)">Clear</button>
    </td>
  </tr>
</table>
```

#### 3. Dashboard Integration
**Files:**
- `iot-angular/src/app/pages/iot/dashboard/iot-dashboard.ts`
- `iot-angular/src/app/pages/iot/dashboard/iot-dashboard.html`

**Widget Display:**
```html
<!-- Offline Nodes Alert Widget -->
<card class="mb-3">
    <card-header class="fw-bold d-flex align-items-center">
        <i class="bi bi-router text-danger me-2"></i>
        <span>Offline Nodes Summary</span>
        <span class="badge bg-danger ms-2">{{ offlineSummary.total }}</span>
        <a href="/iot/alerts" class="btn btn-sm btn-outline-theme ms-auto">
            View All Alerts <i class="bi bi-arrow-right ms-1"></i>
        </a>
    </card-header>
    <card-body>
        <div class="row text-center">
            <div class="col-md-4">
                <i class="bi bi-exclamation-triangle text-danger"></i>
                <div class="fs-2 fw-bold text-danger">{{ offlineSummary.total }}</div>
                <div class="text-muted small">Total Offline Nodes</div>
            </div>
            <div class="col-md-4">
                <i class="bi bi-exclamation-circle text-warning"></i>
                <div class="fs-2 fw-bold text-warning">{{ offlineSummary.warning }}</div>
                <div class="text-muted small">Warning (> 30 min)</div>
            </div>
            <div class="col-md-4">
                <i class="bi bi-x-circle text-danger"></i>
                <div class="fs-2 fw-bold text-danger">{{ offlineSummary.critical }}</div>
                <div class="text-muted small">Critical (> 1 hour)</div>
            </div>
        </div>
    </card-body>
</card>
```

**Auto-refresh Logic:**
```typescript
ngOnInit() {
  this.loadOfflineSummary();
  interval(300000).subscribe(() => this.loadOfflineSummary());
}

loadOfflineSummary() {
  this.alertService.getOfflineNodesSummary().subscribe({
    next: (data) => this.offlineSummary = data,
    error: (err) => console.error('Failed to load offline summary', err)
  });
}
```

#### 4. Module Registration
**File:** `iot-angular/src/app/app.module.ts`
```typescript
import { AlertService } from './service/alert.service';
import { AlertCenterComponent } from './pages/iot/alerts/alert-center.component';

@NgModule({
  declarations: [
    AlertCenterComponent,
    // ...
  ],
  providers: [
    AlertService,
    // ...
  ]
})
```

#### 5. Routing
**File:** `iot-angular/src/app/app-routing.module.ts`
```typescript
{ path: 'iot/alerts', component: IotAlertsPage, data: { title: 'IoT Alerts' } }
```
- `IotAlertsPage` now wraps `<alert-center></alert-center>`

## Data Flow

### Alert Creation Flow
```
1. Cron Job (every 5 min)
   └─> alert-checker.service.ts
       └─> Query nodes table (last_seen_at)
           └─> Create alert_events row
               └─> Backend stores in PostgreSQL

2. Frontend Request
   └─> GET /api/alert-events/statistics/offline-nodes
       └─> Backend returns: { total, warning, critical }
           └─> Dashboard displays widget

3. User Views Alert Center
   └─> GET /api/alert-events?status=open&userId=X
       └─> Display alert list
           └─> User clicks "Acknowledge"
               └─> PATCH /api/alert-events/:id/acknowledge
```

### Auto-refresh Flow
```
Dashboard Component
└─> ngOnInit()
    └─> loadOfflineSummary()
        └─> alertService.getOfflineNodesSummary()
            └─> HTTP GET to backend
                └─> Update offlineSummary property
                    └─> Angular renders widget

└─> interval(300000) = 5 minutes
    └─> Repeat loadOfflineSummary()
```

## Alert Thresholds

| Severity  | Condition          | Threshold       |
|-----------|-------------------|-----------------|
| Warning   | Node Offline      | > 30 minutes    |
| Critical  | Node Offline      | > 1 hour        |
| Resolved  | Node Back Online  | last_seen_at updated |

## API Endpoints

### Statistics Summary
```
GET /api/alert-events/statistics/summary
Response: {
  openCount: number,
  acknowledgedCount: number,
  clearedCount: number,
  totalCount: number
}
```

### Offline Nodes Summary
```
GET /api/alert-events/statistics/offline-nodes
Response: {
  total: number,
  warning: number,
  critical: number
}
```

### Alert Events List
```
GET /api/alert-events?status=open&userId=1
Response: AlertEventDto[]
```

### Acknowledge Alert
```
PATCH /api/alert-events/:id/acknowledge
Body: { userId: number }
Response: AlertEventDto
```

### Clear Alert
```
PATCH /api/alert-events/:id/clear
Body: { userId: number }
Response: AlertEventDto
```

## Testing Checklist

### Backend Tests
- [ ] Start backend: `cd iot-backend && npm run start:dev`
- [ ] Check cron logs: Should show "Checking for offline nodes..." every 5 min
- [ ] Verify database: `SELECT * FROM alert_events WHERE status = 'open';`
- [ ] Test API:
  ```bash
  curl http://localhost:3000/api/alert-events/statistics/offline-nodes
  curl http://localhost:3000/api/alert-events/statistics/summary
  curl http://localhost:3000/api/alert-events?status=open
  ```

### Frontend Tests
- [ ] Start frontend: `cd iot-angular && npm start`
- [ ] Navigate to dashboard: http://localhost:4200/iot/dashboard
- [ ] Verify offline widget displays counts
- [ ] Wait 5 minutes, verify auto-refresh updates counts
- [ ] Click "View All Alerts" button → should navigate to /iot/alerts
- [ ] Test Alert Center:
  - [ ] Statistics cards show correct counts
  - [ ] Offline summary displays warning/critical breakdown
  - [ ] Alert list shows open alerts
  - [ ] Filter buttons work (Open/Acknowledged/Cleared)
  - [ ] Acknowledge button changes status
  - [ ] Clear button changes status
  - [ ] Search by node code works
  - [ ] Auto-refresh updates every 5 minutes

### SDK Verification
- [ ] SDK generated with new endpoints:
  ```bash
  cd iot-angular
  npm run generate-api
  # Should include alertEventsControllerGetStatistics()
  # Should include alertEventsControllerGetOfflineNodesSummary()
  ```

## Troubleshooting

### Cron not detecting offline nodes
- Check nodes table has `last_seen_at` populated
- Verify alert rule exists: `SELECT * FROM alert_rules WHERE name = 'node_offline';`
- Check cron service logs in terminal

### Dashboard widget shows 0/0/0
- Verify backend is running on port 3000
- Check browser console for API errors
- Verify SDK generated correctly
- Check AlertService is injected in dashboard component

### Alert Center page blank
- Verify AlertCenterComponent is declared in app.module.ts
- Check browser console for compilation errors
- Verify IotAlertsPage template wraps `<alert-center></alert-center>`

### Route ordering issues
- Statistics routes MUST be before `:id` route in controller
- Order: `/statistics/summary` → `/statistics/offline-nodes` → `/:id`

## Performance Considerations

- **Cron Frequency:** 5 minutes (adjustable in `@Cron()` decorator)
- **Frontend Refresh:** 5 minutes (adjustable in `interval(300000)`)
- **Database Indexes:** Ensure `last_seen_at` column indexed for fast queries
- **Alert Volume:** Consider pagination if alert count > 1000

## Future Enhancements

1. **Email/SMS Notifications:** Integrate with notification service
2. **Alert Rules UI:** Admin page to manage alert rules dynamically
3. **Alert History:** Chart showing alert trends over time
4. **Escalation:** Auto-escalate critical alerts after X hours
5. **Bulk Actions:** Acknowledge/clear multiple alerts at once
6. **WebSocket:** Real-time alert push without polling
7. **Sound Alerts:** Play sound when critical alert triggered
8. **Custom Thresholds:** Per-owner configurable offline thresholds

## Documentation References

- Backend Implementation: `iot-backend/IOT-LOGS-MODULE-COMPLETE.md`
- Device Commands: `iot-backend/DEVICE-COMMANDS-IMPLEMENTATION.md`
- Dashboard Stats: `DASHBOARD-ADMIN-STATS-IMPLEMENTATION.md`
- Telemetry Auto-refresh: `TELEMETRY-AUTO-REFRESH.md`

---

**Status:** ✅ COMPLETE  
**Last Updated:** 2024-08-09  
**Next Steps:** Test end-to-end flow and deploy to staging

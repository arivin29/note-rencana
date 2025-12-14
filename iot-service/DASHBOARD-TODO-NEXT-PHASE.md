# Dashboard - TODO for Next Phase

## 📋 Overview
This document tracks pending improvements for the IoT Dashboard after completing Phase 1 (Telemetry Widget Redesign).

---

## ✅ Completed (Phase 1)

### 1. Connectivity Monitoring
- ✅ Auto-update connectivity status (MQTT + cron)
- ✅ Stacked area chart visualization
- ✅ Database cleanup for false online statuses
- ✅ OnModuleInit cleanup in ConnectivityMonitorService

### 2. Multi-Tenant Filtering
- ✅ Owner dropdown triggers widget reload
- ✅ Dynamic ownerId for super admin vs owner users
- ✅ Cascading filters (owner → project → time range)

### 3. Telemetry Widget Redesign
- ✅ Renamed: "TELEMETRY/MIN" → "DATA INGESTION"
- ✅ Removed: LoRa gateways, coverage (technical details)
- ✅ Added: Device activity, message recency, queue health
- ✅ Backend DTO + Service updated
- ✅ Frontend component updated
- ✅ SDK regenerated
- 📄 Documentation: `TELEMETRY-WIDGET-REDESIGN.md`

---

## 🔄 Pending (Phase 2)

### 1. Telemetry Streams - Real Data Integration 🔴 CRITICAL

**Current State:**
```
TELEMETRY STREAMS
Hourly ingestion rate

📊 Flow Channels: Random data (90-160)
📊 Pressure Channels: Random data (40-95)
```

**Problem:**
- **100% SIMULATED DATA** using `generateRealisticSeries()`
- Hardcoded stats: 12.4K total, 4.2K forwarded, 99.4% success
- Data doesn't change with owner/project filters
- No connection to real sensor_logs table

**Proposed: REAL DATA from sensor_logs**

Query actual sensor logs grouped by hour and sensor type:
```sql
SELECT 
  DATE_TRUNC('hour', sl.created_at) AS hour,
  sc.sensor_type,
  COUNT(*) AS log_count
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
WHERE sl.created_at >= NOW() - INTERVAL '24 hours'
  AND (n.id_owner = :ownerId OR :ownerId IS NULL)
  AND (n.id_project = :projectId OR :projectId IS NULL)
GROUP BY DATE_TRUNC('hour', sl.created_at), sc.sensor_type
ORDER BY hour ASC;
```

**Implementation:**
- [ ] Inject SensorLog, SensorChannel repositories
- [ ] Implement `getHourlyTelemetryData()` query
- [ ] Replace `generateRealisticSeries()` with real data
- [ ] Calculate real ingestion statistics
- [ ] Add database indexes on `sensor_logs.created_at`
- [ ] Test with owner/project filters
- [ ] Document: `TELEMETRY-STREAMS-REAL-DATA.md` ✅

**Estimated Effort:** 6-8 hours  
**Priority:** 🔴 CRITICAL (Blocks production readiness)

---

### 2. Forwarding Activity Logs - Hidden (No Backend) 🔴

**Current State:**
- ✅ **Hidden in Owner Detail page** (`owners-detail.html`)
- ✅ Database table exists: `owner_forwarding_logs`
- ✅ Entity exists: `OwnerForwardingLog`
- ❌ No backend endpoint to query logs
- ❌ No insertion logic when forwarding happens

**What Was Hidden:**
"Recent Delivery Attempts" section showing:
- Time, Target, Type, Status, Message, Latency
- Was using hardcoded dummy data (3 fake log entries)

**Implementation Needed:**

1. **Create endpoint** in `owners.controller.ts`:
   ```typescript
   @Get(':id/forwarding-logs')
   async getForwardingLogs(@Param('id') id: string, @Query('limit') limit = 10) {
     return this.ownersService.getForwardingLogs(id, limit);
   }
   ```

2. **Implement service** in `owners.service.ts`:
   ```typescript
   async getForwardingLogs(ownerId: string, limit: number) {
     return this.forwardingLogRepository.find({
       where: { idOwner: ownerId },
       order: { createdAt: 'DESC' },
       take: limit
     });
   }
   ```

3. **Insert logs** when forwarding happens:
   - In webhook forwarding logic
   - In database batch forwarding logic
   - Record: status, attempts, errorMessage, durationMs

4. **Uncomment frontend** after backend ready:
   - `owners-detail.html` lines ~333-380
   - `owners-detail.ts` lines ~310-334

**Files:**
- Frontend: `iot-angular/src/app/pages/iot/owners/owners-detail/` (commented out)
- Backend: `iot-backend/src/entities/owner-forwarding-log.entity.ts` (ready)
- Migration: `1736823000000-InitialSchema.ts` line 310 (table exists)

**Priority**: 🔴 HIGH (After forwarding system implemented)  
**Estimated Effort**: 4-6 hours

---

### 3. Forwarded Payloads Widget - Needs Redesign 🎯

**Current State:**
```
FORWARDED PAYLOADS
0 payloads

🌐 Webhooks 99.1% success
💾 DB batches 92.4%
```

**Problem:**
- Shows technical distribution (webhook vs database)
- Not actionable for users
- No volume context

**Proposed: PAYLOAD THROUGHPUT**
```
PAYLOAD THROUGHPUT
1,847 delivered
▲ +15%

⚡ 31 payloads/min
✅ 98.5% success
🔄 26 in queue
```

**Implementation Plan:**

#### Backend Changes
File: `iot-backend/src/dashboard/dto/kpi-stats-response.dto.ts`
```typescript
export class ForwardedPayloadsMetric {
  // KEEP
  current: number;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  sparkline: number[];
  
  // ADD
  rate: number;              // Payloads per minute
  successRate: number;       // Percentage
  queueSize: number;         // Pending/retrying
  
  // REMOVE
  webhookSuccess: string;
  dbBatchSuccess: string;
}
```

File: `iot-backend/src/dashboard/dashboard.service.ts`
```typescript
// Calculate from forwarding_logs table
const forwardedPayloads = await this.calculatePayloadMetrics(ownerId, projectId, timeRange);
// Returns: { current, rate, successRate, queueSize, delta, trend, sparkline }
```

#### Frontend Changes
File: `iot-angular/src/app/pages/iot/dashboard/widgets/kpi-cards/kpi-cards.component.ts`

Currently **commented out** (line ~183):
```typescript
// TODO: Uncomment after backend implementation
{
  title: 'PAYLOAD THROUGHPUT',
  value: this.formatNumber(data.forwardedPayloads.current),
  delta: data.forwardedPayloads.delta,
  trend: data.forwardedPayloads.trend,
  info: [
    { icon: 'fa fa-gauge text-success me-1', text: `${data.forwardedPayloads.rate} payloads/min` },
    { icon: 'fa fa-check-circle text-primary me-1', text: `${data.forwardedPayloads.successRate}% success` },
    { icon: 'fa fa-hourglass text-warning me-1', text: `${data.forwardedPayloads.queueSize} in queue` }
  ],
  chart: { ... }
}
```

**Tasks:**
- [ ] Update backend DTO (`ForwardedPayloadsMetric`)
- [ ] Implement `calculatePayloadMetrics()` in dashboard service
- [ ] Query `forwarding_logs` table for real data
- [ ] Calculate success rate, delivery rate, queue size
- [ ] Regenerate SDK (`npm run generate-api`)
- [ ] Uncomment frontend widget code
- [ ] Test with real forwarding data
- [ ] Create documentation: `PAYLOAD-THROUGHPUT-WIDGET.md`

**Estimated Effort:** 3-4 hours

---

### 3. Real-Time Data Integration 🔴

**Current State:**
- Most metrics use **simulated data**
- `lastMessageSecondsAgo` is random (0-30 seconds)
- Queue sizes hardcoded to 0

**Proposed Improvements:**

#### A. Real Last Message Timestamp
Track actual MQTT message arrival:
```typescript
// In MQTT gateway service
private lastMessageReceived: Date;

handleIncomingMessage(topic: string, payload: any) {
  this.lastMessageReceived = new Date();
  // ... existing logic
}

getLastMessageAge(): number {
  if (!this.lastMessageReceived) return null;
  return Math.floor((Date.now() - this.lastMessageReceived.getTime()) / 1000);
}
```

Backend endpoint:
```typescript
@Get('mqtt/status')
getMqttStatus() {
  return {
    connected: this.mqttService.isConnected(),
    lastMessageSecondsAgo: this.mqttService.getLastMessageAge(),
    queueSize: this.mqttService.getQueueSize()
  };
}
```

**Tasks:**
- [ ] Track `lastMessageReceived` in MQTT gateway
- [ ] Create `/mqtt/status` endpoint
- [ ] Update dashboard service to fetch real timestamps
- [ ] Replace simulated `lastMessageSecondsAgo` with real data

**Estimated Effort:** 2-3 hours

#### B. Real Queue Monitoring
If using message queue (Redis, RabbitMQ):
```typescript
async getQueueSize(): Promise<number> {
  // Example with Redis
  return await this.redis.llen('mqtt:message:queue');
}
```

**Tasks:**
- [ ] Determine if message queue is implemented
- [ ] If yes: Query actual queue size
- [ ] If no: Consider implementing for reliability
- [ ] Update dashboard metrics with real queue data

**Estimated Effort:** 4-6 hours (if implementing queue)

---

### 4. Alert Widget Enhancement 🟡

**Current State:**
```
ACTIVE ALERTS
12 alerts
▼ -3

⚠️ 8 critical
ℹ️ 4 warnings
```

**Potential Improvements:**
- [ ] Add alert age indicator (oldest alert)
- [ ] Show acknowledged vs unacknowledged count
- [ ] Add quick action: "Acknowledge All"
- [ ] Click to open Alert Management page

**Estimated Effort:** 2-3 hours

---

### 5. Performance Optimization 🟢

**Current State:**
- Dashboard calls multiple endpoints
- Each widget triggers separate API call
- No caching mechanism

**Proposed:**
```typescript
// Consolidated endpoint
@Get('dashboard/overview')
getDashboardOverview(@Query() filters: DashboardFiltersDto) {
  return {
    connectivity: { ... },
    alerts: { ... },
    telemetry: { ... },
    payloads: { ... },
    timestamp: new Date()
  };
}
```

**Benefits:**
- Single HTTP request instead of 4
- Reduced backend load
- Faster dashboard load time
- Consistent data snapshot

**Tasks:**
- [ ] Create consolidated endpoint
- [ ] Update frontend to use single call
- [ ] Add response caching (30-60 seconds)
- [ ] Implement loading states

**Estimated Effort:** 3-4 hours

---

## 🎨 UI/UX Enhancements (Low Priority)

### 6. Widget Customization
- [ ] Allow users to reorder widgets (drag & drop)
- [ ] Show/hide widgets based on user preference
- [ ] Save layout to user profile

### 7. Mobile Responsiveness
- [ ] Optimize KPI cards for mobile (2-column → 1-column)
- [ ] Adjust chart sizes for small screens
- [ ] Test on tablets/phones

### 8. Dark Mode Support
- [ ] Ensure all charts visible in dark mode
- [ ] Adjust color schemes
- [ ] Test contrast ratios

---

## 📊 Testing Checklist (Before Release)

### Functional Testing
- [ ] Test all widgets with real data
- [ ] Verify filters (owner, project, time range)
- [ ] Check multi-tenant isolation (owner can't see other data)
- [ ] Verify super admin sees all data

### Performance Testing
- [ ] Dashboard load time < 2 seconds
- [ ] API response time < 500ms
- [ ] No memory leaks (chart updates)
- [ ] Browser console errors = 0

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## 🚀 Deployment Strategy

### Phase 2 Release Plan

1. **Week 1:** Forwarded Payloads widget redesign
   - Backend implementation
   - Frontend update
   - Testing

2. **Week 2:** Real-time data integration
   - MQTT status tracking
   - Queue monitoring
   - Dashboard endpoint updates

3. **Week 3:** Performance optimization
   - Consolidated endpoint
   - Caching implementation
   - Load testing

4. **Week 4:** Polish & testing
   - Bug fixes
   - UI refinements
   - Documentation updates

---

## 📝 Git Workflow

### Branch Strategy
```bash
# Phase 2 development
git checkout -b feature/dashboard-phase2

# Individual features
git checkout -b feature/payload-throughput-widget
git checkout -b feature/realtime-mqtt-status
git checkout -b feature/dashboard-performance
```

### Commit Message Convention
```
feat: add payload throughput widget
fix: correct queue size calculation
refactor: consolidate dashboard endpoints
docs: update dashboard TODO
test: add widget integration tests
```

### Pull Request Template
```markdown
## 🎯 Objective
[What does this PR accomplish?]

## 🔄 Changes
- [ ] Backend: ...
- [ ] Frontend: ...
- [ ] Documentation: ...

## ✅ Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete

## 📸 Screenshots
[Before/After if UI changes]

## 📋 Checklist
- [ ] Code reviewed
- [ ] No console errors
- [ ] Documentation updated
- [ ] SDK regenerated (if backend changes)
```

---

## 📚 Related Documentation

- `TELEMETRY-WIDGET-REDESIGN.md` - Phase 1 telemetry widget changes
- `DASHBOARD-ADMIN-STATS-IMPLEMENTATION.md` - Original dashboard specs
- `TELEMETRY-AUTO-REFRESH.md` - Auto-refresh implementation
- `TELEMETRY-CASCADING-FILTERS.md` - Filter cascade logic

---

## 🤝 Team Notes

### For Backend Developers
- Focus on `ForwardedPayloadsMetric` DTO update
- Implement real forwarding_logs queries
- Add MQTT status endpoint for telemetry widget

### For Frontend Developers
- Uncomment payload widget after backend ready
- Test SDK regeneration workflow
- Ensure TypeScript types match backend DTOs

### For QA
- Test all filter combinations
- Verify multi-tenant data isolation
- Check chart performance with large datasets

---

**Priority Legend:**
- 🎯 High Priority (Phase 2)
- 🟡 Medium Priority (Phase 3)
- 🟢 Low Priority (Future)
- 🔴 Critical (Blocking)

**Status:** Draft  
**Created:** December 10, 2024  
**Last Updated:** December 10, 2024  
**Next Review:** After Phase 2 completion

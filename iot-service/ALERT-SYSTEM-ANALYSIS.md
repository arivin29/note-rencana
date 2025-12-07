# Alert System Analysis & Design

## 📋 Current Database Schema (Alert-Related Tables)

### 1. **`sensor_channels`** - Threshold Configuration
```sql
CREATE TABLE sensor_channels (
  id_sensor_channel UUID PRIMARY KEY,
  id_sensor UUID NOT NULL,
  id_sensor_type UUID NOT NULL,
  metric_code TEXT NOT NULL,          -- e.g., "temperature", "flow_rate"
  unit TEXT,                          -- e.g., "°C", "m³/h"
  min_threshold NUMERIC,              -- ✅ Lower bound alert
  max_threshold NUMERIC,              -- ✅ Upper bound alert
  multiplier NUMERIC(12, 6),
  offset_value NUMERIC(12, 6),
  alert_suppression_window INTEGER,   -- ✅ Prevent alert spam
  ...
)
```
**Status:** ✅ **SUDAH ADA** - Basic threshold configuration

### 2. **`alert_rules`** - Alert Rule Definitions
```sql
CREATE TABLE alert_rules (
  id_alert_rule UUID PRIMARY KEY,
  id_sensor_channel UUID NOT NULL,
  rule_type TEXT NOT NULL,            -- ✅ e.g., "threshold", "anomaly", "offline"
  severity TEXT,                      -- ✅ e.g., "critical", "warning", "info"
  params_json JSONB,                  -- ✅ Flexible rule parameters
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```
**Status:** ✅ **SUDAH ADA** - Rule engine framework

### 3. **`alert_events`** - Active/Historical Alerts
```sql
CREATE TABLE alert_events (
  id_alert_event UUID PRIMARY KEY,
  id_alert_rule UUID NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,  -- When alert fired
  value DOUBLE PRECISION,             -- Value that triggered alert
  status TEXT DEFAULT 'open',         -- ✅ open, acknowledged, cleared
  acknowledged_by UUID,               -- ✅ User who acknowledged
  acknowledged_at TIMESTAMPTZ,
  cleared_by UUID,                    -- ✅ User/system who cleared
  cleared_at TIMESTAMPTZ,
  note TEXT,                          -- ✅ Resolution notes
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```
**Status:** ✅ **SUDAH ADA** - Event tracking & workflow

### 4. **`sensor_logs`** - Raw Telemetry Data
```sql
CREATE TABLE sensor_logs (
  id_sensor_log BIGSERIAL PRIMARY KEY,
  id_sensor_channel UUID NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  value_raw DOUBLE PRECISION,
  value_engineered DOUBLE PRECISION,  -- After calibration
  min_threshold DOUBLE PRECISION,     -- ✅ Threshold snapshot
  max_threshold DOUBLE PRECISION,     -- ✅ Threshold snapshot
  quality_flag TEXT,
  ...
)
```
**Status:** ✅ **SUDAH ADA** - Historical data with threshold context

---

## 🎯 Alert Types We Can Implement

### Category 1: **Threshold-Based Alerts** (BASIC)
Trigger when sensor value exceeds defined limits.

#### 1.1 **Upper Threshold Breach** ⚠️
```json
{
  "rule_type": "threshold_max",
  "severity": "critical",
  "params": {
    "threshold": 85.0,
    "duration_sec": 60,
    "hysteresis": 2.0
  }
}
```
**Example:**
- Temperature > 85°C for 60 seconds → Critical alert
- Flow rate > 100 m³/h → Warning alert

#### 1.2 **Lower Threshold Breach** ⚠️
```json
{
  "rule_type": "threshold_min",
  "severity": "warning",
  "params": {
    "threshold": 10.0,
    "duration_sec": 300
  }
}
```
**Example:**
- Pressure < 10 bar for 5 minutes → Warning alert
- Battery < 20% → Info alert

#### 1.3 **Range Violation** ⚠️
```json
{
  "rule_type": "threshold_range",
  "severity": "warning",
  "params": {
    "min": 20.0,
    "max": 80.0
  }
}
```
**Example:**
- Temperature not in range 20-80°C → Warning

---

### Category 2: **Time-Based Alerts** (MEDIUM)
Trigger based on time patterns or missing data.

#### 2.1 **Node Offline** 🔴
```json
{
  "rule_type": "node_offline",
  "severity": "critical",
  "params": {
    "timeout_minutes": 15,
    "grace_period_sec": 300
  }
}
```
**Logic:**
- Check `nodes.last_seen_at`
- If `NOW() - last_seen_at > 15 minutes` → Alert

**Example:**
- Node DEMO1-A4CF12 offline for 15 minutes → Critical alert

#### 2.2 **Sensor Data Gap** ⚠️
```json
{
  "rule_type": "data_gap",
  "severity": "warning",
  "params": {
    "expected_interval_sec": 300,
    "max_gap_multiplier": 3
  }
}
```
**Logic:**
- Expected data every 5 minutes (300 sec)
- If gap > 15 minutes (3x expected) → Warning

**Example:**
- Flowmeter no data for 15 minutes → Warning alert

#### 2.3 **Calibration Due** 📅
```json
{
  "rule_type": "calibration_due",
  "severity": "info",
  "params": {
    "days_before_warning": 7
  }
}
```
**Logic:**
- Check `sensors.calibration_due_at`
- If `calibration_due_at - NOW() < 7 days` → Info alert

---

### Category 3: **Statistical Alerts** (ADVANCED)
Trigger based on data patterns and anomalies.

#### 3.1 **Sudden Spike/Drop** 📊
```json
{
  "rule_type": "rate_of_change",
  "severity": "warning",
  "params": {
    "percent_change": 50,
    "time_window_sec": 60
  }
}
```
**Logic:**
- Calculate: `(current - previous) / previous * 100`
- If change > 50% in 1 minute → Warning

**Example:**
- Flow rate jumps from 10 to 16 m³/h (+60%) → Warning (possible leak)

#### 3.2 **Flatline Detection** 📉
```json
{
  "rule_type": "flatline",
  "severity": "warning",
  "params": {
    "duration_sec": 600,
    "variance_threshold": 0.01
  }
}
```
**Logic:**
- Check standard deviation over 10 minutes
- If variance < 0.01 → Warning (sensor stuck?)

**Example:**
- Temperature reads exactly 25.00°C for 10 minutes → Warning (faulty sensor?)

#### 3.3 **Anomaly Detection** 🤖
```json
{
  "rule_type": "anomaly",
  "severity": "info",
  "params": {
    "baseline_days": 7,
    "std_deviation_multiplier": 3
  }
}
```
**Logic:**
- Calculate baseline: mean ± 3σ from last 7 days
- If current value outside baseline → Info alert

**Example:**
- Flow rate at 3 AM (normally 5 m³/h) suddenly 50 m³/h → Anomaly

---

### Category 4: **System Health Alerts** (OPERATIONAL)

#### 4.1 **Battery Low** 🔋
```json
{
  "rule_type": "battery_low",
  "severity": "warning",
  "params": {
    "threshold_percent": 20,
    "critical_threshold_percent": 10
  }
}
```
**Data Source:** Node telemetry payload `battery_level`

#### 4.2 **Firmware Outdated** 🔧
```json
{
  "rule_type": "firmware_outdated",
  "severity": "info",
  "params": {
    "min_version": "2.1.0"
  }
}
```
**Logic:** Compare `nodes.firmware_version` with required version

#### 4.3 **Connectivity Degraded** 📶
```json
{
  "rule_type": "connectivity_degraded",
  "severity": "warning",
  "params": {
    "signal_threshold_dbm": -90,
    "packet_loss_percent": 20
  }
}
```
**Data Source:** Node telemetry payload `signal_strength`, `packet_loss`

---

## 🔄 Alert Workflow & States

### Alert State Machine:
```
┌──────────┐
│  OPEN    │ ← Alert triggered (status = 'open')
└────┬─────┘
     │
     ├─→ User acknowledges
     │
┌──────────────┐
│ ACKNOWLEDGED │ (acknowledged_by, acknowledged_at filled)
└────┬─────────┘
     │
     ├─→ Condition clears OR User resolves
     │
┌──────────┐
│ CLEARED  │ (cleared_by, cleared_at filled)
└──────────┘
```

### Status Values:
- **`open`** - New alert, needs attention
- **`acknowledged`** - Engineer is aware, working on it
- **`cleared`** - Resolved (auto-cleared when value returns to normal)
- **`silenced`** - Temporarily suppressed (maintenance window)

---

## 💡 Implementation Strategy

### Phase 1: **Basic Threshold Alerts** (Quick Win)
**Timeline:** 2-3 days  
**Complexity:** Low  
**Business Value:** High

**What to build:**
1. Background job/scheduler to check `sensor_logs` against `sensor_channels.min_threshold` / `max_threshold`
2. Create `alert_events` when breach detected
3. Alert Center UI to display `alert_events` (already exists in HTML)
4. Acknowledge/Clear actions

**Code Location:**
- `iot-backend/src/modules/alerts/` (new module)
- Scheduler: Check every 1-5 minutes

**Sample Alert:**
```typescript
// Pseudo-code for alert checker
async function checkThresholdAlerts() {
  // Get latest sensor readings
  const latestReadings = await sensorLogRepository
    .createQueryBuilder('log')
    .distinctOn(['log.id_sensor_channel'])
    .orderBy('log.id_sensor_channel')
    .addOrderBy('log.ts', 'DESC')
    .getMany();

  for (const reading of latestReadings) {
    const channel = await sensorChannelRepository.findOne({
      where: { idSensorChannel: reading.idSensorChannel }
    });

    // Check upper threshold
    if (channel.maxThreshold && reading.valueEngineered > channel.maxThreshold) {
      await createOrUpdateAlert({
        type: 'threshold_max',
        severity: 'critical',
        value: reading.valueEngineered,
        threshold: channel.maxThreshold
      });
    }

    // Check lower threshold
    if (channel.minThreshold && reading.valueEngineered < channel.minThreshold) {
      await createOrUpdateAlert({
        type: 'threshold_min',
        severity: 'warning',
        value: reading.valueEngineered,
        threshold: channel.minThreshold
      });
    }
  }
}
```

---

### Phase 2: **Node Offline Alerts** (Essential)
**Timeline:** 1-2 days  
**Complexity:** Low  
**Business Value:** Critical

**What to build:**
1. Scheduler checks `nodes.last_seen_at`
2. If `NOW() - last_seen_at > configured_timeout` → Create alert
3. Auto-clear when node comes back online

**Sample Alert:**
```typescript
async function checkNodeOfflineAlerts() {
  const offlineNodes = await nodeRepository
    .createQueryBuilder('node')
    .where(`node.last_seen_at < NOW() - INTERVAL '15 minutes'`)
    .andWhere(`node.connectivity_status != 'offline'`)
    .getMany();

  for (const node of offlineNodes) {
    await createOrUpdateAlert({
      type: 'node_offline',
      severity: 'critical',
      nodeId: node.idNode,
      lastSeen: node.lastSeenAt
    });
  }
}
```

---

### Phase 3: **Alert Rules Management UI** (Flexible)
**Timeline:** 3-5 days  
**Complexity:** Medium  
**Business Value:** High

**What to build:**
1. CRUD UI for `alert_rules` table
2. Rule type selector (threshold, offline, anomaly, etc.)
3. Severity selector (critical, warning, info)
4. Parameters form (threshold values, durations, etc.)
5. Enable/disable toggle per rule

**UI Mockup:**
```
┌─────────────────────────────────────┐
│ Alert Rules Configuration           │
├─────────────────────────────────────┤
│ Sensor Channel: Temperature #1      │
│ Rule Type: [Threshold Max ▼]        │
│ Severity: [Critical ▼]              │
│                                     │
│ Parameters:                         │
│ ├─ Max Threshold: [85.0]           │
│ ├─ Duration (sec): [60]            │
│ └─ Hysteresis: [2.0]               │
│                                     │
│ [✓] Enabled                         │
│                                     │
│ [Save Rule]  [Cancel]               │
└─────────────────────────────────────┘
```

---

### Phase 4: **Advanced Alerts** (Optional)
**Timeline:** 1-2 weeks  
**Complexity:** High  
**Business Value:** Medium

**What to build:**
- Rate of change detection
- Anomaly detection (statistical baseline)
- Predictive alerts (ML-based)
- Alert correlation (multiple sensors)

---

## 📊 Alert Center UI - Data Flow

### Current HTML Structure:
```html
<card class="shadow-sm h-100">
  <card-header>Alert Queue</card-header>
  <card-body>
    <table>
      <tr *ngFor="let alert of filteredAlerts">
        <td>{{ alert.channelLabel }}</td>      <!-- sensor_channels.metric_code -->
        <td>{{ alert.severity }}</td>          <!-- alert_rules.severity -->
        <td>{{ alert.status }}</td>            <!-- alert_events.status -->
        <td>{{ alert.value }}</td>             <!-- alert_events.value -->
        <td>{{ alert.threshold }}</td>         <!-- From params_json or channel -->
        <td>{{ alert.assignedTo }}</td>        <!-- alert_events.acknowledged_by -->
        <td>{{ alert.triggeredAt }}</td>       <!-- alert_events.triggered_at -->
      </tr>
    </table>
  </card-body>
</card>
```

### Backend API Needed:
```typescript
// GET /api/alerts/events?status=open&severity=critical
interface AlertEventResponse {
  idAlertEvent: string;
  idAlertRule: string;
  triggeredAt: Date;
  value: number;
  status: 'open' | 'acknowledged' | 'cleared';
  severity: 'critical' | 'warning' | 'info';
  
  // Joined data
  sensorChannel: {
    idSensorChannel: string;
    metricCode: string;        // "temperature"
    unit: string;              // "°C"
    minThreshold: number;
    maxThreshold: number;
  };
  
  sensor: {
    idSensor: string;
    label: string;             // "Temperature Sensor #1"
  };
  
  node: {
    idNode: string;
    code: string;              // "DEMO1-A4CF12"
  };
  
  project: {
    idProject: string;
    name: string;              // "Water Treatment Plant"
  };
  
  owner: {
    idOwner: string;
    name: string;              // "PT. XYZ"
  };
  
  // Workflow
  acknowledgedBy?: {
    idUser: string;
    name: string;
  };
  acknowledgedAt?: Date;
  note?: string;
}
```

---

## 🎨 UI Components Needed

### 1. **Alert Statistics Cards** (Already exists in HTML)
```typescript
openCount = alerts.filter(a => a.status === 'open').length;
acknowledgedCount = alerts.filter(a => a.status === 'acknowledged').length;
criticalCount = alerts.filter(a => a.severity === 'critical').length;
```

### 2. **Alert Actions**
```html
<button (click)="acknowledgeAlert(alert)">
  <i class="fa fa-check"></i> Acknowledge
</button>

<button (click)="clearAlert(alert)">
  <i class="fa fa-times"></i> Clear
</button>

<button (click)="silenceAlert(alert)">
  <i class="fa fa-bell-slash"></i> Silence (1h)
</button>
```

### 3. **Alert Detail Drawer**
When user clicks on alert → Show side panel with:
- Full sensor history chart
- Threshold lines
- Timeline of status changes
- Comment section for notes
- Related alerts (same sensor/node)

---

## 🔔 Notification Channels (Future)

### Escalation Policy:
1. **Level 1** (0-5 min) → In-app notification only
2. **Level 2** (5-15 min) → Email to assigned engineer
3. **Level 3** (15-30 min) → SMS to supervisor
4. **Level 4** (30+ min) → Phone call to manager

### Integration Options:
- Email (SMTP)
- SMS (Twilio, AWS SNS)
- Telegram Bot
- Webhook to external systems (PagerDuty, OpsGenie)
- WhatsApp Business API

---

## 📝 Recommended Next Steps

### **Immediate (This Week):**
1. ✅ Review `alert_rules` and `alert_events` table structure
2. ✅ Create NestJS module: `iot-backend/src/modules/alerts/`
3. ✅ Implement basic threshold checker (scheduler)
4. ✅ Create REST API:
   - `GET /api/alerts/events` (list with filters)
   - `POST /api/alerts/events/:id/acknowledge`
   - `POST /api/alerts/events/:id/clear`
5. ✅ Connect Angular Alert Center to real API

### **Short-term (Next Week):**
1. ✅ Add node offline detection
2. ✅ Alert rules CRUD UI
3. ✅ Email notifications (basic)

### **Long-term (Next Month):**
1. ✅ Advanced statistical alerts
2. ✅ Escalation policies
3. ✅ Alert correlation & grouping
4. ✅ Mobile push notifications

---

## 💰 Business Value

### **Why Alerts Matter:**
1. **Reduce Downtime** - Detect issues before catastrophic failure
2. **Save Costs** - Prevent equipment damage via early warning
3. **Compliance** - Meet SLA requirements for response time
4. **Accountability** - Track who acknowledged/resolved what
5. **Insights** - Pattern analysis over time

### **Example ROI:**
- **Without Alerts:** Pipe burst at 3 AM, discovered at 8 AM = 5 hours downtime + water loss
- **With Alerts:** Pressure drop alert at 3:05 AM, engineer fixes at 3:30 AM = 25 minutes downtime

---

## 🎯 Summary

### **Database:** ✅ READY
- `alert_rules` table exists
- `alert_events` table exists
- `sensor_channels` has threshold columns

### **Missing Pieces:**
1. ❌ Alert checker logic (background job)
2. ❌ REST API for alerts
3. ❌ Alert Center UI connection to API

### **Recommended Start:**
**Phase 1: Basic Threshold Alerts**
- 2-3 days development
- Immediate business value
- Low complexity, high impact

**Would you like me to start implementing Phase 1?** 🚀

---

**Document Version:** 1.0  
**Date:** 2025-12-08  
**Author:** AI Assistant  
**Status:** Ready for implementation approval

# Alert Deduplication Logic

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0

---

## 1. Problem Statement

### 1.1 Without Deduplication

```
10:00 - Pressure anomaly detected → Alert #1 sent
10:10 - Pressure anomaly detected → Alert #2 sent  ← SPAM!
10:20 - Pressure anomaly detected → Alert #3 sent  ← SPAM!
10:30 - Pressure anomaly detected → Alert #4 sent  ← SPAM!
```

**Result:** Alert fatigue, users ignore notifications

### 1.2 With Deduplication

```
10:00 - Pressure anomaly detected → Alert #1 sent ✅
10:10 - Pressure anomaly detected → Update Alert #1 duration
10:20 - Pressure anomaly detected → Update Alert #1 duration
10:30 - Pressure anomaly detected → Update Alert #1 duration
11:00 - Pressure returns to normal → Alert #1 auto-cleared (duration: 1h)
```

**Result:** 1 alert with accurate duration, no spam

---

## 2. Deduplication Strategy

### 2.1 Deduplication Key

An alert is considered **duplicate** if all of these match:

| Field | Description |
|-------|-------------|
| `channel_id` | Same sensor channel |
| `anomaly_type` | Same type (threshold_breach, forecast_deviation, etc) |
| `time_window` | Within suppression window (default: 30 min) |
| `status` | Existing alert is still `open` |

### 2.2 Decision Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ALERT DEDUPLICATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  New Anomaly Detected                                                       │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Query: Find existing alert WHERE                                    │    │
│  │   - channel_id = new.channel_id                                     │    │
│  │   - anomaly_type = new.anomaly_type                                 │    │
│  │   - status = 'open'                                                 │    │
│  │   - triggered_at > (now - suppression_window)                       │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                           │
│                     ┌───────────┴───────────┐                               │
│                     ▼                       ▼                               │
│              Found Existing           Not Found                             │
│                     │                       │                               │
│                     ▼                       ▼                               │
│         ┌─────────────────────┐   ┌─────────────────────┐                   │
│         │  UPDATE existing    │   │  CREATE new alert   │                   │
│         │  - last_value       │   │  - send notification│                   │
│         │  - occurrence_count │   │  - log creation     │                   │
│         │  - updated_at       │   │                     │                   │
│         │  - max_value        │   │                     │                   │
│         │  - min_value        │   │                     │                   │
│         │  - NO notification  │   │                     │                   │
│         └─────────────────────┘   └─────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Enhancement

### 3.1 Enhanced alert_events Table

```sql
-- Add columns for deduplication tracking
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS 
    occurrence_count INTEGER DEFAULT 1;

ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS 
    first_value DOUBLE PRECISION;

ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS 
    last_value DOUBLE PRECISION;

ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS 
    max_value DOUBLE PRECISION;

ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS 
    min_value DOUBLE PRECISION;

ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS 
    last_occurrence_at TIMESTAMPTZ;

ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS 
    anomaly_type TEXT;

-- Index for deduplication queries
CREATE INDEX IF NOT EXISTS idx_alert_dedup 
ON alert_events (id_sensor_channel, anomaly_type, status, triggered_at)
WHERE status = 'open';

-- Comments
COMMENT ON COLUMN alert_events.occurrence_count IS 'Number of times this alert was triggered (for deduplication)';
COMMENT ON COLUMN alert_events.last_occurrence_at IS 'Timestamp of the most recent occurrence';
```

### 3.2 Updated Entity

```typescript
// src/entities/alert-event.entity.ts - Enhanced

@Entity('alert_events')
export class AlertEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'id_alert_event' })
  idAlertEvent: string;

  @Column({ type: 'uuid', name: 'id_alert_rule', nullable: false })
  idAlertRule: string;

  @Column({ type: 'timestamptz', name: 'triggered_at', nullable: false })
  triggeredAt: Date;

  @Column({ type: 'double precision', nullable: true })
  value: number;

  @Column({ type: 'text', default: 'open' })
  status: string;

  // Deduplication fields
  @Column({ type: 'text', name: 'anomaly_type', nullable: true })
  anomalyType: string;

  @Column({ type: 'integer', name: 'occurrence_count', default: 1 })
  occurrenceCount: number;

  @Column({ type: 'double precision', name: 'first_value', nullable: true })
  firstValue: number;

  @Column({ type: 'double precision', name: 'last_value', nullable: true })
  lastValue: number;

  @Column({ type: 'double precision', name: 'max_value', nullable: true })
  maxValue: number;

  @Column({ type: 'double precision', name: 'min_value', nullable: true })
  minValue: number;

  @Column({ type: 'timestamptz', name: 'last_occurrence_at', nullable: true })
  lastOccurrenceAt: Date;

  // Existing fields...
  @Column({ type: 'uuid', name: 'acknowledged_by', nullable: true })
  acknowledgedBy: string;

  @Column({ type: 'timestamptz', name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'uuid', name: 'cleared_by', nullable: true })
  clearedBy: string;

  @Column({ type: 'timestamptz', name: 'cleared_at', nullable: true })
  clearedAt: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations...
}
```

---

## 4. Deduplication Service

### 4.1 Service Implementation

```typescript
// src/modules/ml/services/alert-deduplication.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AlertEvent } from '../../../entities/alert-event.entity';
import { AnomalyResult } from '../../../entities/anomaly-result.entity';

@Injectable()
export class AlertDeduplicationService {
  private readonly logger = new Logger(AlertDeduplicationService.name);

  constructor(
    @InjectRepository(AlertEvent)
    private alertRepo: Repository<AlertEvent>,
    private configService: ConfigService,
  ) {}

  /**
   * Check if an anomaly should create a new alert or update existing
   */
  async processAnomaly(anomaly: AnomalyResult): Promise<ProcessResult> {
    const suppressionMinutes = this.configService.get(
      'email.alert.suppressionMinutes',
      30
    );

    const suppressionThreshold = new Date();
    suppressionThreshold.setMinutes(
      suppressionThreshold.getMinutes() - suppressionMinutes
    );

    // Find existing open alert for same channel + type
    const existingAlert = await this.findExistingAlert(
      anomaly.idSensorChannel,
      anomaly.anomalyType,
      suppressionThreshold
    );

    if (existingAlert) {
      // Update existing alert (no new notification)
      return this.updateExistingAlert(existingAlert, anomaly);
    } else {
      // Create new alert (send notification)
      return this.createNewAlert(anomaly);
    }
  }

  /**
   * Find existing open alert within suppression window
   */
  private async findExistingAlert(
    channelId: string,
    anomalyType: string,
    since: Date
  ): Promise<AlertEvent | null> {
    return this.alertRepo.findOne({
      where: {
        alertRule: {
          idSensorChannel: channelId,
        },
        anomalyType,
        status: 'open',
        triggeredAt: MoreThan(since),
      },
      relations: ['alertRule'],
    });
  }

  /**
   * Update existing alert with new occurrence
   */
  private async updateExistingAlert(
    alert: AlertEvent,
    anomaly: AnomalyResult
  ): Promise<ProcessResult> {
    // Update occurrence stats
    alert.occurrenceCount += 1;
    alert.lastValue = anomaly.actualValue;
    alert.lastOccurrenceAt = new Date();
    
    // Track min/max values
    if (anomaly.actualValue > (alert.maxValue || -Infinity)) {
      alert.maxValue = anomaly.actualValue;
    }
    if (anomaly.actualValue < (alert.minValue || Infinity)) {
      alert.minValue = anomaly.actualValue;
    }

    await this.alertRepo.save(alert);

    this.logger.debug(
      `Updated existing alert ${alert.idAlertEvent}, ` +
      `occurrence #${alert.occurrenceCount}`
    );

    return {
      action: 'updated',
      alertId: alert.idAlertEvent,
      sendNotification: false,
      occurrenceCount: alert.occurrenceCount,
    };
  }

  /**
   * Create new alert
   */
  private async createNewAlert(anomaly: AnomalyResult): Promise<ProcessResult> {
    // Get or create alert rule
    const alertRule = await this.getAlertRule(anomaly);

    const alert = this.alertRepo.create({
      idAlertRule: alertRule.idAlertRule,
      triggeredAt: new Date(),
      value: anomaly.actualValue,
      status: 'open',
      anomalyType: anomaly.anomalyType,
      occurrenceCount: 1,
      firstValue: anomaly.actualValue,
      lastValue: anomaly.actualValue,
      maxValue: anomaly.actualValue,
      minValue: anomaly.actualValue,
      lastOccurrenceAt: new Date(),
    });

    const saved = await this.alertRepo.save(alert);

    // Link anomaly to alert
    anomaly.idAlertEvent = saved.idAlertEvent;
    await this.anomalyRepo.save(anomaly);

    this.logger.log(
      `Created new alert ${saved.idAlertEvent} for ` +
      `channel ${anomaly.idSensorChannel}, type ${anomaly.anomalyType}`
    );

    return {
      action: 'created',
      alertId: saved.idAlertEvent,
      sendNotification: true,
      occurrenceCount: 1,
    };
  }
}

interface ProcessResult {
  action: 'created' | 'updated';
  alertId: string;
  sendNotification: boolean;
  occurrenceCount: number;
}
```

---

## 5. Suppression Window Configuration

### 5.1 Per-Channel Configuration

```typescript
// Optional: Different suppression per channel via alert_rules.params_json
{
  "suppression_minutes": 60,  // Custom for this channel
  "min_grade": "severe"
}

// In service
async getSuppressionMinutes(channelId: string): Promise<number> {
  const rule = await this.alertRuleRepo.findOne({
    where: { idSensorChannel: channelId }
  });
  
  return rule?.paramsJson?.suppression_minutes 
    || this.configService.get('email.alert.suppressionMinutes', 30);
}
```

### 5.2 By Severity

| Severity | Suppression Window | Rationale |
|----------|-------------------|-----------|
| CRITICAL | 15 minutes | Shorter - need frequent updates |
| HIGH | 30 minutes | Default |
| MEDIUM | 60 minutes | Less urgent |
| LOW | 120 minutes | 2 hours |

```typescript
getSuppressionBySeverity(severity: string): number {
  const windows = {
    'CRITICAL': 15,
    'HIGH': 30,
    'MEDIUM': 60,
    'LOW': 120,
  };
  return windows[severity] || 30;
}
```

---

## 6. Alert Lifecycle

### 6.1 State Machine

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
┌────────┐    ┌─────────┐    ┌──────────────┐    ┌─────────┐  │
│ Anomaly│───►│  OPEN   │───►│ ACKNOWLEDGED │───►│ CLEARED │  │
│Detected│    │         │    │              │    │         │  │
└────────┘    └────┬────┘    └──────────────┘    └─────────┘  │
                   │                                          │
                   │ New occurrence (same type)                │
                   └──────────────────────────────────────────┘
                         Update count, no state change
```

### 6.2 Transition Rules

| From | To | Trigger | Notes |
|------|----|---------|----|
| - | OPEN | New anomaly | Send notification |
| OPEN | OPEN | Duplicate anomaly | Update stats only |
| OPEN | ACKNOWLEDGED | User action | Notification stops |
| OPEN | CLEARED | Auto-clear / User | Value back to normal |
| ACKNOWLEDGED | OPEN | New anomaly after window | New alert cycle |
| ACKNOWLEDGED | CLEARED | User resolves | Final state |
| CLEARED | OPEN | New anomaly | New alert |

---

## 7. Notification Logic

### 7.1 When to Send Notifications

```typescript
async shouldSendNotification(
  alert: AlertEvent,
  result: ProcessResult
): Promise<boolean> {
  // Only notify on new alerts
  if (result.action !== 'created') {
    return false;
  }

  // Check if notification is enabled for this rule
  const rule = await this.alertRuleRepo.findOne(alert.idAlertRule);
  if (!rule.enabled) {
    return false;
  }

  // Check quiet hours
  if (this.isQuietHours() && rule.severity !== 'CRITICAL') {
    return false;
  }

  // Check rate limit per recipient
  if (await this.isRateLimited(alert.alertRule.project)) {
    this.logger.warn('Rate limit reached, skipping notification');
    return false;
  }

  return true;
}

isQuietHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const quietStart = parseInt(this.config.get('NOTIFICATION_QUIET_START'), 10);
  const quietEnd = parseInt(this.config.get('NOTIFICATION_QUIET_END'), 10);
  
  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (quietStart > quietEnd) {
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart && hour < quietEnd;
}
```

### 7.2 Escalation (Optional)

```typescript
// If alert stays open too long, escalate
async checkEscalation(alert: AlertEvent): Promise<void> {
  if (!this.config.get('ALERT_ESCALATION_ENABLED')) {
    return;
  }

  const ageMinutes = (Date.now() - alert.triggeredAt.getTime()) / 60000;

  // Escalation levels
  if (alert.status === 'open') {
    if (ageMinutes > 60 && !alert.escalatedLevel1) {
      await this.escalateToLevel1(alert);
    }
    if (ageMinutes > 120 && !alert.escalatedLevel2) {
      await this.escalateToLevel2(alert);
    }
  }
}
```

---

## 8. Grouping (Advanced)

### 8.1 Alert Grouping by Node

If multiple channels on the same node have anomalies, group them:

```typescript
interface AlertGroup {
  nodeId: string;
  nodeCode: string;
  alerts: AlertEvent[];
  firstAlert: Date;
  severity: string; // Highest severity in group
}

async groupAlerts(): Promise<AlertGroup[]> {
  const openAlerts = await this.alertRepo.find({
    where: { status: 'open' },
    relations: ['alertRule', 'alertRule.sensorChannel'],
  });

  // Group by node
  const groups = new Map<string, AlertGroup>();
  
  for (const alert of openAlerts) {
    const nodeId = alert.alertRule.sensorChannel.node.idNode;
    
    if (!groups.has(nodeId)) {
      groups.set(nodeId, {
        nodeId,
        nodeCode: alert.alertRule.sensorChannel.node.nodeCode,
        alerts: [],
        firstAlert: alert.triggeredAt,
        severity: alert.alertRule.severity,
      });
    }
    
    const group = groups.get(nodeId)!;
    group.alerts.push(alert);
    
    // Update first alert time
    if (alert.triggeredAt < group.firstAlert) {
      group.firstAlert = alert.triggeredAt;
    }
    
    // Update severity (keep highest)
    if (this.compareSeverity(alert.alertRule.severity, group.severity) > 0) {
      group.severity = alert.alertRule.severity;
    }
  }

  return Array.from(groups.values());
}
```

### 8.2 Grouped Notification

```
Subject: [CRITICAL] 3 Alerts on NODE-001 (WTP-01)

Summary:
- 2 Pressure anomalies
- 1 Flow anomaly

Details:
┌──────────────────┬───────────┬──────────────┬────────────┐
│ Channel          │ Type      │ Value        │ Time       │
├──────────────────┼───────────┼──────────────┼────────────┤
│ Pressure IN      │ Spike     │ 9.2 bar      │ 10:30      │
│ Pressure OUT     │ Spike     │ 8.8 bar      │ 10:30      │
│ Flow Main        │ Drop      │ 45 m³/h      │ 10:32      │
└──────────────────┴───────────┴──────────────┴────────────┘

[View Node Dashboard] [Acknowledge All]
```

---

## 9. API Extensions

### 9.1 Bulk Operations

```typescript
// POST /ml/alerts/bulk-acknowledge
@Post('bulk-acknowledge')
async bulkAcknowledge(@Body() dto: BulkAcknowledgeDto) {
  return this.alertService.bulkAcknowledge(dto.alertIds, dto.note, user);
}

// POST /ml/alerts/acknowledge-by-node/:nodeId
@Post('acknowledge-by-node/:nodeId')
async acknowledgeByNode(
  @Param('nodeId') nodeId: string,
  @Body('note') note: string,
) {
  return this.alertService.acknowledgeByNode(nodeId, note, user);
}
```

### 9.2 Alert History in Response

```json
{
  "idAlertEvent": "uuid",
  "triggeredAt": "2026-02-27T10:00:00Z",
  "status": "open",
  "occurrenceCount": 5,
  "firstValue": 8.5,
  "lastValue": 9.2,
  "maxValue": 9.4,
  "minValue": 8.5,
  "lastOccurrenceAt": "2026-02-27T10:40:00Z",
  "duration": "40 minutes",
  "trend": "increasing"
}
```

---

## 10. Testing Deduplication

### 10.1 Unit Test Cases

```typescript
describe('AlertDeduplicationService', () => {
  describe('processAnomaly', () => {
    it('should create new alert for first occurrence', async () => {
      const anomaly = createMockAnomaly();
      const result = await service.processAnomaly(anomaly);
      
      expect(result.action).toBe('created');
      expect(result.sendNotification).toBe(true);
      expect(result.occurrenceCount).toBe(1);
    });

    it('should update existing alert for duplicate', async () => {
      // Create first alert
      const anomaly1 = createMockAnomaly();
      await service.processAnomaly(anomaly1);
      
      // Same anomaly 5 minutes later
      const anomaly2 = createMockAnomaly();
      anomaly2.actualValue = 9.5;
      const result = await service.processAnomaly(anomaly2);
      
      expect(result.action).toBe('updated');
      expect(result.sendNotification).toBe(false);
      expect(result.occurrenceCount).toBe(2);
    });

    it('should create new alert after suppression window', async () => {
      // Create first alert
      const anomaly1 = createMockAnomaly();
      await service.processAnomaly(anomaly1);
      
      // Fast-forward past suppression window
      jest.advanceTimersByTime(31 * 60 * 1000); // 31 minutes
      
      // Same anomaly after window
      const anomaly2 = createMockAnomaly();
      const result = await service.processAnomaly(anomaly2);
      
      expect(result.action).toBe('created');
      expect(result.sendNotification).toBe(true);
    });

    it('should not deduplicate different anomaly types', async () => {
      const anomaly1 = createMockAnomaly({ type: 'threshold_breach' });
      const anomaly2 = createMockAnomaly({ type: 'forecast_deviation' });
      
      await service.processAnomaly(anomaly1);
      const result = await service.processAnomaly(anomaly2);
      
      expect(result.action).toBe('created');
    });
  });
});
```

---

## 11. Related Documents

- [05-API-DESIGN.md](05-API-DESIGN.md) - API specification
- [07-SCHEDULER-CONFIG.md](07-SCHEDULER-CONFIG.md) - Scheduler jobs
- [09-ERROR-HANDLING.md](09-ERROR-HANDLING.md) - Error handling
- [10-EMAIL-TEMPLATES.md](10-EMAIL-TEMPLATES.md) - Email templates

---

**Next:** Error Handling Strategy

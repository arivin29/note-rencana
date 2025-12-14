# Alert Phase 1: Node Offline Detection

## 🎯 Goal
Detect dan alert ketika IoT node/device tidak mengirim data dalam waktu tertentu.

---

## ⏱️ Alert Thresholds

| Duration | Severity | Action |
|----------|----------|--------|
| > 30 min | ⚠️ **Warning** | Send notification |
| > 1 hour | 🔴 **Critical** | Escalate to admin |
| > 6 hours | 🚫 **Offline** | Mark as inactive |

---

## 🗄️ Database Structure

### Use Existing `nodes` Table
```sql
-- Check node yang offline
SELECT 
  id_node,
  name,
  last_sync,
  NOW() - last_sync AS offline_duration,
  CASE
    WHEN NOW() - last_sync > INTERVAL '1 hour' THEN 'critical'
    WHEN NOW() - last_sync > INTERVAL '30 minutes' THEN 'warning'
    ELSE 'online'
  END AS status
FROM nodes
WHERE last_sync IS NOT NULL
  AND NOW() - last_sync > INTERVAL '30 minutes';
```

### Alert Events Table (Already Exists)
```sql
-- Create alert event when node offline
INSERT INTO alert_events (
  id_alert_event,
  id_alert_rule,
  triggered_at,
  value,
  status,
  created_at
) VALUES (
  uuid_generate_v4(),
  '<offline_rule_id>',
  NOW(),
  EXTRACT(EPOCH FROM (NOW() - last_sync)), -- Duration in seconds
  'open',
  NOW()
);
```

---

## 💻 Backend Implementation

### 1. Create Alerts Module

```bash
cd iot-backend/src/modules
nest g module alerts
nest g service alerts/alert-checker
nest g service alerts
nest g controller alerts
```

### 2. Alert Checker Service (Cron Job)

**File:** `iot-backend/src/modules/alerts/alert-checker.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Node } from '../entities/node.entity';
import { AlertEvent } from '../entities/alert-event.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AlertCheckerService {
  private readonly logger = new Logger(AlertCheckerService.name);

  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    @InjectRepository(AlertEvent)
    private alertEventRepository: Repository<AlertEvent>,
  ) {}

  // Run every 5 minutes
  @Cron('*/5 * * * *')
  async checkOfflineNodes() {
    this.logger.log('🔍 Checking for offline nodes...');

    const now = new Date();
    const warningThreshold = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    const criticalThreshold = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    // Find nodes that haven't synced in 30+ minutes
    const offlineNodes = await this.nodeRepository.find({
      where: {
        lastSync: LessThan(warningThreshold),
      },
      relations: ['gateway', 'project'],
    });

    this.logger.log(`Found ${offlineNodes.length} offline nodes`);

    for (const node of offlineNodes) {
      const offlineDuration = now.getTime() - node.lastSync.getTime();
      const offlineMinutes = Math.floor(offlineDuration / 60000);

      // Determine severity
      let severity: 'warning' | 'critical';
      if (node.lastSync < criticalThreshold) {
        severity = 'critical';
      } else {
        severity = 'warning';
      }

      await this.createOrUpdateOfflineAlert(node, severity, offlineMinutes);
    }

    this.logger.log('✅ Offline node check completed');
  }

  async createOrUpdateOfflineAlert(
    node: Node,
    severity: 'warning' | 'critical',
    offlineMinutes: number,
  ) {
    // Check if there's already an open alert for this node
    const existingAlert = await this.alertEventRepository.findOne({
      where: {
        nodeId: node.idNode,
        alertType: 'node_offline',
        status: 'open',
      },
    });

    if (existingAlert) {
      // Update existing alert
      existingAlert.severity = severity;
      existingAlert.value = offlineMinutes;
      existingAlert.updatedAt = new Date();
      existingAlert.message = `Node "${node.name}" offline for ${offlineMinutes} minutes`;

      await this.alertEventRepository.save(existingAlert);
      this.logger.log(
        `📝 Updated alert for node ${node.name} (${severity}, ${offlineMinutes}m)`,
      );
    } else {
      // Create new alert
      const newAlert = this.alertEventRepository.create({
        idAlertEvent: uuidv4(),
        nodeId: node.idNode,
        alertType: 'node_offline',
        severity,
        value: offlineMinutes,
        status: 'open',
        triggeredAt: new Date(),
        message: `Node "${node.name}" offline for ${offlineMinutes} minutes`,
        metadata: {
          nodeName: node.name,
          gatewayId: node.gateway?.idGateway,
          projectId: node.project?.idProject,
          lastSync: node.lastSync,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.alertEventRepository.save(newAlert);
      this.logger.log(
        `🚨 Created alert for node ${node.name} (${severity}, ${offlineMinutes}m)`,
      );
    }
  }

  // Auto-clear alerts when node comes back online
  @Cron('*/5 * * * *')
  async autoClearResolvedAlerts() {
    this.logger.log('🔍 Checking for resolved alerts...');

    const now = new Date();
    const onlineThreshold = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago

    // Find open offline alerts
    const openAlerts = await this.alertEventRepository.find({
      where: {
        alertType: 'node_offline',
        status: 'open',
      },
      relations: ['node'],
    });

    for (const alert of openAlerts) {
      // Check if node is back online (synced in last 10 minutes)
      if (alert.node && alert.node.lastSync > onlineThreshold) {
        alert.status = 'cleared';
        alert.clearedAt = new Date();
        alert.clearedBy = 'system'; // Auto-cleared
        alert.note = 'Node came back online';
        alert.updatedAt = new Date();

        await this.alertEventRepository.save(alert);
        this.logger.log(`✅ Auto-cleared alert for node ${alert.node.name}`);
      }
    }

    this.logger.log('✅ Auto-clear check completed');
  }
}
```

---

### 3. Alerts Service (Business Logic)

**File:** `iot-backend/src/modules/alerts/alerts.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AlertEvent } from '../entities/alert-event.entity';
import { Node } from '../entities/node.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertEvent)
    private alertEventRepository: Repository<AlertEvent>,
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
  ) {}

  /**
   * Get alert events with filters
   */
  async getAlertEvents(filters: {
    status?: string;
    severity?: string;
    alertType?: string;
    projectId?: string;
    limit?: number;
  }) {
    const query = this.alertEventRepository.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.node', 'node')
      .leftJoinAndSelect('node.project', 'project')
      .leftJoinAndSelect('node.gateway', 'gateway')
      .orderBy('alert.triggeredAt', 'DESC');

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query.andWhere('alert.status = :status', { status: filters.status });
    }

    if (filters.severity && filters.severity !== 'all') {
      query.andWhere('alert.severity = :severity', { severity: filters.severity });
    }

    if (filters.alertType && filters.alertType !== 'all') {
      query.andWhere('alert.alertType = :alertType', { alertType: filters.alertType });
    }

    if (filters.projectId) {
      query.andWhere('project.idProject = :projectId', { projectId: filters.projectId });
    }

    if (filters.limit) {
      query.take(filters.limit);
    }

    return await query.getMany();
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(dateRange: string = '7d') {
    const daysAgo = parseInt(dateRange.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const [open, acknowledged, cleared, total] = await Promise.all([
      this.alertEventRepository.count({ where: { status: 'open' } }),
      this.alertEventRepository.count({ where: { status: 'acknowledged' } }),
      this.alertEventRepository.count({ where: { status: 'cleared' } }),
      this.alertEventRepository.count({
        where: {
          triggeredAt: In([startDate, new Date()]),
        },
      }),
    ]);

    return {
      open,
      acknowledged,
      cleared,
      total,
      dateRange,
    };
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(id: string, userId: string, note?: string) {
    const alert = await this.alertEventRepository.findOne({
      where: { idAlertEvent: id },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    alert.note = note || alert.note;
    alert.updatedAt = new Date();

    return await this.alertEventRepository.save(alert);
  }

  /**
   * Clear/resolve alert
   */
  async clearAlert(id: string, userId: string, note?: string) {
    const alert = await this.alertEventRepository.findOne({
      where: { idAlertEvent: id },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    alert.status = 'cleared';
    alert.clearedBy = userId;
    alert.clearedAt = new Date();
    alert.note = note || alert.note;
    alert.updatedAt = new Date();

    return await this.alertEventRepository.save(alert);
  }

  /**
   * Get offline nodes summary
   */
  async getOfflineNodesSummary() {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() - 30 * 60 * 1000);
    const criticalThreshold = new Date(now.getTime() - 60 * 60 * 1000);

    const [warning, critical] = await Promise.all([
      this.nodeRepository.count({
        where: {
          lastSync: In([criticalThreshold, warningThreshold]),
        },
      }),
      this.nodeRepository.count({
        where: {
          lastSync: In([new Date(0), criticalThreshold]),
        },
      }),
    ]);

    return {
      warning,
      critical,
      total: warning + critical,
    };
  }
}
```

---

### 4. Alerts Controller (REST API)

**File:** `iot-backend/src/modules/alerts/alerts.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@ApiTags('Alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get('events')
  @ApiOperation({ summary: 'Get alert events' })
  async getAlertEvents(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('alertType') alertType?: string,
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.getAlertEvents({
      status,
      severity,
      alertType,
      projectId,
      limit,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get alert statistics' })
  async getAlertStatistics(@Query('dateRange') dateRange?: string) {
    return this.alertsService.getAlertStatistics(dateRange);
  }

  @Get('offline-summary')
  @ApiOperation({ summary: 'Get offline nodes summary' })
  async getOfflineNodesSummary() {
    return this.alertsService.getOfflineNodesSummary();
  }

  @Post('events/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser() user: User,
  ) {
    return this.alertsService.acknowledgeAlert(id, user.idUser, note);
  }

  @Post('events/:id/clear')
  @ApiOperation({ summary: 'Clear/resolve alert' })
  async clearAlert(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser() user: User,
  ) {
    return this.alertsService.clearAlert(id, user.idUser, note);
  }
}
```

---

## 📁 File Structure

```
iot-backend/src/modules/alerts/
├── alerts.module.ts
├── alerts.service.ts
├── alerts.controller.ts
├── alert-checker.service.ts
└── dto/
    ├── alert-event-filters.dto.ts
    └── alert-action.dto.ts
```

---

## 🧪 Testing

### 1. Simulate Offline Node
```sql
-- Set node last_sync to 1 hour ago
UPDATE nodes
SET last_sync = NOW() - INTERVAL '1 hour'
WHERE id_node = '<test_node_id>';
```

### 2. Trigger Manual Check
```bash
# Call cron job manually
curl -X POST http://localhost:3000/api/alerts/check-offline
```

### 3. Check Alert Created
```bash
curl -X GET http://localhost:3000/api/alerts/events?status=open \
  -H "Authorization: Bearer YOUR_JWT"
```

**Expected Response:**
```json
[
  {
    "idAlertEvent": "...",
    "alertType": "node_offline",
    "severity": "critical",
    "status": "open",
    "value": 60,
    "message": "Node 'Water Tank Sensor' offline for 60 minutes",
    "triggeredAt": "2025-12-08T10:00:00Z",
    "node": {
      "idNode": "...",
      "name": "Water Tank Sensor",
      "lastSync": "2025-12-08T09:00:00Z"
    }
  }
]
```

---

## 📊 Frontend Dashboard Widget

### Offline Nodes Card
```html
<card>
  <card-header class="bg-danger text-white">
    <h5 class="mb-0">
      <i class="bi bi-exclamation-triangle me-2"></i>
      Offline Nodes
    </h5>
  </card-header>
  <card-body>
    <div class="row text-center">
      <div class="col-6">
        <h2 class="text-warning mb-0">{{ offlineSummary.warning }}</h2>
        <small class="text-muted">Warning (30m+)</small>
      </div>
      <div class="col-6">
        <h2 class="text-danger mb-0">{{ offlineSummary.critical }}</h2>
        <small class="text-muted">Critical (1h+)</small>
      </div>
    </div>
    <hr>
    <a routerLink="/iot/alert-center" class="btn btn-sm btn-outline-theme w-100">
      View All Alerts
    </a>
  </card-body>
</card>
```

---

## ✅ Implementation Checklist

### Backend
- [ ] Install `@nestjs/schedule` dependency
- [ ] Create alerts module structure
- [ ] Implement `AlertCheckerService` with cron jobs
- [ ] Implement `AlertsService` business logic
- [ ] Implement `AlertsController` REST API
- [ ] Update `app.module.ts` to import ScheduleModule
- [ ] Test cron job execution
- [ ] Test alert creation
- [ ] Test auto-clear functionality

### Frontend
- [ ] Update `alert.service.ts` with API methods
- [ ] Add offline nodes widget to dashboard
- [ ] Connect Alert Center to real API
- [ ] Add acknowledge/clear buttons
- [ ] Test in browser

---

## 🚀 Implementation Time

**Estimated:** 1-2 days

**Day 1:**
- Backend setup (4-6 hours)
- Testing with simulated data (2 hours)

**Day 2:**
- Frontend integration (3-4 hours)
- End-to-end testing (2 hours)

---

**Priority:** ⭐⭐⭐ **HIGHEST**  
**Complexity:** ⭐ **LOW**  
**Business Value:** ⭐⭐⭐ **HIGHEST**

---

**Ready to implement?** 🚀

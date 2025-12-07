# Alert System - Quick Reminder & Implementation Plan

## 📊 Status Saat Ini

**Database Schema:** ✅ SUDAH LENGKAP  
**Backend API:** ❌ BELUM ADA  
**Frontend UI:** ⚠️ SUDAH ADA tapi belum connect ke backend  
**Dokumentasi:** ✅ Sudah dibuat di `ALERT-SYSTEM-ANALYSIS.md`

---

## 🗄️ Database Tables (Already Exist)

| Table | Purpose | Status |
|-------|---------|--------|
| `sensor_channels` | Threshold config (min/max) | ✅ Ready |
| `alert_rules` | Alert rule definitions | ✅ Ready |
| `alert_events` | Active & historical alerts | ✅ Ready |
| `sensor_logs` | Raw telemetry data | ✅ Ready |

---

## 🎯 Alert Categories (Proposed)

### 1. **Threshold Alerts** (Phase 1 - PRIORITAS)
- ✅ Temperature > max threshold
- ✅ Flow rate < min threshold
- ✅ Pressure out of range
- ✅ Humidity critical

**Implementasi:** 2-3 hari  
**Complexity:** ⭐⭐ (Medium)

### 2. **Time-Based Alerts** (Phase 2)
- ⏱️ Node offline > 30 minutes
- ⏱️ No data received for X hours
- ⏱️ Last sync too old

**Implementasi:** 1-2 hari  
**Complexity:** ⭐ (Easy)

### 3. **Statistical Alerts** (Phase 3)
- 📊 Anomaly detection (sudden spike/drop)
- 📊 Moving average deviation
- 📊 Trend analysis (declining battery)

**Implementasi:** 3-5 hari  
**Complexity:** ⭐⭐⭐ (Hard)

### 4. **System Health Alerts** (Phase 4)
- 🔋 Battery < 20%
- 📶 Signal strength weak
- 💾 Storage almost full

**Implementasi:** 1-2 hari  
**Complexity:** ⭐⭐ (Medium)

---

## 📋 Phase 1 Implementation Plan (Threshold Alerts)

### Timeline: **2-3 Days**

### Day 1: Backend Foundation

#### 1. Create Alerts Module
```bash
cd iot-backend/src/modules
nest g module alerts
nest g service alerts
nest g controller alerts
```

#### 2. Create Alert Checker Service
**File:** `alert-checker.service.ts`

```typescript
@Injectable()
export class AlertCheckerService {
  constructor(
    @InjectRepository(SensorLog) private sensorLogRepo: Repository<SensorLog>,
    @InjectRepository(AlertRule) private alertRuleRepo: Repository<AlertRule>,
    @InjectRepository(AlertEvent) private alertEventRepo: Repository<AlertEvent>,
    @InjectRepository(SensorChannel) private sensorChannelRepo: Repository<SensorChannel>,
  ) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async checkThresholdAlerts() {
    const activeRules = await this.alertRuleRepo.find({
      where: { enabled: true, ruleType: 'threshold' }
    });

    for (const rule of activeRules) {
      await this.evaluateThresholdRule(rule);
    }
  }

  async evaluateThresholdRule(rule: AlertRule) {
    // Get latest sensor reading
    const latestLog = await this.sensorLogRepo.findOne({
      where: { idSensorChannel: rule.idSensorChannel },
      order: { ts: 'DESC' }
    });

    if (!latestLog) return;

    const channel = await this.sensorChannelRepo.findOne({
      where: { idSensorChannel: rule.idSensorChannel }
    });

    // Check threshold breach
    const isMaxBreach = latestLog.valueEngineered > channel.maxThreshold;
    const isMinBreach = latestLog.valueEngineered < channel.minThreshold;

    if (isMaxBreach || isMinBreach) {
      await this.createAlertEvent(rule, latestLog, isMaxBreach ? 'max' : 'min');
    }
  }

  async createAlertEvent(rule: AlertRule, log: SensorLog, breachType: string) {
    // Check if alert already exists and open
    const existingAlert = await this.alertEventRepo.findOne({
      where: {
        idAlertRule: rule.idAlertRule,
        status: 'open'
      }
    });

    if (existingAlert) {
      // Update existing alert
      existingAlert.value = log.valueEngineered;
      existingAlert.updatedAt = new Date();
      await this.alertEventRepo.save(existingAlert);
    } else {
      // Create new alert
      const newAlert = this.alertEventRepo.create({
        idAlertEvent: uuidv4(),
        idAlertRule: rule.idAlertRule,
        triggeredAt: log.ts,
        value: log.valueEngineered,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await this.alertEventRepo.save(newAlert);
    }
  }
}
```

#### 3. Create Alert REST API
**File:** `alerts.controller.ts`

```typescript
@Controller('alerts')
@ApiTags('Alerts')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get('events')
  @ApiOperation({ summary: 'Get alert events' })
  async getAlertEvents(@Query() filters: AlertEventFiltersDto) {
    return this.alertsService.getAlertEvents(filters);
  }

  @Post('events/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body() dto: AcknowledgeAlertDto,
    @CurrentUser() user: User
  ) {
    return this.alertsService.acknowledgeAlert(id, user.idUser, dto.note);
  }

  @Post('events/:id/clear')
  @ApiOperation({ summary: 'Clear/resolve alert' })
  async clearAlert(
    @Param('id') id: string,
    @Body() dto: ClearAlertDto,
    @CurrentUser() user: User
  ) {
    return this.alertsService.clearAlert(id, user.idUser, dto.note);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get alert rules' })
  async getAlertRules(@Query() filters: AlertRuleFiltersDto) {
    return this.alertsService.getAlertRules(filters);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create alert rule' })
  async createAlertRule(@Body() dto: CreateAlertRuleDto) {
    return this.alertsService.createAlertRule(dto);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateAlertRule(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto
  ) {
    return this.alertsService.updateAlertRule(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteAlertRule(@Param('id') id: string) {
    return this.alertsService.deleteAlertRule(id);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get alert statistics' })
  async getAlertStatistics(@Query() filters: DateRangeDto) {
    return this.alertsService.getAlertStatistics(filters);
  }
}
```

---

### Day 2-3: Frontend Integration

#### 1. Connect Alert Center Page
**File:** `iot-angular/src/app/pages/iot/alert-center/alert-center.component.ts`

```typescript
export class AlertCenterComponent implements OnInit {
  alerts: AlertEvent[] = [];
  loading = false;
  
  filters = {
    status: 'all',
    severity: 'all',
    dateRange: '7d'
  };

  ngOnInit() {
    this.loadAlerts();
  }

  loadAlerts() {
    this.loading = true;
    this.alertService.getAlertEvents(this.filters).subscribe({
      next: (data) => {
        this.alerts = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load alerts', err);
        this.loading = false;
      }
    });
  }

  acknowledgeAlert(alert: AlertEvent) {
    const note = prompt('Add note (optional):');
    this.alertService.acknowledgeAlert(alert.idAlertEvent, note).subscribe({
      next: () => {
        alert.status = 'acknowledged';
        alert.acknowledgedAt = new Date();
      }
    });
  }

  clearAlert(alert: AlertEvent) {
    const note = prompt('Resolution note (optional):');
    this.alertService.clearAlert(alert.idAlertEvent, note).subscribe({
      next: () => {
        alert.status = 'cleared';
        alert.clearedAt = new Date();
      }
    });
  }
}
```

#### 2. Update Alert Service
**File:** `alert.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AlertService {
  private API_URL = `${environment.apiUrl}/api/alerts`;

  constructor(private http: HttpClient) {}

  getAlertEvents(filters: any): Observable<AlertEvent[]> {
    return this.http.get<AlertEvent[]>(`${this.API_URL}/events`, {
      params: filters
    });
  }

  acknowledgeAlert(id: string, note?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/events/${id}/acknowledge`, { note });
  }

  clearAlert(id: string, note?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/events/${id}/clear`, { note });
  }

  getAlertStatistics(dateRange: string): Observable<any> {
    return this.http.get(`${this.API_URL}/statistics`, {
      params: { dateRange }
    });
  }
}
```

---

## 🎨 Frontend UI (Alert Center Page)

### Already Exists At:
`iot-angular/src/app/pages/iot/alert-center/alert-center.component.html`

### Need to Add:

#### 1. Alert List Card
```html
<card>
  <card-header>
    <div class="d-flex align-items-center">
      <span class="flex-1">Active Alerts</span>
      <span class="badge bg-danger">{{ openAlertCount }}</span>
    </div>
  </card-header>
  <card-body>
    <div *ngFor="let alert of alerts" class="alert-item">
      <div class="d-flex align-items-start">
        <div class="flex-1">
          <h6>{{ alert.sensorName }} - {{ alert.metricName }}</h6>
          <p class="text-muted mb-1">
            Value: {{ alert.value }} {{ alert.unit }}
            <span class="text-danger" *ngIf="alert.breachType === 'max'">
              (Max: {{ alert.threshold }})
            </span>
            <span class="text-warning" *ngIf="alert.breachType === 'min'">
              (Min: {{ alert.threshold }})
            </span>
          </p>
          <small class="text-muted">
            Triggered {{ alert.triggeredAt | date:'short' }}
          </small>
        </div>
        <div>
          <span class="badge" [class]="getSeverityBadge(alert.severity)">
            {{ alert.severity }}
          </span>
          <div class="mt-2">
            <button 
              class="btn btn-sm btn-outline-primary me-2"
              (click)="acknowledgeAlert(alert)"
              *ngIf="alert.status === 'open'">
              Acknowledge
            </button>
            <button 
              class="btn btn-sm btn-outline-success"
              (click)="clearAlert(alert)"
              *ngIf="alert.status !== 'cleared'">
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  </card-body>
</card>
```

#### 2. Alert Statistics Card
```html
<div class="row mb-3">
  <div class="col-md-3">
    <card>
      <card-body class="text-center">
        <h3 class="text-danger mb-0">{{ stats.open }}</h3>
        <p class="text-muted mb-0">Open Alerts</p>
      </card-body>
    </card>
  </div>
  <div class="col-md-3">
    <card>
      <card-body class="text-center">
        <h3 class="text-warning mb-0">{{ stats.acknowledged }}</h3>
        <p class="text-muted mb-0">Acknowledged</p>
      </card-body>
    </card>
  </div>
  <div class="col-md-3">
    <card>
      <card-body class="text-center">
        <h3 class="text-success mb-0">{{ stats.cleared }}</h3>
        <p class="text-muted mb-0">Cleared</p>
      </card-body>
    </card>
  </div>
  <div class="col-md-3">
    <card>
      <card-body class="text-center">
        <h3 class="text-info mb-0">{{ stats.total }}</h3>
        <p class="text-muted mb-0">Total (7 Days)</p>
      </card-body>
    </card>
  </div>
</div>
```

---

## 📊 Sample Alert Rules (Seed Data)

### Temperature Critical
```sql
INSERT INTO alert_rules (id_alert_rule, id_sensor_channel, rule_type, severity, params_json, enabled)
VALUES (
  uuid_generate_v4(),
  '<temperature_channel_id>',
  'threshold_max',
  'critical',
  '{"threshold": 85, "duration_sec": 60, "hysteresis": 2}',
  true
);
```

### Flow Rate Low Warning
```sql
INSERT INTO alert_rules (id_alert_rule, id_sensor_channel, rule_type, severity, params_json, enabled)
VALUES (
  uuid_generate_v4(),
  '<flow_rate_channel_id>',
  'threshold_min',
  'warning',
  '{"threshold": 10, "duration_sec": 300}',
  true
);
```

---

## ✅ Implementation Checklist

### Backend (Day 1)
- [ ] Create `alerts` module in iot-backend
- [ ] Create `AlertCheckerService` with cron job
- [ ] Implement `evaluateThresholdRule()` method
- [ ] Implement `createAlertEvent()` method
- [ ] Create REST API endpoints:
  - [ ] GET `/api/alerts/events`
  - [ ] POST `/api/alerts/events/:id/acknowledge`
  - [ ] POST `/api/alerts/events/:id/clear`
  - [ ] GET `/api/alerts/rules`
  - [ ] POST `/api/alerts/rules`
  - [ ] GET `/api/alerts/statistics`
- [ ] Create DTOs (AlertEventFiltersDto, AcknowledgeAlertDto, etc.)
- [ ] Test with Postman/Swagger

### Frontend (Day 2-3)
- [ ] Update `alert.service.ts` with API methods
- [ ] Connect Alert Center component to real API
- [ ] Add alert list with status badges
- [ ] Add acknowledge button functionality
- [ ] Add clear button functionality
- [ ] Add alert statistics cards
- [ ] Add filters (status, severity, date range)
- [ ] Test in browser
- [ ] Add real-time updates (optional: WebSocket)

### Testing (Day 3)
- [ ] Create test alert rules in database
- [ ] Generate sensor logs that breach thresholds
- [ ] Verify cron job triggers correctly
- [ ] Test acknowledge workflow
- [ ] Test clear workflow
- [ ] Verify statistics accuracy

---

## 🚀 Quick Start Command

```bash
# Create backend module
cd iot-backend
nest g module modules/alerts
nest g service modules/alerts
nest g controller modules/alerts

# Install cron dependency (if not installed)
npm install @nestjs/schedule
```

---

## 📚 Documentation Reference

- **Full Analysis:** `ALERT-SYSTEM-ANALYSIS.md` (641 lines)
- **Database Schema:** Check existing tables via `check_columns.sql`
- **Frontend Component:** `iot-angular/src/app/pages/iot/alert-center/`

---

## 💡 Next Question to Answer

**User:** "bro sepertinya http://localhost:4200/profile halaman ini blom ada bro"  
**✅ Status:** SOLVED - Profile page exists, backend endpoints added

**User:** "bro pada halaman Alert Center saya masih bingung kira kira alert apa yang perlu kita siapkan"  
**✅ Status:** ANALYZED - Ready for Phase 1 implementation

**Next:** "Mau implement Alert Phase 1 sekarang?" 🚀

---

**Last Updated:** December 8, 2025  
**Status:** 📋 Planning Complete - Ready to implement  
**Estimated Time:** 2-3 days for Phase 1 (Threshold Alerts)

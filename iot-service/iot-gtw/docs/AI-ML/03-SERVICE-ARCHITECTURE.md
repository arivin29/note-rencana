# Service Architecture: ML Module Structure

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0

> **Quick Reference:**
> - `iot-gtw` → Background jobs, ML orchestration, sync (Section 2)
> - `iot-backend` → REST API untuk Angular, notifications (Section 3)

---

## 1. Service Split Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SERVICE RESPONSIBILITY SPLIT                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          iot-gtw (Gateway)                             │  │
│  │                                                                       │  │
│  │  Responsibilities:                                                    │  │
│  │  ├─ Telemetry ingestion (MQTT, Teltonika)                            │  │
│  │  ├─ Data processing & transformation                                  │  │
│  │  ├─ ClickHouse writes (raw + aggregates)                             │  │
│  │  ├─ OpenSearch sync (ClickHouse → OpenSearch)                        │  │
│  │  ├─ ML orchestration (trigger detectors, fetch results)             │  │
│  │  ├─ Forecast generation (periodic)                                   │  │
│  │  └─ Scheduler jobs (cron-based)                                      │  │
│  │                                                                       │  │
│  │  Why here: Real-time processing, close to data source                │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                                    │                                        │
│                                    │ Internal calls / Shared PostgreSQL     │
│                                    ▼                                        │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       iot-backend (API Server)                         │  │
│  │                                                                       │  │
│  │  Responsibilities:                                                    │  │
│  │  ├─ REST API for frontend (Angular)                                  │  │
│  │  ├─ Anomaly/Forecast/Alert APIs                                      │  │
│  │  ├─ User authentication & authorization                              │  │
│  │  ├─ Email notifications (Nodemailer)                                 │  │
│  │  ├─ Alert lifecycle management                                       │  │
│  │  └─ Dashboard data aggregation                                       │  │
│  │                                                                       │  │
│  │  Why here: User-facing APIs, authentication, notifications           │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. iot-gtw Module Structure

```
src/
├── modules/
│   ├── ml/                              # NEW: ML Module
│   │   ├── ml.module.ts                 # Module definition
│   │   │
│   │   ├── services/
│   │   │   ├── opensearch.service.ts    # OpenSearch client wrapper
│   │   │   ├── opensearch-sync.service.ts   # ClickHouse → OpenSearch sync
│   │   │   ├── anomaly-detection.service.ts # Poll & process anomaly results
│   │   │   ├── forecast.service.ts      # Generate & store forecasts
│   │   │   └── ml-config.service.ts     # Load thresholds from PostgreSQL
│   │   │
│   │   ├── jobs/
│   │   │   ├── sync.job.ts              # Cron: */10 * * * *
│   │   │   ├── anomaly-poll.job.ts      # Cron: 2,12,22... * * * *
│   │   │   ├── forecast.job.ts          # Cron: 0 0,12 * * *
│   │   │   └── cleanup.job.ts           # Cron: 0 1 * * *
│   │   │
│   │   ├── interfaces/
│   │   │   ├── opensearch-document.interface.ts
│   │   │   ├── anomaly-result.interface.ts
│   │   │   ├── forecast-result.interface.ts
│   │   │   └── detector-config.interface.ts
│   │   │
│   │   └── constants/
│   │       ├── index-templates.ts       # OpenSearch index mappings
│   │       └── detector-configs.ts      # ML detector configurations
│   │
│   ├── clickhouse/                      # EXISTING
│   │   └── ...
│   │
│   └── telemetry/                       # EXISTING
│       └── ...
│
├── shared/
│   ├── database/
│   │   └── entities/                    # Shared entities (if needed)
│   └── utils/
│       ├── retry.util.ts                # Retry logic with backoff
│       └── batch.util.ts                # Batching utilities
│
└── config/
    └── ml.config.ts                     # ML configuration (env-based)
```

### 2.1 ml.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { SensorChannel } from '../entities/sensor-channel.entity';

// Services
import { OpenSearchService } from './services/opensearch.service';
import { OpenSearchSyncService } from './services/opensearch-sync.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { ForecastService } from './services/forecast.service';
import { MlConfigService } from './services/ml-config.service';

// Jobs
import { SyncJob } from './jobs/sync.job';
import { AnomalyPollJob } from './jobs/anomaly-poll.job';
import { ForecastJob } from './jobs/forecast.job';
import { CleanupJob } from './jobs/cleanup.job';

// Dependencies
import { ClickHouseModule } from '../clickhouse/clickhouse.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    TypeOrmModule.forFeature([SensorChannel]),
    ClickHouseModule,
  ],
  providers: [
    // Services
    OpenSearchService,
    OpenSearchSyncService,
    AnomalyDetectionService,
    ForecastService,
    MlConfigService,
    // Jobs
    SyncJob,
    AnomalyPollJob,
    ForecastJob,
    CleanupJob,
  ],
  exports: [
    OpenSearchService,
    AnomalyDetectionService,
    ForecastService,
  ],
})
export class MlModule {}
```

### 2.2 Key Services

#### opensearch.service.ts
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private client: Client;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Client({
      node: this.configService.get('OPENSEARCH_URL'),
      auth: {
        username: this.configService.get('OPENSEARCH_USER'),
        password: this.configService.get('OPENSEARCH_PASSWORD'),
      },
      ssl: {
        rejectUnauthorized: false, // For self-signed certs
      },
    });

    await this.ensureIndexTemplates();
  }

  async ensureIndexTemplates() {
    // Create index templates on startup
  }

  async bulkIndex(index: string, documents: any[]): Promise<void> {
    // Bulk index documents
  }

  async search(index: string, query: any): Promise<any> {
    // Search with pagination
  }

  async getAnomalyResults(detectorId: string, from: Date): Promise<any[]> {
    // Get anomaly detection results
  }

  async createForecast(channelId: string, data: any[]): Promise<any> {
    // Call forecast API
  }
}
```

#### opensearch-sync.service.ts
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';
import { ClickHouseService } from '../../clickhouse/clickhouse.service';
import { MlConfigService } from './ml-config.service';

@Injectable()
export class OpenSearchSyncService {
  private readonly logger = new Logger(OpenSearchSyncService.name);
  private lastSyncTime: Date;

  constructor(
    private opensearchService: OpenSearchService,
    private clickhouseService: ClickHouseService,
    private mlConfigService: MlConfigService,
  ) {}

  async sync(): Promise<{ synced: number; errors: number }> {
    const startTime = this.lastSyncTime || new Date(Date.now() - 10 * 60 * 1000);
    
    // 1. Query new aggregates from ClickHouse
    const aggregates = await this.clickhouseService.query(`
      SELECT 
        time_bucket,
        owner_code,
        project_id,
        project_code,
        node_id,
        node_code,
        sensor_id,
        sensor_label,
        channel_id,
        metric_code,
        metric_unit,
        avgMerge(avg_raw_state) as avg_raw,
        avgMerge(avg_eng_state) as avg_eng,
        min(min_eng) as min_eng,
        max(max_eng) as max_eng,
        sum(sample_count) as sample_count
      FROM iot.sensor_telemetry_10min
      WHERE time_bucket > {startTime:DateTime}
      GROUP BY time_bucket, owner_code, project_id, project_code, 
               node_id, node_code, sensor_id, sensor_label, 
               channel_id, metric_code, metric_unit
      ORDER BY time_bucket
    `, { startTime });

    if (aggregates.length === 0) {
      return { synced: 0, errors: 0 };
    }

    // 2. Enrich with thresholds from PostgreSQL
    const channelIds = [...new Set(aggregates.map(a => a.channel_id))];
    const thresholds = await this.mlConfigService.getThresholds(channelIds);

    // 3. Transform to OpenSearch documents
    const documents = aggregates.map(agg => ({
      ...agg,
      min_threshold: thresholds[agg.channel_id]?.minThreshold,
      max_threshold: thresholds[agg.channel_id]?.maxThreshold,
      '@timestamp': agg.time_bucket,
    }));

    // 4. Bulk index
    const indexName = `sensor-telemetry-10min-${this.getIndexSuffix()}`;
    await this.opensearchService.bulkIndex(indexName, documents);

    this.lastSyncTime = new Date();
    return { synced: documents.length, errors: 0 };
  }

  private getIndexSuffix(): string {
    const now = new Date();
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

---

## 3. iot-backend Module Structure

```
src/
├── modules/
│   ├── ml/                              # NEW: ML API Module
│   │   ├── ml.module.ts
│   │   │
│   │   ├── controllers/
│   │   │   ├── anomaly.controller.ts    # /ml/anomalies
│   │   │   ├── forecast.controller.ts   # /ml/forecasts
│   │   │   ├── alert.controller.ts      # /ml/alerts
│   │   │   └── dashboard.controller.ts  # /ml/dashboard
│   │   │
│   │   ├── services/
│   │   │   ├── anomaly.service.ts       # CRUD for anomaly_results
│   │   │   ├── forecast.service.ts      # CRUD for forecast_results
│   │   │   ├── alert.service.ts         # Alert lifecycle
│   │   │   └── ml-dashboard.service.ts  # Dashboard aggregations
│   │   │
│   │   └── dto/
│   │       ├── anomaly-query.dto.ts
│   │       ├── forecast-query.dto.ts
│   │       ├── alert-acknowledge.dto.ts
│   │       └── dashboard-summary.dto.ts
│   │
│   ├── notifications/                   # EXTEND existing module
│   │   ├── notifications.module.ts
│   │   │
│   │   ├── services/
│   │   │   ├── email.service.ts         # NEW: Nodemailer service
│   │   │   └── notification.service.ts  # Existing
│   │   │
│   │   └── templates/
│   │       ├── anomaly-alert.hbs        # Handlebars template
│   │       ├── daily-summary.hbs
│   │       └── forecast-warning.hbs
│   │
│   └── ...existing modules...
│
├── entities/
│   ├── anomaly-result.entity.ts         # Already created
│   ├── forecast-result.entity.ts        # Already created
│   ├── alert-rule.entity.ts             # Existing
│   └── alert-event.entity.ts            # Existing
│
└── config/
    └── email.config.ts                  # SMTP configuration
```

### 3.1 ml.module.ts (backend)

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { AnomalyResult } from '../../entities/anomaly-result.entity';
import { ForecastResult } from '../../entities/forecast-result.entity';
import { AlertRule } from '../../entities/alert-rule.entity';
import { AlertEvent } from '../../entities/alert-event.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';

// Controllers
import { AnomalyController } from './controllers/anomaly.controller';
import { ForecastController } from './controllers/forecast.controller';
import { AlertController } from './controllers/alert.controller';
import { DashboardController } from './controllers/dashboard.controller';

// Services
import { AnomalyService } from './services/anomaly.service';
import { ForecastService } from './services/forecast.service';
import { AlertService } from './services/alert.service';
import { MlDashboardService } from './services/ml-dashboard.service';

// Dependencies
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnomalyResult,
      ForecastResult,
      AlertRule,
      AlertEvent,
      SensorChannel,
    ]),
    NotificationsModule,
  ],
  controllers: [
    AnomalyController,
    ForecastController,
    AlertController,
    DashboardController,
  ],
  providers: [
    AnomalyService,
    ForecastService,
    AlertService,
    MlDashboardService,
  ],
  exports: [
    AnomalyService,
    ForecastService,
    AlertService,
  ],
})
export class MlModule {}
```

### 3.2 Key Controllers

#### anomaly.controller.ts
```typescript
import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnomalyService } from '../services/anomaly.service';
import { AnomalyQueryDto } from '../dto/anomaly-query.dto';

@Controller('ml/anomalies')
@UseGuards(JwtAuthGuard)
export class AnomalyController {
  constructor(private anomalyService: AnomalyService) {}

  @Get()
  async findAll(@Query() query: AnomalyQueryDto) {
    return this.anomalyService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.anomalyService.findOne(id);
  }

  @Post(':id/acknowledge')
  async acknowledge(
    @Param('id') id: string,
    @Body('note') note: string,
    @CurrentUser() user: User,
  ) {
    return this.anomalyService.acknowledge(id, user.id, note);
  }

  @Get('stats/by-grade')
  async statsByGrade(@Query() query: AnomalyQueryDto) {
    return this.anomalyService.getStatsByGrade(query);
  }

  @Get('stats/by-channel')
  async statsByChannel(@Query() query: AnomalyQueryDto) {
    return this.anomalyService.getStatsByChannel(query);
  }
}
```

---

## 4. Email Service (notifications module)

### 4.1 email.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.initTransporter();
    this.loadTemplates();
  }

  private initTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  private loadTemplates() {
    const templateDir = path.join(__dirname, '../templates');
    const templates = ['anomaly-alert', 'daily-summary', 'forecast-warning'];
    
    for (const name of templates) {
      const filePath = path.join(templateDir, `${name}.hbs`);
      if (fs.existsSync(filePath)) {
        const source = fs.readFileSync(filePath, 'utf-8');
        this.templates.set(name, handlebars.compile(source));
      }
    }
  }

  async sendAnomalyAlert(data: AnomalyAlertData): Promise<void> {
    const template = this.templates.get('anomaly-alert');
    const html = template(data);

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM'),
      to: data.recipients.join(', '),
      subject: `[${data.severity}] ${data.anomalyType} - ${data.projectCode} / ${data.nodeCode}`,
      html,
    });

    this.logger.log(`Alert email sent to ${data.recipients.length} recipients`);
  }

  async sendDailySummary(data: DailySummaryData): Promise<void> {
    const template = this.templates.get('daily-summary');
    const html = template(data);

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_FROM'),
      to: data.recipients.join(', '),
      subject: `[Daily Summary] IoT Monitoring - ${data.date}`,
      html,
    });
  }
}

interface AnomalyAlertData {
  recipients: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  anomalyType: string;
  projectCode: string;
  nodeCode: string;
  metricCode: string;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  timestamp: string;
  dashboardUrl: string;
}

interface DailySummaryData {
  recipients: string[];
  date: string;
  totalAnomalies: number;
  criticalCount: number;
  highCount: number;
  topChannels: { channelId: string; count: number }[];
}
```

---

## 5. Shared Communication

### 5.1 Option A: Direct Database Access (Recommended)

```
┌─────────────┐                    ┌─────────────┐
│   iot-gtw   │                    │ iot-backend │
│             │                    │             │
│  Write:     │                    │  Read:      │
│  - anomaly_ │──── PostgreSQL ────│  - anomaly_ │
│    results  │                    │    results  │
│  - forecast_│                    │  - forecast_│
│    results  │                    │    results  │
│             │                    │             │
│  Read:      │                    │  Write:     │
│  - sensor_  │                    │  - alert_   │
│    channels │                    │    events   │
│  - alert_   │                    │             │
│    rules    │                    │             │
└─────────────┘                    └─────────────┘

Pros: Simple, no additional service communication
Cons: Tight coupling via database
```

### 5.2 Option B: Internal HTTP Calls

```typescript
// iot-gtw calls iot-backend to create alert

// In iot-gtw: anomaly-detection.service.ts
async processAnomaly(anomaly: AnomalyResult) {
  // Save to PostgreSQL
  await this.anomalyResultRepo.save(anomaly);
  
  // Notify iot-backend to create alert (if conditions met)
  if (anomaly.anomalyGrade === 'severe' || anomaly.anomalyGrade === 'critical') {
    await this.httpService.post(
      `${this.backendUrl}/internal/alerts/create`,
      { anomalyResultId: anomaly.idAnomalyResult }
    ).toPromise();
  }
}
```

### 5.3 Recommendation

**Use Option A (Direct Database)** untuk simplicity:
- `iot-gtw` writes to `anomaly_results`, `forecast_results`
- `iot-gtw` juga creates `alert_events` langsung jika anomaly severe/critical
- `iot-backend` hanya membaca dan manage lifecycle (acknowledge, clear)
- Email dikirim dari `iot-gtw` atau `iot-backend` (pilih satu tempat)

**Email Responsibility:**
- **Rekomendasi:** Email dari `iot-backend` karena sudah ada notification module
- `iot-gtw` set flag `needs_notification = true` di alert_events
- `iot-backend` punya scheduler yang poll new alerts dan kirim email

---

## 6. Dependencies & Packages

### 6.1 iot-gtw

```json
{
  "dependencies": {
    "@opensearch-project/opensearch": "^2.5.0",
    "@nestjs/schedule": "^4.0.0",
    "cron": "^3.1.0"
  }
}
```

### 6.2 iot-backend

```json
{
  "dependencies": {
    "nodemailer": "^6.9.0",
    "handlebars": "^4.7.8",
    "@types/nodemailer": "^6.4.0"
  }
}
```

---

## 7. Database Connection Sharing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE CONNECTIONS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PostgreSQL:                                                                │
│  ├─ iot-gtw:     Read  → sensor_channels, alert_rules                      │
│  │               Write → anomaly_results, forecast_results, alert_events   │
│  │                                                                         │
│  └─ iot-backend: Read  → all tables                                        │
│                  Write → alert_events (acknowledge, clear), alert_rules    │
│                                                                             │
│  ClickHouse:                                                                │
│  ├─ iot-gtw:     Write → sensor_telemetry, aggregates                      │
│  │               Read  → aggregates (for sync, forecast)                   │
│  │                                                                         │
│  └─ iot-backend: Read  → aggregates (for API queries)                      │
│                                                                             │
│  OpenSearch:                                                                │
│  ├─ iot-gtw:     Write → sensor-telemetry-*, anomaly-results-*             │
│  │               Read  → anomaly results from ML                           │
│  │                                                                         │
│  └─ iot-backend: (Optional) Read → for search APIs                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. File Structure Summary

### iot-gtw (Gateway)

```
src/modules/ml/
├── ml.module.ts
├── services/
│   ├── opensearch.service.ts         # OpenSearch client
│   ├── opensearch-sync.service.ts    # ClickHouse → OpenSearch
│   ├── anomaly-detection.service.ts  # Poll anomalies, save, create alerts
│   ├── forecast.service.ts           # Generate forecasts
│   └── ml-config.service.ts          # Load thresholds
├── jobs/
│   ├── sync.job.ts                   # Cron: */10
│   ├── anomaly-poll.job.ts           # Cron: 2,12,22...
│   ├── forecast.job.ts               # Cron: 0 0,12
│   └── cleanup.job.ts                # Cron: 0 1
├── interfaces/
│   └── *.interface.ts
└── constants/
    ├── index-templates.ts
    └── detector-configs.ts
```

### iot-backend (API)

```
src/modules/ml/
├── ml.module.ts
├── controllers/
│   ├── anomaly.controller.ts         # GET /ml/anomalies
│   ├── forecast.controller.ts        # GET /ml/forecasts
│   ├── alert.controller.ts           # GET/POST /ml/alerts
│   └── dashboard.controller.ts       # GET /ml/dashboard
├── services/
│   ├── anomaly.service.ts
│   ├── forecast.service.ts
│   ├── alert.service.ts
│   └── ml-dashboard.service.ts
└── dto/
    └── *.dto.ts

src/modules/notifications/
├── services/
│   └── email.service.ts              # NEW
└── templates/
    ├── anomaly-alert.hbs             # NEW
    └── daily-summary.hbs             # NEW
```

---

## 9. Related Documents

- [02-DATA-FLOW.md](02-DATA-FLOW.md) - Data flow diagrams
- [04-OPENSEARCH-TEMPLATES.md](04-OPENSEARCH-TEMPLATES.md) - Index templates
- [05-API-DESIGN.md](05-API-DESIGN.md) - API specification

---

**Next:** OpenSearch Index Templates

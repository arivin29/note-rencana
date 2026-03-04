# Scheduler Jobs Configuration

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0

> **Service Location:**
> - Sync, Anomaly Poll, Forecast, Cleanup → `iot-gtw`
> - Email Digest, Alert Auto-Clear → `iot-backend`

---

## 1. Overview

### 1.1 Job Summary

| Job | Cron | Service | Description |
|-----|------|---------|-------------|
| **Sync Job** | `*/10 * * * *` | iot-gtw | Sync ClickHouse → OpenSearch |
| **Anomaly Poll Job** | `2,12,22,32,42,52 * * * *` | iot-gtw | Poll & process anomaly results |
| **Forecast Job** | `0 0,12 * * *` | iot-gtw | Generate 7-day forecasts |
| **Cleanup Job** | `0 1 * * *` | iot-gtw | Delete old data |
| **Email Digest Job** | `0 8 * * *` | iot-backend | Send daily summary |
| **Alert Auto-Clear Job** | `0 * * * *` | iot-backend | Auto-clear stale alerts |

### 1.2 Timeline Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOURLY JOB TIMELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  :00  :02  :10  :12  :20  :22  :30  :32  :40  :42  :50  :52  :00            │
│   │    │    │    │    │    │    │    │    │    │    │    │    │             │
│   │    │    │    │    │    │    │    │    │    │    │    │    └── Next hour │
│   │    │    │    │    │    │    │    │    │    │    │    │                  │
│   │    └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘                  │
│   │         └─ Anomaly Poll (offset +2 min after sync)                      │
│   │                                                                         │
│   └────┬────┬────┬────┬────┬────┬                                           │
│        └─── Sync Job (every 10 min)                                         │
│                                                                             │
│  Special times:                                                             │
│  00:00 - Forecast Job                                                       │
│  01:00 - Cleanup Job                                                        │
│  08:00 - Email Digest                                                       │
│  12:00 - Forecast Job                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Sync Job (ClickHouse → OpenSearch)

### 2.1 Configuration

```typescript
// src/modules/ml/jobs/sync.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OpenSearchSyncService } from '../services/opensearch-sync.service';

@Injectable()
export class SyncJob {
  private readonly logger = new Logger(SyncJob.name);
  private isRunning = false;

  constructor(
    private configService: ConfigService,
    private syncService: OpenSearchSyncService,
  ) {}

  @Cron('*/10 * * * *', {
    name: 'opensearch-sync',
    timeZone: 'UTC',
  })
  async handleSync() {
    // Check if enabled
    if (!this.configService.get('ml.jobs.sync.enabled')) {
      return;
    }

    // Prevent concurrent runs
    if (this.isRunning) {
      this.logger.warn('Sync job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting OpenSearch sync...');
      
      const result = await this.syncService.sync();
      
      this.logger.log(
        `Sync completed: ${result.synced} documents indexed, ` +
        `${result.errors} errors, took ${Date.now() - startTime}ms`
      );
    } catch (error) {
      this.logger.error('Sync job failed', error.stack);
      // Don't rethrow - let next cycle retry
    } finally {
      this.isRunning = false;
    }
  }
}
```

### 2.2 Sync Service Details

```typescript
// Sync process breakdown
async sync(): Promise<SyncResult> {
  // 1. Get last sync cursor
  const lastSync = this.getLastSyncTime();
  
  // 2. Query ClickHouse for new data
  const newData = await this.queryClickHouse(lastSync);
  
  // 3. Enrich with PostgreSQL metadata
  const enriched = await this.enrichWithMetadata(newData);
  
  // 4. Bulk index to OpenSearch
  const bulkResult = await this.bulkIndex(enriched);
  
  // 5. Update cursor
  this.updateSyncCursor(bulkResult.lastTimestamp);
  
  return bulkResult;
}
```

### 2.3 Error Handling

| Error Type | Action |
|------------|--------|
| ClickHouse timeout | Retry 3x with backoff, skip cycle if fails |
| OpenSearch timeout | Retry 3x, buffer data, alert if persists |
| Partial failure | Log failed docs, continue with successful |
| Network error | Retry with exponential backoff |

---

## 3. Anomaly Poll Job

### 3.1 Configuration

```typescript
// src/modules/ml/jobs/anomaly-poll.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AnomalyDetectionService } from '../services/anomaly-detection.service';

@Injectable()
export class AnomalyPollJob {
  private readonly logger = new Logger(AnomalyPollJob.name);
  private isRunning = false;

  constructor(
    private configService: ConfigService,
    private anomalyService: AnomalyDetectionService,
  ) {}

  // Run at :02, :12, :22, :32, :42, :52 (offset from sync)
  @Cron('2,12,22,32,42,52 * * * *', {
    name: 'anomaly-poll',
    timeZone: 'UTC',
  })
  async handleAnomalyPoll() {
    if (!this.configService.get('ml.jobs.anomalyPoll.enabled')) {
      return;
    }

    if (this.isRunning) {
      this.logger.warn('Anomaly poll already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('Polling anomaly results...');
      
      const result = await this.anomalyService.pollAndProcess();
      
      this.logger.log(
        `Anomaly poll completed: ${result.processed} anomalies, ` +
        `${result.alertsCreated} alerts, took ${Date.now() - startTime}ms`
      );
    } catch (error) {
      this.logger.error('Anomaly poll failed', error.stack);
    } finally {
      this.isRunning = false;
    }
  }
}
```

### 3.2 Anomaly Detection Service Details

```typescript
// Anomaly poll process breakdown
async pollAndProcess(): Promise<PollResult> {
  const detectors = ['pressure', 'flow', 'level', 'universal'];
  let totalProcessed = 0;
  let totalAlerts = 0;

  for (const detector of detectors) {
    // 1. Get anomaly results from OpenSearch
    const anomalies = await this.opensearch.getAnomalyResults(detector);
    
    for (const anomaly of anomalies) {
      // 2. Get forecast for comparison (dynamic baseline)
      const forecast = await this.getForecast(
        anomaly.channelId, 
        anomaly.timestamp
      );
      
      // 3. Calculate deviation
      const deviation = this.calculateDeviation(
        anomaly.actualValue,
        forecast?.predictedValue
      );
      
      // 4. Determine grade
      const grade = this.determineGrade(anomaly.anomalyScore, deviation);
      
      // 5. Check deduplication
      const isDuplicate = await this.checkDuplicate(
        anomaly.channelId,
        anomaly.type,
        30 // suppression minutes
      );
      
      if (!isDuplicate) {
        // 6. Save to PostgreSQL
        const saved = await this.saveAnomalyResult({
          ...anomaly,
          expectedValue: forecast?.predictedValue,
          deviation,
          grade,
        });
        
        // 7. Create alert if needed
        if (grade === 'severe' || grade === 'critical') {
          await this.createAlert(saved);
          totalAlerts++;
        }
        
        totalProcessed++;
      }
    }
  }

  return { processed: totalProcessed, alertsCreated: totalAlerts };
}
```

---

## 4. Forecast Job

### 4.1 Configuration

```typescript
// src/modules/ml/jobs/forecast.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ForecastService } from '../services/forecast.service';

@Injectable()
export class ForecastJob {
  private readonly logger = new Logger(ForecastJob.name);
  private isRunning = false;

  constructor(
    private configService: ConfigService,
    private forecastService: ForecastService,
  ) {}

  // Run at 00:00 and 12:00 UTC
  @Cron('0 0,12 * * *', {
    name: 'forecast-generation',
    timeZone: 'UTC',
  })
  async handleForecast() {
    if (!this.configService.get('ml.jobs.forecast.enabled')) {
      return;
    }

    if (this.isRunning) {
      this.logger.warn('Forecast job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting forecast generation...');
      
      const result = await this.forecastService.generateAllForecasts();
      
      this.logger.log(
        `Forecast completed: ${result.channelsProcessed} channels, ` +
        `${result.forecastsGenerated} forecasts, ` +
        `${result.failures} failures, took ${Date.now() - startTime}ms`
      );
    } catch (error) {
      this.logger.error('Forecast job failed', error.stack);
    } finally {
      this.isRunning = false;
    }
  }
}
```

### 4.2 Forecast Service Details

```typescript
// Forecast generation process
async generateAllForecasts(): Promise<ForecastResult> {
  const config = this.configService.get('ml.forecast');
  const batchId = uuidv4();
  
  // 1. Get all active sensor channels
  const channels = await this.getActiveChannels();
  
  let processed = 0;
  let generated = 0;
  let failures = 0;

  // 2. Process in batches (to avoid memory issues)
  const batches = chunk(channels, 50);
  
  for (const batch of batches) {
    await Promise.all(batch.map(async (channel) => {
      try {
        // 3. Get historical data from ClickHouse (30 days)
        const history = await this.getHistory(
          channel.idSensorChannel,
          config.trainingDays
        );
        
        if (history.length < 24 * 7) { // Need at least 1 week
          this.logger.warn(`Insufficient data for ${channel.idSensorChannel}`);
          failures++;
          return;
        }
        
        // 4. Generate forecast via OpenSearch ML
        const predictions = await this.opensearch.createForecast(
          channel.idSensorChannel,
          history,
          config.horizonDays * 24 // hours
        );
        
        // 5. Mark old forecasts as not current
        await this.markOldForecasts(channel.idSensorChannel);
        
        // 6. Save new forecasts
        await this.saveForecastBatch(
          channel.idSensorChannel,
          batchId,
          predictions
        );
        
        processed++;
        generated += predictions.length;
      } catch (error) {
        this.logger.error(
          `Forecast failed for ${channel.idSensorChannel}`,
          error.message
        );
        failures++;
      }
    }));
  }

  return {
    batchId,
    channelsProcessed: processed,
    forecastsGenerated: generated,
    failures,
  };
}
```

### 4.3 Forecast Data Structure

```typescript
// Each forecast point
interface ForecastPoint {
  forecastTime: Date;
  predictedValue: number;
  lowerBound: number;      // Confidence interval
  upperBound: number;
  confidence: number;       // e.g., 0.95
}

// 7 days × 24 hours = 168 points per channel
// 900 channels × 168 = ~151,200 forecast records per batch
```

---

## 5. Cleanup Job

### 5.1 Configuration

```typescript
// src/modules/ml/jobs/cleanup.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AnomalyResult } from '../../../entities/anomaly-result.entity';
import { ForecastResult } from '../../../entities/forecast-result.entity';

@Injectable()
export class CleanupJob {
  private readonly logger = new Logger(CleanupJob.name);

  constructor(
    @InjectRepository(AnomalyResult)
    private anomalyRepo: Repository<AnomalyResult>,
    @InjectRepository(ForecastResult)
    private forecastRepo: Repository<ForecastResult>,
  ) {}

  // Run at 01:00 UTC daily
  @Cron('0 1 * * *', {
    name: 'data-cleanup',
    timeZone: 'UTC',
  })
  async handleCleanup() {
    if (!this.configService.get('ml.jobs.cleanup.enabled')) {
      return;
    }

    const startTime = Date.now();

    try {
      this.logger.log('Starting data cleanup...');
      
      // 1. Delete old anomaly results (> 90 days)
      const anomalyDate = new Date();
      anomalyDate.setDate(anomalyDate.getDate() - 90);
      
      const anomalyResult = await this.anomalyRepo.delete({
        detectedAt: LessThan(anomalyDate),
      });
      
      // 2. Delete old forecasts (non-current older than 7 days)
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() - 7);
      
      const forecastResult = await this.forecastRepo.delete({
        isCurrent: false,
        createdAt: LessThan(forecastDate),
      });
      
      // 3. Cleanup OpenSearch old indices (optional - via ISM policy)
      // await this.cleanupOpenSearchIndices();
      
      this.logger.log(
        `Cleanup completed: ${anomalyResult.affected} anomalies, ` +
        `${forecastResult.affected} forecasts deleted, ` +
        `took ${Date.now() - startTime}ms`
      );
    } catch (error) {
      this.logger.error('Cleanup job failed', error.stack);
    }
  }
}
```

### 5.2 Retention Policy

| Data Type | PostgreSQL | OpenSearch | ClickHouse |
|-----------|------------|------------|------------|
| `anomaly_results` | 90 days | 90 days | N/A |
| `forecast_results` (current) | Keep latest | N/A | N/A |
| `forecast_results` (old) | 7 days | N/A | N/A |
| `alert_events` | 1 year | N/A | N/A |
| `sensor_telemetry` (raw) | N/A | N/A | 90 days (TTL) |
| `sensor_telemetry_10min` | N/A | 180 days | 180 days (TTL) |
| `sensor_telemetry_1hour` | N/A | N/A | 1 year (TTL) |
| `sensor_telemetry_daily` | N/A | N/A | 3 years (TTL) |

---

## 6. Email Digest Job (iot-backend)

### 6.1 Configuration

```typescript
// src/modules/notifications/jobs/email-digest.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailService } from '../services/email.service';
import { AnomalyService } from '../../ml/services/anomaly.service';
import { AlertService } from '../../ml/services/alert.service';

@Injectable()
export class EmailDigestJob {
  private readonly logger = new Logger(EmailDigestJob.name);

  constructor(
    private emailService: EmailService,
    private anomalyService: AnomalyService,
    private alertService: AlertService,
  ) {}

  // Run at 08:00 UTC daily
  @Cron('0 8 * * *', {
    name: 'email-digest',
    timeZone: 'UTC',
  })
  async handleDigest() {
    try {
      this.logger.log('Generating daily digest...');
      
      // Get yesterday's stats
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 1. Get anomaly stats
      const anomalyStats = await this.anomalyService.getStats({
        from: yesterday,
        to: today,
      });
      
      // 2. Get alert stats
      const alertStats = await this.alertService.getStats({
        from: yesterday,
        to: today,
      });
      
      // 3. Get recipients (admin users)
      const recipients = await this.getDigestRecipients();
      
      // 4. Send digest email
      await this.emailService.sendDailySummary({
        recipients,
        date: yesterday.toISOString().split('T')[0],
        totalAnomalies: anomalyStats.total,
        criticalCount: anomalyStats.byGrade.critical,
        highCount: anomalyStats.byGrade.severe,
        openAlerts: alertStats.open,
        acknowledgedAlerts: alertStats.acknowledged,
        topChannels: anomalyStats.topChannels.slice(0, 5),
      });
      
      this.logger.log(`Daily digest sent to ${recipients.length} recipients`);
    } catch (error) {
      this.logger.error('Email digest failed', error.stack);
    }
  }
}
```

---

## 7. Alert Auto-Clear Job (iot-backend)

### 7.1 Configuration

```typescript
// src/modules/ml/jobs/alert-auto-clear.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertService } from '../services/alert.service';

@Injectable()
export class AlertAutoClearJob {
  private readonly logger = new Logger(AlertAutoClearJob.name);

  constructor(
    private configService: ConfigService,
    private alertService: AlertService,
  ) {}

  // Run every hour
  @Cron('0 * * * *', {
    name: 'alert-auto-clear',
    timeZone: 'UTC',
  })
  async handleAutoClear() {
    const autoClearHours = this.configService.get('email.alert.autoClearHours');
    
    try {
      this.logger.log('Checking for stale alerts...');
      
      // Find alerts that have been open for too long
      // AND the underlying metric has returned to normal
      const staleAlerts = await this.alertService.findStaleAlerts(autoClearHours);
      
      for (const alert of staleAlerts) {
        // Check if the value is now normal
        const isNormal = await this.alertService.checkCurrentValueNormal(
          alert.alertRule.idSensorChannel
        );
        
        if (isNormal) {
          await this.alertService.autoClear(alert.idAlertEvent, 
            `Auto-cleared: value returned to normal range after ${autoClearHours} hours`
          );
        }
      }
      
      this.logger.log(`Auto-cleared ${staleAlerts.length} stale alerts`);
    } catch (error) {
      this.logger.error('Alert auto-clear failed', error.stack);
    }
  }
}
```

---

## 8. Job Monitoring

### 8.1 Health Check Endpoint

```typescript
// GET /health/jobs
{
  "jobs": {
    "sync": {
      "status": "healthy",
      "lastRun": "2026-02-27T10:00:00Z",
      "lastDuration": 1234,
      "lastResult": { "synced": 1500, "errors": 0 },
      "nextRun": "2026-02-27T10:10:00Z"
    },
    "anomalyPoll": {
      "status": "healthy",
      "lastRun": "2026-02-27T10:02:00Z",
      "lastDuration": 567,
      "lastResult": { "processed": 3, "alertsCreated": 1 },
      "nextRun": "2026-02-27T10:12:00Z"
    },
    "forecast": {
      "status": "healthy",
      "lastRun": "2026-02-27T00:00:00Z",
      "lastDuration": 180000,
      "lastResult": { "channelsProcessed": 45, "forecastsGenerated": 7560 },
      "nextRun": "2026-02-27T12:00:00Z"
    }
  }
}
```

### 8.2 Job Metrics (Prometheus)

```typescript
// Metrics to expose
iot_job_runs_total{job="sync", status="success"}
iot_job_runs_total{job="sync", status="failure"}
iot_job_duration_seconds{job="sync"}
iot_job_last_run_timestamp{job="sync"}
iot_sync_documents_indexed_total
iot_anomalies_detected_total{grade="critical"}
iot_forecasts_generated_total
```

---

## 9. Manual Job Triggers

### 9.1 API Endpoints (Admin Only)

```typescript
// POST /admin/jobs/sync/trigger
// POST /admin/jobs/forecast/trigger
// POST /admin/jobs/cleanup/trigger

@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class JobsAdminController {
  @Post('sync/trigger')
  async triggerSync() {
    await this.syncJob.handleSync();
    return { triggered: true };
  }
  
  @Post('forecast/trigger')
  async triggerForecast() {
    await this.forecastJob.handleForecast();
    return { triggered: true };
  }
}
```

---

## 10. Related Documents

- [02-DATA-FLOW.md](02-DATA-FLOW.md) - Data flow diagrams
- [03-SERVICE-ARCHITECTURE.md](03-SERVICE-ARCHITECTURE.md) - Service structure
- [06-ENVIRONMENT-VARIABLES.md](06-ENVIRONMENT-VARIABLES.md) - Configuration

---

**Next:** Alert Deduplication Logic

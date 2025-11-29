# Dashboard Admin Stats Implementation

## 🎯 Objective
Copy GTW iot-logs stats endpoint to Backend so Angular can consume it directly without accessing GTW.

**Benefits:**
- ✅ Single entry point for Angular (only backend)
- ✅ Better security (no direct GTW access from frontend)
- ✅ Easier to cache and optimize
- ✅ Consistent API pattern

---

## 📊 Current State (GTW)

### GTW Endpoint
```
GET http://localhost:4000/api/iot-logs/stats
```

### Response Structure
```json
{
  "total": 1234,
  "processed": 900,
  "unprocessed": 334,
  "byLabel": {
    "TELEMETRY": 800,
    "EVENT": 150,
    "PAIRING": 50,
    "ERROR": 100,
    "WARNING": 50,
    "COMMAND": 30,
    "RESPONSE": 20,
    "DEBUG": 20,
    "INFO": 10,
    "LOG": 4
  }
}
```

### GTW Implementation Details
**File:** `iot-gtw/src/modules/iot-log/iot-log.service.ts`

```typescript
async getStats(): Promise<{
  total: number;
  processed: number;
  unprocessed: number;
  byLabel: Record<string, number>;
}> {
  const total = await this.iotLogRepository.count();
  const processed = await this.iotLogRepository.count({ where: { processed: true } });
  const unprocessed = await this.iotLogRepository.count({ where: { processed: false } });

  const byLabelRaw = await this.iotLogRepository
    .createQueryBuilder('log')
    .select('log.label', 'label')
    .addSelect('COUNT(*)', 'count')
    .groupBy('log.label')
    .getRawMany();

  const byLabel = byLabelRaw.reduce((acc, item) => {
    acc[item.label] = parseInt(item.count, 10);
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    processed,
    unprocessed,
    byLabel,
  };
}
```

---

## 🚀 New Implementation (Backend)

### New Backend Endpoint
```
GET http://localhost:3000/api/iot-logs/stats
```

### Implementation Plan

#### 1. Create IotLogs Module (if not exists)
```bash
cd iot-backend
nest g module modules/iot-logs
nest g controller modules/iot-logs
nest g service modules/iot-logs
```

#### 2. Create Entity (IotLog)
**File:** `iot-backend/src/entities/iot-log.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum LogLabel {
  TELEMETRY = 'TELEMETRY',
  EVENT = 'EVENT',
  PAIRING = 'PAIRING',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  COMMAND = 'COMMAND',
  RESPONSE = 'RESPONSE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  LOG = 'LOG'
}

@Entity('iot_logs')
export class IotLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceId: string;

  @Column({ type: 'enum', enum: LogLabel, default: LogLabel.LOG })
  label: LogLabel;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

#### 3. Create Stats DTO
**File:** `iot-backend/src/modules/iot-logs/dto/iot-log-stats.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class IotLogStatsDto {
  @ApiProperty({ example: 1234, description: 'Total number of logs' })
  total: number;

  @ApiProperty({ example: 900, description: 'Number of processed logs' })
  processed: number;

  @ApiProperty({ example: 334, description: 'Number of unprocessed logs' })
  unprocessed: number;

  @ApiProperty({
    example: {
      TELEMETRY: 800,
      EVENT: 150,
      PAIRING: 50,
      ERROR: 100,
      WARNING: 50,
      COMMAND: 30,
      RESPONSE: 20,
      DEBUG: 20,
      INFO: 10,
      LOG: 4
    },
    description: 'Count of logs by label/category'
  })
  byLabel: Record<string, number>;
}
```

#### 4. Create Service
**File:** `iot-backend/src/modules/iot-logs/iot-logs.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IotLog } from '../../entities/iot-log.entity';
import { IotLogStatsDto } from './dto/iot-log-stats.dto';

@Injectable()
export class IotLogsService {
  private readonly logger = new Logger(IotLogsService.name);

  constructor(
    @InjectRepository(IotLog)
    private iotLogRepository: Repository<IotLog>,
  ) {}

  /**
   * Get IoT logs statistics
   * Aggregates total, processed, unprocessed, and counts by label
   */
  async getStats(): Promise<IotLogStatsDto> {
    try {
      // Count total logs
      const total = await this.iotLogRepository.count();

      // Count processed logs
      const processed = await this.iotLogRepository.count({
        where: { processed: true },
      });

      // Count unprocessed logs
      const unprocessed = await this.iotLogRepository.count({
        where: { processed: false },
      });

      // Count logs by label
      const byLabelRaw = await this.iotLogRepository
        .createQueryBuilder('log')
        .select('log.label', 'label')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.label')
        .getRawMany();

      // Transform to key-value object
      const byLabel = byLabelRaw.reduce((acc, item) => {
        acc[item.label] = parseInt(item.count, 10);
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        processed,
        unprocessed,
        byLabel,
      };
    } catch (error) {
      this.logger.error(`Failed to get IoT logs stats: ${error.message}`);
      throw error;
    }
  }
}
```

#### 5. Create Controller
**File:** `iot-backend/src/modules/iot-logs/iot-logs.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IotLogsService } from './iot-logs.service';
import { IotLogStatsDto } from './dto/iot-log-stats.dto';

@ApiTags('IoT Logs')
@Controller('iot-logs')
export class IotLogsController {
  constructor(private readonly iotLogsService: IotLogsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get IoT logs statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: IotLogStatsDto,
  })
  async getStats(): Promise<IotLogStatsDto> {
    return this.iotLogsService.getStats();
  }
}
```

#### 6. Register Module
**File:** `iot-backend/src/modules/iot-logs/iot-logs.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotLog } from '../../entities/iot-log.entity';
import { IotLogsController } from './iot-logs.controller';
import { IotLogsService } from './iot-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([IotLog])],
  controllers: [IotLogsController],
  providers: [IotLogsService],
  exports: [IotLogsService],
})
export class IotLogsModule {}
```

#### 7. Import in AppModule
**File:** `iot-backend/src/app.module.ts`

```typescript
import { IotLogsModule } from './modules/iot-logs/iot-logs.module';

@Module({
  imports: [
    // ... existing modules
    IotLogsModule,
  ],
})
export class AppModule {}
```

---

## 🎨 Angular Integration

### Update Dashboard Admin
**File:** `iot-angular/src/app/pages/iot/dashboard-admin/dashboard-admin.ts`

```typescript
import { IotLogsService } from '../../../sdk/core/services/iot-logs.service';

export class DashboardAdminPage implements OnInit {
  stats = {
    total: 0,
    processed: 0,
    unprocessed: 0,
    byLabel: {} as Record<string, number>
  };

  constructor(
    private iotLogsService: IotLogsService
  ) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.iotLogsService.iotLogsControllerGetStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => console.error('Failed to load stats:', err)
    });
  }
}
```

### Display Stats in Template
**File:** `iot-angular/src/app/pages/iot/dashboard-admin/dashboard-admin.html`

```html
<div class="row">
  <!-- Total Logs Card -->
  <div class="col-lg-3 col-md-6 mb-4">
    <div class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex align-items-center">
          <div class="flex-grow-1">
            <h6 class="text-muted text-uppercase mb-1">Total Logs</h6>
            <h2 class="mb-0">{{ stats.total | number }}</h2>
          </div>
          <div class="ms-3">
            <i class="fa fa-file-alt fa-3x text-primary"></i>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Processed Logs Card -->
  <div class="col-lg-3 col-md-6 mb-4">
    <div class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex align-items-center">
          <div class="flex-grow-1">
            <h6 class="text-muted text-uppercase mb-1">Processed</h6>
            <h2 class="mb-0">{{ stats.processed | number }}</h2>
          </div>
          <div class="ms-3">
            <i class="fa fa-check-circle fa-3x text-success"></i>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Unprocessed Logs Card -->
  <div class="col-lg-3 col-md-6 mb-4">
    <div class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex align-items-center">
          <div class="flex-grow-1">
            <h6 class="text-muted text-uppercase mb-1">Unprocessed</h6>
            <h2 class="mb-0">{{ stats.unprocessed | number }}</h2>
          </div>
          <div class="ms-3">
            <i class="fa fa-clock fa-3x text-warning"></i>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Logs by Label Table -->
  <div class="col-lg-12 mb-4">
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white">
        <h5 class="mb-0">Logs by Category</h5>
      </div>
      <div class="card-body">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Label</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let label of objectKeys(stats.byLabel)">
              <td>
                <span class="badge" [ngClass]="getLabelBadgeClass(label)">
                  {{ label }}
                </span>
              </td>
              <td>{{ stats.byLabel[label] | number }}</td>
              <td>
                {{ (stats.byLabel[label] / stats.total * 100).toFixed(2) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
```

---

## ✅ Testing Checklist

### Backend Testing
- [ ] Create iot_logs table in database
- [ ] Run backend server
- [ ] Test endpoint: `curl http://localhost:3000/api/iot-logs/stats`
- [ ] Verify response structure matches expected format
- [ ] Check Swagger docs: `http://localhost:3000/api`

### Frontend Testing
- [ ] Regenerate SDK: `cd iot-angular && npm run generate-sdk`
- [ ] Import IotLogsService in dashboard-admin
- [ ] Load stats on page init
- [ ] Display stats in cards
- [ ] Verify numbers are correct
- [ ] Test auto-refresh if implemented

### Integration Testing
- [ ] Insert test data in iot_logs table
- [ ] Verify stats update correctly
- [ ] Test with different label types
- [ ] Test with processed/unprocessed flags

---

## 🗄️ Database Table Creation

```sql
-- Create iot_logs table
CREATE TABLE IF NOT EXISTS iot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(255),
  label VARCHAR(50) NOT NULL DEFAULT 'LOG',
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_iot_logs_device_id (device_id),
  INDEX idx_iot_logs_label (label),
  INDEX idx_iot_logs_processed (processed),
  INDEX idx_iot_logs_timestamp (timestamp)
);

-- Add check constraint for label enum
ALTER TABLE iot_logs 
ADD CONSTRAINT chk_iot_logs_label 
CHECK (label IN ('TELEMETRY', 'EVENT', 'PAIRING', 'ERROR', 'WARNING', 'COMMAND', 'RESPONSE', 'DEBUG', 'INFO', 'LOG'));
```

---

## 🎯 Next Steps

1. **Implement Backend Module:**
   - Create entity, service, controller
   - Register module in AppModule
   - Test endpoint

2. **Database Setup:**
   - Create iot_logs table
   - Add indexes
   - Insert test data

3. **Angular Integration:**
   - Regenerate SDK
   - Update dashboard-admin component
   - Add stats cards
   - Test display

4. **Optional Enhancements:**
   - Add caching (Redis)
   - Add date range filters
   - Add real-time updates (WebSocket)
   - Add export functionality

---

## 📝 Notes

- **Same Database:** GTW and Backend can share the same `iot_logs` table
- **Read-Only:** Backend only reads stats (GTW writes logs)
- **Performance:** Add indexes for better query performance
- **Caching:** Consider caching stats for 1-5 minutes
- **Pagination:** Future enhancement for logs list endpoint

---

**Author:** AI Assistant  
**Date:** November 23, 2025  
**Status:** Planning Phase

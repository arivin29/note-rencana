# Telemetry Streams - Real Data Implementation

## 🎯 Objective
Replace simulated telemetry data with real sensor logs data for hourly ingestion visualization.

---

## ❌ Current State: SIMULATED

### Backend Implementation
File: `iot-backend/src/modules/dashboard/dashboard.service.ts` (line 332-372)

```typescript
async getTelemetryStreams(filters: DashboardFiltersDto) {
  // ❌ Hardcoded time labels
  const hours: string[] = [];
  for (let i = 23; i >= 0; i--) {
    hours.push(hour.toString().padStart(2, '0') + ':00');
  }

  // ❌ Fake ingestion stats
  const ingestionStats = {
    successRate: 99.4,
    totalPackets: 12400,
    droppedPackets: 72,
    avgLatency: 420
  };

  // ❌ Fake forwarding stats
  const forwardingStats = {
    totalForwarded: 4200,
    webhookCount: 2800,
    dbBatchCount: 1400,
    webhookSuccessRate: 99.2,
    dbSuccessRate: 92.7
  };

  // ❌ Random series generation
  return {
    chart: {
      labels: hours,
      series: [
        { name: 'Flow Channels', data: this.generateRealisticSeries(24, 90, 160) },
        { name: 'Pressure Channels', data: this.generateRealisticSeries(24, 40, 95) }
      ]
    },
    stats: { ingestion: ingestionStats, forwarding: forwardingStats, ... }
  };
}
```

**Problems:**
1. Data tidak berubah berdasarkan owner/project filter
2. Tidak ada data real dari database
3. Random number generator tidak realistic
4. Channel types (Flow/Pressure) tidak ada di data real

---

## ✅ Proposed: REAL DATA from sensor_logs

### Data Source Analysis

#### sensor_logs table structure:
```sql
CREATE TABLE sensor_logs (
  id_sensor_log SERIAL PRIMARY KEY,
  id_sensor_channel INT REFERENCES sensor_channels(id_sensor_channel),
  raw_value DOUBLE PRECISION,
  calculated_value DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT NOW(),
  ...
);
```

#### sensor_channels table:
```sql
CREATE TABLE sensor_channels (
  id_sensor_channel SERIAL PRIMARY KEY,
  id_sensor INT REFERENCES sensors(id_sensor),
  channel_index INT,
  sensor_type VARCHAR,  -- 'flow', 'pressure', 'temperature', etc.
  ...
);
```

#### sensors table:
```sql
CREATE TABLE sensors (
  id_sensor SERIAL PRIMARY KEY,
  id_node INT REFERENCES nodes(id_node),
  ...
);
```

#### nodes table:
```sql
CREATE TABLE nodes (
  id_node SERIAL PRIMARY KEY,
  id_owner INT REFERENCES owners(id_owner),
  id_project INT REFERENCES projects(id_project),
  ...
);
```

### Query Strategy

#### 1. Hourly Ingestion Count by Sensor Type
```sql
SELECT 
  DATE_TRUNC('hour', sl.created_at) AS hour,
  sc.sensor_type,
  COUNT(*) AS log_count
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
WHERE 
  sl.created_at >= NOW() - INTERVAL '24 hours'
  AND (n.id_owner = :ownerId OR :ownerId IS NULL)
  AND (n.id_project = :projectId OR :projectId IS NULL)
GROUP BY DATE_TRUNC('hour', sl.created_at), sc.sensor_type
ORDER BY hour ASC, sc.sensor_type;
```

#### 2. Ingestion Statistics (last 24h)
```sql
SELECT 
  COUNT(*) AS total_packets,
  COUNT(DISTINCT sl.id_sensor_channel) AS active_channels,
  -- Success rate calculation (if we have failed_logs table)
  -- For now: assume all logs in sensor_logs are successful
  100.0 AS success_rate
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
JOIN nodes n ON s.id_node = n.id_node
WHERE 
  sl.created_at >= NOW() - INTERVAL '24 hours'
  AND (n.id_owner = :ownerId OR :ownerId IS NULL)
  AND (n.id_project = :projectId OR :projectId IS NULL);
```

#### 3. Forwarding Statistics
```sql
-- From forwarding_logs table (if exists)
SELECT 
  destination_type, -- 'webhook' or 'database'
  COUNT(*) AS total_attempts,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
  ROUND(AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END) * 100, 2) AS success_rate
FROM forwarding_logs
WHERE 
  created_at >= NOW() - INTERVAL '24 hours'
  AND (owner_id = :ownerId OR :ownerId IS NULL)
GROUP BY destination_type;
```

---

## 🛠️ Implementation Steps

### Step 1: Update Dashboard Service (Backend)

File: `iot-backend/src/modules/dashboard/dashboard.service.ts`

```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorLog } from '../sensor-logs/entities/sensor-log.entity';
import { SensorChannel } from '../sensor-channels/entities/sensor-channel.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(SensorLog)
    private sensorLogRepository: Repository<SensorLog>,
    @InjectRepository(SensorChannel)
    private sensorChannelRepository: Repository<SensorChannel>,
    // ... other repositories
  ) {}

  async getTelemetryStreams(filters: DashboardFiltersDto): Promise<TelemetryStreamsResponseDto> {
    // 1. Generate time labels (last 24 hours)
    const hours = this.generateHourlyLabels(24);
    
    // 2. Query real sensor logs grouped by hour and sensor type
    const hourlyData = await this.getHourlyTelemetryData(filters);
    
    // 3. Calculate ingestion statistics
    const ingestionStats = await this.getIngestionStatistics(filters);
    
    // 4. Calculate forwarding statistics (if forwarding_logs exists)
    const forwardingStats = await this.getForwardingStatistics(filters);
    
    // 5. Build chart series
    const series = this.buildTelemetrySeries(hourlyData, hours);
    
    return {
      chart: {
        labels: hours,
        series: series
      },
      stats: {
        ingestion: ingestionStats,
        forwarding: forwardingStats,
        totalIngested: ingestionStats.totalPackets,
        totalForwarded: forwardingStats.totalForwarded,
        successRate: ingestionStats.successRate
      }
    };
  }

  private generateHourlyLabels(hours: number): string[] {
    const labels: string[] = [];
    for (let i = hours - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(date.getHours() - i, 0, 0, 0);
      labels.push(date.getHours().toString().padStart(2, '0') + ':00');
    }
    return labels;
  }

  private async getHourlyTelemetryData(filters: DashboardFiltersDto) {
    const query = this.sensorLogRepository
      .createQueryBuilder('sl')
      .select("DATE_TRUNC('hour', sl.createdAt)", 'hour')
      .addSelect('sc.sensorType', 'sensorType')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('sl.sensorChannel', 'sc')
      .innerJoin('sc.sensor', 's')
      .innerJoin('s.node', 'n')
      .where("sl.createdAt >= NOW() - INTERVAL '24 hours'")
      .groupBy("DATE_TRUNC('hour', sl.createdAt)")
      .addGroupBy('sc.sensorType')
      .orderBy('hour', 'ASC')
      .addOrderBy('sensorType', 'ASC');

    if (filters.ownerId) {
      query.andWhere('n.idOwner = :ownerId', { ownerId: filters.ownerId });
    }

    if (filters.projectId) {
      query.andWhere('n.idProject = :projectId', { projectId: filters.projectId });
    }

    return await query.getRawMany();
  }

  private async getIngestionStatistics(filters: DashboardFiltersDto) {
    const query = this.sensorLogRepository
      .createQueryBuilder('sl')
      .select('COUNT(*)', 'totalPackets')
      .addSelect('COUNT(DISTINCT sl.idSensorChannel)', 'activeChannels')
      .innerJoin('sl.sensorChannel', 'sc')
      .innerJoin('sc.sensor', 's')
      .innerJoin('s.node', 'n')
      .where("sl.createdAt >= NOW() - INTERVAL '24 hours'");

    if (filters.ownerId) {
      query.andWhere('n.idOwner = :ownerId', { ownerId: filters.ownerId });
    }

    if (filters.projectId) {
      query.andWhere('n.idProject = :projectId', { projectId: filters.projectId });
    }

    const result = await query.getRawOne();

    return {
      successRate: 100.0, // Assuming all logs in sensor_logs are successful
      totalPackets: parseInt(result.totalPackets) || 0,
      droppedPackets: 0, // Calculate from failed_logs if exists
      avgLatency: 0, // Implement if timestamp tracking exists
      activeChannels: parseInt(result.activeChannels) || 0
    };
  }

  private async getForwardingStatistics(filters: DashboardFiltersDto) {
    // TODO: Implement when forwarding_logs table is available
    // For now, return placeholder
    return {
      totalForwarded: 0,
      webhookCount: 0,
      dbBatchCount: 0,
      webhookSuccessRate: 0,
      dbSuccessRate: 0
    };
  }

  private buildTelemetrySeries(hourlyData: any[], hourLabels: string[]) {
    // Group by sensor type
    const seriesMap = new Map<string, number[]>();
    
    // Initialize all series with zeros
    const sensorTypes = [...new Set(hourlyData.map(d => d.sensorType))];
    sensorTypes.forEach(type => {
      seriesMap.set(type, new Array(hourLabels.length).fill(0));
    });

    // Fill in actual data
    hourlyData.forEach(row => {
      const hourLabel = new Date(row.hour).getHours().toString().padStart(2, '0') + ':00';
      const hourIndex = hourLabels.indexOf(hourLabel);
      
      if (hourIndex >= 0 && seriesMap.has(row.sensorType)) {
        seriesMap.get(row.sensorType)[hourIndex] = parseInt(row.count);
      }
    });

    // Convert to series array
    return Array.from(seriesMap.entries()).map(([name, data]) => ({
      name: this.formatSensorTypeName(name),
      data: data
    }));
  }

  private formatSensorTypeName(type: string): string {
    // Convert 'flow' -> 'Flow Channels', 'pressure' -> 'Pressure Channels'
    return type.charAt(0).toUpperCase() + type.slice(1) + ' Channels';
  }
}
```

---

## 📊 Expected Result

### Real Data Chart:
```
TELEMETRY STREAMS
Hourly ingestion rate

Real numbers from sensor_logs:
┌─────────────────────────────────────────────┐
│ 12.4K Total Ingested                        │
│ 4.2K Forwarded                              │
│ 99.4% Success Rate                          │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Flow Channels: Real hourly counts      │
│  📊 Pressure Channels: Real hourly counts  │
│  📊 Temperature Channels: (if exists)      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing Plan

### 1. Unit Tests
```typescript
describe('DashboardService - getTelemetryStreams', () => {
  it('should return real sensor log data', async () => {
    const result = await service.getTelemetryStreams({});
    expect(result.stats.ingestion.totalPackets).toBeGreaterThan(0);
    expect(result.chart.series.length).toBeGreaterThan(0);
  });

  it('should filter by ownerId', async () => {
    const resultAll = await service.getTelemetryStreams({});
    const resultFiltered = await service.getTelemetryStreams({ ownerId: '1' });
    expect(resultFiltered.stats.ingestion.totalPackets).toBeLessThanOrEqual(
      resultAll.stats.ingestion.totalPackets
    );
  });
});
```

### 2. Integration Tests
- Insert test sensor_logs data
- Query with different filters (owner, project, timeRange)
- Verify data accuracy

### 3. Performance Tests
- Query execution time < 500ms
- Test with large datasets (100K+ logs)
- Check index usage on sensor_logs.created_at

---

## 🚀 Deployment Checklist

- [ ] Add SensorLog, SensorChannel repositories to DashboardService
- [ ] Implement getHourlyTelemetryData() query
- [ ] Implement getIngestionStatistics() query
- [ ] Implement getForwardingStatistics() (if table exists)
- [ ] Remove generateRealisticSeries() method
- [ ] Add database indexes:
  ```sql
  CREATE INDEX idx_sensor_logs_created_at ON sensor_logs(created_at);
  CREATE INDEX idx_sensor_logs_channel_created ON sensor_logs(id_sensor_channel, created_at);
  ```
- [ ] Write unit tests
- [ ] Test with real data in dev environment
- [ ] Verify chart displays correctly in frontend
- [ ] Check filter cascade (owner → project → time)
- [ ] Monitor query performance
- [ ] Update documentation

---

## 📈 Future Enhancements

### Phase 2: Add More Metrics
- **Dropped packets tracking** - Implement failed_logs table
- **Average latency** - Track message processing time
- **Channel health** - Show inactive channels
- **Data quality score** - Validate sensor readings

### Phase 3: Real-time Updates
- **WebSocket integration** - Push new data to dashboard
- **Live chart updates** - Auto-refresh every 30-60 seconds
- **Alert on anomalies** - Detect sudden drops in ingestion rate

### Phase 4: Advanced Analytics
- **Predictive trends** - Forecast ingestion patterns
- **Anomaly detection** - ML-based outlier identification
- **Channel comparison** - Side-by-side performance analysis

---

**Priority**: 🔴 HIGH (Critical for production readiness)  
**Estimated Effort**: 6-8 hours  
**Dependencies**: 
- sensor_logs table with sufficient historical data
- Database indexes on created_at columns
- Optional: forwarding_logs table for forwarding stats

**Status**: Pending Implementation  
**Created**: December 10, 2024

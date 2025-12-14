import { ApiProperty } from '@nestjs/swagger';

class KpiMetric {
  @ApiProperty({ description: 'Current value', example: 168 })
  current: number;

  @ApiProperty({ description: 'Change from previous period', example: '+3' })
  delta: string;

  @ApiProperty({ description: 'Trend direction', enum: ['up', 'down', 'flat'], example: 'up' })
  trend: 'up' | 'down' | 'flat';

  @ApiProperty({ description: 'Sparkline data points (last 12 intervals)', type: [Number], example: [110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 168] })
  sparkline: number[];
}

class TimeSeriesDataPoint {
  @ApiProperty({ description: 'Timestamp of the data point', example: '2025-12-10T10:00:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Online nodes count', example: 20 })
  online: number;

  @ApiProperty({ description: 'Degraded nodes count', example: 1 })
  degraded: number;

  @ApiProperty({ description: 'Offline nodes count', example: 3 })
  offline: number;
}

class NodesOnlineMetric extends KpiMetric {
  @ApiProperty({ description: 'Healthy nodes percentage', example: 91 })
  healthyPercentage: number;

  @ApiProperty({ description: 'New deployments count', example: 6 })
  newDeployments: number;

  @ApiProperty({ 
    description: 'Time series data for stacked area chart (last 24 data points)', 
    type: [TimeSeriesDataPoint],
    example: [
      { timestamp: '2025-12-10T10:00:00Z', online: 20, degraded: 1, offline: 3 },
      { timestamp: '2025-12-10T11:00:00Z', online: 20, degraded: 1, offline: 3 }
    ]
  })
  timeSeries: TimeSeriesDataPoint[];

  @ApiProperty({ description: 'Total nodes count', example: 24 })
  totalNodes: number;

  @ApiProperty({ description: 'Degraded nodes count', example: 1 })
  degradedNodes: number;

  @ApiProperty({ description: 'Offline nodes count', example: 3 })
  offlineNodes: number;
}

class ActiveAlertsMetric extends KpiMetric {
  @ApiProperty({ description: 'Critical alerts count', example: 3 })
  criticalCount: number;

  @ApiProperty({ description: 'Warning alerts count', example: 4 })
  warningCount: number;
}

class TelemetryRateMetric extends KpiMetric {
  @ApiProperty({ description: 'Active devices sending data', example: 18 })
  activeDevices: number;

  @ApiProperty({ description: 'Total devices', example: 24 })
  totalDevices: number;

  @ApiProperty({ description: 'Last message received (seconds ago)', example: 2 })
  lastMessageSecondsAgo: number;

  @ApiProperty({ description: 'Pending queue size', example: 0 })
  queueSize: number;
}

class ForwardedPayloadsMetric extends KpiMetric {
  @ApiProperty({ description: 'Webhook success rate', example: 99.1 })
  webhookSuccess: number;

  @ApiProperty({ description: 'Database batch success rate', example: 92.4 })
  dbBatchSuccess: number;

  @ApiProperty({ 
    description: 'Distribution breakdown', 
    example: { webhook: 45, mysql: 32, postgresql: 23 } 
  })
  distribution: {
    webhook: number;
    mysql: number;
    postgresql: number;
  };
}

export class KpiStatsResponseDto {
  @ApiProperty({ description: 'Nodes online metrics', type: NodesOnlineMetric })
  nodesOnline: NodesOnlineMetric;

  @ApiProperty({ description: 'Active alerts metrics', type: ActiveAlertsMetric })
  activeAlerts: ActiveAlertsMetric;

  @ApiProperty({ description: 'Telemetry rate metrics (per minute)', type: TelemetryRateMetric })
  telemetryRate: TelemetryRateMetric;

  @ApiProperty({ description: 'Forwarded payloads metrics', type: ForwardedPayloadsMetric })
  forwardedPayloads: ForwardedPayloadsMetric;
}

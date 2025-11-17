import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NodeResponseDto {
  @ApiProperty()
  idNode: string;

  @ApiProperty()
  idProject: string;

  @ApiProperty()
  idNodeModel: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  serialNumber?: string;

  @ApiPropertyOptional()
  devEui?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  installDate?: Date;

  @ApiPropertyOptional()
  firmwareVersion?: string;

  @ApiPropertyOptional()
  batteryType?: string;

  @ApiProperty()
  telemetryIntervalSec: number;

  @ApiProperty()
  connectivityStatus: string;

  @ApiPropertyOptional()
  lastSeenAt?: Date;

  @ApiPropertyOptional()
  idCurrentLocation?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Project details' })
  project?: any;

  @ApiPropertyOptional({ description: 'Node model details' })
  nodeModel?: any;

  @ApiPropertyOptional({ description: 'Current location details' })
  currentLocation?: any;
}

export class NodeDetailedResponseDto extends NodeResponseDto {
  @ApiPropertyOptional({ description: 'Sensors attached to this node', isArray: true })
  sensors?: any[];

  @ApiPropertyOptional({ description: 'Node statistics' })
  stats?: {
    totalSensors: number;
    activeSensors: number;
    lastTelemetry?: Date;
    uptimePercentage?: number;
  };
}

export class NodeStatisticsResponseDto {
  @ApiProperty({ description: 'Total number of nodes' })
  totalNodes: number;

  @ApiProperty({ description: 'Number of online nodes' })
  onlineNodes: number;

  @ApiProperty({ description: 'Number of offline nodes' })
  offlineNodes: number;

  @ApiProperty({ description: 'Number of degraded nodes' })
  degradedNodes: number;

  @ApiPropertyOptional({ description: 'Nodes grouped by model', isArray: true })
  nodesByModel?: Array<{
    modelName: string;
    count: number;
    percentage: number;
  }>;

  @ApiPropertyOptional({ description: 'Nodes grouped by project', isArray: true })
  nodesByProject?: Array<{
    idProject: string;
    projectName: string;
    nodeCount: number;
  }>;

  @ApiPropertyOptional({ description: 'Connectivity overview' })
  connectivityOverview?: {
    online: number;
    offline: number;
    degraded: number;
    averageUptimePercentage: number;
  };

  @ApiPropertyOptional({ description: 'Battery status overview' })
  batteryOverview?: {
    lowBattery: number; // Count of nodes with battery < 20%
    mediumBattery: number; // 20-50%
    goodBattery: number; // > 50%
  };
}

export class NodeDashboardResponseDto {
  @ApiProperty({ description: 'Node details' })
  node: NodeDetailedResponseDto;

  @ApiPropertyOptional({ description: 'Sensors with latest channel values', isArray: true })
  sensorsWithData?: Array<{
    idSensor: string;
    sensorCode: string;
    catalogName: string;
    status: string;
    channels: Array<{
      idSensorChannel: string;
      metricCode: string;
      unit: string;
      latestValue?: number;
      timestamp?: Date;
      status: string;
    }>;
  }>;

  @ApiPropertyOptional({ description: 'Recent activity log', isArray: true })
  recentActivity?: Array<{
    timestamp: Date;
    type: string;
    description: string;
  }>;

  @ApiPropertyOptional({ description: 'Health metrics' })
  health?: {
    overall: string; // 'healthy' | 'warning' | 'critical'
    connectivity: string;
    battery: string;
    sensors: string;
    lastTelemetry?: Date;
  };

  @ApiPropertyOptional({ description: 'Uptime statistics' })
  uptime?: {
    percentage: number;
    totalHours: number;
    onlineHours: number;
    lastOnline?: Date;
    lastOffline?: Date;
  };
}

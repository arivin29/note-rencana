import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NodeInfoDto {
  @ApiProperty()
  idNode: string;

  @ApiPropertyOptional()
  idProject?: string;

  @ApiPropertyOptional()
  idNodeModel?: string;

  @ApiPropertyOptional()
  idNodeProfile?: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  description?: string;

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

  @ApiPropertyOptional()
  telemetryIntervalSec?: number;

  @ApiProperty()
  connectivityStatus: string;

  @ApiPropertyOptional()
  lastSeenAt?: Date;

  // Location
  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  province?: string;

  @ApiPropertyOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  elevationM?: number;

  // Status & Maintenance
  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  commissionedAt?: Date;

  @ApiPropertyOptional()
  lastMaintenanceAt?: Date;

  @ApiPropertyOptional()
  nextMaintenanceAt?: Date;

  // Environment
  @ApiPropertyOptional()
  installationType?: string;

  @ApiPropertyOptional()
  enclosureRating?: string;

  @ApiPropertyOptional()
  powerSource?: string;

  // PIC
  @ApiPropertyOptional()
  picName?: string;

  @ApiPropertyOptional()
  picPhone?: string;

  @ApiPropertyOptional()
  picEmail?: string;

  // Notes & Tags
  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiPropertyOptional()
  iconUrl?: string;

  // Related entities
  @ApiPropertyOptional({ description: 'Node model details' })
  nodeModel?: {
    idNodeModel: string;
    modelName: string;
    vendor?: string;
    protocol?: string;
  };

  @ApiPropertyOptional({ description: 'Project details' })
  project?: {
    idProject: string;
    name: string;
  };

  // Timestamps
  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;
}

export class SensorResponseDto {
  @ApiProperty()
  idSensor: string;

  @ApiProperty()
  idNode: string;

  @ApiPropertyOptional()
  idSensorCatalog?: string;

  @ApiPropertyOptional({ description: 'Unique sensor code identifier' })
  sensorCode?: string;

  @ApiProperty()
  label: string;

  @ApiPropertyOptional({ description: 'Physical location description' })
  location?: string;

  @ApiPropertyOptional({ 
    description: 'Sensor health status', 
    enum: ['active', 'maintenance', 'inactive']
  })
  status?: 'active' | 'maintenance' | 'inactive';

  @ApiPropertyOptional()
  protocolChannel?: string;

  @ApiPropertyOptional()
  calibrationFactor?: number;

  @ApiPropertyOptional()
  samplingRate?: number;

  @ApiPropertyOptional()
  installDate?: Date;

  @ApiPropertyOptional()
  calibrationDueAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Node details', type: NodeInfoDto })
  node?: NodeInfoDto;

  @ApiPropertyOptional({ description: 'Sensor catalog details' })
  sensorCatalog?: any;

  @ApiPropertyOptional({ description: 'Last sensor value (engineered) - summary from first channel' })
  lastValue?: number;

  @ApiPropertyOptional({ description: 'Timestamp of last sensor value' })
  lastValueAt?: Date;

  @ApiPropertyOptional({ 
    description: 'Sensor channels with latest values from ClickHouse',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        idSensorChannel: { type: 'string' },
        metricCode: { type: 'string' },
        unit: { type: 'string' },
        lastValue: { type: 'number' },
        lastValueAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  channels?: Array<{
    idSensorChannel: string;
    metricCode: string;
    unit: string;
    lastValue: number | null;
    lastValueAt: Date | null;
  }>;
}

export class SensorDetailedResponseDto extends SensorResponseDto {
  @ApiPropertyOptional({ description: 'Sensor channels', isArray: true })
  sensorChannels?: any[];

  @ApiPropertyOptional({ description: 'Calibration status' })
  calibrationStatus?: {
    isCalibrated: boolean;
    daysUntilDue?: number;
    isOverdue: boolean;
  };
}

export class SensorStatisticsResponseDto {
  @ApiProperty({ description: 'Total sensors count' })
  totalSensors: number;

  @ApiProperty({ description: 'Active sensors count' })
  activeSensors: number;

  @ApiProperty({ description: 'Sensors needing calibration' })
  sensorsNeedingCalibration: number;

  @ApiProperty({ description: 'Sensors by catalog', type: 'array' })
  sensorsByCatalog: Array<{
    catalogName: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Sensors by node', type: 'array' })
  sensorsByNode: Array<{
    idNode: string;
    nodeCode: string;
    sensorCount: number;
  }>;

  @ApiProperty({ description: 'Calibration overview' })
  calibrationOverview: {
    calibrated: number;
    needsCalibration: number;
    overdue: number;
    percentage: number;
  };
}

export class SensorDashboardResponseDto {
  @ApiProperty({ description: 'Sensor details' })
  sensor: SensorDetailedResponseDto;

  @ApiProperty({ description: 'Channel metrics', type: 'array' })
  channels: Array<{
    idSensorChannel: string;
    metricCode: string;
    unit: string;
    latestValue?: number;
    status: string;
  }>;

  @ApiProperty({ description: 'Recent activity', type: 'array' })
  recentActivity: Array<{
    timestamp: Date;
    type: string;
    description: string;
  }>;

  @ApiProperty({ description: 'Health status' })
  health: {
    overall: string;
    calibrationStatus: string;
    channelStatus: string;
    lastReading?: Date;
  };
}


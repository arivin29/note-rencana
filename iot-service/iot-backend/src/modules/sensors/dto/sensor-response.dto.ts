import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'Node details' })
  node?: any;

  @ApiPropertyOptional({ description: 'Sensor catalog details' })
  sensorCatalog?: any;
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


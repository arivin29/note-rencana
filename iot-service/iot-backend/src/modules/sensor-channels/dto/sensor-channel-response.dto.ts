import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SensorChannelResponseDto {
  @ApiProperty()
  idSensorChannel: string;

  @ApiProperty()
  idSensor: string;

  @ApiProperty()
  idSensorType: string;

  @ApiProperty()
  metricCode: string;

  @ApiPropertyOptional()
  unit?: string;

  @ApiPropertyOptional()
  minThreshold?: number;

  @ApiPropertyOptional()
  maxThreshold?: number;

  @ApiPropertyOptional()
  multiplier?: number;

  @ApiPropertyOptional({ description: 'Value offset for calibration (renamed from offset)' })
  offsetValue?: number;

  @ApiPropertyOptional()
  registerAddress?: number;

  @ApiPropertyOptional()
  precision?: number;

  @ApiPropertyOptional()
  aggregation?: string;

  @ApiPropertyOptional()
  alertSuppressionWindow?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Sensor details' })
  sensor?: any;

  @ApiPropertyOptional({ description: 'Sensor type details' })
  sensorType?: any;
}

export class SensorChannelDetailedResponseDto extends SensorChannelResponseDto {
  @ApiPropertyOptional({ description: 'Latest value from sensor logs' })
  latestValue?: {
    value: number;
    timestamp: Date;
    qualityFlag?: string;
  };

  @ApiPropertyOptional({ description: 'Channel statistics' })
  stats?: {
    minValue24h?: number;
    maxValue24h?: number;
    avgValue24h?: number;
    lastReading?: Date;
    readingCount24h?: number;
  };
}

export class SensorChannelStatisticsResponseDto {
  @ApiProperty({ description: 'Total number of sensor channels' })
  totalChannels: number;

  @ApiProperty({ description: 'Number of active channels' })
  activeChannels: number;

  @ApiPropertyOptional({ description: 'Channels grouped by sensor type', isArray: true })
  channelsBySensorType?: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;

  @ApiPropertyOptional({ description: 'Channels grouped by sensor', isArray: true })
  channelsBySensor?: Array<{
    idSensor: string;
    sensorCode: string;
    channelCount: number;
  }>;

  @ApiPropertyOptional({ description: 'Threshold violations overview' })
  thresholdOverview?: {
    totalWithThresholds: number;
    minThresholdSet: number;
    maxThresholdSet: number;
    bothThresholdsSet: number;
  };

  @ApiPropertyOptional({ description: 'Aggregation methods used', isArray: true })
  aggregationMethods?: Array<{
    method: string;
    count: number;
  }>;
}

export class SensorChannelReadingsResponseDto {
  @ApiProperty({ description: 'Channel information' })
  channel: {
    idSensorChannel: string;
    metricCode: string;
    unit: string;
    sensorCode?: string;
    nodeCode?: string;
  };

  @ApiPropertyOptional({ description: 'Time-series data points', isArray: true })
  dataPoints?: Array<{
    timestamp: Date;
    value: number;
    qualityFlag?: string;
  }>;

  @ApiPropertyOptional({ description: 'Statistics for the period' })
  statistics?: {
    min: number;
    max: number;
    avg: number;
    count: number;
    stdDev?: number;
  };

  @ApiPropertyOptional({ description: 'Data gaps detected', isArray: true })
  gaps?: Array<{
    start: Date;
    end: Date;
    durationMinutes: number;
  }>;
}

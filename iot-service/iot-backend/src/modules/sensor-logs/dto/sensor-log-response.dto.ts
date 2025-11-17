import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SensorLogResponseDto {
  @ApiProperty({ description: 'Sensor log unique ID' })
  idSensorLog: string;

  @ApiProperty({ description: 'Sensor channel ID' })
  idSensorChannel: string;

  @ApiProperty({ description: 'Sensor ID (denormalized)' })
  idSensor: string;

  @ApiProperty({ description: 'Node ID (denormalized)' })
  idNode: string;

  @ApiProperty({ description: 'Project ID (denormalized)' })
  idProject: string;

  @ApiPropertyOptional({ description: 'Owner ID (denormalized)' })
  idOwner?: string;

  @ApiProperty({ description: 'Timestamp of measurement' })
  ts: Date;

  @ApiPropertyOptional({ description: 'Raw value from sensor' })
  valueRaw?: number;

  @ApiPropertyOptional({ description: 'Engineered/calibrated value' })
  valueEngineered?: number;

  @ApiPropertyOptional({ description: 'Quality flag (good, bad, uncertain)' })
  qualityFlag?: string;

  @ApiPropertyOptional({ description: 'Ingestion source (api, mqtt, modbus)' })
  ingestionSource?: string;

  @ApiPropertyOptional({ description: 'HTTP status code or protocol response' })
  statusCode?: number;

  @ApiPropertyOptional({ description: 'Ingestion latency in milliseconds' })
  ingestionLatencyMs?: number;

  @ApiPropertyOptional({ description: 'Payload sequence number' })
  payloadSeq?: number;

  @ApiPropertyOptional({ description: 'Minimum threshold at time of reading' })
  minThreshold?: number;

  @ApiPropertyOptional({ description: 'Maximum threshold at time of reading' })
  maxThreshold?: number;

  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt: Date;
}

/**
 * Extended sensor log response with enriched relationship data
 */
export class SensorLogEnrichedResponseDto extends SensorLogResponseDto {
  @ApiPropertyOptional({ description: 'Channel label/metric code' })
  channelLabel?: string;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  unit?: string;

  @ApiPropertyOptional({ description: 'Sensor label/name' })
  sensorLabel?: string;

  @ApiPropertyOptional({ description: 'Sensor code' })
  sensorCode?: string;

  @ApiPropertyOptional({ description: 'Sensor type name' })
  sensorType?: string;

  @ApiPropertyOptional({ description: 'Node name/code' })
  nodeName?: string;

  @ApiPropertyOptional({ description: 'Node serial number' })
  nodeSerialNumber?: string;

  @ApiPropertyOptional({ description: 'Project name' })
  projectName?: string;

  @ApiPropertyOptional({ description: 'Owner name' })
  ownerName?: string;
}

export class SensorLogTelemetryTrendDto {
  @ApiProperty({ description: 'Channel ID' })
  idSensorChannel: string;

  @ApiProperty({ description: 'Metric code' })
  metricCode: string;

  @ApiProperty({ description: 'Sensor type category' })
  sensorTypeCategory: string;

  @ApiProperty({ description: 'Unit of measurement' })
  unit: string;

  @ApiProperty({ description: 'Latest value' })
  latestValue: number;

  @ApiProperty({ description: 'Latest timestamp' })
  latestTimestamp: Date;

  @ApiProperty({ description: 'Telemetry data points', type: [Object] })
  dataPoints: Array<{
    ts: Date;
    value: number;
    quality: string;
  }>;

  @ApiProperty({ description: 'Statistics for the time period' })
  statistics: {
    min: number;
    max: number;
    avg: number;
    count: number;
    firstValue: number;
    lastValue: number;
  };
}

export class SensorLogTelemetryTrendsResponseDto {
  @ApiProperty({ description: 'Node ID' })
  idNode: string;

  @ApiProperty({ description: 'Time range in hours' })
  hours: number;

  @ApiProperty({ description: 'Total channels with data' })
  channelCount: number;

  @ApiProperty({ description: 'Total data points returned' })
  totalDataPoints: number;

  @ApiProperty({ description: 'Telemetry trends per channel', type: [SensorLogTelemetryTrendDto] })
  channels: SensorLogTelemetryTrendDto[];

  @ApiProperty({ description: 'Query execution time in ms' })
  queryTimeMs: number;
}

export class SensorLogListResponseDto {
  @ApiProperty({ description: 'List of sensor logs with enriched data', type: [SensorLogEnrichedResponseDto] })
  data: SensorLogEnrichedResponseDto[];

  @ApiProperty({ description: 'Total count of logs' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Logs per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
}

export class SensorLogStatisticsDto {
  @ApiProperty({ description: 'Total logs in database' })
  totalLogs: number;

  @ApiProperty({ description: 'Logs by quality flag' })
  byQuality: Array<{
    qualityFlag: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Logs by ingestion source' })
  bySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Recent activity (last 24 hours)' })
  recentActivity: {
    last24h: number;
    lastHour: number;
    averagePerMinute: number;
  };

  @ApiProperty({ description: 'Top active channels' })
  topChannels: Array<{
    idSensorChannel: string;
    metricCode: string;
    logCount: number;
    latestValue: number;
    latestTimestamp: Date;
  }>;
}

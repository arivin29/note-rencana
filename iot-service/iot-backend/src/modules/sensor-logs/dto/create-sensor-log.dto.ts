import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsNumber, IsString, IsDateString, IsEnum, Min, Max } from 'class-validator';

export enum QualityFlag {
  GOOD = 'good',
  BAD = 'bad',
  UNCERTAIN = 'uncertain',
}

export enum IngestionSource {
  API = 'api',
  MQTT = 'mqtt',
  MODBUS = 'modbus',
  TCP = 'tcp',
  HTTP = 'http',
}

export class CreateSensorLogDto {
  @ApiProperty({ description: 'Sensor channel ID' })
  @IsUUID()
  idSensorChannel: string;

  @ApiProperty({ description: 'Sensor ID' })
  @IsUUID()
  idSensor: string;

  @ApiProperty({ description: 'Node ID' })
  @IsUUID()
  idNode: string;

  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  idProject: string;

  @ApiPropertyOptional({ description: 'Owner ID' })
  @IsOptional()
  @IsUUID()
  idOwner?: string;

  @ApiPropertyOptional({ description: 'Timestamp of measurement (ISO string)', example: '2025-11-12T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  ts?: string;

  @ApiPropertyOptional({ description: 'Raw sensor value' })
  @IsOptional()
  @IsNumber()
  valueRaw?: number;

  @ApiPropertyOptional({ description: 'Engineered/calibrated value' })
  @IsOptional()
  @IsNumber()
  valueEngineered?: number;

  @ApiPropertyOptional({ description: 'Quality flag', enum: QualityFlag })
  @IsOptional()
  @IsEnum(QualityFlag)
  qualityFlag?: QualityFlag;

  @ApiPropertyOptional({ description: 'Ingestion source', enum: IngestionSource })
  @IsOptional()
  @IsEnum(IngestionSource)
  ingestionSource?: IngestionSource;

  @ApiPropertyOptional({ description: 'Status code' })
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @ApiPropertyOptional({ description: 'Ingestion latency in ms' })
  @IsOptional()
  @IsNumber()
  ingestionLatencyMs?: number;

  @ApiPropertyOptional({ description: 'Payload sequence number' })
  @IsOptional()
  @IsNumber()
  payloadSeq?: number;

  @ApiPropertyOptional({ description: 'Minimum threshold' })
  @IsOptional()
  @IsNumber()
  minThreshold?: number;

  @ApiPropertyOptional({ description: 'Maximum threshold' })
  @IsOptional()
  @IsNumber()
  maxThreshold?: number;
}

export class BulkCreateSensorLogsDto {
  @ApiProperty({ description: 'Array of sensor log entries', type: [CreateSensorLogDto] })
  logs: CreateSensorLogDto[];
}

export class GetSensorLogsQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-indexed)', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 1000, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiPropertyOptional({ description: 'Filter by sensor channel ID' })
  @IsOptional()
  @IsUUID()
  idSensorChannel?: string;

  @ApiPropertyOptional({ description: 'Filter by sensor ID' })
  @IsOptional()
  @IsUUID()
  idSensor?: string;

  @ApiPropertyOptional({ description: 'Filter by node ID' })
  @IsOptional()
  @IsUUID()
  idNode?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  idProject?: string;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @IsUUID()
  idOwner?: string;

  @ApiPropertyOptional({ description: 'Filter by quality flag', enum: QualityFlag })
  @IsOptional()
  @IsEnum(QualityFlag)
  qualityFlag?: QualityFlag;

  @ApiPropertyOptional({ description: 'Filter by ingestion source', enum: IngestionSource })
  @IsOptional()
  @IsEnum(IngestionSource)
  ingestionSource?: IngestionSource;

  @ApiPropertyOptional({ description: 'Start timestamp (ISO string)', example: '2025-11-12T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End timestamp (ISO string)', example: '2025-11-12T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GetTelemetryTrendsQueryDto {
  @ApiPropertyOptional({ description: 'Hours of historical data', minimum: 0.5, maximum: 168, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(168) // Max 1 week
  hours?: number = 1;

  @ApiPropertyOptional({ description: 'Comma-separated channel IDs to filter', example: 'uuid1,uuid2,uuid3' })
  @IsOptional()
  @IsString()
  channelIds?: string;

  @ApiPropertyOptional({ description: 'Data point interval in minutes', minimum: 1, maximum: 60, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  intervalMinutes?: number = 10;
}

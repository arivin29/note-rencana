import { IsOptional, IsString, IsNumber, IsUUID, IsDateString, IsEnum, Min, Max, IsNotEmpty, IsObject, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AnomalyGrade {
  NORMAL = 'normal',
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical',
}

/**
 * DTO for creating anomaly results from iot-gtw ML detection
 * Supports either idSensorChannel OR (deviceId + sensorKey)
 */
export class CreateAnomalyDto {
  @ApiPropertyOptional({ description: 'Sensor channel ID (provide this OR deviceId+sensorKey)' })
  @ValidateIf((o) => !o.deviceId || !o.sensorKey)
  @IsUUID()
  idSensorChannel?: string;

  @ApiPropertyOptional({ description: 'Device ID (used with sensorKey to resolve idSensorChannel)' })
  @ValidateIf((o) => !o.idSensorChannel)
  @IsString()
  @IsNotEmpty()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Sensor key (used with deviceId to resolve idSensorChannel)' })
  @ValidateIf((o) => !o.idSensorChannel)
  @IsString()
  @IsNotEmpty()
  sensorKey?: string;

  @ApiPropertyOptional({ description: 'Metric code (channel name)' })
  @IsOptional()
  @IsString()
  metricCode?: string;

  @ApiProperty({ description: 'When anomaly was detected' })
  @IsDateString()
  @IsNotEmpty()
  detectedAt: string;

  @ApiProperty({ description: 'Actual sensor value' })
  @IsNumber()
  @IsNotEmpty()
  actualValue: number;

  @ApiPropertyOptional({ description: 'Expected/predicted value' })
  @IsOptional()
  @IsNumber()
  expectedValue?: number;

  @ApiProperty({ description: 'Anomaly score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  anomalyScore: number;

  @ApiProperty({ description: 'Anomaly severity grade', enum: AnomalyGrade })
  @IsEnum(AnomalyGrade)
  @IsNotEmpty()
  anomalyGrade: AnomalyGrade;

  @ApiProperty({ description: 'Type of anomaly (spike, drop, drift, etc)' })
  @IsString()
  @IsNotEmpty()
  anomalyType: string;

  @ApiPropertyOptional({ description: 'OpenSearch detector ID' })
  @IsOptional()
  @IsString()
  detectorId?: string;

  @ApiPropertyOptional({ description: 'OpenSearch detector name' })
  @IsOptional()
  @IsString()
  detectorName?: string;

  @ApiPropertyOptional({ description: 'Raw OpenSearch result JSON' })
  @IsOptional()
  @IsObject()
  opensearchResult?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Optional note' })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * DTO for bulk creating anomalies
 */
export class CreateBulkAnomaliesDto {
  @ApiProperty({ type: [CreateAnomalyDto], description: 'Array of anomalies to create' })
  @IsNotEmpty()
  anomalies: CreateAnomalyDto[];
}

export class QueryAnomaliesDto {
  @ApiPropertyOptional({ description: 'Filter by sensor channel ID' })
  @IsOptional()
  @IsUUID()
  idSensorChannel?: string;

  @ApiPropertyOptional({ description: 'Filter by device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Filter by sensor key' })
  @IsOptional()
  @IsString()
  sensorKey?: string;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Filter by minimum grade', enum: AnomalyGrade })
  @IsOptional()
  @IsEnum(AnomalyGrade)
  minGrade?: AnomalyGrade;

  @ApiPropertyOptional({ description: 'Start date for date range filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for date range filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter only acknowledged anomalies' })
  @IsOptional()
  isAcknowledged?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AcknowledgeAnomalyDto {
  @ApiProperty({ description: 'User who acknowledged' })
  @IsString()
  acknowledgedBy: string;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AnomalyResponseDto {
  @ApiProperty()
  idAnomalyResult: string;

  @ApiProperty()
  idSensorChannel: string;

  @ApiProperty()
  detectedAt: Date;

  @ApiProperty()
  actualValue: number;

  @ApiPropertyOptional()
  expectedValue?: number;

  @ApiProperty()
  anomalyScore: number;

  @ApiProperty({ enum: AnomalyGrade })
  anomalyGrade: string;

  @ApiProperty()
  anomalyType: string;

  @ApiPropertyOptional()
  detectorId?: string;

  @ApiPropertyOptional()
  detectorName?: string;

  @ApiProperty()
  isAcknowledged: boolean;

  @ApiPropertyOptional()
  acknowledgedAt?: Date;

  @ApiPropertyOptional()
  acknowledgedBy?: string;

  @ApiProperty()
  createdAt: Date;

  // Joined data
  @ApiPropertyOptional()
  sensorChannel?: {
    idSensorChannel: string;
    channelName: string;
    unitMeasure: string;
  };

  @ApiPropertyOptional()
  sensor?: {
    idSensor: string;
    sensorKey: string;
    sensorName: string;
  };

  @ApiPropertyOptional()
  node?: {
    idNode: string;
    nodeName: string;
    deviceId: string;
  };
}

export class AnomalySummaryDto {
  @ApiProperty()
  totalAnomalies: number;

  @ApiProperty()
  criticalCount: number;

  @ApiProperty()
  severeCount: number;

  @ApiProperty()
  moderateCount: number;

  @ApiProperty()
  mildCount: number;

  @ApiProperty()
  acknowledgedCount: number;

  @ApiProperty()
  unacknowledgedCount: number;

  @ApiProperty()
  lastDetectedAt: Date | null;

  @ApiProperty()
  affectedSensors: number;

  @ApiProperty()
  affectedNodes: number;
}

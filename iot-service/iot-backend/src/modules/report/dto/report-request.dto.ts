import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';

export enum AggregationMode {
  RAW = 'raw',
  ONE_MINUTE = '1m',
  TEN_MINUTES = '10m',
  ONE_HOUR = '1h',
  ONE_DAY = '1d',
}

export enum RangeType {
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1M',
  CUSTOM = 'custom',
}

export class ReportRequestDto {
  @ApiPropertyOptional({
    description: 'Owner ID (required for admin, auto-filled for owner users)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    description: 'Project ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Node IDs to filter by (multi-select)',
    example: ['123e4567-e89b-12d3-a456-426614174002'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  nodeIds?: string[];

  @ApiPropertyOptional({
    description: 'Sensor Channel IDs to include in report (multi-select)',
    example: ['123e4567-e89b-12d3-a456-426614174003'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sensorChannelIds?: string[];

  @ApiPropertyOptional({
    description: 'Metric codes to include (alternative to sensorChannelIds). Combined with nodeIds to get channels.',
    example: ['pressure', 'temperature'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metricCodes?: string[];

  @ApiProperty({
    description: 'Start date for report data',
    example: '2026-03-01T00:00:00Z',
  })
  @IsISO8601()
  startDate: string;

  @ApiProperty({
    description: 'End date for report data',
    example: '2026-03-10T23:59:59Z',
  })
  @IsISO8601()
  endDate: string;

  @ApiProperty({
    description: 'Aggregation mode for data',
    enum: AggregationMode,
    example: AggregationMode.ONE_HOUR,
  })
  @IsEnum(AggregationMode)
  aggregation: AggregationMode;

  @ApiPropertyOptional({
    description: 'Fill time gaps with null values (default: false)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  fillGaps?: boolean;

  @ApiPropertyOptional({
    description: 'Skip zero values in aggregation (default: true). Useful to exclude sensor error readings.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  skipZero?: boolean;

  @ApiPropertyOptional({
    description: 'Use threshold filter from sensor_channel (min/max threshold with 20% buffer). Default: false',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  useThresholdFilter?: boolean;
}

export class ReportPreviewRequestDto extends ReportRequestDto {
  @ApiPropertyOptional({
    description: 'Maximum rows to return for preview (default: 100)',
    example: 100,
  })
  @IsOptional()
  previewLimit?: number;
}

/**
 * DTO for getting sensor types by nodes
 */
export class GetSensorTypesDto {
  @ApiProperty({
    description: 'Node IDs to get sensor types for',
    example: ['123e4567-e89b-12d3-a456-426614174002'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one node ID is required' })
  @IsUUID('4', { each: true })
  nodeIds: string[];
}

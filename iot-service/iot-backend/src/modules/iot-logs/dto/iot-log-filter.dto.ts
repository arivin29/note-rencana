import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum LogLabel {
  TELEMETRY = 'telemetry',
  EVENT = 'event',
  PAIRING = 'pairing',
  ERROR = 'error',
  WARNING = 'warning',
  COMMAND = 'command',
  RESPONSE = 'response',
  DEBUG = 'debug',
  INFO = 'info',
  LOG = 'log',
}

export class IotLogFilterDto {
  @ApiProperty({
    required: false,
    description: 'Filter by device ID (node code)',
    example: 'NODE-001',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by owner ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by project ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    required: false,
    enum: LogLabel,
    description: 'Filter by log label/category',
    example: 'telemetry',
  })
  @IsOptional()
  @IsEnum(LogLabel)
  label?: LogLabel;

  @ApiProperty({
    required: false,
    description: 'Filter by processed status',
    example: false,
  })
  @IsOptional()
  processed?: boolean;

  @ApiProperty({
    required: false,
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2025-11-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'End date for filtering (ISO 8601 format)',
    example: '2025-11-23T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    required: false,
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

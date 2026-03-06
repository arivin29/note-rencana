import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsNumber, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// COMMON QUERY DTOs
// ============================================

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ProjectFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class NodeFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['active', 'maintenance', 'offline'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by connectivity', enum: ['online', 'offline'] })
  @IsOptional()
  @IsString()
  connectivityStatus?: string;
}

export class SensorFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by node ID' })
  @IsOptional()
  @IsUUID()
  nodeId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['active', 'maintenance', 'inactive'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class SensorDataQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by node ID' })
  @IsOptional()
  @IsUUID()
  nodeId?: string;

  @ApiPropertyOptional({ description: 'Filter by sensor ID' })
  @IsOptional()
  @IsUUID()
  sensorId?: string;

  @ApiPropertyOptional({ description: 'Filter by channel ID' })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Filter by metric code', example: 'temperature' })
  @IsOptional()
  @IsString()
  metricCode?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO8601)', example: '2025-02-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO8601)', example: '2025-02-07T23:59:59Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Filter by quality flag', enum: ['good', 'bad', 'uncertain'] })
  @IsOptional()
  @IsString()
  qualityFlag?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}

export class SensorDataAggregatedQueryDto {
  @ApiPropertyOptional({ description: 'Channel ID to aggregate' })
  @IsUUID()
  channelId: string;

  @ApiPropertyOptional({ description: 'Start date (ISO8601)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO8601)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ 
    description: 'Aggregation interval', 
    enum: ['1m', '5m', '15m', '1h', '1d'],
    default: '1h'
  })
  @IsOptional()
  @IsString()
  interval?: string = '1h';

  @ApiPropertyOptional({ 
    description: 'Aggregation type', 
    enum: ['avg', 'min', 'max', 'sum', 'count'],
    default: 'avg'
  })
  @IsOptional()
  @IsString()
  aggregation?: string = 'avg';
}

export class AlertFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by node ID' })
  @IsOptional()
  @IsUUID()
  nodeId?: string;

  @ApiPropertyOptional({ description: 'Filter by severity', enum: ['info', 'warning', 'critical'] })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['active', 'acknowledged', 'resolved'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExportQueryDto {
  @ApiPropertyOptional({ description: 'Export format', enum: ['csv', 'json'], default: 'json' })
  @IsOptional()
  @IsString()
  format?: 'csv' | 'json' = 'json';

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by node ID' })
  @IsOptional()
  @IsUUID()
  nodeId?: string;

  @ApiPropertyOptional({ description: 'Filter by channel ID' })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO8601)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO8601)' })
  @IsDateString()
  endDate: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class QueryMeta {
  queryTimeMs: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

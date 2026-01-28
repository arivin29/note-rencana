import { IsString, IsOptional, IsObject, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DataSource {
  POSTGRESQL = 'postgresql',
  CLICKHOUSE = 'clickhouse',
}

export class ExecuteQueryDto {
  @ApiProperty({ description: 'SQL SELECT query to execute' })
  @IsString()
  sql: string;

  @ApiPropertyOptional({ 
    description: 'Data source to query',
    enum: DataSource,
    default: DataSource.POSTGRESQL,
    example: 'postgresql'
  })
  @IsEnum(DataSource)
  @IsOptional()
  dataSource?: DataSource;

  @ApiPropertyOptional({ 
    description: 'Time range preset for query (legacy)', 
    example: '6h',
    enum: ['15m', '30m', '1h', '3h', '6h', '12h', '24h', '7d', '30d']
  })
  @IsString()
  @IsOptional()
  timeRange?: string;

  @ApiPropertyOptional({ 
    description: 'Start time as epoch milliseconds',
    example: 1769481191565
  })
  @IsNumber()
  @IsOptional()
  from?: number;

  @ApiPropertyOptional({ 
    description: 'End time as epoch milliseconds',
    example: 1769482091565
  })
  @IsNumber()
  @IsOptional()
  to?: number;

  @ApiPropertyOptional({ description: 'Query variables' })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}

export class ValidateQueryDto {
  @ApiProperty({ description: 'SQL query to validate' })
  @IsString()
  sql: string;
}

// Response DTOs
export class QueryColumnDto {
  name: string;
  type: string;
}

export class ExecuteQueryResponseDto {
  @ApiProperty({ description: 'Column names', type: [String] })
  columns: string[];

  @ApiProperty({ description: 'Query result rows', type: 'array' })
  rows: Record<string, any>[];

  @ApiProperty({ description: 'Total row count' })
  rowCount: number;

  @ApiProperty({ description: 'Execution time in milliseconds' })
  executionTime: number;
}

export class ValidateQueryResponseDto {
  @ApiProperty({ description: 'Whether the query is valid' })
  isValid: boolean;

  @ApiPropertyOptional({ description: 'Error message if invalid' })
  error?: string;

  @ApiPropertyOptional({ description: 'Blocked keywords found', type: [String] })
  blockedKeywords?: string[];
}

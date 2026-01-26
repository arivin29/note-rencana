import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteQueryDto {
  @ApiProperty({ description: 'SQL SELECT query to execute' })
  @IsString()
  sql: string;

  @ApiPropertyOptional({ 
    description: 'Time range for query', 
    example: '6h',
    enum: ['15m', '30m', '1h', '3h', '6h', '12h', '24h', '7d', '30d']
  })
  @IsString()
  @IsOptional()
  timeRange?: string;

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

import { IsString, IsOptional, IsObject, IsInt, IsIn, Min, Max, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Widget types - use kebab-case consistently (matches frontend)
const WIDGET_TYPES = [
  'line-chart',        // Single line time series
  'multi-line-chart',  // Multiple lines time series
  'bar-chart',         // Categorical bar chart
  'pie-chart',         // Distribution pie/donut
  'gauge',             // Single value with ranges
  'stat-card',         // KPI card with icon
  'table',             // Tabular data
  'heatmap'            // 2D heatmap visualization
] as const;
type WidgetTypeDto = typeof WIDGET_TYPES[number];

// Data source types
const DATA_SOURCES = ['postgresql', 'clickhouse'] as const;
type DataSourceType = typeof DATA_SOURCES[number];

export class CreateWidgetDto {
  @ApiProperty({ description: 'Widget name' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Widget type',
    enum: WIDGET_TYPES,
    example: 'line-chart'
  })
  @IsString()
  @IsIn(WIDGET_TYPES)
  widgetType: WidgetTypeDto;

  @ApiProperty({ description: 'SQL SELECT query' })
  @IsString()
  sqlQuery: string;

  @ApiPropertyOptional({ 
    description: 'Data source for query execution',
    enum: DATA_SOURCES,
    default: 'postgresql',
    example: 'postgresql'
  })
  @IsString()
  @IsIn(DATA_SOURCES)
  @IsOptional()
  dataSource?: DataSourceType;

  @ApiProperty({ description: 'Widget configuration JSON' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: 'Grid position X', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Grid position Y', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  positionY?: number;

  @ApiPropertyOptional({ description: 'Grid columns (width)', default: 6 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  cols?: number;

  @ApiPropertyOptional({ description: 'Grid rows (height)', default: 4 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  rows?: number;
}

export class UpdateWidgetDto {
  @ApiPropertyOptional({ description: 'Widget name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Widget type',
    enum: WIDGET_TYPES
  })
  @IsString()
  @IsIn(WIDGET_TYPES)
  @IsOptional()
  widgetType?: WidgetTypeDto;

  @ApiPropertyOptional({ description: 'SQL SELECT query' })
  @IsString()
  @IsOptional()
  sqlQuery?: string;

  @ApiPropertyOptional({ 
    description: 'Data source for query execution',
    enum: DATA_SOURCES,
    example: 'postgresql'
  })
  @IsString()
  @IsIn(DATA_SOURCES)
  @IsOptional()
  dataSource?: DataSourceType;

  @ApiPropertyOptional({ description: 'Widget configuration JSON' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Grid position X' })
  @IsInt()
  @Min(0)
  @IsOptional()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Grid position Y' })
  @IsInt()
  @Min(0)
  @IsOptional()
  positionY?: number;

  @ApiPropertyOptional({ description: 'Grid columns (width)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  cols?: number;

  @ApiPropertyOptional({ description: 'Grid rows (height)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  rows?: number;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  isActive?: boolean;
}

// For batch position updates (drag & drop)
export class WidgetPositionDto {
  @ApiProperty({ description: 'Widget ID' })
  @IsString()
  idWidget: string;

  @ApiProperty({ description: 'Grid position X' })
  @IsInt()
  @Min(0)
  positionX: number;

  @ApiProperty({ description: 'Grid position Y' })
  @IsInt()
  @Min(0)
  positionY: number;

  @ApiPropertyOptional({ description: 'Grid columns (width)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  cols?: number;

  @ApiPropertyOptional({ description: 'Grid rows (height)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  rows?: number;
}

export class UpdateWidgetPositionsDto {
  @ApiProperty({ type: [WidgetPositionDto], description: 'Array of widget positions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetPositionDto)
  positions: WidgetPositionDto[];
}

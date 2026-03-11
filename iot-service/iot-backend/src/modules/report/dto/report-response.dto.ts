import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportColumnDto {
  @ApiProperty({ description: 'Column key', example: 'sensor_a' })
  key: string;

  @ApiProperty({ description: 'Column label', example: 'Temperature - Pump 1' })
  label: string;

  @ApiPropertyOptional({ description: 'Unit of measurement', example: '°C' })
  unit?: string;
}

export class ReportRowDto {
  @ApiProperty({ description: 'Timestamp', example: '2026-03-01T00:00:00Z' })
  timestamp: string;

  @ApiProperty({
    description: 'Sensor values keyed by sensor channel ID',
    example: { sensor_a: 25.5, sensor_b: 3.2 },
  })
  values: Record<string, number | null>;
}

export class ChartSeriesDto {
  @ApiProperty({ description: 'Series name', example: 'Temperature - Pump 1' })
  name: string;

  @ApiProperty({ description: 'Data points', example: [25.5, 26.1, 25.8] })
  data: (number | null)[];
}

export class ChartDataDto {
  @ApiProperty({
    description: 'X-axis categories (timestamps)',
    example: ['2026-03-01T00:00:00Z', '2026-03-01T01:00:00Z'],
  })
  categories: string[];

  @ApiProperty({ description: 'Chart series data', type: [ChartSeriesDto] })
  series: ChartSeriesDto[];
}

export class SensorSummaryDto {
  @ApiProperty({
    description: 'Sensor Channel ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  sensorChannelId: string;

  @ApiProperty({ description: 'Sensor label', example: 'Temperature - Pump 1' })
  label: string;

  @ApiPropertyOptional({ description: 'Unit', example: '°C' })
  unit?: string;

  @ApiProperty({ description: 'Minimum value', example: 20.1 })
  min: number;

  @ApiProperty({ description: 'Maximum value', example: 31.2 })
  max: number;

  @ApiProperty({ description: 'Average value', example: 25.5 })
  avg: number;

  @ApiProperty({ description: 'Data point count', example: 168 })
  count: number;
}

export class ReportMetadataDto {
  @ApiProperty({
    description: 'Report generation timestamp',
    example: '2026-03-10T10:30:00Z',
  })
  generatedAt: string;

  @ApiProperty({ description: 'Total data points', example: 1680 })
  totalPoints: number;

  @ApiProperty({ description: 'Date range start', example: '2026-03-01T00:00:00Z' })
  startDate: string;

  @ApiProperty({ description: 'Date range end', example: '2026-03-10T23:59:59Z' })
  endDate: string;

  @ApiProperty({ description: 'Aggregation mode used', example: '1h' })
  aggregation: string;

  @ApiPropertyOptional({ description: 'Project name', example: 'Pump Station Alpha' })
  projectName?: string;

  @ApiPropertyOptional({ description: 'Node names', example: ['Pump 1', 'Pump 2'] })
  nodeNames?: string[];
}

export class ReportPreviewResponseDto {
  @ApiProperty({ description: 'Report metadata' })
  metadata: ReportMetadataDto;

  @ApiProperty({ description: 'Column definitions', type: [ReportColumnDto] })
  columns: ReportColumnDto[];

  @ApiProperty({ description: 'Data rows (limited for preview)', type: [ReportRowDto] })
  rows: ReportRowDto[];

  @ApiProperty({ description: 'Chart data for visualization' })
  chartData: ChartDataDto;

  @ApiProperty({ description: 'Summary statistics per sensor', type: [SensorSummaryDto] })
  summary: SensorSummaryDto[];
}

// Generic API response wrapper
export class ReportApiResponseDto<T> {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  message?: string;
}
/**
 * Sensor Type DTO for grouped sensor channels
 */
export class SensorTypeDto {
  @ApiProperty({ description: 'Metric code (unique identifier)', example: 'pressure' })
  metricCode: string;

  @ApiProperty({ description: 'Display label', example: 'Pressure' })
  label: string;

  @ApiPropertyOptional({ description: 'Unit of measurement', example: 'bar' })
  unit?: string;

  @ApiProperty({ description: 'Number of channels with this metric', example: 3 })
  channelCount: number;
}
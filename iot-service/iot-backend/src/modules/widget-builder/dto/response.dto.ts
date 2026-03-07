import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Widget types for response
const WIDGET_TYPES = [
  'line-chart', 'multi-line-chart', 'bar-chart', 'pie-chart',
  'gauge', 'stat-card', 'table', 'heatmap'
] as const;

export class CustomWidgetResponseDto {
  @ApiProperty({ description: 'Widget ID' })
  idWidget: string;

  @ApiProperty({ description: 'Dashboard ID' })
  idDashboard: string;

  @ApiProperty({ description: 'Widget name' })
  name: string;

  @ApiProperty({ description: 'Widget type', enum: WIDGET_TYPES })
  widgetType: string;

  @ApiProperty({ description: 'SQL query' })
  sqlQuery: string;

  @ApiProperty({ description: 'Widget configuration' })
  config: Record<string, any>;

  @ApiProperty({ description: 'Grid position X' })
  positionX: number;

  @ApiProperty({ description: 'Grid position Y' })
  positionY: number;

  @ApiProperty({ description: 'Grid columns' })
  cols: number;

  @ApiProperty({ description: 'Grid rows' })
  rows: number;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;
}

export class CustomDashboardResponseDto {
  @ApiProperty({ description: 'Dashboard ID' })
  idDashboard: string;

  @ApiProperty({ description: 'Owner ID' })
  idOwner: string;

  @ApiPropertyOptional({ description: 'Associated project ID' })
  idProject?: string;

  @ApiPropertyOptional({ description: 'Project name (when loaded)' })
  projectName?: string;

  @ApiProperty({ description: 'Dashboard name' })
  name: string;

  @ApiPropertyOptional({ description: 'Dashboard description' })
  description?: string;

  @ApiProperty({ description: 'Layout configuration' })
  layoutConfig: Record<string, any>;

  @ApiProperty({ description: 'Default time range' })
  timeRange: string;

  @ApiProperty({ description: 'Auto refresh interval in seconds' })
  refreshInterval: number;

  @ApiProperty({ description: 'Is default dashboard' })
  isDefault: boolean;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  createdBy?: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Widgets in this dashboard', type: [CustomWidgetResponseDto] })
  widgets?: CustomWidgetResponseDto[];
}

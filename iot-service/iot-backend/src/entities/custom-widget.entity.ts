import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomDashboard } from './custom-dashboard.entity';

// Widget type enum - use kebab-case consistently
export type WidgetType = 
  | 'line-chart'        // Single line time series
  | 'multi-line-chart'  // Multiple lines time series
  | 'bar-chart'         // Categorical bar chart
  | 'pie-chart'         // Distribution pie/donut
  | 'gauge'             // Single value with ranges
  | 'stat-card'         // KPI card with icon
  | 'table'             // Tabular data
  | 'heatmap';          // 2D heatmap visualization

// Widget configuration interfaces
export interface WidgetFieldMapping {
  xField: string;
  yField: string;
  yFields: string[];
  seriesField: string;
  labelField: string;
  valueField: string;
}

export interface WidgetSeriesConfig {
  field: string;
  label: string;
  color: string;
  unit: string;
  decimals: number;
  visible: boolean;
}

export interface WidgetAxisConfig {
  label: string;
  timeFormat: string;
}

export interface WidgetYAxisConfig {
  label: string;
  unit: string;
  decimals: number;
  min: number | null;
  max: number | null;
  scale: 'linear' | 'log';
}

export interface WidgetThreshold {
  mode: 'manual' | 'field';
  value: number;
  field: string;
  label: string;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

export interface WidgetDisplayConfig {
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  lineStyle: 'smooth' | 'straight' | 'step';
  lineWidth: number;
  fillOpacity: number;
  showPoints: 'never' | 'always' | 'auto';
  tooltipMode: 'single' | 'all' | 'hidden';
}

export interface WidgetConfig {
  title?: string;
  description?: string;
  mapping?: WidgetFieldMapping;
  series?: WidgetSeriesConfig[];
  xAxis?: WidgetAxisConfig;
  yAxis?: WidgetYAxisConfig;
  thresholds?: WidgetThreshold[];
  display?: WidgetDisplayConfig;
}

@Entity('custom_widgets')
@Index(['idDashboard'])
export class CustomWidget {
  @PrimaryGeneratedColumn('uuid', { name: 'id_widget' })
  idWidget: string;

  @Column({ type: 'uuid', name: 'id_dashboard', nullable: false })
  idDashboard: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, name: 'widget_type', nullable: false })
  widgetType: WidgetType;

  // Position in grid layout
  @Column({ type: 'integer', name: 'position_x', default: 0 })
  positionX: number;

  @Column({ type: 'integer', name: 'position_y', default: 0 })
  positionY: number;

  @Column({ type: 'integer', default: 6 })
  cols: number;

  @Column({ type: 'integer', default: 4 })
  rows: number;

  // SQL Query
  @Column({ type: 'text', name: 'sql_query', nullable: false })
  sqlQuery: string;

  // Complete configuration as JSONB
  @Column({ type: 'jsonb', default: {} })
  config: WidgetConfig;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CustomDashboard, (dashboard) => dashboard.widgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_dashboard' })
  dashboard: CustomDashboard;
}

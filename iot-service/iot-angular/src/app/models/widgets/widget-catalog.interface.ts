import { SensorType, WidgetType, WidgetCategory, WidgetComplexity, WidgetResourceUsage, DataType } from './widget-types.enum';

export interface WidgetCatalogItem {
  id: string;
  name: string;
  category: WidgetCategory;
  widgetType: WidgetType;

  // Display
  icon: string;
  thumbnail: string;
  description: string;

  // Compatibility
  supportedSensorTypes: SensorType[] | ['*'];
  supportedDataTypes: DataType[];

  // Configuration
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  configOptions: WidgetConfigOption[];

  // Metadata
  complexity: WidgetComplexity;
  resourceUsage: WidgetResourceUsage;
  tags: string[];
}

export interface WidgetConfigOption {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'toggle' | 'color';
  defaultValue: any;
  options?: Array<{ label: string; value: any }>;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  userId: string;
  projectId?: string;
  layout: 'grid' | 'free';
  gridSize: { cols: number; rows: number };
  widgets: DashboardWidgetInstance[];
  isDefault?: boolean;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidgetInstance {
  instanceId: string;
  widgetCatalogId: string;

  // Sensor binding
  sensorId: string;
  sensorChannelId?: string;
  sensorType: SensorType;

  // Position & Size
  position: { x: number; y: number };
  size: { width: number; height: number };

  // Configuration
  config: any; // BaseWidgetConfig or extended
  customConfig: Record<string, any>;

  // Behavior
  refreshRate: number;
  autoRefresh: boolean;
  displayOrder?: number;
}

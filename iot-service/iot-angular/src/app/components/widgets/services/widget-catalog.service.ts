import { Injectable } from '@angular/core';
import { WidgetCatalogItem, SensorType } from '../../../models/widgets';

@Injectable({
  providedIn: 'root'
})
export class WidgetCatalogService {

  private catalog: WidgetCatalogItem[] = [
    // ====================
    // NUMERIC CATEGORY
    // ====================
    {
      id: 'big-number',
      name: 'Big Number',
      category: 'numeric',
      widgetType: 'big-number',
      icon: 'fa-calculator',
      thumbnail: '/assets/img/widgets/big-number-thumb.png',
      description: 'Display sensor value in large prominent number',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['scalar'],
      defaultSize: { width: 1, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [
        {
          key: 'showTrend',
          label: 'Show Trend',
          type: 'toggle',
          defaultValue: true
        },
        {
          key: 'fontSize',
          label: 'Font Size',
          type: 'select',
          defaultValue: 'large',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
            { label: 'Extra Large', value: 'xlarge' }
          ]
        }
      ],
      complexity: 'simple',
      resourceUsage: 'low',
      tags: ['simple', 'minimal', 'kpi']
    },

    {
      id: 'info-card',
      name: 'Info Card',
      category: 'numeric',
      widgetType: 'info-card',
      icon: 'fa-id-card',
      thumbnail: '/assets/img/widgets/info-card-thumb.png',
      description: 'Compact card with value, status, and metadata',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['scalar'],
      defaultSize: { width: 1, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [
        {
          key: 'showIcon',
          label: 'Show Icon',
          type: 'toggle',
          defaultValue: true
        },
        {
          key: 'showStats',
          label: 'Show Min/Max',
          type: 'toggle',
          defaultValue: true
        }
      ],
      complexity: 'simple',
      resourceUsage: 'low',
      tags: ['compact', 'overview']
    },

    {
      id: 'multi-metric',
      name: 'Multi-Metric Card',
      category: 'numeric',
      widgetType: 'multi-metric',
      icon: 'fa-table-cells',
      thumbnail: '/assets/img/widgets/multi-metric-thumb.png',
      description: 'Display current, average, min, and max values',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['multi-metric'],
      defaultSize: { width: 1, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [],
      complexity: 'simple',
      resourceUsage: 'low',
      tags: ['statistics', 'summary']
    },

    // ====================
    // GAUGE CATEGORY
    // ====================
    {
      id: 'radial-gauge',
      name: 'Radial Gauge',
      category: 'gauge',
      widgetType: 'radial-gauge',
      icon: 'fa-gauge',
      thumbnail: '/assets/img/widgets/radial-gauge-thumb.png',
      description: 'Classic circular gauge with needle/arc indicator',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['scalar'],
      defaultSize: { width: 1, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [
        {
          key: 'showMinMax',
          label: 'Show Min/Max Labels',
          type: 'toggle',
          defaultValue: true
        },
        {
          key: 'colorZones',
          label: 'Color Zones',
          type: 'select',
          defaultValue: 'auto',
          options: [
            { label: 'Auto (Green-Yellow-Red)', value: 'auto' },
            { label: 'Single Color', value: 'single' },
            { label: 'Custom', value: 'custom' }
          ]
        },
        {
          key: 'needleType',
          label: 'Indicator Type',
          type: 'select',
          defaultValue: 'needle',
          options: [
            { label: 'Needle', value: 'needle' },
            { label: 'Arc', value: 'arc' }
          ]
        }
      ],
      complexity: 'medium',
      resourceUsage: 'medium',
      tags: ['gauge', 'visual', 'realtime']
    },

    {
      id: 'linear-gauge',
      name: 'Linear Gauge',
      category: 'gauge',
      widgetType: 'linear-gauge',
      icon: 'fa-sliders',
      thumbnail: '/assets/img/widgets/linear-gauge-thumb.png',
      description: 'Horizontal bar gauge for space-efficient display',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['scalar'],
      defaultSize: { width: 2, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [
        {
          key: 'showPercentage',
          label: 'Show Percentage',
          type: 'toggle',
          defaultValue: true
        },
        {
          key: 'orientation',
          label: 'Orientation',
          type: 'select',
          defaultValue: 'horizontal',
          options: [
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Vertical', value: 'vertical' }
          ]
        }
      ],
      complexity: 'simple',
      resourceUsage: 'low',
      tags: ['compact', 'gauge']
    },

    {
      id: 'radial-progress',
      name: 'Radial Progress',
      category: 'gauge',
      widgetType: 'radial-progress',
      icon: 'fa-circle-notch',
      thumbnail: '/assets/img/widgets/radial-progress-thumb.png',
      description: 'Donut chart showing percentage of capacity',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['scalar'],
      defaultSize: { width: 1, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [
        {
          key: 'color',
          label: 'Progress Color',
          type: 'color',
          defaultValue: '#0EA5E9'
        }
      ],
      complexity: 'simple',
      resourceUsage: 'low',
      tags: ['progress', 'percentage']
    },

    // ====================
    // CHART CATEGORY
    // ====================
    {
      id: 'sparkline',
      name: 'Sparkline',
      category: 'chart',
      widgetType: 'sparkline',
      icon: 'fa-chart-area',
      thumbnail: '/assets/img/widgets/sparkline-thumb.png',
      description: 'Minimal line chart without axes',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['time-series'],
      defaultSize: { width: 1, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [
        {
          key: 'showTrend',
          label: 'Show Trend Percentage',
          type: 'toggle',
          defaultValue: true
        }
      ],
      complexity: 'simple',
      resourceUsage: 'medium',
      tags: ['compact', 'trend', 'minimal']
    },

    {
      id: 'line-chart',
      name: 'Line Chart',
      category: 'chart',
      widgetType: 'line-chart',
      icon: 'fa-chart-line',
      thumbnail: '/assets/img/widgets/line-chart-thumb.png',
      description: 'Time-series line chart for trend analysis',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['time-series'],
      defaultSize: { width: 2, height: 2 },
      minSize: { width: 2, height: 1 },
      configOptions: [
        {
          key: 'timeRange',
          label: 'Time Range',
          type: 'select',
          defaultValue: '1h',
          options: [
            { label: 'Last 1 Hour', value: '1h' },
            { label: 'Last 6 Hours', value: '6h' },
            { label: 'Last 24 Hours', value: '24h' },
            { label: 'Last 7 Days', value: '7d' },
            { label: 'Last 30 Days', value: '30d' }
          ]
        },
        {
          key: 'showGrid',
          label: 'Show Grid',
          type: 'toggle',
          defaultValue: true
        },
        {
          key: 'smoothCurve',
          label: 'Smooth Curve',
          type: 'toggle',
          defaultValue: true
        }
      ],
      complexity: 'advanced',
      resourceUsage: 'high',
      tags: ['chart', 'trend', 'historical']
    },

    {
      id: 'area-chart',
      name: 'Area Chart',
      category: 'chart',
      widgetType: 'area-chart',
      icon: 'fa-chart-area',
      thumbnail: '/assets/img/widgets/area-chart-thumb.png',
      description: 'Time-series area chart with gradient fill',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['time-series'],
      defaultSize: { width: 2, height: 2 },
      minSize: { width: 2, height: 1 },
      configOptions: [
        {
          key: 'timeRange',
          label: 'Time Range',
          type: 'select',
          defaultValue: '1h',
          options: [
            { label: 'Last 1 Hour', value: '1h' },
            { label: 'Last 6 Hours', value: '6h' },
            { label: 'Last 24 Hours', value: '24h' },
            { label: 'Last 7 Days', value: '7d' },
            { label: 'Last 30 Days', value: '30d' }
          ]
        },
        {
          key: 'fillGradient',
          label: 'Gradient Fill',
          type: 'toggle',
          defaultValue: true
        }
      ],
      complexity: 'advanced',
      resourceUsage: 'high',
      tags: ['chart', 'area', 'historical']
    },

    // ====================
    // STATUS CATEGORY
    // ====================
    {
      id: 'threshold-alert',
      name: 'Threshold Alert',
      category: 'status',
      widgetType: 'threshold-alert',
      icon: 'fa-triangle-exclamation',
      thumbnail: '/assets/img/widgets/threshold-thumb.png',
      description: 'Visual indicator with threshold zones',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['scalar'],
      defaultSize: { width: 1, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [
        {
          key: 'alertSound',
          label: 'Alert Sound',
          type: 'toggle',
          defaultValue: false
        }
      ],
      complexity: 'medium',
      resourceUsage: 'low',
      tags: ['alert', 'safety', 'monitoring']
    },

    {
      id: 'status-badge',
      name: 'Status Badge',
      category: 'status',
      widgetType: 'status-badge',
      icon: 'fa-circle-check',
      thumbnail: '/assets/img/widgets/status-badge-thumb.png',
      description: 'Simple status indicator with online/offline state',
      supportedSensorTypes: ['*'],
      supportedDataTypes: ['status'],
      defaultSize: { width: 1, height: 1 },
      minSize: { width: 1, height: 1 },
      configOptions: [],
      complexity: 'simple',
      resourceUsage: 'low',
      tags: ['status', 'simple']
    }
  ];

  /**
   * Get full catalog
   */
  getCatalog(): WidgetCatalogItem[] {
    return [...this.catalog];
  }

  /**
   * Get catalog items by category
   */
  getCatalogByCategory(category: string): WidgetCatalogItem[] {
    if (category === 'all') {
      return this.getCatalog();
    }
    return this.catalog.filter(item => item.category === category);
  }

  /**
   * Get widget by ID
   */
  getWidgetById(id: string): WidgetCatalogItem | undefined {
    return this.catalog.find(item => item.id === id);
  }

  /**
   * Filter catalog by sensor type
   */
  filterBySensorType(sensorType: SensorType): WidgetCatalogItem[] {
    return this.catalog.filter(item => {
      const types = item.supportedSensorTypes as any;
      return types.includes('*') || types.includes(sensorType);
    });
  }

  /**
   * Search catalog
   */
  search(query: string): WidgetCatalogItem[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return this.getCatalog();
    }

    return this.catalog.filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get categories with counts
   */
  getCategories(): Array<{ id: string; label: string; icon: string; count: number }> {
    return [
      {
        id: 'all',
        label: 'All Widgets',
        icon: 'fa-th',
        count: this.catalog.length
      },
      {
        id: 'numeric',
        label: 'Numeric',
        icon: 'fa-calculator',
        count: this.catalog.filter(w => w.category === 'numeric').length
      },
      {
        id: 'gauge',
        label: 'Gauge',
        icon: 'fa-gauge',
        count: this.catalog.filter(w => w.category === 'gauge').length
      },
      {
        id: 'chart',
        label: 'Chart',
        icon: 'fa-chart-line',
        count: this.catalog.filter(w => w.category === 'chart').length
      },
      {
        id: 'status',
        label: 'Status',
        icon: 'fa-traffic-light',
        count: this.catalog.filter(w => w.category === 'status').length
      }
    ];
  }
}

# 📈 14 - ECharts Implementation Guide

> **Document:** Apache ECharts Integration for Angular  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 14.1 Why ECharts for IoT Dashboard?

### Comparison Summary

| Feature | ngx-charts | ApexCharts | **ECharts** | Grafana's Approach |
|---------|------------|------------|-------------|-------------------|
| Large dataset (>100K) | ❌ Crash | ⚠️ Slow | ✅ **Smooth** | Uses uPlot/ECharts |
| Real-time streaming | ❌ | ✅ | ✅ **Native** | Custom |
| Pan & Zoom | ❌ | ⚠️ Basic | ✅ **dataZoom** | Custom |
| Brush selection | ❌ | ❌ | ✅ **Built-in** | Custom |
| Dark theme | ⚠️ Manual | ✅ | ✅ **Built-in** | Built-in |
| Annotations | ❌ | ⚠️ | ✅ **markLine/markArea** | Built-in |
| Tree-shaking | ❌ | ❌ | ✅ **~60KB** | N/A |

### ECharts Wins for IoT:
1. **Time-series optimized** - Native support untuk temporal data
2. **Incremental rendering** - Handle jutaan data point
3. **DataZoom component** - Built-in pan/zoom seperti Grafana
4. **WebGL rendering** (echarts-gl) - Untuk visualisasi berat

---

## 14.2 Installation & Setup

### Install Dependencies

```bash
cd iot-angular

# Core packages
npm install echarts@^5.5.0 ngx-echarts@^20.0.1

# Optional: GL for 3D charts
npm install echarts-gl
```

### Tree-Shaking Setup (Recommended)

**File: `src/app/echarts.config.ts`**

```typescript
import * as echarts from 'echarts/core';

// ===== CHARTS =====
import {
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  HeatmapChart,
  ScatterChart
} from 'echarts/charts';

// ===== COMPONENTS =====
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkAreaComponent,
  MarkPointComponent,
  DatasetComponent,
  VisualMapComponent
} from 'echarts/components';

// ===== RENDERER =====
import { CanvasRenderer } from 'echarts/renderers';
// import { SVGRenderer } from 'echarts/renderers'; // For mobile/low memory

// ===== REGISTER =====
echarts.use([
  // Charts
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  HeatmapChart,
  ScatterChart,
  
  // Components
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkAreaComponent,
  MarkPointComponent,
  DatasetComponent,
  VisualMapComponent,
  
  // Renderer
  CanvasRenderer
]);

export { echarts };
```

### Angular Module Setup

**File: `src/app/modules/dynamic-dashboard/dynamic-dashboard.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../echarts.config';

@NgModule({
  imports: [
    CommonModule,
    NgxEchartsDirective,
    // ... other imports
  ],
  providers: [
    provideEchartsCore({ echarts })
  ]
})
export class DynamicDashboardModule {}
```

**For Standalone Components:**

```typescript
import { Component } from '@angular/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../echarts.config';

@Component({
  selector: 'app-line-chart-widget',
  standalone: true,
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `<div echarts [options]="chartOptions" class="chart"></div>`
})
export class LineChartWidgetComponent {}
```

---

## 14.3 Theme Configuration

### Dark Theme (Grafana-like)

**File: `src/app/echarts-theme-dark.ts`**

```typescript
export const darkTheme = {
  color: [
    '#73bf69', // Green (success)
    '#5794f2', // Blue (primary)
    '#ff9830', // Orange (warning)
    '#f2495c', // Red (error)
    '#b877d9', // Purple
    '#fade2a', // Yellow
  ],
  backgroundColor: '#181b1f',
  textStyle: {
    color: '#d8d9da'
  },
  title: {
    textStyle: {
      color: '#d8d9da'
    }
  },
  legend: {
    textStyle: {
      color: '#d8d9da'
    }
  },
  tooltip: {
    backgroundColor: 'rgba(24, 27, 31, 0.95)',
    borderColor: '#2c3235',
    textStyle: {
      color: '#d8d9da'
    }
  },
  xAxis: {
    axisLine: {
      lineStyle: { color: '#2c3235' }
    },
    axisLabel: {
      color: '#8e8e8e'
    },
    splitLine: {
      lineStyle: { color: '#2c3235' }
    }
  },
  yAxis: {
    axisLine: {
      lineStyle: { color: '#2c3235' }
    },
    axisLabel: {
      color: '#8e8e8e'
    },
    splitLine: {
      lineStyle: { color: '#2c3235' }
    }
  },
  dataZoom: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    dataBackgroundColor: 'rgba(255,255,255,0.1)',
    fillerColor: 'rgba(87, 148, 242, 0.2)',
    handleColor: '#5794f2',
    textStyle: {
      color: '#8e8e8e'
    }
  }
};
```

**Register Theme:**

```typescript
// In echarts.config.ts
import { darkTheme } from './echarts-theme-dark';

echarts.registerTheme('dark-iot', darkTheme);
```

**Use Theme:**

```html
<div echarts [options]="chartOptions" [theme]="'dark-iot'" class="chart"></div>
```

---

## 14.4 Chart Templates for IoT Widgets

### A. Real-time Line Chart

```typescript
@Component({
  selector: 'app-realtime-line-widget',
  standalone: true,
  imports: [NgxEchartsDirective],
  template: `
    <div echarts 
         [options]="chartOptions" 
         [merge]="updateOptions"
         [theme]="theme"
         (chartInit)="onChartInit($event)"
         class="widget-chart">
    </div>
  `,
  styles: [`.widget-chart { height: 100%; width: 100%; }`]
})
export class RealtimeLineWidgetComponent implements OnInit, OnDestroy {
  @Input() widget!: Widget;
  @Input() theme: string = 'dark-iot';
  
  chartOptions: EChartsCoreOption = {};
  updateOptions: EChartsCoreOption = {};
  
  private chartInstance: any;
  private dataBuffer: [number, number][] = [];
  private maxDataPoints = 100;
  
  ngOnInit() {
    this.initChart();
  }
  
  initChart() {
    this.chartOptions = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          const p = params[0];
          const date = new Date(p.value[0]);
          return `${date.toLocaleTimeString()}<br/>${p.seriesName}: ${p.value[1].toFixed(2)}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, height: 20 }
      ],
      xAxis: {
        type: 'time',
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: this.widget.config?.unit || '',
        nameLocation: 'middle',
        nameGap: 40,
        splitLine: {
          lineStyle: { type: 'dashed' }
        }
      },
      series: [{
        name: this.widget.title,
        type: 'line',
        smooth: true,
        symbol: 'none',
        sampling: 'lttb', // Largest-Triangle-Three-Buckets downsampling
        itemStyle: {
          color: this.widget.config?.lineColor || '#5794f2'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(87, 148, 242, 0.3)' },
              { offset: 1, color: 'rgba(87, 148, 242, 0.05)' }
            ]
          }
        },
        data: this.dataBuffer
      }]
    };
  }
  
  // Real-time update
  appendData(timestamp: number, value: number) {
    this.dataBuffer.push([timestamp, value]);
    
    // Keep buffer size limited
    if (this.dataBuffer.length > this.maxDataPoints) {
      this.dataBuffer.shift();
    }
    
    // Efficient update without full re-render
    this.updateOptions = {
      series: [{
        data: this.dataBuffer
      }]
    };
  }
  
  onChartInit(ec: any) {
    this.chartInstance = ec;
  }
  
  ngOnDestroy() {
    this.chartInstance?.dispose();
  }
}
```

---

### B. Gauge Widget

```typescript
@Component({
  selector: 'app-gauge-widget',
  template: `
    <div echarts [options]="chartOptions" [merge]="updateOptions" class="gauge-chart"></div>
  `
})
export class GaugeWidgetComponent {
  @Input() set value(val: number) {
    this.updateOptions = {
      series: [{ data: [{ value: val }] }]
    };
  }
  @Input() min = 0;
  @Input() max = 100;
  @Input() unit = '';
  @Input() thresholds: { warning: number; danger: number } = { warning: 70, danger: 90 };
  
  chartOptions: EChartsCoreOption = {};
  updateOptions: EChartsCoreOption = {};
  
  ngOnInit() {
    const warningRatio = this.thresholds.warning / this.max;
    const dangerRatio = this.thresholds.danger / this.max;
    
    this.chartOptions = {
      series: [{
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: this.min,
        max: this.max,
        splitNumber: 5,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#73bf69' },
              { offset: warningRatio, color: '#73bf69' },
              { offset: warningRatio, color: '#ff9830' },
              { offset: dangerRatio, color: '#ff9830' },
              { offset: dangerRatio, color: '#f2495c' },
              { offset: 1, color: '#f2495c' }
            ]
          }
        },
        progress: {
          show: true,
          width: 15
        },
        pointer: {
          itemStyle: {
            color: 'auto'
          }
        },
        axisLine: {
          lineStyle: {
            width: 15,
            color: [
              [warningRatio, '#73bf69'],
              [dangerRatio, '#ff9830'],
              [1, '#f2495c']
            ]
          }
        },
        axisTick: {
          distance: -20,
          splitNumber: 5,
          lineStyle: {
            width: 1,
            color: '#999'
          }
        },
        splitLine: {
          distance: -25,
          length: 10,
          lineStyle: {
            width: 2,
            color: '#999'
          }
        },
        axisLabel: {
          distance: -30,
          color: '#999',
          fontSize: 12
        },
        detail: {
          valueAnimation: true,
          formatter: `{value} ${this.unit}`,
          color: 'inherit',
          fontSize: 24,
          offsetCenter: [0, '70%']
        },
        data: [{ value: 0 }]
      }]
    };
  }
}
```

---

### C. Multi-Axis Comparison Chart

```typescript
// Temperature + Humidity dual-axis chart
const dualAxisOptions: EChartsCoreOption = {
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' }
  },
  legend: {
    data: ['Temperature', 'Humidity']
  },
  grid: {
    left: '10%',
    right: '10%'
  },
  xAxis: {
    type: 'time'
  },
  yAxis: [
    {
      type: 'value',
      name: 'Temperature',
      position: 'left',
      axisLine: {
        lineStyle: { color: '#5794f2' }
      },
      axisLabel: {
        formatter: '{value}°C'
      }
    },
    {
      type: 'value',
      name: 'Humidity',
      position: 'right',
      axisLine: {
        lineStyle: { color: '#73bf69' }
      },
      axisLabel: {
        formatter: '{value}%'
      }
    }
  ],
  series: [
    {
      name: 'Temperature',
      type: 'line',
      yAxisIndex: 0,
      data: temperatureData, // [[timestamp, value], ...]
      itemStyle: { color: '#5794f2' }
    },
    {
      name: 'Humidity',
      type: 'line',
      yAxisIndex: 1,
      data: humidityData,
      itemStyle: { color: '#73bf69' }
    }
  ]
};
```

---

### D. Heatmap (Node Status Grid)

```typescript
const nodeStatusHeatmap: EChartsCoreOption = {
  tooltip: {
    position: 'top',
    formatter: (params: any) => {
      return `${params.data[2]}<br/>Status: ${params.data[3]}`;
    }
  },
  grid: {
    top: '10%',
    bottom: '15%'
  },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    splitArea: { show: true }
  },
  yAxis: {
    type: 'category',
    data: ['NODE-001', 'NODE-002', 'NODE-003', 'NODE-004'],
    splitArea: { show: true }
  },
  visualMap: {
    min: 0,
    max: 100,
    calculable: true,
    orient: 'horizontal',
    left: 'center',
    bottom: '0%',
    inRange: {
      color: ['#f2495c', '#ff9830', '#73bf69']
    }
  },
  series: [{
    type: 'heatmap',
    data: [
      // [x, y, value, label]
      [0, 0, 95, 'NODE-001'],
      [0, 1, 80, 'NODE-002'],
      [0, 2, 0, 'NODE-003'],  // Offline
      // ...
    ],
    label: { show: true },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }]
};
```

---

## 14.5 Performance Optimization

### Large Dataset Handling

```typescript
// For datasets > 10K points
const largeDataOptions: EChartsCoreOption = {
  // Enable progressive rendering
  progressive: 5000,
  progressiveThreshold: 10000,
  
  series: [{
    type: 'line',
    // Use LTTB downsampling
    sampling: 'lttb',
    // Disable animation for large data
    animation: false,
    // Use large mode
    large: true,
    largeThreshold: 5000,
    data: largeDataArray
  }]
};
```

### Real-time Update Best Practices

```typescript
// DON'T: Re-create entire options
// this.chartOptions = { ...newOptions };

// DO: Use merge to update only data
this.updateOptions = {
  series: [{
    data: newData
  }]
};

// Or use chartInstance directly for append
this.chartInstance.appendData({
  seriesIndex: 0,
  data: [[timestamp, value]]
});
```

---

## 14.6 Integration with WebSocket

```typescript
@Injectable()
export class ChartRealtimeService {
  constructor(private wsService: DashboardRealtimeService) {}
  
  subscribeToChannel(
    channelId: string, 
    callback: (data: { ts: number; value: number }) => void
  ): Subscription {
    return this.wsService
      .onChannelData(channelId)
      .pipe(
        map(event => ({
          ts: new Date(event.ts).getTime(),
          value: event.valueEngineered
        }))
      )
      .subscribe(callback);
  }
}

// In component
export class LineChartWidgetComponent implements OnInit, OnDestroy {
  private subscription?: Subscription;
  
  ngOnInit() {
    if (this.widget.dataSource.enableRealtime) {
      this.subscription = this.realtimeService.subscribeToChannel(
        this.widget.dataSource.channel.idSensorChannel,
        (data) => this.appendData(data.ts, data.value)
      );
    }
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
```

---

## 14.7 Export & Save Chart

```typescript
// Get chart as base64 image
exportAsImage() {
  const base64 = this.chartInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  });
  
  // Download
  const link = document.createElement('a');
  link.download = `${this.widget.title}.png`;
  link.href = base64;
  link.click();
}

// Get chart data as CSV
exportAsCSV() {
  const data = this.chartInstance.getOption().series[0].data;
  let csv = 'Timestamp,Value\n';
  
  data.forEach((point: [number, number]) => {
    csv += `${new Date(point[0]).toISOString()},${point[1]}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  saveAs(blob, `${this.widget.title}.csv`);
}
```

---

## 14.8 Responsive Design

```typescript
// Auto-resize on container change
@HostListener('window:resize')
onResize() {
  this.chartInstance?.resize();
}

// Or use ResizeObserver
ngAfterViewInit() {
  const resizeObserver = new ResizeObserver(() => {
    this.chartInstance?.resize();
  });
  resizeObserver.observe(this.chartContainer.nativeElement);
}
```

---

## Navigation

⬅️ [Previous: Data Source Mapping](./13-DATA-SOURCE-MAPPING.md) | [Back to Index](./00-INDEX.md)

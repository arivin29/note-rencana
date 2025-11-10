# 📊 IoT Widget System Documentation

## 🎯 Overview

Universal widget system untuk menampilkan data sensor IoT dengan berbagai style visualisasi. Sistem ini **100% reusable** - satu widget component bisa dipakai untuk semua jenis sensor (pressure, temperature, flow, voltage, dll).

## ✨ Features

- ✅ **Universal & Reusable**: Satu widget untuk semua sensor types
- ✅ **Type-Safe**: Full TypeScript dengan interfaces
- ✅ **70+ Sensor Types**: Metadata lengkap dari pressure sampai radiation
- ✅ **11 Widget Types**: Numeric, Gauge, Chart, dan Status widgets
- ✅ **Auto Configuration**: Widget Factory yang smart
- ✅ **ApexCharts Integration**: Beautiful interactive charts
- ✅ **Responsive**: Works di semua screen sizes

---

## 📁 Folder Structure

\`\`\`
src/app/
├── models/widgets/
│   ├── widget-types.enum.ts          # Type definitions
│   ├── widget-config.interface.ts    # Widget configurations
│   ├── sensor-metadata.ts            # 70+ sensor definitions
│   ├── widget-catalog.interface.ts   # Catalog system
│   └── index.ts                      # Barrel export
│
└── components/widgets/
    ├── widgets-module.ts              # Main module
    ├── services/
    │   ├── widget-factory.service.ts  # Smart config generator
    │   └── widget-catalog.service.ts  # 11 widget catalog
    ├── base/
    │   ├── widget-container.component.*
    │   └── widget-renderer.component.* (future)
    ├── numeric/
    │   ├── big-number-widget.component.*
    │   ├── info-card-widget.component.*
    │   └── multi-metric-widget.component.* (future)
    ├── gauge/
    │   ├── radial-gauge-widget.component.*
    │   ├── linear-gauge-widget.component.* (future)
    │   └── radial-progress-widget.component.* (future)
    ├── chart/
    │   ├── sparkline-widget.component.* (future)
    │   ├── line-chart-widget.component.* (future)
    │   └── area-chart-widget.component.* (future)
    └── status/
        ├── threshold-alert-widget.component.* (future)
        └── status-badge-widget.component.* (future)
\`\`\`

---

## 🚀 Quick Start

### 1. Import Module

\`\`\`typescript
// your.module.ts
import { WidgetsModule } from '@app/components/widgets/widgets-module';

@NgModule({
  imports: [WidgetsModule]
})
export class YourModule { }
\`\`\`

### 2. Use Widget Factory

\`\`\`typescript
// your.component.ts
import { Component, OnInit } from '@angular/core';
import { WidgetFactoryService } from '@app/components/widgets/services/widget-factory.service';
import { GaugeWidgetConfig } from '@app/models/widgets';

export class YourComponent implements OnInit {
  pressureWidget!: GaugeWidgetConfig;

  constructor(private widgetFactory: WidgetFactoryService) {}

  ngOnInit() {
    // Create pressure gauge widget
    this.pressureWidget = this.widgetFactory.createGaugeWidget(
      'pressure',  // sensor type
      2.4,         // current value
      {
        label: 'Inlet Pressure',
        max: 5,
        updateTime: '2s ago'
      }
    );
  }
}
\`\`\`

### 3. Display Widget

\`\`\`html
<!-- your.component.html -->
<div class="row">
  <div class="col-md-4">
    <radial-gauge-widget [config]="pressureWidget"></radial-gauge-widget>
  </div>
</div>
\`\`\`

---

## 📊 Available Widgets

### NUMERIC Widgets

#### 1. Big Number Widget
Menampilkan nilai dalam font besar untuk KPI display.

\`\`\`typescript
const widget = widgetFactory.createWidget('big-number', 'temperature', 27.5, {
  label: 'Ambient Temperature'
});
\`\`\`

\`\`\`html
<big-number-widget [config]="widget"></big-number-widget>
\`\`\`

#### 2. Info Card Widget
Compact card dengan icon, status, dan statistics.

\`\`\`typescript
const widget = widgetFactory.createInfoCardWidget('flow_rate', 118.2, {
  label: 'Main Flow',
  trend: { direction: 'up', value: 5.2 },
  stats: { min: 95.5, max: 125.8 }
});
\`\`\`

\`\`\`html
<info-card-widget [config]="widget"></info-card-widget>
\`\`\`

---

### GAUGE Widgets

#### 1. Radial Gauge Widget
Circular gauge dengan color zones.

\`\`\`typescript
const widget = widgetFactory.createGaugeWidget('pressure', 2.4, {
  label: 'Inlet Pressure',
  max: 5,
  min: 0
});
\`\`\`

\`\`\`html
<radial-gauge-widget [config]="widget"></radial-gauge-widget>
\`\`\`

---

## 🎨 Sensor Types (70+ Available)

### Flow & Volume
- \`flow_rate\` - Flow Rate (m3/h)
- \`flow_totalizer\` - Total Volume (m3)
- \`velocity\` - Velocity (m/s)

### Pressure
- \`pressure\` - Pressure (bar)
- \`pressure_differential\` - Differential Pressure (bar)
- \`pressure_vacuum\` - Vacuum Pressure (mbar)

### Temperature
- \`temperature\` - Temperature (°C)
- \`temperature_ambient\` - Ambient Temperature (°C)

### Electrical
- \`voltage\` - Voltage (V)
- \`current\` - Current (A)
- \`power_active\` - Active Power (kW)
- \`energy\` - Energy (kWh)
- \`frequency\` - Frequency (Hz)

### Water Quality
- \`ph\` - pH Level
- \`conductivity\` - Conductivity (μS/cm)
- \`tds\` - Total Dissolved Solids (ppm)
- \`turbidity\` - Turbidity (NTU)
- \`dissolved_oxygen\` - Dissolved Oxygen (mg/L)

### Environmental
- \`humidity\` - Humidity (%RH)
- \`rainfall\` - Rainfall (mm)
- \`wind_speed\` - Wind Speed (m/s)

### Gas & Air Quality
- \`gas_co2\` - CO2 (ppm)
- \`gas_co\` - Carbon Monoxide (ppm)
- \`pm25\` - PM2.5 (μg/m3)
- \`pm10\` - PM10 (μg/m3)

**... and 50+ more sensor types!** See \`sensor-metadata.ts\` for complete list.

---

## 🛠️ Widget Factory API

### createWidget()
Create basic widget configuration.

\`\`\`typescript
createWidget(
  widgetType: WidgetType,
  sensorType: SensorType,
  value: number,
  options?: Partial<BaseWidgetConfig>
): BaseWidgetConfig
\`\`\`

### createGaugeWidget()
Create gauge (radial or linear).

\`\`\`typescript
createGaugeWidget(
  sensorType: SensorType,
  value: number,
  options?: Partial<GaugeWidgetConfig>
): GaugeWidgetConfig
\`\`\`

### createInfoCardWidget()
Create info card with trend & stats.

\`\`\`typescript
createInfoCardWidget(
  sensorType: SensorType,
  value: number,
  options?: Partial<InfoCardWidgetConfig>
): InfoCardWidgetConfig
\`\`\`

### createChartWidget()
Create time-series chart.

\`\`\`typescript
createChartWidget(
  sensorType: SensorType,
  currentValue: number,
  data: TimeSeriesData[],
  options?: Partial<ChartWidgetConfig>
): ChartWidgetConfig
\`\`\`

---

## 💡 Real-World Examples

### Example 1: Pressure Monitoring Dashboard

\`\`\`typescript
export class PressureDashboard implements OnInit {
  widgets: GaugeWidgetConfig[] = [];

  constructor(
    private widgetFactory: WidgetFactoryService,
    private sensorService: SensorService
  ) {}

  ngOnInit() {
    // Fetch pressure sensors dari API
    this.sensorService.getPressureSensors().subscribe(sensors => {
      this.widgets = sensors.map(sensor => 
        this.widgetFactory.createGaugeWidget(
          'pressure',
          sensor.lastValue,
          {
            label: sensor.label,
            sensorId: sensor.id,
            min: sensor.minRange,
            max: sensor.maxRange
          }
        )
      );
    });
  }
}
\`\`\`

\`\`\`html
<div class="row">
  <div class="col-md-3" *ngFor="let widget of widgets">
    <radial-gauge-widget [config]="widget"></radial-gauge-widget>
  </div>
</div>
\`\`\`

### Example 2: Mixed Sensor Dashboard

\`\`\`typescript
export class MixedDashboard implements OnInit {
  pressureGauge!: GaugeWidgetConfig;
  temperatureBigNumber!: BaseWidgetConfig;
  flowInfoCard!: InfoCardWidgetConfig;

  ngOnInit() {
    // Pressure sensor - Radial Gauge
    this.pressureGauge = this.widgetFactory.createGaugeWidget(
      'pressure', 2.4, { label: 'Inlet Pressure' }
    );

    // Temperature sensor - Big Number
    this.temperatureBigNumber = this.widgetFactory.createWidget(
      'big-number', 'temperature', 27.5
    );

    // Flow sensor - Info Card
    this.flowInfoCard = this.widgetFactory.createInfoCardWidget(
      'flow_rate', 118.2, {
        trend: { direction: 'up', value: 5.2 }
      }
    );
  }
}
\`\`\`

\`\`\`html
<div class="row">
  <div class="col-md-4">
    <radial-gauge-widget [config]="pressureGauge"></radial-gauge-widget>
  </div>
  <div class="col-md-4">
    <big-number-widget [config]="temperatureBigNumber"></big-number-widget>
  </div>
  <div class="col-md-4">
    <info-card-widget [config]="flowInfoCard"></info-card-widget>
  </div>
</div>
\`\`\`

---

## 🗄️ Database Schema

Widget system mendukung user dashboard dengan konfigurasi tersimpan di database:

\`\`\`sql
-- User custom dashboards
CREATE TABLE user_dashboards (
  id_dashboard UUID PRIMARY KEY,
  id_user UUID NOT NULL,
  name TEXT NOT NULL,
  layout_type TEXT DEFAULT 'grid',
  grid_cols INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Widget instances
CREATE TABLE dashboard_widgets (
  id_widget_instance UUID PRIMARY KEY,
  id_dashboard UUID REFERENCES user_dashboards(id_dashboard),
  widget_type TEXT NOT NULL,
  id_sensor UUID REFERENCES sensors(id_sensor),
  position_x INTEGER,
  position_y INTEGER,
  size_width INTEGER,
  size_height INTEGER,
  config_json JSONB,
  refresh_rate INTEGER DEFAULT 5
);
\`\`\`

---

## 🎯 Demo Page

Lihat semua widgets in action di:
\`\`\`
http://localhost:4200/#/iot/widgets-showcase
\`\`\`

---

## 🚧 Future Development

### Phase 2 (Planned)
- [ ] Linear Gauge Widget
- [ ] Radial Progress Widget
- [ ] Multi-Metric Card Widget

### Phase 3 (Planned)
- [ ] Sparkline Chart Widget
- [ ] Line Chart Widget
- [ ] Area Chart Widget

### Phase 4 (Planned)
- [ ] Threshold Alert Widget
- [ ] Status Badge Widget
- [ ] Widget Picker/Catalog Browser

### Phase 5 (Advanced)
- [ ] Dashboard Builder (Drag & Drop)
- [ ] Widget Customizer
- [ ] Dashboard Templates
- [ ] Widget Sharing

---

## 📝 Notes

- Semua widget **fully responsive**
- Color zones di gauge widget **auto-generated** (60% green, 85% yellow, 100% red)
- Sensor metadata lengkap dengan **icon & color** untuk consistency
- Widget factory **auto-detect** sensor type dan configure accordingly

---

## 🙋 Support

Untuk pertanyaan atau bug report, hubungi tim development atau buat issue di repository.

---

**Last Updated**: November 10, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready (Phase 1)

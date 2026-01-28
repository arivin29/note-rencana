# Widget Configuration Structure

## Overview

Dokumen ini menjelaskan struktur konfigurasi widget yang disimpan di database. Struktur ini dirancang untuk:
- Clean dan mudah dipahami
- Fleksibel untuk berbagai tipe chart
- Tidak hardcoded - semua konfigurasi dynamic
- Mudah di-serialize/deserialize ke JSON

## Database Schema (PostgreSQL)

```sql
CREATE TABLE widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'line-chart', 'bar-chart', 'gauge', etc
    query JSONB NOT NULL,       -- SQL query configuration
    config JSONB NOT NULL,      -- Widget configuration (see below)
    position JSONB NOT NULL,    -- Grid position
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Config JSON Structure

### Full Example (Line Chart with Multi-line)

```json
{
  "title": "Temperature & Humidity",
  "description": "Real-time sensor readings",
  
  "mapping": {
    "xField": "timestamp",
    "yField": "temperature",
    "yFields": ["temperature", "humidity", "pressure"],
    "seriesField": "",
    "labelField": "",
    "valueField": ""
  },
  
  "series": [
    {
      "field": "temperature",
      "label": "Temp",
      "color": "#73bf69",
      "unit": "°C",
      "decimals": 1,
      "visible": true
    },
    {
      "field": "humidity",
      "label": "Humidity",
      "color": "#5794f2",
      "unit": "%",
      "decimals": 0,
      "visible": true
    },
    {
      "field": "pressure",
      "label": "Pressure",
      "color": "#ff9830",
      "unit": "hPa",
      "decimals": 1,
      "visible": true
    }
  ],
  
  "xAxis": {
    "label": "Time",
    "timeFormat": "HH:mm"
  },
  
  "yAxis": {
    "label": "",
    "unit": "",
    "decimals": 1,
    "min": null,
    "max": null,
    "scale": "linear"
  },
  
  "thresholds": [
    {
      "mode": "manual",
      "value": 80,
      "field": "",
      "label": "Max",
      "color": "#f2495c",
      "lineStyle": "dashed"
    },
    {
      "mode": "field",
      "value": 0,
      "field": "avg_value",
      "label": "Average",
      "color": "#5794f2",
      "lineStyle": "solid"
    }
  ],
  
  "display": {
    "showLegend": true,
    "legendPosition": "top",
    "lineStyle": "smooth",
    "lineWidth": 2,
    "fillOpacity": 20,
    "showPoints": "auto",
    "tooltipMode": "all"
  }
}
```

## Config Sections Explained

### 1. Basic Info

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Widget title displayed on chart |
| `description` | string | Optional subtitle/description |

### 2. Field Mapping

Menentukan kolom mana dari query result yang digunakan:

| Field | Type | Used For | Description |
|-------|------|----------|-------------|
| `xField` | string | Line, Bar, Area | Column for X-axis (usually timestamp) |
| `yField` | string | Line, Bar, Area | Single Y column (legacy/fallback) |
| `yFields` | string[] | Line, Bar, Area | Multiple Y columns for multi-line chart |
| `seriesField` | string | Line, Bar | Group data by this column into separate series |
| `labelField` | string | Pie | Column for pie slice labels |
| `valueField` | string | Gauge, Card, Pie | Column for numeric value |

### 3. Series Configuration

Per-series customization (automatically generated when yFields selected):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `field` | string | - | Query column name |
| `label` | string | field name | Display name in legend |
| `color` | string | auto | Hex color (#73bf69) |
| `unit` | string | "" | Unit suffix (°C, %, etc) |
| `decimals` | number | 1 | Decimal places for values |
| `visible` | boolean | true | Show/hide this series |

### 4. X-Axis Configuration

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `label` | string | - | Axis label (optional) |
| `timeFormat` | string | HH:mm, HH:mm:ss, DD/MM, DD/MM HH:mm, YYYY-MM-DD | Format for timestamp display |

### 5. Y-Axis Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | string | "" | Axis label (e.g., "Temperature") |
| `unit` | string | "" | Global unit if all series same |
| `decimals` | number | 1 | Default decimal places |
| `min` | number\|null | null | Min value (null = auto) |
| `max` | number\|null | null | Max value (null = auto) |
| `scale` | string | "linear" | "linear" or "log" |

### 6. Thresholds

Reference lines on chart:

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `mode` | string | "manual", "field" | Value source |
| `value` | number | - | Manual threshold value |
| `field` | string | - | Query column for dynamic threshold |
| `label` | string | - | Display label |
| `color` | string | - | Line color |
| `lineStyle` | string | "solid", "dashed" | Line style |

### 7. Display Options

| Field | Type | Options | Default | Description |
|-------|------|---------|---------|-------------|
| `showLegend` | boolean | - | true | Show/hide legend |
| `legendPosition` | string | top, bottom, left, right | top | Legend placement |
| `lineStyle` | string | smooth, straight, step | smooth | Line interpolation |
| `lineWidth` | number | 1-5 | 2 | Line thickness |
| `fillOpacity` | number | 0-100 | 20 | Area fill opacity (%) |
| `showPoints` | string | auto, always, never | auto | Data point markers |
| `tooltipMode` | string | single, all, hidden | all | Tooltip behavior |

## Usage Examples

### Simple Single Line Chart

```json
{
  "title": "Temperature",
  "mapping": { "xField": "timestamp", "yField": "value" },
  "display": { "lineStyle": "smooth" }
}
```

### Multi-Line with Custom Colors

```json
{
  "title": "Sensor Data",
  "mapping": { 
    "xField": "time", 
    "yFields": ["temp", "humidity"] 
  },
  "series": [
    { "field": "temp", "label": "Temperature", "color": "#ff6b6b", "unit": "°C" },
    { "field": "humidity", "label": "Humidity", "color": "#4ecdc4", "unit": "%" }
  ]
}
```

### Gauge Widget

```json
{
  "title": "Current Temperature",
  "mapping": { "valueField": "current_value" },
  "yAxis": { "min": 0, "max": 100, "unit": "°C" }
}
```

### Pie Chart

```json
{
  "title": "Status Distribution",
  "mapping": { 
    "labelField": "status", 
    "valueField": "count" 
  },
  "display": { "showLegend": true }
}
```

## Loading Config in Component

```typescript
// Load widget from DB
loadWidget(widgetId: string) {
  this.api.getWidget(widgetId).subscribe(widget => {
    // Populate form from config
    this.form = {
      name: widget.name,
      title: widget.config.title || '',
      description: widget.config.description || '',
      sql: widget.query.sql,
      mapping: { ...defaultMapping, ...widget.config.mapping },
      series: widget.config.series || [],
      xAxis: { ...defaultXAxis, ...widget.config.xAxis },
      yAxis: { ...defaultYAxis, ...widget.config.yAxis },
      thresholds: widget.config.thresholds || [],
      display: { ...defaultDisplay, ...widget.config.display }
    };
    this.selectedType = widget.type;
  });
}
```

## TypeScript Interfaces

See `/src/app/pages/iot/widget-builder/models/widget.models.ts` for full interfaces:

- `WidgetConfig`
- `WidgetFieldMapping`
- `WidgetSeriesConfig`
- `WidgetAxisConfig`
- `WidgetYAxisConfig`
- `WidgetThreshold`
- `WidgetDisplayConfig`

---

Last updated: 2025-01-26

# 📋 16 - User Interaction & Widget Creation Flow

> **Document:** Widget Creation UX Design  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 16.1 Global Dashboard Controls (Grafana-style)

### Dashboard Header Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰  My IoT Dashboard                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ GLOBAL FILTERS (affects all widgets that opt-in)                    │   │
│  │                                                                      │   │
│  │  Project: [All Projects      ▼]   Node: [All Nodes        ▼]       │   │
│  │                                                                      │   │
│  │  Time Range: [Last 24 hours ▼]  │ 🕐 2026-01-24 00:00 → 2026-01-25 │   │
│  │                                                                      │   │
│  │  [15m] [1h] [6h] [24h] [7d] [30d] [Custom]          [🔄 Auto 30s]  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [+ Add Widget]  [📋 Widget Library]  [💾 Save]  [⚙️ Settings]  [👁 View]   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Global Filter Behavior

```typescript
interface DashboardGlobalFilter {
  // Project filter (optional)
  idProject?: string | null;  // null = all projects user has access
  
  // Node filter (optional, cascading from project)
  idNode?: string | null;     // null = all nodes in selected project
  
  // Time range (required)
  timeRange: {
    type: 'relative' | 'absolute';
    relative?: {
      value: number;
      unit: 'minute' | 'hour' | 'day' | 'week' | 'month';
    };
    absolute?: {
      start: string;  // ISO datetime
      end: string;
    };
  };
  
  // Auto refresh
  autoRefresh: {
    enabled: boolean;
    intervalSec: number;  // 0, 10, 30, 60, 300
  };
}
```

### Widget Time Range Options

```typescript
interface WidgetTimeConfig {
  // Widget can choose to:
  useGlobalTimeRange: boolean;  // true = follow dashboard filter
  
  // If useGlobalTimeRange = false, widget has own time range
  customTimeRange?: {
    type: 'relative' | 'absolute';
    // ...
  };
}
```

**Behavior:**
- `useGlobalTimeRange: true` → Widget follows dashboard time picker
- `useGlobalTimeRange: false` → Widget has independent time range (e.g., "Always show last 7 days")

---

## 16.2 Data Model: Sensor Hierarchy

### Database Join Structure

```
┌─────────────────┐
│     owners      │
│  - id_owner     │
│  - name         │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│    projects     │
│  - id_project   │
│  - id_owner     │
│  - name         │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│     nodes       │
│  - id_node      │
│  - id_project   │
│  - code         │
│  - dev_eui      │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐      ┌──────────────────┐
│    sensors      │      │  sensor_catalogs │
│  - id_sensor    │──────│  - id_sensor_catalog│
│  - id_node      │      │  - vendor        │
│  - id_sensor_catalog   │  - model_name    │
│  - label        │      │  - default_channels_json│
│  - location     │      └──────────────────┘
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐      ┌──────────────────┐
│ sensor_channels │      │   sensor_types   │
│  - id_sensor_channel   │  - id_sensor_type│
│  - id_sensor    │──────│  - category      │ (temperature, humidity, pressure, etc.)
│  - id_sensor_type      │  - default_unit  │ (°C, %, hPa, etc.)
│  - metric_code  │      └──────────────────┘
│  - unit         │ (override dari sensor_type)
│  - min_threshold│
│  - max_threshold│
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│   sensor_logs   │  ← TIME-SERIES DATA
│  - ts           │
│  - value_raw    │
│  - value_engineered│
└─────────────────┘
```

### API Response: Cascading Data

```typescript
// GET /api/widget-builder/channels?idProject=xxx&idNode=yyy

interface ChannelOption {
  idSensorChannel: string;
  
  // Display info (pre-joined)
  displayLabel: string;      // "NODE-001 > Temp Sensor A > temperature"
  shortLabel: string;        // "temperature"
  
  // Hierarchy info
  project: {
    idProject: string;
    name: string;
  };
  node: {
    idNode: string;
    code: string;
  };
  sensor: {
    idSensor: string;
    label: string;
    location: string;
    catalog?: {
      vendor: string;
      modelName: string;
    };
  };
  channel: {
    metricCode: string;      // "temperature", "humidity"
    unit: string;            // "°C", "%"
    category: string;        // from sensor_types
  };
  
  // For chart config
  defaultConfig: {
    minThreshold?: number;
    maxThreshold?: number;
    suggestedColor: string;  // Based on category
  };
}
```

---

## 16.3 Widget Creation Flow (Step-by-Step)

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WIDGET CREATION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

     ┌─────────────┐
     │  + Add      │
     │  Widget     │
     └──────┬──────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Choose Widget Type                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│   │  📈     │  │  📊     │  │  🥧     │  │  🔥     │          │
│   │  Line   │  │  Gauge  │  │  Pie    │  │ Heatmap │          │
│   │  Chart  │  │         │  │  Chart  │  │         │          │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│   │  🔢     │  │  📋     │  │  📊     │  │  ⏱️     │          │
│   │  Value  │  │  Table  │  │  Bar    │  │  Alert  │          │
│   │  Card   │  │         │  │  Chart  │  │ Timeline│          │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                 │
│  💡 Tip: Line Chart is best for time-series sensor data        │
└─────────────────────────────────────────────────────────────────┘
            │
            │ (User clicks Line Chart)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Select Data Source                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Data Mode:                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ● Single Metric    ○ Compare Metrics    ○ Aggregation    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  🔍 Quick Search: [Search sensor/channel...            ]  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  OR browse by hierarchy:                                        │
│                                                                 │
│  Project:  [Solar Farm Jakarta                           ▼]   │
│                    │                                            │
│                    ▼ (auto-load nodes)                         │
│  Node:     [NODE-001 - Main Controller                   ▼]   │
│                    │                                            │
│                    ▼ (auto-load sensors)                       │
│  Sensor:   [Temperature Sensor A (Vendor X, Model Y)     ▼]   │
│                    │                                            │
│                    ▼ (auto-load channels)                      │
│  Channel:  [temperature (°C)                             ▼]   │
│                                                                 │
│  ──────────────────────────────────────────────────────────── │
│  Selected: NODE-001 > Temp Sensor A > temperature (°C)         │
│  ──────────────────────────────────────────────────────────── │
│                                                                 │
│                                           [Back] [Next →]       │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Time Range Configuration                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Time Range Source:                                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ● Use Dashboard Time Range (recommended)                  │ │
│  │   → Widget will follow the global time filter above       │ │
│  │                                                           │ │
│  │ ○ Fixed Time Range                                        │ │
│  │   → Widget always shows specific time period              │ │
│  │   [Last 7 days ▼]                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                           [Back] [Next →]       │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Display Configuration                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Basic Settings:                                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Title:      [Temperature Trend                        ]  │ │
│  │  Subtitle:   [NODE-001 - Main Controller               ]  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Chart Options:                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Line Color:  [████] #1890ff    Line Width: [2 ▼]        │ │
│  │  Line Style:  [Solid ▼]         Fill Area:  [✓]          │ │
│  │  Smooth Line: [✓]               Show Points: [ ]         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Axis & Scale:                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Y-Axis Label: [Temperature (°C)                       ]  │ │
│  │  Y-Axis Min:   [Auto ▼]    Y-Axis Max: [Auto ▼]          │ │
│  │  Decimals:     [1 ▼]                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Interactive Features:                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  [✓] Enable zoom (dataZoom)                               │ │
│  │  [✓] Show tooltip on hover                                │ │
│  │  [✓] Enable brush selection                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                           [Back] [Next →]       │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Thresholds & Alerts (Optional)                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Show Threshold Lines:                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  [✓] Enable thresholds                                    │ │
│  │                                                           │ │
│  │  ⚠️ Warning:  [35    ] °C    Color: [████] #ff9830       │ │
│  │  🔴 Danger:   [45    ] °C    Color: [████] #f2495c       │ │
│  │                                                           │ │
│  │  [✓] Fill background when in threshold zone               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  💡 Thresholds from channel config: min=0, max=50              │
│     [Use channel defaults]                                      │
│                                                                 │
│                                           [Back] [Next →]       │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Preview & Save                                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │                    LIVE PREVIEW                           │ │
│  │                                                           │ │
│  │     📈 Temperature Trend                                  │ │
│  │        NODE-001 - Main Controller                         │ │
│  │   50 ┤                                                    │ │
│  │      │                         ╭──╮                       │ │
│  │   40 ┤─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─/─ ─ \─ ─ ─ ─ Warning ─ ─  │ │
│  │      │              ╭────────╯     ╰──╮                   │ │
│  │   30 ┤─────────────╯                   ╰────────          │ │
│  │      │                                                    │ │
│  │   20 ┤                                                    │ │
│  │      └────────────────────────────────────────────────    │ │
│  │        00:00    06:00    12:00    18:00    24:00          │ │
│  │                                                           │ │
│  │   [═══════════════════════════════════] DataZoom          │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Summary:                                                       │
│  • Data: NODE-001 > Temp Sensor A > temperature                │
│  • Time: Dashboard time range                                   │
│  • Refresh: Real-time (WebSocket)                              │
│                                                                 │
│                              [Back] [Save to Dashboard]         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16.4 Compare Metrics Mode (Multi-Channel)

### Use Case: Compare multiple sensors

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Select Data Source (Compare Mode)                      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Data Mode:                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ○ Single Metric    ● Compare Metrics    ○ Aggregation    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Selected Channels (max 10):                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  1. NODE-001 > Temp A > temperature     [████] #1890ff [×]│ │
│  │  2. NODE-001 > Temp B > temperature     [████] #52c41a [×]│ │
│  │  3. NODE-002 > Temp A > temperature     [████] #faad14 [×]│ │
│  │                                                           │ │
│  │  [+ Add another channel]                                  │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⚠️ Note: All channels should have same unit for best results  │
│     Mixed units detected: °C, % - Consider using dual-axis     │
│                                                                 │
│  Axis Mode:                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ● Single Y-Axis (same unit)                               │ │
│  │ ○ Dual Y-Axis (different units)                           │ │
│  │ ○ Separate Y-Axis per channel                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16.5 Quick Add: Channel Search

### Alternative to cascading dropdown - Search box

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Quick Search                                                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [temperature                                              🔍] │
│                                                                 │
│  Results (showing channels you have access to):                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  📊 temperature (°C)                                      │ │
│  │     └─ NODE-001 > Temperature Sensor A                    │ │
│  │        Solar Farm Jakarta                                 │ │
│  │                                              [+ Select]   │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  📊 temperature (°C)                                      │ │
│  │     └─ NODE-001 > Temperature Sensor B                    │ │
│  │        Solar Farm Jakarta                                 │ │
│  │                                              [+ Select]   │ │
│  │  ─────────────────────────────────────────────────────── │ │
│  │  📊 temperature (°C)                                      │ │
│  │     └─ NODE-002 > Outdoor Temp                            │ │
│  │        Wind Turbine Surabaya                              │ │
│  │                                              [+ Select]   │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  💡 Search by: metric name, sensor label, node code, project   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Search API

```typescript
// GET /api/widget-builder/search?q=temperature&limit=20

interface ChannelSearchResult {
  channels: Array<{
    idSensorChannel: string;
    metricCode: string;
    unit: string;
    
    // Breadcrumb for display
    breadcrumb: string;  // "Solar Farm Jakarta > NODE-001 > Temp Sensor A"
    
    // Highlight matched text
    matchedField: 'metricCode' | 'sensorLabel' | 'nodeCode' | 'projectName';
    
    // Full info for when selected
    fullInfo: ChannelOption;
  }>;
  
  totalCount: number;
}
```

---

## 16.6 Widget Config JSON Structure (Final)

### Saved Widget Configuration

```typescript
interface WidgetConfiguration {
  // Identity
  idWidget: string;
  idDashboard: string;
  widgetType: WidgetType;
  
  // Position & Size (for gridster)
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  
  // Data Source
  dataSource: {
    mode: 'single' | 'multi' | 'aggregation';
    
    // For single mode
    channel?: {
      idSensorChannel: string;
      // Cached display info (for showing without re-query)
      _cache?: {
        breadcrumb: string;
        metricCode: string;
        unit: string;
      };
    };
    
    // For multi mode
    channels?: Array<{
      idSensorChannel: string;
      alias?: string;
      color: string;
      yAxisIndex?: number;
      _cache?: { ... };
    }>;
    
    // For aggregation mode
    aggregation?: {
      scope: 'project' | 'owner';
      scopeId: string;
      metric: 'count' | 'avg' | 'sum';
      groupBy: 'status' | 'sensor_type' | 'node';
    };
  };
  
  // Time Range
  timeConfig: {
    useGlobalTimeRange: boolean;
    customTimeRange?: {
      type: 'relative' | 'absolute';
      relative?: { value: number; unit: string };
      absolute?: { start: string; end: string };
    };
  };
  
  // Display Config (widget-type specific)
  displayConfig: LineChartDisplayConfig | GaugeDisplayConfig | ...;
  
  // Thresholds
  thresholds?: {
    enabled: boolean;
    lines: Array<{
      value: number;
      color: string;
      label: string;
    }>;
    fillBackground: boolean;
  };
  
  // Metadata
  title: string;
  subtitle?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 16.7 Implementation Complexity Analysis

### Difficulty Breakdown

| Component | Difficulty | Notes |
|-----------|------------|-------|
| **Step 1: Widget Type Selection** | 🟢 Easy | Simple grid of buttons |
| **Step 2: Cascading Dropdown** | 🟡 Medium | Need 4 API calls, state management |
| **Step 2: Quick Search** | 🟡 Medium | Full-text search on backend |
| **Step 3: Time Range** | 🟢 Easy | Radio buttons + date picker |
| **Step 4: Display Config** | 🟡 Medium | Dynamic form based on widget type |
| **Step 5: Thresholds** | 🟢 Easy | Simple form |
| **Step 6: Live Preview** | 🔴 Hard | Real chart with real data |
| **Global Time Filter** | 🟡 Medium | State broadcast to all widgets |
| **Drag & Drop Canvas** | 🟡 Medium | angular-gridster2 handles most |

### Recommended Implementation Order

1. **Phase 1A**: Basic widget creation (no wizard, simple form)
2. **Phase 1B**: Cascading dropdown
3. **Phase 2A**: Multi-step wizard UI
4. **Phase 2B**: Live preview
5. **Phase 2C**: Quick search
6. **Phase 3**: Global time filter sync

---

## 16.8 API Endpoints for Widget Builder

```typescript
// ===== CASCADING DATA =====

// Get projects user has access to
GET /api/widget-builder/projects
→ [{ idProject, name }]

// Get nodes in a project
GET /api/widget-builder/nodes?idProject={id}
→ [{ idNode, code, name }]

// Get sensors in a node (with catalog info)
GET /api/widget-builder/sensors?idNode={id}
→ [{ 
    idSensor, label, location, 
    catalog: { vendor, modelName } 
  }]

// Get channels in a sensor (with type info)
GET /api/widget-builder/channels?idSensor={id}
→ [{ 
    idSensorChannel, metricCode, unit,
    type: { category, defaultUnit },
    thresholds: { min, max }
  }]

// ===== SEARCH =====

// Search channels across all accessible data
GET /api/widget-builder/search?q={query}&limit=20
→ [{ idSensorChannel, breadcrumb, matchedField, fullInfo }]

// ===== PREVIEW DATA =====

// Get data for preview (limited points)
POST /api/widget-builder/preview
Body: { channelIds: [...], timeRange: {...}, limit: 100 }
→ { data: [...], meta: { unit, channelName } }
```

---

## Navigation

⬅️ [Previous: Chart Types Catalog](./15-CHART-TYPES-CATALOG.md) | [Back to Index](./00-INDEX.md)

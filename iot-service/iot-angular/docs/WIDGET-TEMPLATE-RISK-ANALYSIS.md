# Widget Template System - Risk Analysis & Architecture Review

## Executive Summary

Setelah review kode existing, berikut analisis risiko dan rekomendasi untuk menghindari masalah di kemudian hari.

---

## 1. Current Architecture Analysis

### Existing Components

```
widget-builder/
├── widget-wizard/          # Expert Mode (SQL Editor) - 2451 lines!
├── components/
│   └── widgets/
│       ├── gauge-widget.component.ts       # Already exists!
│       ├── line-chart-widget.component.ts  # Already exists!
│       ├── bar-chart-widget.component.ts
│       ├── pie-chart-widget.component.ts
│       ├── value-card-widget.component.ts
│       └── data-table-widget.component.ts
├── models/
│   └── widget.models.ts    # Widget, WidgetConfig, WidgetType, etc.
└── dashboard-view/         # Dashboard renderer
```

### Existing Widget Types (from models)

```typescript
export type WidgetType = 
  | 'line-chart'        // ✅ Already defined
  | 'multi-line-chart'  // ✅ Already defined
  | 'bar-chart'         // ✅ Already defined
  | 'pie-chart'         // ✅ Already defined
  | 'gauge'             // ✅ Already defined
  | 'stat-card'         // ✅ Already defined
  | 'table'             // ✅ Already defined
  | 'heatmap';          // ✅ Already defined
```

### Existing Widget Config Structure

```typescript
interface WidgetConfig {
  title?: string;
  description?: string;
  sqlQuery?: string;           // SQL query
  dataSource?: 'postgresql' | 'clickhouse';
  refreshInterval?: number;
  
  // Already structured!
  mapping?: WidgetFieldMapping;
  series?: WidgetSeriesConfig[];
  xAxis?: WidgetAxisConfig;
  yAxis?: WidgetYAxisConfig;
  thresholds?: WidgetThreshold[];
  display?: WidgetDisplayConfig;
}
```

---

## 2. Risk Analysis

### 🔴 HIGH RISK

#### Risk 1: Duplicated Widget Rendering Logic
**Problem**: Jika kita buat template wizard baru, bisa terjadi duplikasi logic untuk render widget.

**Current State**: 
- `gauge-widget.component.ts` sudah ada
- `line-chart-widget.component.ts` sudah ada
- Semua widget components sudah bisa render berdasarkan config

**Recommendation**: 
- ✅ REUSE existing widget components
- ❌ JANGAN buat widget renderer baru
- Template wizard hanya generate `WidgetConfig` yang sama formatnya

```
Template Wizard → Generate WidgetConfig → Same Widget Components
Expert Mode    → Manual WidgetConfig   → Same Widget Components
```

---

#### Risk 2: Inconsistent Data Model
**Problem**: Template mode bisa create widget dengan struktur config berbeda dari Expert mode.

**Current WidgetConfig**:
```typescript
{
  sqlQuery: "SELECT ...",
  mapping: { xField, yField, ... },
  series: [...],
  thresholds: [...],
  display: { showLegend, ... }
}
```

**Recommendation**:
- ✅ Template mode HARUS generate WidgetConfig dengan struktur SAMA
- ✅ Tambah field `creationMode: 'template' | 'expert'` untuk tracking
- ✅ Tambah field `templateId?: string` untuk reference

```typescript
// Extended WidgetConfig
interface WidgetConfig {
  // ... existing fields ...
  
  // NEW: Track creation mode
  creationMode?: 'template' | 'expert';
  templateId?: string;        // e.g., 'gauge-speedometer'
  templateConfig?: any;       // Original template settings (for re-edit)
}
```

---

#### Risk 3: Edit Mode Compatibility
**Problem**: Widget dibuat dengan Template mode, tapi user ingin edit → harus bisa edit di kedua mode.

**Scenarios**:
1. Widget dibuat Template mode → Edit dengan Template mode ✅
2. Widget dibuat Template mode → Edit dengan Expert mode ✅ (advanced user)
3. Widget dibuat Expert mode → Edit dengan Expert mode ✅
4. Widget dibuat Expert mode → Edit dengan Template mode ❓ (mungkin tidak compatible)

**Recommendation**:
```typescript
// Saat edit widget
if (widget.config.creationMode === 'template' && widget.config.templateId) {
  // Show option: "Edit as Template" or "Edit as SQL"
  showEditModeSelector();
} else {
  // Expert mode only
  openExpertEditor();
}
```

---

### 🟡 MEDIUM RISK

#### Risk 4: SQL Generation Inconsistency
**Problem**: SQL yang di-generate template bisa berbeda format dari SQL yang ditulis manual.

**Example**:
```sql
-- Template generated (formatted)
SELECT 
  timestamp as time,
  value
FROM sensor_logs
WHERE id_sensor_channel = 'xxx'
ORDER BY timestamp DESC
LIMIT 1

-- Expert written (minified)
SELECT timestamp as time, value FROM sensor_logs WHERE id_sensor_channel='xxx' ORDER BY timestamp DESC LIMIT 1
```

**Impact**: Tidak masalah untuk execution, tapi bisa confusing saat debug.

**Recommendation**:
- ✅ Standardize SQL formatting di generator
- ✅ Add comments in generated SQL untuk clarity

```sql
-- [AUTO-GENERATED] Template: gauge-speedometer
-- Channel: Temperature (°C)
-- DO NOT EDIT - Use Template Editor instead
SELECT ...
```

---

#### Risk 5: Widget Type Mismatch
**Problem**: Template wizard pilih "Gauge" tapi config.type tidak sesuai.

**Current Widget Types**:
```typescript
'gauge'      // Existing
'stat-card'  // Existing - similar to "Single Value"
```

**Recommendation**:
- ✅ Map template types to existing WidgetTypes:

| Template Type | WidgetType | Notes |
|---------------|------------|-------|
| Gauge (Speedometer) | `gauge` | Use existing |
| Gauge (Progress) | `gauge` | Same, different style |
| Single Value | `stat-card` | Use existing |
| Line Chart | `line-chart` | Use existing |
| Multi Line | `multi-line-chart` | Use existing |
| Area Chart | `line-chart` | Same type, fillOpacity: 0.5 |
| Table | `table` | Use existing |

---

#### Risk 6: Filter Cascade Performance
**Problem**: Cascade filter (Node → Sensor → Channel) bisa slow jika data banyak.

**Current widget-wizard.component.ts** sudah punya:
```typescript
nodesList: Array<{id: string, name?: string, label?: string, code?: string}> = [];
sensorsList: Array<{id: string, label?: string, idNode?: string}> = [];
channelsList: Array<{id: string, label?: string, idSensor?: string}> = [];
```

**Recommendation**:
- ✅ Reuse existing filter logic dari widget-wizard
- ✅ Add caching untuk frequently accessed data
- ✅ Consider lazy loading untuk large datasets

---

### 🟢 LOW RISK

#### Risk 7: Route Conflict
**Problem**: New routes bisa conflict dengan existing.

**Current Routes**:
```typescript
{ path: '', component: DashboardListComponent },
{ path: ':id', component: DashboardViewComponent },
{ path: ':id/add-widget', component: WidgetWizardComponent },       // Expert
{ path: ':id/edit-widget/:widgetId', component: WidgetWizardComponent },
```

**Proposed Routes**:
```typescript
{ path: ':id/widget/new', component: WidgetCreateComponent },       // Mode selector
{ path: ':id/widget/template', component: WidgetTemplateWizard },   // Template mode
{ path: ':id/widget/expert', component: WidgetWizardComponent },    // Expert mode (existing)
{ path: ':id/edit-widget/:widgetId', component: WidgetEditRouter }, // Smart router
```

**Recommendation**:
- ✅ Keep `/add-widget` as alias to `/widget/new` for backward compatibility
- ✅ Use guard/resolver to detect edit mode

---

## 3. Architecture Recommendations

### Recommended Structure

```
widget-builder/
├── widget-wizard/                    # KEEP - Expert Mode
│   └── widget-wizard.component.ts
│
├── widget-create/                    # NEW - Entry Point
│   ├── widget-create.component.ts    # Mode selector UI
│   └── widget-create.component.html
│
├── widget-template-wizard/           # NEW - Template Mode
│   ├── widget-template-wizard.component.ts
│   ├── widget-template-wizard.component.html
│   │
│   ├── steps/
│   │   ├── select-type.component.ts
│   │   ├── select-template.component.ts
│   │   ├── select-data.component.ts
│   │   ├── configure.component.ts
│   │   └── preview.component.ts
│   │
│   └── sql-generators/               # SQL generation per type
│       ├── gauge-sql.generator.ts
│       ├── timeseries-sql.generator.ts
│       └── table-sql.generator.ts
│
├── components/
│   └── widgets/                      # KEEP - Shared renderers
│       ├── gauge-widget.component.ts
│       └── ...
│
├── models/
│   ├── widget.models.ts              # EXTEND - Add template fields
│   └── template.models.ts            # NEW - Template definitions
│
└── services/
    ├── widget-sql-generator.service.ts    # NEW - Centralized SQL gen
    └── widget-template.service.ts         # NEW - Template registry
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐         │
│   │  Template   │      │    SQL      │      │   Widget    │         │
│   │   Wizard    │─────▶│  Generator  │─────▶│   Config    │         │
│   └─────────────┘      └─────────────┘      └──────┬──────┘         │
│                                                     │                │
│   ┌─────────────┐                                   │                │
│   │   Expert    │───────────────────────────────────┤                │
│   │   Mode      │                                   │                │
│   └─────────────┘                                   │                │
│                                                     ▼                │
│                                            ┌─────────────┐          │
│                                            │   Save to   │          │
│                                            │   Backend   │          │
│                                            └──────┬──────┘          │
│                                                   │                  │
│                                                   ▼                  │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Dashboard View                            │   │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │
│   │   │  Gauge  │  │  Line   │  │   Bar   │  │  Table  │        │   │
│   │   │ Widget  │  │  Chart  │  │  Chart  │  │ Widget  │        │   │
│   │   └─────────┘  └─────────┘  └─────────┘  └─────────┘        │   │
│   │                                                              │   │
│   │   Same widget components render both Template & Expert!      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Model Extensions

### Extended WidgetConfig

```typescript
// models/widget.models.ts - EXTEND existing

export interface WidgetConfig {
  // ... existing fields ...
  
  // === NEW FIELDS FOR TEMPLATE SUPPORT ===
  
  /**
   * How this widget was created
   * - 'template': Created using Template Wizard
   * - 'expert': Created using SQL Editor (Expert Mode)
   * - undefined: Legacy widgets (pre-template)
   */
  creationMode?: 'template' | 'expert';
  
  /**
   * Template identifier if created via template
   * Format: '{widgetType}-{templateStyle}'
   * Example: 'gauge-speedometer', 'line-chart-area'
   */
  templateId?: string;
  
  /**
   * Original template configuration (for re-editing)
   * Stores the selections user made in template wizard
   */
  templateConfig?: TemplateConfiguration;
}

export interface TemplateConfiguration {
  // Data Source (cascade filter results)
  nodeId?: string;
  sensorId?: string;
  channelId?: string;
  channelIds?: string[];  // For multi-channel charts
  
  // Template-specific settings
  settings: Record<string, any>;
}
```

### Template Models

```typescript
// models/template.models.ts - NEW FILE

export interface WidgetTemplate {
  id: string;                    // 'gauge-speedometer'
  widgetType: WidgetType;        // 'gauge'
  name: string;                  // 'Speedometer'
  description: string;           // 'Classic gauge with needle'
  icon: string;                  // 'fa-tachometer-alt'
  preview: string;               // Preview image URL or SVG
  
  // Required filter level
  requiredFilters: ('node' | 'sensor' | 'channel')[];
  
  // Default config values
  defaultConfig: Partial<WidgetConfig>;
  
  // SQL template (with placeholders)
  sqlTemplate: string;
  
  // Configurable options
  options: TemplateOption[];
}

export interface TemplateOption {
  key: string;
  label: string;
  type: 'number' | 'string' | 'select' | 'color' | 'boolean';
  defaultValue: any;
  options?: { label: string; value: any }[];  // For select type
  autoFrom?: string;  // Auto-populate from data, e.g., 'channel.unit'
}

// Template Categories
export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  templates: WidgetTemplate[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'gauge',
    name: 'Gauge',
    icon: 'fa-tachometer-alt',
    description: 'Single value with visual indicator',
    templates: [/* ... */]
  },
  {
    id: 'timeseries',
    name: 'Time Series',
    icon: 'fa-chart-line',
    description: 'Data over time',
    templates: [/* ... */]
  },
  // ...
];
```

---

## 5. Migration Strategy

### For Existing Widgets

Existing widgets (created before template system) akan tetap berfungsi karena:
- `creationMode` undefined = treat as 'expert'
- `templateId` undefined = no template reference
- Edit selalu buka Expert Mode

```typescript
// Edit router logic
if (widget.config.creationMode === 'template' && widget.config.templateId) {
  // Option to edit as template OR expert
  this.showEditOptions = true;
} else {
  // Direct to expert mode
  this.router.navigate([...,'widget', 'expert']);
}
```

### Backward Compatibility

```typescript
// Widget save - ensure compatibility
saveWidget(widget: Widget) {
  // Always save SQL (for backend execution)
  widget.sqlQuery = this.form.sql;
  
  // If template mode, also save template config
  if (this.isTemplateMode) {
    widget.config.creationMode = 'template';
    widget.config.templateId = this.selectedTemplateId;
    widget.config.templateConfig = {
      nodeId: this.selectedNodeId,
      sensorId: this.selectedSensorId,
      channelId: this.selectedChannelId,
      settings: this.templateSettings
    };
  }
  
  // ... rest of save logic
}
```

---

## 6. Testing Checklist

### Before Release

- [ ] Template widget renders correctly in dashboard
- [ ] Expert widget still works as before
- [ ] Edit template widget → Template wizard loads correct values
- [ ] Edit template widget → Switch to Expert mode works
- [ ] Edit expert widget → Expert mode only
- [ ] Dashboard with mixed widgets (template + expert) renders correctly
- [ ] SQL generated by template executes correctly (PostgreSQL)
- [ ] SQL generated by template executes correctly (ClickHouse)
- [ ] Time variables (${fromTime}, ${toTime}) work in generated SQL
- [ ] Refresh interval works for template widgets
- [ ] Widget deletion works

### Performance Tests

- [ ] Load time with 10+ widgets on dashboard
- [ ] Cascade filter with 100+ nodes
- [ ] SQL generation time < 100ms

---

## 7. Summary

| Aspect | Risk Level | Mitigation |
|--------|------------|------------|
| Widget rendering duplication | 🔴 High | Reuse existing widget components |
| Config structure mismatch | 🔴 High | Extend existing model, don't create new |
| Edit mode compatibility | 🔴 High | Smart router with mode detection |
| SQL format inconsistency | 🟡 Medium | Standardize SQL generator output |
| Widget type mapping | 🟡 Medium | Map templates to existing types |
| Filter performance | 🟡 Medium | Reuse existing, add caching |
| Route conflicts | 🟢 Low | Careful route planning |

### Key Principles

1. **REUSE** existing widget components - don't duplicate
2. **EXTEND** existing models - don't create incompatible ones
3. **GENERATE** SQL in same format - consistent execution
4. **SUPPORT** both modes for edit - user choice
5. **TEST** mixed dashboards - compatibility

---

*Document Version: 1.0*
*Created: 2026-02-19*
*Status: Ready for Review*

# Widget Builder - Naming Convention Guide

## 📋 Database Tables

| Table Name | Primary Key | Description |
|------------|-------------|-------------|
| `custom_dashboards` | `id_dashboard` (UUID) | User-created dashboards |
| `custom_widgets` | `id_widget` (UUID) | Widgets inside dashboards |
| `widget_query_templates` | `id_template` (UUID) | Pre-built SQL templates |

### Table Columns Naming Pattern
- **Primary Key**: `id_<entity>` (e.g., `id_dashboard`, `id_widget`, `id_template`)
- **Foreign Key**: `id_<referenced_entity>` (e.g., `id_owner`, `id_dashboard`)
- **Timestamps**: `created_at`, `updated_at`
- **User Reference**: `created_by` → references `users(id_user)`
- **Boolean Flags**: `is_<state>` (e.g., `is_active`, `is_default`, `is_system`)

---

## 🗃️ Entity Classes (TypeORM)

| Entity Class | Table | File Location |
|--------------|-------|---------------|
| `CustomDashboard` | `custom_dashboards` | `src/entities/custom-dashboard.entity.ts` |
| `CustomWidget` | `custom_widgets` | `src/entities/custom-widget.entity.ts` |
| `WidgetQueryTemplate` | `widget_query_templates` | `src/entities/widget-query-template.entity.ts` |

### Entity Property Naming
- Use **camelCase** in TypeScript
- Map to **snake_case** in database via `@Column({ name: 'column_name' })`

```typescript
// Example
@Column({ name: 'id_owner' })
idOwner: string;

@Column({ name: 'widget_type' })
widgetType: string;
```

---

## 🔌 API Endpoints

Base Path: `/api/widget-builder`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboards` | List all dashboards |
| POST | `/dashboards` | Create dashboard |
| GET | `/dashboards/:id` | Get dashboard with widgets |
| PUT | `/dashboards/:id` | Update dashboard |
| DELETE | `/dashboards/:id` | Delete dashboard |
| GET | `/dashboards/:dashboardId/widgets` | Get widgets in dashboard |
| POST | `/dashboards/:dashboardId/widgets` | Create widget |
| GET | `/dashboards/:dashboardId/widgets/:widgetId` | Get single widget |
| PUT | `/dashboards/:dashboardId/widgets/:widgetId` | Update widget |
| DELETE | `/dashboards/:dashboardId/widgets/:widgetId` | Delete widget |
| PATCH | `/dashboards/:dashboardId/widgets/positions` | Update widget positions |
| POST | `/query/validate` | Validate SQL query |
| POST | `/query/execute` | Execute SQL query |
| GET | `/templates` | List query templates |
| GET | `/templates/:id` | Get template by ID |

### URL Parameter Naming
- Use **camelCase** for path params: `:dashboardId`, `:widgetId`
- Use **camelCase** for query params: `?ownerId=`, `?timeRange=`

---

## 📦 DTO Classes

| DTO Class | Purpose | File |
|-----------|---------|------|
| `CreateDashboardDto` | Create dashboard request | `create-dashboard.dto.ts` |
| `UpdateDashboardDto` | Update dashboard request | `update-dashboard.dto.ts` |
| `CreateWidgetDto` | Create widget request | `create-widget.dto.ts` |
| `UpdateWidgetDto` | Update widget request | `update-widget.dto.ts` |
| `UpdateWidgetPositionsDto` | Batch update positions | `update-widget-positions.dto.ts` |
| `ExecuteQueryDto` | Execute SQL request | `execute-query.dto.ts` |
| `ExecuteQueryResponseDto` | Execute SQL response | `execute-query-response.dto.ts` |
| `ValidateQueryDto` | Validate SQL request | `validate-query.dto.ts` |
| `ValidateQueryResponseDto` | Validate SQL response | `validate-query-response.dto.ts` |

---

## 🎨 Widget Types

Standard widget type identifiers (stored in `widget_type` column):

| Type ID | Display Name | Description |
|---------|--------------|-------------|
| `line-chart` | Line Chart | Time series single line |
| `multi-line-chart` | Multi-Line Chart | Time series multiple lines |
| `bar-chart` | Bar Chart | Categorical bar chart |
| `pie-chart` | Pie Chart | Distribution chart |
| `gauge` | Gauge | Single value with ranges |
| `stat-card` | Stat Card | KPI card with icon |
| `table` | Table | Tabular data display |
| `heatmap` | Heatmap | 2D heatmap visualization |

---

## 🔤 Config JSON Structure

### Chart Config
```json
{
  "chartType": "line|multi-line|bar|pie",
  "series": [
    {"field": "column_name", "label": "Display Label", "color": "#hex"}
  ],
  "xAxis": {"field": "time", "format": "HH:mm"},
  "yAxis": {"label": "Label", "unit": "unit"},
  "thresholds": [
    {"value": 100, "color": "#f44336", "label": "Alert"}
  ],
  "groupByField": "field_for_multi_line",
  "colors": ["#hex1", "#hex2"],
  "enableZoom": true,
  "showLegend": true
}
```

### Gauge Config
```json
{
  "min": 0,
  "max": 100,
  "unit": "bar",
  "thresholds": [
    {"value": 30, "color": "#4CAF50"},
    {"value": 70, "color": "#ff9800"},
    {"value": 90, "color": "#f44336"}
  ]
}
```

### Stat Card Config
```json
{
  "field": "total_value",
  "unit": "m³",
  "icon": "water_drop",
  "color": "#2196F3",
  "format": "0,0.00"
}
```

### Table Config
```json
{
  "columns": [
    {"field": "name", "header": "Name", "width": "30%", "type": "text"},
    {"field": "status", "header": "Status", "width": "20%", "type": "badge"},
    {"field": "timestamp", "header": "Time", "width": "30%", "type": "datetime"}
  ],
  "pageSize": 10,
  "sortable": true,
  "filterable": true
}
```

---

## 🔢 SQL Variables

Variables that get replaced at runtime:

| Variable | Description | Example Replacement |
|----------|-------------|---------------------|
| `${ownerId}` | Current user's owner ID | `dc98bdd8-b935-4582-8a61-0f5cd595ed78` |
| `${timeRange}` | Selected time range | `6h`, `24h`, `7 days`, `30 days` |

### Example SQL with Variables
```sql
SELECT 
  date_trunc('hour', timestamp) AS time,
  AVG(CAST(value AS DECIMAL)) AS avg_value
FROM telemetry_data 
WHERE id_node IN (
  SELECT id_node FROM nodes WHERE id_owner = '${ownerId}'
)
AND timestamp >= NOW() - INTERVAL '${timeRange}'
GROUP BY date_trunc('hour', timestamp)
ORDER BY time
```

---

## 📁 File Structure

```
iot-backend/
├── src/
│   ├── entities/
│   │   ├── custom-dashboard.entity.ts
│   │   ├── custom-widget.entity.ts
│   │   └── widget-query-template.entity.ts
│   └── modules/
│       └── widget-builder/
│           ├── widget-builder.module.ts
│           ├── widget-builder.controller.ts
│           ├── widget-builder.service.ts
│           └── dto/
│               ├── create-dashboard.dto.ts
│               ├── update-dashboard.dto.ts
│               ├── create-widget.dto.ts
│               ├── update-widget.dto.ts
│               ├── update-widget-positions.dto.ts
│               ├── execute-query.dto.ts
│               ├── execute-query-response.dto.ts
│               ├── validate-query.dto.ts
│               └── validate-query-response.dto.ts
└── migrations/
    └── widget-builder-setup.sql

iot-angular/
├── src/
│   ├── app/
│   │   └── views/
│   │       └── dashboard/
│   │           └── widget-builder/
│   │               ├── widget-builder.component.ts
│   │               ├── widget-builder.component.html
│   │               └── widget-wizard/
│   │                   ├── widget-wizard.component.ts
│   │                   └── widget-wizard.component.html
│   └── sdk/
│       └── core/
│           ├── services/
│           │   └── widget-builder.service.ts
│           └── models/
│               ├── create-dashboard-dto.ts
│               ├── create-widget-dto.ts
│               └── ...
```

---

## ✅ Checklist for New Features

When adding new widget-related features:

1. [ ] Database: Use `id_<entity>` for primary keys
2. [ ] Database: Use `snake_case` for column names
3. [ ] Entity: Use `camelCase` for TypeScript properties
4. [ ] Entity: Map with `@Column({ name: 'snake_case' })`
5. [ ] API: Use `/api/widget-builder/` base path
6. [ ] API: Use `camelCase` for URL params
7. [ ] DTO: Suffix with `Dto` (e.g., `CreateWidgetDto`)
8. [ ] Config: Use `camelCase` for JSON keys
9. [ ] Widget Type: Use `kebab-case` (e.g., `line-chart`)
10. [ ] Regenerate SDK: `ng-openapi-gen --input http://localhost:3000/api-json --output src/sdk/core`

---

## 📊 Demo Data Summary

**Dashboard**: `Water Monitoring Overview`
- Owner: Acme Water Utility (`dc98bdd8-b935-4582-8a61-0f5cd595ed78`)
- ID: `dd000001-0000-0000-0000-000000000001`

**Widgets** (6 total):
| Name | Type | Position (x,y) | Size (cols×rows) |
|------|------|----------------|------------------|
| Flow Rate Trend | line-chart | 0,0 | 6×4 |
| Pressure Comparison | multi-line-chart | 6,0 | 6×4 |
| Daily Consumption | bar-chart | 0,4 | 4×3 |
| Current Pressure | gauge | 4,4 | 2×3 |
| Total Flow Today | stat-card | 6,4 | 2×3 |
| Node Status | table | 8,4 | 4×3 |

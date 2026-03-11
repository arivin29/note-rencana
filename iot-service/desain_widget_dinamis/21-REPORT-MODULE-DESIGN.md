# Report Module - Design Document

## Overview

Module untuk generate report data telemetry dengan filter hierarkis, preview sebelum export, dan multiple output format.

---

## Table of Contents

1. [User Stories](#1-user-stories)
2. [Hierarchical Filter System](#2-hierarchical-filter-system)
3. [Aggregation Modes](#3-aggregation-modes)
4. [API Specification](#4-api-specification)
5. [Database Schema](#5-database-schema)
6. [Backend Architecture](#6-backend-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Export Formats](#8-export-formats)
9. [Implementation Phases](#9-implementation-phases)
10. [Task Tracking](#10-task-tracking)

---

## 1. User Stories

### Primary Users
- **Owner** - Generate report untuk asset mereka
- **Admin** - Generate report lintas owner/project

### User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-01 | Owner | Filter data berdasarkan project, node, sensor | Saya bisa fokus pada data yang relevan |
| US-02 | Owner | Memilih range waktu (1 hari/minggu/bulan/custom) | Saya bisa analisa periode tertentu |
| US-03 | Owner | Memilih mode agregasi (raw/10min/1jam/1hari) | Saya bisa lihat detail atau summary |
| US-04 | Owner | Preview data sebelum export | Saya bisa validasi sebelum download |
| US-05 | Owner | Lihat line chart dari data | Saya bisa visualisasi trend |
| US-06 | Owner | Export ke XLSX dengan multiple sheet | Saya dapat data + summary + info |
| US-07 | Owner | Save template report | Saya bisa reuse config untuk report berkala |
| US-08 | Admin | Filter by owner | Saya bisa generate report per owner |

---

## 2. Hierarchical Filter System

### Filter Flow
```
Owner → Project → Node (Multi) → Sensor Channel (Multi)
```

### Filter Dependency Rules

| Step | Filter | Depends On | Multi-Select |
|------|--------|------------|--------------|
| 1 | Owner | - | No (Single) |
| 2 | Project | Owner | No (Single) |
| 3 | Node | Project | **Yes** |
| 4 | Sensor Channel | Node(s) | **Yes** |

### Auto-Cascade Behavior
- Jika Owner berubah → Reset Project, Node, Sensor
- Jika Project berubah → Reset Node, Sensor
- Jika Node berubah → Reset Sensor

### API Endpoints for Filters

```
GET /api/owners                         → List all owners (admin only)
GET /api/projects?ownerId={id}          → Projects filtered by owner
GET /api/nodes?projectId={id}           → Nodes filtered by project
GET /api/sensor-channels?nodeIds={ids}  → Channels filtered by nodes
```

---

## 3. Aggregation Modes

### Available Modes

| Mode | Interval | Description | ClickHouse Function |
|------|----------|-------------|---------------------|
| `raw` | - | Data mentah per record | No aggregation |
| `1m` | 1 minute | Per menit | `toStartOfMinute()` |
| `10m` | 10 minutes | Per 10 menit | `toStartOfTenMinutes()` |
| `1h` | 1 hour | Per jam | `toStartOfHour()` |
| `1d` | 1 day | Per hari | `toStartOfDay()` |

### Suggested Aggregation by Range

| Date Range | Suggested Modes | Default |
|------------|-----------------|---------|
| 1 Hari | raw, 1m, 10m | 10m |
| 1 Minggu | 10m, 1h | 1h |
| 1 Bulan | 1h, 1d | 1d |
| Custom | All available | Based on span |

### Data Points Estimation

| Range | Mode | Points/Sensor | Total (10 sensors) |
|-------|------|---------------|-------------------|
| 1 Hari | raw (10s interval) | ~8,640 | 86,400 |
| 1 Hari | 10m | 144 | 1,440 |
| 1 Minggu | 1h | 168 | 1,680 |
| 1 Bulan | 1d | 30 | 300 |

---

## 4. API Specification

### 4.1 Generate Preview

```http
POST /api/reports/preview
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "ownerId": "uuid",
  "projectId": "uuid",
  "nodeIds": ["uuid1", "uuid2"],
  "sensorChannelIds": ["uuid1", "uuid2", "uuid3"],
  "startDate": "2026-03-01T00:00:00Z",
  "endDate": "2026-03-10T23:59:59Z",
  "aggregation": "1h"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "generatedAt": "2026-03-10T10:30:00Z",
      "totalPoints": 1680,
      "dateRange": {
        "start": "2026-03-01T00:00:00Z",
        "end": "2026-03-10T23:59:59Z"
      },
      "aggregation": "1h"
    },
    "columns": [
      { "key": "timestamp", "label": "Timestamp" },
      { "key": "sensor_a", "label": "Temperature - Pump 1", "unit": "°C" },
      { "key": "sensor_b", "label": "Pressure - Pump 1", "unit": "bar" }
    ],
    "rows": [
      {
        "timestamp": "2026-03-01T00:00:00Z",
        "sensor_a": 25.5,
        "sensor_b": 3.2
      }
    ],
    "chartData": {
      "categories": ["2026-03-01T00:00:00Z", "2026-03-01T01:00:00Z"],
      "series": [
        {
          "name": "Temperature - Pump 1",
          "data": [25.5, 26.1, 25.8]
        },
        {
          "name": "Pressure - Pump 1", 
          "data": [3.2, 3.4, 3.1]
        }
      ]
    },
    "summary": [
      {
        "sensorChannelId": "uuid",
        "label": "Temperature - Pump 1",
        "unit": "°C",
        "min": 20.1,
        "max": 31.2,
        "avg": 25.5,
        "count": 168
      }
    ]
  }
}
```

### 4.2 Export XLSX

```http
POST /api/reports/export/xlsx
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:** Same as preview

**Response:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="report-2026-03-10.xlsx"
```

**XLSX Structure:**
- Sheet 1: "Data" - Full data table
- Sheet 2: "Summary" - Statistics per sensor
- Sheet 3: "Info" - Report metadata (filter, date generated, etc.)

### 4.3 Save Template

```http
POST /api/reports/templates
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Daily Pump Report",
  "description": "Temperature & Pressure sensors - Pump Station 1",
  "config": {
    "projectId": "uuid",
    "nodeIds": ["uuid1"],
    "sensorChannelIds": ["uuid1", "uuid2"],
    "rangeType": "1d",
    "aggregation": "10m"
  }
}
```

### 4.4 Get Templates

```http
GET /api/reports/templates
Authorization: Bearer {token}
```

### 4.5 Generate from Template

```http
POST /api/reports/templates/{id}/generate
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "format": "xlsx",
  "customDateRange": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-10"
  }
}
```

---

## 5. Database Schema

### 5.1 Report Templates (PostgreSQL)

```sql
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_owner UUID NOT NULL REFERENCES owners(id),
    id_user UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_owner FOREIGN KEY (id_owner) REFERENCES owners(id) ON DELETE CASCADE
);

CREATE INDEX idx_report_templates_owner ON report_templates(id_owner);
CREATE INDEX idx_report_templates_user ON report_templates(id_user);
```

### 5.2 Config JSONB Structure

```json
{
  "projectId": "uuid",
  "nodeIds": ["uuid1", "uuid2"],
  "sensorChannelIds": ["uuid1", "uuid2", "uuid3"],
  "rangeType": "1d|1w|1M|custom",
  "aggregation": "raw|1m|10m|1h|1d",
  "customRange": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-10"
  }
}
```

---

## 6. Backend Architecture

### Directory Structure

```
src/
└── report/
    ├── report.module.ts
    ├── report.controller.ts
    ├── report.service.ts
    ├── report-export.service.ts      # XLSX generation
    ├── report-template.service.ts    # Template CRUD
    ├── dto/
    │   ├── report-request.dto.ts
    │   ├── report-response.dto.ts
    │   ├── create-template.dto.ts
    │   └── template-response.dto.ts
    └── entities/
        └── report-template.entity.ts
```

### Service Dependencies

```
ReportModule
├── imports: [
│   ClickHouseModule,      # For aggregation queries
│   OwnersModule,          # For owner validation
│   ProjectsModule,        # For project validation
│   NodesModule,           # For node validation
│   SensorChannelsModule,  # For channel metadata
│   TypeOrmModule.forFeature([ReportTemplate])
│ ]
├── controllers: [ReportController]
├── providers: [
│   ReportService,
│   ReportExportService,
│   ReportTemplateService
│ ]
└── exports: [ReportService]
```

### ClickHouse Query Example

```sql
-- Aggregated query for 1-hour intervals
SELECT 
    toStartOfHour(timestamp) AS ts,
    id_sensor_channel,
    avg(value_engineered) AS avg_value,
    min(value_engineered) AS min_value,
    max(value_engineered) AS max_value,
    count() AS point_count
FROM sensor_logs
WHERE 
    id_sensor_channel IN ('uuid1', 'uuid2', 'uuid3')
    AND timestamp >= '2026-03-01 00:00:00'
    AND timestamp <= '2026-03-10 23:59:59'
GROUP BY ts, id_sensor_channel
ORDER BY ts ASC, id_sensor_channel
```

---

## 7. Frontend Architecture

### Directory Structure

```
src/app/pages/iot/reports/
├── reports-routing.module.ts
├── reports.module.ts
├── report-builder/
│   ├── report-builder.ts
│   ├── report-builder.html
│   └── report-builder.scss
├── report-preview/
│   ├── report-preview.ts
│   ├── report-preview.html
│   └── report-preview.scss
├── report-templates/
│   ├── report-templates.ts
│   ├── report-templates.html
│   └── report-templates.scss
└── services/
    └── report.service.ts
```

### Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│  ReportBuilderComponent                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Filters Section                                          ││
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    ││
│  │ │ Owner    │→│ Project  │→│ Nodes    │→│ Sensors  │    ││
│  │ │ dropdown │ │ dropdown │ │ multisel │ │ multisel │    ││
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘    ││
│  │ ┌──────────────────────┐ ┌──────────────────────┐      ││
│  │ │ Date Range           │ │ Aggregation Mode     │      ││
│  │ │ [start] - [end]      │ │ ○raw ○10m ○1h ○1d   │      ││
│  │ │ Quick: 1D 1W 1M      │ │ Suggested: 1h ✓      │      ││
│  │ └──────────────────────┘ └──────────────────────┘      ││
│  │                                                         ││
│  │ [Generate Preview]  [Load Template ▼]                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ReportPreviewComponent (child)                          ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ 📈 ApexCharts Line Chart                            │ ││
│  │ │ - Zoom, Pan, Tooltip                                │ ││
│  │ │ - Legend toggle series                              │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ 📊 Data Table (paginated, max 100 preview)          │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ 📋 Summary Statistics                               │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │                                                         ││
│  │ [💾 Save Template]  [� Export XLSX]                   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Menu Integration

```typescript
// app-menus.service.ts
{
  title: 'IoT',
  icon: 'bi bi-cpu',
  children: [
    { title: 'Dashboard', url: '/iot/dashboard' },
    { title: 'Telemetry', url: '/iot/telemetry' },
    { title: 'Reports', url: '/iot/reports', icon: 'bi bi-file-earmark-bar-graph' }, // NEW
    // ...
  ]
}
```

---

## 8. Export Format

### 8.1 XLSX Format

**Sheet 1: Data**
| Timestamp | Temperature - Pump 1 (°C) | Pressure - Pump 1 (bar) |
|-----------|---------------------------|-------------------------|
| 2026-03-01 00:00 | 25.5 | 3.2 |
| 2026-03-01 01:00 | 26.1 | 3.4 |

**Sheet 2: Summary**
| Sensor | Unit | Min | Avg | Max | Count |
|--------|------|-----|-----|-----|-------|
| Temperature - Pump 1 | °C | 20.1 | 25.5 | 31.2 | 168 |
| Pressure - Pump 1 | bar | 2.8 | 3.2 | 3.8 | 168 |

**Sheet 3: Report Info**
| Property | Value |
|----------|-------|
| Generated At | 2026-03-10 10:30:00 |
| Date Range | 2026-03-01 - 2026-03-10 |
| Aggregation | Per 1 Hour |
| Project | Pump Station Alpha |
| Nodes | Pump 1, Pump 2 |
| Total Data Points | 336 |

### 8.2 Library Choice

**exceljs** ✅ Recommended
- Styling (colors, borders, fonts)
- Multiple sheets
- Formulas support
- Streaming for large files
- NPM: `npm install exceljs`

---

## 9. Implementation Phases

### Phase 1: MVP (3-4 days)
- [ ] Backend: ReportModule dengan preview & XLSX export
- [ ] Backend: ClickHouse aggregation queries
- [ ] Frontend: Report builder dengan hierarchical filters
- [ ] Frontend: Preview table & basic chart
- [ ] Menu integration

### Phase 2: XLSX Export (1-2 days)
- [ ] Backend: exceljs integration
- [ ] Backend: Multi-sheet generation
- [ ] Backend: Styling & formatting

### Phase 3: Templates (1-2 days)
- [ ] Database: report_templates table
- [ ] Backend: Template CRUD API
- [ ] Frontend: Save/Load template UI

### Phase 4: Enhancements (Optional)
- [ ] PDF export dengan chart
- [ ] Scheduled report generation
- [ ] Email delivery
- [ ] Chart customization

---

## 10. Task Tracking

### Backend Tasks

| ID | Task | Status | Priority |
|----|------|--------|----------|
| BE-01 | Create ReportModule structure | ⬜ TODO | P1 |
| BE-02 | Create DTOs (request/response) | ⬜ TODO | P1 |
| BE-03 | Implement ReportService.generatePreview() | ⬜ TODO | P1 |
| BE-04 | ClickHouse aggregation query builder | ⬜ TODO | P1 |
| BE-05 | XLSX export with exceljs | ⬜ TODO | P1 |
| BE-06 | XLSX export with exceljs | ⬜ TODO | P2 |
| BE-07 | ReportTemplate entity | ⬜ TODO | P3 |
| BE-08 | Template CRUD service | ⬜ TODO | P3 |
| BE-09 | API documentation (Swagger) | ⬜ TODO | P2 |

### Frontend Tasks

| ID | Task | Status | Priority |
|----|------|--------|----------|
| FE-01 | Create ReportsModule & routing | ⬜ TODO | P1 |
| FE-02 | Report builder component | ⬜ TODO | P1 |
| FE-03 | Hierarchical filter components | ⬜ TODO | P1 |
| FE-04 | Preview table component | ⬜ TODO | P1 |
| FE-05 | ApexCharts line chart | ⬜ TODO | P1 |
| FE-06 | Summary statistics component | ⬜ TODO | P2 |
| FE-07 | Export XLSX button | ⬜ TODO | P1 |
| FE-08 | Template save/load UI | ⬜ TODO | P3 |
| FE-09 | Add to sidebar menu | ⬜ TODO | P1 |
| FE-10 | SDK service generation | ⬜ TODO | P1 |

### Integration Tasks

| ID | Task | Status | Priority |
|----|------|--------|----------|
| INT-01 | OpenAPI spec update | ⬜ TODO | P1 |
| INT-02 | Generate SDK | ⬜ TODO | P1 |
| INT-03 | End-to-end testing | ⬜ TODO | P2 |

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-10 | AI Assistant | Initial design document |

---

## Next Steps

1. Review & approve design
2. Start BE-01: Create ReportModule structure
3. Parallel: FE-01: Create ReportsModule structure

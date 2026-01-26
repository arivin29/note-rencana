# Widget Builder - Backend & Database Specification

## 📋 Review: Desain Awal vs Implementasi Mockup

### Status: ✅ Struktur Konsisten + Enhancement

Desain awal dari `MULTI-TENANT-DASHBOARD-DESIGN.md` masih relevan untuk **dashboard multi-tenant**, tetapi **Widget Builder** adalah **fitur tambahan baru** yang membutuhkan struktur database dan backend tersendiri.

---

## 🗄️ Database Schema - Widget Builder

### Table: `dashboards`
```sql
CREATE TABLE dashboards (
  id_dashboard UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner UUID REFERENCES owners(id_owner),  -- Multi-tenant: per owner
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout_config JSONB DEFAULT '{}',           -- Grid layout settings
  time_range VARCHAR(20) DEFAULT '6h',        -- Default time range
  refresh_interval INTEGER DEFAULT 60,        -- Auto refresh in seconds
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id_user),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for tenant filtering
CREATE INDEX idx_dashboards_owner ON dashboards(id_owner);
```

### Table: `widgets`
```sql
CREATE TABLE widgets (
  id_widget UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_dashboard UUID REFERENCES dashboards(id_dashboard) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  widget_type VARCHAR(50) NOT NULL,           -- 'line-chart', 'bar-chart', 'gauge', etc.
  
  -- Position in grid
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  cols INTEGER DEFAULT 6,                     -- Grid columns (1-12)
  rows INTEGER DEFAULT 4,                     -- Grid rows
  
  -- SQL Query
  sql_query TEXT NOT NULL,
  
  -- Complete Configuration (JSONB for flexibility)
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES users(id_user),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for dashboard lookup
CREATE INDEX idx_widgets_dashboard ON widgets(id_dashboard);
```

---

## 📦 Widget Config JSONB Structure

Berdasarkan implementasi mockup di `widget-wizard.component.ts`:

```json
{
  "title": "Temperature Monitor",
  "description": "Real-time temperature readings",
  
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
      "label": "Temperature",
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
    }
  ],
  
  "xAxis": {
    "label": "Time",
    "timeFormat": "HH:mm"
  },
  
  "yAxis": {
    "label": "Value",
    "unit": "",
    "decimals": 1,
    "min": null,
    "max": null,
    "scale": "linear"
  },
  
  "thresholds": [
    {
      "mode": "manual",
      "value": 30,
      "field": "",
      "label": "Max Temp",
      "color": "#f2495c",
      "lineStyle": "dashed"
    },
    {
      "mode": "field",
      "value": 0,
      "field": "min_threshold",
      "label": "Dynamic Min",
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

---

## 🔌 Backend API Endpoints

### Dashboard Management

```
GET    /api/dashboards                    - List dashboards (filtered by owner)
GET    /api/dashboards/:id                - Get dashboard with widgets
POST   /api/dashboards                    - Create dashboard
PUT    /api/dashboards/:id                - Update dashboard
DELETE /api/dashboards/:id                - Delete dashboard
```

### Widget Management

```
GET    /api/dashboards/:dashboardId/widgets           - List widgets
GET    /api/dashboards/:dashboardId/widgets/:widgetId - Get widget detail
POST   /api/dashboards/:dashboardId/widgets           - Create widget
PUT    /api/dashboards/:dashboardId/widgets/:widgetId - Update widget
DELETE /api/dashboards/:dashboardId/widgets/:widgetId - Delete widget
PATCH  /api/dashboards/:dashboardId/widgets/positions - Batch update positions
```

### Widget Query Execution

```
POST   /api/widgets/execute-query         - Execute SQL and return data
POST   /api/widgets/validate-query        - Validate SQL syntax (SELECT only)
GET    /api/widgets/query-columns         - Get available columns from result
```

---

## 📝 DTOs (Data Transfer Objects)

### CreateDashboardDto
```typescript
interface CreateDashboardDto {
  name: string;
  description?: string;
  isDefault?: boolean;
}
```

### CreateWidgetDto
```typescript
interface CreateWidgetDto {
  name: string;
  widgetType: 'line-chart' | 'bar-chart' | 'gauge' | 'pie-chart' | 'value-card' | 'data-table';
  sqlQuery: string;
  config: WidgetConfig;
  position?: {
    x: number;
    y: number;
    cols: number;
    rows: number;
  };
}
```

### UpdateWidgetDto
```typescript
interface UpdateWidgetDto {
  name?: string;
  widgetType?: string;
  sqlQuery?: string;
  config?: Partial<WidgetConfig>;
  position?: {
    x?: number;
    y?: number;
    cols?: number;
    rows?: number;
  };
}
```

### ExecuteQueryDto
```typescript
interface ExecuteQueryDto {
  sql: string;
  timeRange?: string;  // '15m', '1h', '6h', '24h', '7d'
  variables?: Record<string, any>;
}
```

### ExecuteQueryResponse
```typescript
interface ExecuteQueryResponse {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTime: number;  // ms
}
```

---

## 🔐 Security Requirements

### 1. SQL Injection Prevention
```typescript
// Backend MUST validate SQL before execution
const BLOCKED_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
  'CREATE', 'ALTER', 'GRANT', 'REVOKE', 'EXEC',
  'EXECUTE', 'INTO', 'SET', 'MERGE'
];

function isValidSelectQuery(sql: string): boolean {
  const upperSql = sql.toUpperCase().trim();
  
  // Must start with SELECT or WITH (for CTEs)
  if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('WITH')) {
    return false;
  }
  
  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sql)) {
      return false;
    }
  }
  
  return true;
}
```

### 2. Query Sandboxing (Recommended)
```typescript
// Use READ-ONLY database connection for widget queries
// Or use PostgreSQL read replica

// Alternative: Create restricted DB user
CREATE USER widget_reader WITH PASSWORD 'xxx';
GRANT CONNECT ON DATABASE iot_db TO widget_reader;
GRANT USAGE ON SCHEMA public TO widget_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO widget_reader;
```

### 3. Multi-Tenant Isolation
```typescript
// ALWAYS inject owner filter into widget queries
function executeWidgetQuery(sql: string, ownerId: string) {
  // Wrap user SQL in CTE with owner filter
  const safeSql = `
    WITH owner_nodes AS (
      SELECT n.* FROM nodes n
      JOIN projects p ON n.id_project = p.id_project
      WHERE p.id_owner = $1
    ),
    owner_telemetry AS (
      SELECT t.* FROM telemetry_data t
      WHERE t.id_node IN (SELECT id_node FROM owner_nodes)
    )
    ${sql.replace(/\btelemetry_data\b/gi, 'owner_telemetry')
         .replace(/\bnodes\b/gi, 'owner_nodes')}
  `;
  
  return db.query(safeSql, [ownerId]);
}
```

### 4. Query Timeout
```typescript
// Set statement timeout to prevent long-running queries
await db.query('SET statement_timeout = 30000'); // 30 seconds max
```

---

## 🔄 Time Range Variable Injection

Widget queries can use `${timeRange}` variable:

```sql
-- User writes:
SELECT timestamp, temperature, humidity
FROM telemetry_data
WHERE timestamp > NOW() - INTERVAL '${timeRange}'
ORDER BY timestamp

-- Backend replaces with actual value:
SELECT timestamp, temperature, humidity
FROM telemetry_data
WHERE timestamp > NOW() - INTERVAL '6 hours'
ORDER BY timestamp
```

### Time Range Mapping
```typescript
const TIME_RANGE_MAP = {
  '15m': '15 minutes',
  '30m': '30 minutes',
  '1h': '1 hour',
  '3h': '3 hours',
  '6h': '6 hours',
  '12h': '12 hours',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days'
};
```

---

## 📊 Widget Types & Data Requirements

| Widget Type | Required Fields | Optional Fields |
|-------------|-----------------|-----------------|
| `line-chart` | xField (timestamp), yFields[] | seriesField, thresholds |
| `bar-chart` | xField (category), yFields[] | - |
| `gauge` | valueField | min, max, thresholds |
| `pie-chart` | labelField, valueField | - |
| `value-card` | valueField | unit, decimals |
| `data-table` | columns[] | - |

---

## 🚀 Implementation Priority

### Phase 1: Core Backend (Week 1)
1. [ ] Create `dashboards` table
2. [ ] Create `widgets` table
3. [ ] Implement CRUD endpoints for dashboards
4. [ ] Implement CRUD endpoints for widgets
5. [ ] Implement `execute-query` endpoint with validation

### Phase 2: Security (Week 1-2)
1. [ ] SQL validation (SELECT only)
2. [ ] Multi-tenant query wrapping
3. [ ] Query timeout enforcement
4. [ ] Read-only DB user for queries

### Phase 3: Integration (Week 2)
1. [ ] Connect Angular widget-wizard to real API
2. [ ] Save/load widget configurations
3. [ ] Dashboard rendering from saved widgets
4. [ ] Position/layout persistence

### Phase 4: Enhancement (Week 3+)
1. [ ] Query caching
2. [ ] Query templates/snippets
3. [ ] Widget cloning
4. [ ] Dashboard export/import

---

## 📝 Notes

### Perubahan dari Desain Awal

1. **Database**: 
   - Desain awal fokus pada multi-tenant hierarchy (owners → projects → nodes)
   - Widget builder menambah 2 tabel baru: `dashboards` dan `widgets`
   - Keduanya tetap terhubung ke `owners` untuk isolasi data

2. **Widget Config**:
   - Lebih detail dari desain awal
   - Menambahkan: series override, thresholds (manual + field-based), axis config
   - Menggunakan JSONB untuk fleksibilitas

3. **Security**:
   - SQL validation sudah diimplementasikan di frontend
   - Backend HARUS mengulang validasi (never trust frontend)
   - Query sandboxing dengan read-only user direkomendasikan

4. **Time Range**:
   - Frontend sudah punya dropdown time range
   - Backend perlu inject nilai ke query

---

*Last Updated: 2026-01-26*

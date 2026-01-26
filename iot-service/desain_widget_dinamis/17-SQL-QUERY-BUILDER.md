# 📋 17 - SQL Query Builder (Phase 1 Approach)

> **Document:** Simplified Widget Creation with Raw SQL  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026  
> **Approach:** SQL First, Visual Config Later

---

## 17.1 Simplified Approach Overview

### Why Raw SQL First?

| Aspect | Visual Config (Complex) | Raw SQL (Simple) |
|--------|------------------------|------------------|
| Development effort | 🔴 High | 🟢 Low |
| Time to market | 🔴 Slow | 🟢 Fast |
| Flexibility | 🟡 Limited | 🟢 Unlimited |
| User skill needed | 🟢 None | 🟡 Basic SQL |
| Error handling | 🟢 Controlled | 🟡 Need validation |

### Target User untuk Phase 1
- Admin/Technical users yang paham SQL
- Internal team untuk setup dashboard
- Power users

### Roadmap
```
Phase 1: Raw SQL Query → Map to Chart (NOW)
    ↓
Phase 2: Query Templates (pre-defined SQL)
    ↓
Phase 3: Visual Query Builder (cascading dropdown)
```

---

## 17.2 User Flow (SQL-First)

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Write SQL Query                                        │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  SELECT                                                   │ │
│  │    sl.ts as timestamp,                                    │ │
│  │    sl.value_engineered as value,                          │ │
│  │    sc.metric_code,                                        │ │
│  │    sc.unit                                                │ │
│  │  FROM sensor_logs sl                                      │ │
│  │  JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id  │ │
│  │  WHERE sl.id_sensor_channel = 'uuid-xxx'                  │ │
│  │    AND sl.ts >= NOW() - INTERVAL '24 hours'               │ │
│  │  ORDER BY sl.ts ASC                                       │ │
│  │  LIMIT 1000                                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [▶ Run Query]                         Execution time: 45ms    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
            │
            │ (Execute)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: View Results                                           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Results: 156 rows                                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ timestamp            │ value  │ metric_code  │ unit      │ │
│  │──────────────────────│────────│──────────────│───────────│ │
│  │ 2026-01-24 00:00:00 │ 25.5   │ temperature  │ °C        │ │
│  │ 2026-01-24 00:10:00 │ 25.7   │ temperature  │ °C        │ │
│  │ 2026-01-24 00:20:00 │ 26.1   │ temperature  │ °C        │ │
│  │ 2026-01-24 00:30:00 │ 26.3   │ temperature  │ °C        │ │
│  │ ...                  │ ...    │ ...          │ ...       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                              [Next: Map Fields] │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Map Fields to Chart                                    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Chart Type: [Line Chart ▼]                                     │
│                                                                 │
│  Field Mapping:                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  X-Axis (Time):    [timestamp           ▼]  (detected)   │ │
│  │                                                           │ │
│  │  Y-Axis (Value):   [value               ▼]  (detected)   │ │
│  │                                                           │ │
│  │  Series Name:      [metric_code         ▼]  (optional)   │ │
│  │                                                           │ │
│  │  Group By:         [- none -            ▼]  (optional)   │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  💡 Auto-detected: timestamp column for X, numeric for Y       │
│                                                                 │
│                                              [Next: Configure]  │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Chart Configuration                                    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Title:     [Temperature Trend                              ]   │
│                                                                 │
│  Display:                                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Line Color:   [████] #1890ff                             │ │
│  │  [✓] Show area fill                                       │ │
│  │  [✓] Enable zoom                                          │ │
│  │  [✓] Show tooltip                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                              [Preview →]        │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Preview & Save                                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │     📈 Temperature Trend                                  │ │
│  │   50 ┤                                                    │ │
│  │      │                         ╭──╮                       │ │
│  │   40 ┤                        /    \                      │ │
│  │      │              ╭────────╯      ╰──╮                  │ │
│  │   30 ┤─────────────╯                    ╰────────         │ │
│  │      │                                                    │ │
│  │   20 ┤                                                    │ │
│  │      └────────────────────────────────────────────────    │ │
│  │        00:00    06:00    12:00    18:00    24:00          │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                        [Save to Dashboard]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 17.3 SQL Query Restrictions (Security)

### Allowed Operations

```typescript
const ALLOWED_SQL_PATTERNS = {
  // Only SELECT allowed
  statements: ['SELECT'],
  
  // Allowed tables (read-only)
  tables: [
    'sensor_logs',
    'sensor_channels', 
    'sensors',
    'sensor_types',
    'sensor_catalogs',
    'nodes',
    'projects',
    'owners',
    'alert_events',
    'alert_rules',
  ],
  
  // Forbidden keywords
  forbidden: [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE', 'EXEC',
    'INTO', 'OUTFILE', 'DUMPFILE', 'LOAD_FILE',
    ';--', '/*', '*/', 'UNION ALL', 'INFORMATION_SCHEMA'
  ],
  
  // Limits
  maxRows: 10000,
  timeoutMs: 30000,
};
```

### Query Validation Service

```typescript
// Backend: QueryValidatorService

@Injectable()
export class QueryValidatorService {
  
  validateQuery(sql: string, user: User): ValidationResult {
    // 1. Check only SELECT
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new BadRequestException('Only SELECT queries are allowed');
    }
    
    // 2. Check forbidden keywords
    for (const forbidden of ALLOWED_SQL_PATTERNS.forbidden) {
      if (sql.toUpperCase().includes(forbidden)) {
        throw new BadRequestException(`Forbidden keyword: ${forbidden}`);
      }
    }
    
    // 3. Auto-inject owner filter for multi-tenant
    const sanitizedSql = this.injectOwnerFilter(sql, user.idOwner);
    
    // 4. Add LIMIT if not present
    const limitedSql = this.ensureLimit(sanitizedSql, 10000);
    
    return { 
      isValid: true, 
      sanitizedSql: limitedSql 
    };
  }
  
  // Inject WHERE clause to filter by owner
  private injectOwnerFilter(sql: string, idOwner: string): string {
    // Parse and add: AND (table.id_owner = 'xxx' OR ...)
    // This ensures user can only see their own data
  }
}
```

---

## 17.4 Widget Configuration (SQL-based)

### Saved Widget Structure

```typescript
interface SqlWidgetConfig {
  // Identity
  idWidget: string;
  idDashboard: string;
  widgetType: WidgetType;
  title: string;
  
  // Position (for grid)
  position: { x: number; y: number; w: number; h: number };
  
  // SQL Query
  query: {
    sql: string;           // The raw SQL
    parameters?: Record<string, any>;  // For parameterized queries
  };
  
  // Field Mapping
  fieldMapping: {
    xAxis: string;         // Column name for X axis (e.g., "timestamp")
    yAxis: string;         // Column name for Y axis (e.g., "value")
    seriesName?: string;   // Column for series grouping (optional)
    groupBy?: string;      // Column for grouping (optional)
  };
  
  // Time Range (for variable substitution)
  timeRange: {
    useGlobalTimeRange: boolean;
    customRange?: { value: number; unit: string };
  };
  
  // Display Config
  displayConfig: {
    lineColor?: string;
    showArea?: boolean;
    enableZoom?: boolean;
    // ... widget-type specific
  };
}
```

---

## 17.5 Variable Substitution (Time Range)

### Global Variables

```sql
-- User writes:
SELECT ts, value_engineered as value
FROM sensor_logs
WHERE ts >= ${__timeFrom} AND ts <= ${__timeTo}
  AND id_sensor_channel = 'uuid-xxx'
ORDER BY ts

-- Backend replaces with actual values:
SELECT ts, value_engineered as value  
FROM sensor_logs
WHERE ts >= '2026-01-24 00:00:00' AND ts <= '2026-01-25 00:00:00'
  AND id_sensor_channel = 'uuid-xxx'
ORDER BY ts
```

### Available Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `${__timeFrom}` | Start of time range | `'2026-01-24 00:00:00'` |
| `${__timeTo}` | End of time range | `'2026-01-25 00:00:00'` |
| `${__interval}` | Auto interval for bucketing | `'1 hour'` |
| `${__owner}` | Current user's owner ID | `'uuid-owner'` |
| `${__user}` | Current user ID | `'uuid-user'` |

---

## 17.6 Example Queries

### 1. Single Sensor Time-Series

```sql
SELECT 
  sl.ts as timestamp,
  sl.value_engineered as value
FROM sensor_logs sl
WHERE sl.id_sensor_channel = 'uuid-channel-xxx'
  AND sl.ts >= ${__timeFrom} 
  AND sl.ts <= ${__timeTo}
ORDER BY sl.ts ASC
LIMIT 1000
```

**Field Mapping:**
- X-Axis: `timestamp`
- Y-Axis: `value`

---

### 2. Compare Multiple Sensors

```sql
SELECT 
  sl.ts as timestamp,
  sl.value_engineered as value,
  s.label as sensor_name
FROM sensor_logs sl
JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
JOIN sensors s ON sc.id_sensor = s.id_sensor
WHERE sc.metric_code = 'temperature'
  AND s.id_node = 'uuid-node-xxx'
  AND sl.ts >= ${__timeFrom}
ORDER BY sl.ts ASC
```

**Field Mapping:**
- X-Axis: `timestamp`
- Y-Axis: `value`
- Series Name: `sensor_name` (creates multiple lines)

---

### 3. Node Status Distribution (Pie Chart)

```sql
SELECT 
  connectivity_status as status,
  COUNT(*) as count
FROM nodes n
JOIN projects p ON n.id_project = p.id_project
WHERE p.id_owner = ${__owner}
GROUP BY connectivity_status
```

**Field Mapping:**
- Label: `status`
- Value: `count`

---

### 4. Hourly Average (Aggregated)

```sql
SELECT 
  date_trunc('hour', sl.ts) as hour,
  AVG(sl.value_engineered) as avg_value,
  MIN(sl.value_engineered) as min_value,
  MAX(sl.value_engineered) as max_value
FROM sensor_logs sl
WHERE sl.id_sensor_channel = 'uuid-xxx'
  AND sl.ts >= ${__timeFrom}
GROUP BY date_trunc('hour', sl.ts)
ORDER BY hour ASC
```

**Field Mapping:**
- X-Axis: `hour`
- Y-Axis: `avg_value`
- (Optional multi-series: min_value, max_value)

---

### 5. Alert Events Timeline

```sql
SELECT 
  ae.triggered_at as timestamp,
  ar.severity,
  ae.value,
  sc.metric_code
FROM alert_events ae
JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
WHERE ae.triggered_at >= ${__timeFrom}
ORDER BY ae.triggered_at DESC
LIMIT 100
```

---

## 17.7 API Endpoints

```typescript
// ===== QUERY EXECUTION =====

// Execute SQL and get results
POST /api/query/execute
Headers: Authorization: Bearer {token}
Body: {
  sql: "SELECT ...",
  parameters: {},       // Optional
  timeRange: {          // For variable substitution
    from: "2026-01-24T00:00:00Z",
    to: "2026-01-25T00:00:00Z"
  }
}
Response: {
  columns: [
    { name: "timestamp", type: "timestamp" },
    { name: "value", type: "numeric" },
    { name: "metric_code", type: "text" }
  ],
  rows: [
    { timestamp: "2026-01-24T00:00:00Z", value: 25.5, metric_code: "temperature" },
    ...
  ],
  rowCount: 156,
  executionTimeMs: 45
}

// ===== QUERY VALIDATION =====

// Validate SQL before execution
POST /api/query/validate
Body: { sql: "SELECT ..." }
Response: {
  isValid: true,
  errors: [],
  warnings: ["Query returns many rows, consider adding LIMIT"]
}

// ===== WIDGET CRUD =====

// Save widget with SQL config
POST /api/dashboards/{id}/widgets
Body: {
  widgetType: "line-chart",
  title: "Temperature Trend",
  query: { sql: "SELECT ..." },
  fieldMapping: { xAxis: "timestamp", yAxis: "value" },
  displayConfig: { lineColor: "#1890ff" }
}
```

---

## 17.8 Frontend Components

### Query Editor Component

```typescript
// query-editor.component.ts

@Component({
  selector: 'app-query-editor',
  template: `
    <div class="query-editor">
      <!-- SQL Editor (use Monaco or CodeMirror) -->
      <ngx-monaco-editor
        [(ngModel)]="sql"
        [options]="editorOptions"
        (onInit)="onEditorInit($event)">
      </ngx-monaco-editor>
      
      <!-- Toolbar -->
      <div class="toolbar">
        <button (click)="runQuery()" [disabled]="loading">
          ▶ Run Query
        </button>
        <button (click)="formatSql()">Format</button>
        <span *ngIf="executionTime">{{ executionTime }}ms</span>
      </div>
      
      <!-- Results Table -->
      <div class="results" *ngIf="results">
        <table>
          <thead>
            <tr>
              <th *ngFor="let col of results.columns">{{ col.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of results.rows">
              <td *ngFor="let col of results.columns">{{ row[col.name] }}</td>
            </tr>
          </tbody>
        </table>
        <div class="row-count">{{ results.rowCount }} rows</div>
      </div>
    </div>
  `
})
export class QueryEditorComponent {
  sql = '';
  results: QueryResult | null = null;
  loading = false;
  executionTime: number | null = null;
  
  editorOptions = {
    language: 'sql',
    theme: 'vs-dark',
    minimap: { enabled: false },
    automaticLayout: true
  };
  
  async runQuery() {
    this.loading = true;
    const start = Date.now();
    
    try {
      this.results = await this.queryService.execute(this.sql);
      this.executionTime = Date.now() - start;
    } catch (error) {
      this.toastr.error(error.message);
    } finally {
      this.loading = false;
    }
  }
}
```

### Field Mapping Component

```typescript
// field-mapping.component.ts

@Component({
  selector: 'app-field-mapping',
  template: `
    <div class="field-mapping">
      <h4>Map Query Results to Chart</h4>
      
      <div class="field">
        <label>X-Axis (Time/Category):</label>
        <select [(ngModel)]="mapping.xAxis">
          <option *ngFor="let col of columns" [value]="col.name">
            {{ col.name }} ({{ col.type }})
          </option>
        </select>
        <span class="hint" *ngIf="suggestedX">💡 Suggested: {{ suggestedX }}</span>
      </div>
      
      <div class="field">
        <label>Y-Axis (Value):</label>
        <select [(ngModel)]="mapping.yAxis">
          <option *ngFor="let col of numericColumns" [value]="col.name">
            {{ col.name }}
          </option>
        </select>
      </div>
      
      <div class="field" *ngIf="widgetType === 'line-chart'">
        <label>Series Name (for multiple lines):</label>
        <select [(ngModel)]="mapping.seriesName">
          <option value="">- None (single line) -</option>
          <option *ngFor="let col of textColumns" [value]="col.name">
            {{ col.name }}
          </option>
        </select>
      </div>
    </div>
  `
})
export class FieldMappingComponent {
  @Input() columns: Column[] = [];
  @Input() widgetType: string;
  @Output() mappingChange = new EventEmitter<FieldMapping>();
  
  mapping: FieldMapping = { xAxis: '', yAxis: '' };
  
  get numericColumns() {
    return this.columns.filter(c => ['numeric', 'integer', 'float'].includes(c.type));
  }
  
  get textColumns() {
    return this.columns.filter(c => c.type === 'text');
  }
  
  get suggestedX() {
    // Auto-suggest timestamp column for X
    const tsCol = this.columns.find(c => 
      c.type === 'timestamp' || c.name.includes('time') || c.name.includes('ts')
    );
    return tsCol?.name;
  }
}
```

---

## 17.9 Implementation Plan

### Phase 1A: Basic SQL Widget (Week 1-2)

| Task | Priority |
|------|----------|
| SQL Editor component (Monaco) | 🔴 HIGH |
| Query execution API | 🔴 HIGH |
| Query validation & security | 🔴 HIGH |
| Results table display | 🔴 HIGH |
| Field mapping UI | 🔴 HIGH |
| Basic Line Chart rendering | 🔴 HIGH |

### Phase 1B: More Chart Types (Week 3)

| Task | Priority |
|------|----------|
| Gauge widget | 🟡 MEDIUM |
| Pie chart widget | 🟡 MEDIUM |
| Bar chart widget | 🟡 MEDIUM |
| Value card widget | 🟡 MEDIUM |

### Phase 1C: Polish (Week 4)

| Task | Priority |
|------|----------|
| Global time filter | 🟡 MEDIUM |
| Variable substitution | 🟡 MEDIUM |
| Query templates | 🟢 LOW |
| Save/Load queries | 🟢 LOW |

---

## 17.10 Comparison: SQL vs Visual

| Feature | SQL Approach | Visual Approach |
|---------|-------------|-----------------|
| Dev time | 2 weeks | 4-6 weeks |
| Flexibility | Unlimited | Limited to UI options |
| User learning | Need SQL knowledge | Zero learning |
| Maintenance | Lower | Higher |
| Error prone | Higher | Lower |

**Recommendation:** Start with SQL → Add visual builder later as enhancement

---

## Navigation

⬅️ [Previous: User Interaction Flow](./16-USER-INTERACTION-FLOW.md) | [Back to Index](./00-INDEX.md)

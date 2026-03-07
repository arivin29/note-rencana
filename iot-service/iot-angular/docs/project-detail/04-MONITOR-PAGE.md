# 04 - Monitor Tab

## Purpose
Real-time sensor monitoring dashboard using dynamic widget system.

---

## Integration with Dynamic Widget Module

The Monitor tab will **integrate the existing dynamic widget system** from:
```
desain_widget_dinamis/
```

### Key Integration Points:
1. Use widget catalog from dashboard system
2. Scope widgets to current project's sensors
3. Use same data sources (ClickHouse, PostgreSQL)

---

## Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MONITOR                                          [Add Widget] [⚙ Layout]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Pressure   │  │    Flow     │  │   Level     │  │   Power     │        │
│  │   ██████    │  │    ▓▓▓▓    │  │    ████     │  │    ▒▒▒▒     │        │
│  │   3.2 bar   │  │   45 m³/h  │  │     78%     │  │   2.4 kW    │        │
│  │   ▲ +0.2    │  │   ▼ -5     │  │   ═ stable  │  │   ▲ +0.1    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  Pressure Trend (24h)               │  │  System Health              │  │
│  │  ╭─────────╮                        │  │  ✅ All nodes online        │  │
│  │  │         ╲                        │  │  ✅ No anomalies            │  │
│  │  │          ╲_____                  │  │  ⚠️  1 battery low          │  │
│  │  ╰──────────────────                │  │                             │  │
│  └─────────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Widget Types (From Dashboard Catalog)

Reference: `desain_widget_dinamis/21-DASHBOARD-CATALOG.md`

### Available Widgets for Monitor Tab:

| Widget Type | Use Case | Data Source |
|-------------|----------|-------------|
| `value_card` | Single metric display | ClickHouse latest |
| `gauge` | Percentage/range values | ClickHouse latest |
| `sparkline` | Mini trend line | ClickHouse 24h |
| `line_chart` | Time series | ClickHouse range |
| `status_grid` | Multiple node status | PostgreSQL |
| `alert_list` | Recent alerts | PostgreSQL |
| `map_mini` | Node locations | PostgreSQL |

---

## Component Structure

```typescript
// monitor-tab.component.ts
@Component({
  selector: 'app-monitor-tab',
  templateUrl: './monitor-tab.component.html'
})
export class MonitorTabComponent implements OnInit, OnDestroy {
  @Input() projectId: string;
  
  dashboardConfig: DashboardConfig;
  widgets: Widget[] = [];
  
  private refreshInterval: any;
  
  ngOnInit() {
    this.loadProjectDashboard();
    this.startAutoRefresh();
  }
  
  ngOnDestroy() {
    this.stopAutoRefresh();
  }
  
  loadProjectDashboard() {
    // Load saved dashboard config for this project
    // Or create default layout based on project sensors
  }
  
  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.refreshWidgetData();
    }, 10000); // 10 sec polling
  }
  
  addWidget() {
    // Open widget catalog modal
  }
  
  saveLayout() {
    // Save current widget positions to project config
  }
}
```

---

## Dashboard Config Storage

### Option 1: Per-Project Config (Recommended)
Store in project metadata or separate table:
```typescript
interface ProjectDashboardConfig {
  projectId: string;
  widgets: WidgetConfig[];
  layout: GridLayout;
  refreshInterval: number;
}
```

### Option 2: User Preferences
Store per user + project combination.

---

## Default Widgets

When no config exists, generate default widgets based on project sensors:

```typescript
generateDefaultWidgets(sensors: Sensor[]): WidgetConfig[] {
  const widgets: WidgetConfig[] = [];
  
  // Group sensors by type
  const pressure = sensors.filter(s => s.metricCode === 'pressure');
  const flow = sensors.filter(s => s.metricCode === 'flow');
  const level = sensors.filter(s => s.metricCode === 'level');
  
  // Add value cards for each type
  if (pressure.length) {
    widgets.push({
      type: 'value_card',
      title: 'Pressure',
      dataSource: { sensors: pressure.map(s => s.id) },
      position: { x: 0, y: 0, w: 3, h: 2 }
    });
  }
  
  // ... similar for other types
  
  return widgets;
}
```

---

## Real-time Updates

### Current: Polling (Implemented)
```typescript
// Already available from widget system
setInterval(() => this.refreshData(), 10000);
```

### Future: WebSocket (Optional)
```typescript
// Gateway publishes to topic
// Frontend subscribes via Socket.io
this.socket.on(`project:${projectId}:telemetry`, (data) => {
  this.updateWidgetData(data);
});
```

---

## API Endpoints (Existing)

From `desain_widget_dinamis/08-API-SPECIFICATION.md`:

```
GET  /api/dashboards/:dashboardId
POST /api/dashboards
PUT  /api/dashboards/:dashboardId
GET  /api/widgets/catalog
POST /api/widgets/data-preview
GET  /api/data-sources/query
```

### New Endpoint Needed:
```
GET  /api/projects/:projectId/dashboard
POST /api/projects/:projectId/dashboard
```

---

## Mobile Considerations

- Single column layout on mobile
- Swipe between widgets
- Tap to expand widget
- Pull to refresh

---

**Prev**: [03-OVERVIEW-TAB.md](03-OVERVIEW-TAB.md)  
**Next**: [05-ASSETS-TAB.md](05-ASSETS-TAB.md)

# 07 - Analytics Tab

## Purpose
Historical data analysis, trend charts, comparisons, and report generation.

---

## Status: Phase 3 (Placeholder)

This tab will be implemented in Phase 3. For now, show a placeholder with coming soon message.

---

## Planned Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ANALYTICS                                        [Date Range ▼] [Export]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TREND ANALYSIS                                                      │   │
│  │                                                                      │   │
│  │  Sensor: [Pressure ▼]   Metric: [All ▼]   Range: [Last 7 days ▼]    │   │
│  │                                                                      │   │
│  │  ╭──────────────────────────────────────────────────────────────╮   │   │
│  │  │                     📈                                        │   │   │
│  │  │         ╱╲      ╱╲                                            │   │   │
│  │  │   ╱╲   ╱  ╲    ╱  ╲   ╱──────                                │   │   │
│  │  │  ╱  ╲─╱    ╲──╱    ╲─╱                                       │   │   │
│  │  │ ╱                                                             │   │   │
│  │  ╰──────────────────────────────────────────────────────────────╯   │   │
│  │  Mon    Tue    Wed    Thu    Fri    Sat    Sun                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  STATISTICS                  │  │  COMPARISON                         │  │
│  │                              │  │                                     │  │
│  │  Avg: 3.2 bar               │  │  Node A  ████████ 3.4 bar          │  │
│  │  Min: 2.8 bar               │  │  Node B  ██████   2.9 bar          │  │
│  │  Max: 3.8 bar               │  │  Node C  ███████  3.1 bar          │  │
│  │  Std Dev: 0.3               │  │                                     │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ANOMALY HISTORY                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │ 2026-03-05  │ High Pressure │ Node-001 │ 4.2 bar │ resolved  │   │   │
│  │  │ 2026-03-03  │ Low Flow      │ Node-002 │ 12 m³/h │ resolved  │   │   │
│  │  │ 2026-02-28  │ Spike         │ Node-001 │ 5.1 bar │ resolved  │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Planned Features

### Trend Analysis
- Select sensors/metrics
- Date range picker (1h, 24h, 7d, 30d, custom)
- Line chart with zoom
- Export to CSV

### Statistics
- Aggregated stats (avg, min, max, std dev)
- Period comparison (this week vs last week)

### Comparison
- Compare multiple sensors/nodes
- Side-by-side charts
- Ranking bar chart

### Anomaly History
- List of detected anomalies
- Filter by severity, status
- Link to ML dashboard

### Reports
- Generate PDF report
- Schedule recurring reports
- Email distribution

---

## Data Sources

### ClickHouse
- Historical telemetry data
- Aggregated views (10min, 1h, 1d)

### PostgreSQL
- Anomaly records
- Alert history

---

## Placeholder Implementation

```typescript
// analytics-tab.component.ts
@Component({
  selector: 'app-analytics-tab',
  template: `
    <div class="coming-soon-placeholder">
      <i class="fa fa-chart-line fa-4x text-muted mb-3"></i>
      <h4>Analytics Coming Soon</h4>
      <p class="text-muted">
        Historical trend analysis, comparisons, and reports will be available here.
      </p>
      <a routerLink="/iot/telemetry" class="btn btn-outline-primary">
        View Telemetry Timeline
      </a>
    </div>
  `,
  styles: [`
    .coming-soon-placeholder {
      text-align: center;
      padding: 4rem 2rem;
    }
  `]
})
export class AnalyticsTabComponent {
  @Input() projectId: string;
}
```

---

**Prev**: [06-MAP-TAB.md](06-MAP-TAB.md)  
**Next**: [08-CONFIG-TAB.md](08-CONFIG-TAB.md)

# 03 - Overview Tab

## Purpose
Quick health check dashboard - the "at a glance" view for daily routine monitoring.

---

## Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROJECT SNAPSHOT                                                           │
├──────────────────────────────────┬──────────────────────────────────────────┤
│                                  │                                          │
│  Owner: PDAM KUTKAR              │  OPERATIONS & TEAM                       │
│  Deployment: Live since Mar 2026 │  ┌────────────────────────────────────┐ │
│  Data: Streaming · MQTT          │  │ Project Owner: Arif Pratama        │ │
│                                  │  │ Field Engineer: Siti N.            │ │
│  ┌─────┬─────┬─────┬─────┐       │  │ Support: #proj-water               │ │
│  │ 12  │ 45  │  3  │  0  │       │  └────────────────────────────────────┘ │
│  │Node │Sens │Loc  │Alert│       │                                          │
│  └─────┴─────┴─────┴─────┘       │  CHECKLIST                               │
│                                  │  ☑ Calibrate sensors                     │
│  [Deploy Update] [Edit Project]  │  ☐ Approve firmware                      │
│                                  │  ☐ Review alerts                         │
├──────────────────────────────────┴──────────────────────────────────────────┤
│  MINI MAP (preview, click to expand to Map tab)                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          📍      📍                                    │  │
│  │               📍                      📍                               │  │
│  │                    📍                                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  QUICK LINKS                                                                │
│  [Sensor Explorer] [Nodes/Devices] [Telemetry] [Alert Center]               │
├─────────────────────────────────────┬───────────────────────────────────────┤
│  RECENT SENSORS (top 5)             │   ALERT SUMMARY                       │
│  ┌─────────────────────────────┐    │   ┌─────────────────────────────────┐ │
│  │ Pressure-001   │ 3.2 bar   │    │   │ ✓ All systems operational       │ │
│  │ Flow-002       │ 45 m³/h   │    │   │   No active alerts              │ │
│  │ Level-003      │ 78%       │    │   └─────────────────────────────────┘ │
│  └─────────────────────────────┘    │                                       │
└─────────────────────────────────────┴───────────────────────────────────────┘
```

---

## Components

### 1. Project Snapshot Card
**Existing** - refactor from current implementation
- Owner info
- Deployment date
- Data window
- Stats cards (nodes, sensors, locations, alerts)
- Action buttons

### 2. Operations & Team Card
**Existing** - keep as is
- Project Owner
- Field Engineer
- Support Channel
- Checklist

### 3. Mini Map
**New** - compact version of map widget
- Shows node markers
- Click to navigate to Map tab
- Height: ~200px

### 4. Quick Links Bar
**Existing** - keep as is
- Sensor Explorer
- Nodes/Devices
- Telemetry Timeline
- Alert Center

### 5. Sensor Overview Table
**Existing** - limit to 5 rows
- Link to full list in Assets tab

### 6. Alert Summary
**Existing** - keep as is

---

## Data Requirements

```typescript
interface OverviewTabData {
  project: ProjectDto;
  stats: {
    totalNodes: number;
    activeNodes: number;
    totalSensors: number;
    totalLocations: number;
  };
  recentSensors: SensorDto[];  // limit 5
  alerts: AlertDto[];          // active only
  mapNodes: NodeMapMarker[];
}
```

---

## Implementation Notes

### Refactor Strategy
1. Move existing content into `overview-tab.component`
2. Pass `@Input() project` from parent
3. Keep API calls in parent, pass data down

### Component Interface
```typescript
@Component({
  selector: 'app-overview-tab',
  templateUrl: './overview-tab.component.html'
})
export class OverviewTabComponent {
  @Input() project: any;
  @Input() sensors: any[] = [];
  @Input() alerts: any[] = [];
  @Input() mapNodes: any[] = [];
  
  @Output() navigateToTab = new EventEmitter<string>();
  
  goToMap() {
    this.navigateToTab.emit('map');
  }
}
```

---

**Prev**: [02-TAB-STRUCTURE.md](02-TAB-STRUCTURE.md)  
**Next**: [04-MONITOR-TAB.md](04-MONITOR-TAB.md)

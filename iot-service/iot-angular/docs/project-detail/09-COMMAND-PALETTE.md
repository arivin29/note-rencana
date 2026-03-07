# 09 - SCADA Tab (Optional)

## Purpose
SCADA-like visualization with custom layouts and real-time sensor values.

---

## Status: Future/Optional

This is an advanced feature that can be implemented when needed. It uses the dynamic widget system with a custom background.

---

## Concept

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCADA VIEW                                              [Edit Mode] [⚙]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │                  ┌─────┐                                              │ │
│  │                  │ IPA │                                              │ │
│  │                  │ ═══ │                                              │ │
│  │                  └──┬──┘                                              │ │
│  │                     │                                                 │ │
│  │        ┌────────────┼────────────┐                                    │ │
│  │        │            │            │                                    │ │
│  │        ▼            ▼            ▼                                    │ │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐                               │ │
│  │   │ DMA-1   │  │ DMA-2   │  │ DMA-3   │                               │ │
│  │   │ 3.2 bar │  │ 2.9 bar │  │ 3.1 bar │                               │ │
│  │   │ 45 m³/h │  │ 38 m³/h │  │ 42 m³/h │                               │ │
│  │   └─────────┘  └─────────┘  └─────────┘                               │ │
│  │                                                                       │ │
│  │   Flow: ═══════════════════════════════>  Total: 125 m³/h            │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Legend: 🟢 Normal  🟡 Warning  🔴 Alarm                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Options

### Option 1: Grid Widget Layout (Simple)
Use existing widget system with:
- Custom positions
- Value overlays
- Status colors

### Option 2: SVG Background + Data Binding (Advanced)
```typescript
interface ScadaConfig {
  backgroundSvg: string;  // SVG template with data binding points
  bindings: ScadaBinding[];
}

interface ScadaBinding {
  elementId: string;      // SVG element ID
  dataSource: {
    sensorId: string;
    metricCode: string;
  };
  displayType: 'value' | 'color' | 'animation';
  thresholds?: {
    warning: number;
    alarm: number;
  };
}
```

### Option 3: Canvas-based (Most Flexible)
Use library like Draw2D or JointJS for:
- User-defined diagrams
- Real-time updates
- Interactive controls

---

## Data Sources

Uses same endpoints as Monitor tab:
- Dynamic widget query API
- ClickHouse for latest values
- WebSocket for live updates (optional)

---

## When to Implement

Implement SCADA view when:
1. Customer specifically requests it
2. Need P&ID visualization
3. Control panel requirements

For most IoT use cases, the **Monitor tab with grid widgets** is sufficient.

---

## Placeholder

```typescript
@Component({
  selector: 'app-scada-tab',
  template: `
    <div class="coming-soon-placeholder">
      <i class="fa fa-industry fa-4x text-muted mb-3"></i>
      <h4>SCADA View</h4>
      <p class="text-muted">
        Custom SCADA visualization with P&ID diagrams will be available here.
      </p>
      <p class="small text-muted">
        Contact support to enable this feature for your project.
      </p>
    </div>
  `
})
export class ScadaTabComponent {
  @Input() projectId: string;
}
```

---

## Tab Visibility

SCADA tab is hidden by default:
```typescript
showScadaTab = false; // Enable per-project or per-plan

// Or check project settings
showScadaTab = this.project.features?.scadaEnabled || false;
```

---

**Prev**: [08-CONFIG-TAB.md](08-CONFIG-TAB.md)  
**Next**: [10-TASK-TRACKING.md](10-TASK-TRACKING.md)

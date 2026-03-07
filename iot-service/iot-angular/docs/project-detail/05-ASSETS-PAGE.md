# 05 - Assets Tab

## Purpose
Tree view of project assets: Nodes → Sensors → Channels with search, filter, and quick actions.

---

## Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ASSETS                                                                     │
│                                                                             │
│  [🔍 Search...]  [Status: All ▼]  [Type: All ▼]     [+ Add Node] [⚙]       │
├────────────────────────────────────┬────────────────────────────────────────┤
│                                    │                                        │
│  ASSET TREE                        │  DETAIL PANEL                          │
│  ─────────────                     │  ─────────────                         │
│                                    │                                        │
│  📦 DMA 1 (Project)                │  NODE: PDAM-NODE-001                   │
│  ├── 🖥️ PDAM-NODE-001  ●          │  ┌─────────────────────────────────┐   │
│  │   ├── 🔧 Tekanan (3051)         │  │ Status: Online                   │   │
│  │   │   ├── 📊 Pressure           │  │ Model: Helio ESP32              │   │
│  │   │   ├── 📊 Temperature        │  │ Serial: ESP32-001               │   │
│  │   │   └── 📊 Battery            │  │ Last seen: 2 min ago            │   │
│  │   └── 🔧 Flow Meter (2030)      │  │ Location: Jl. Sudirman          │   │
│  │       ├── 📊 Flow Rate          │  └─────────────────────────────────┘   │
│  │       └── 📊 Totalizer          │                                        │
│  ├── 🖥️ PDAM-NODE-002  ●          │  LATEST VALUES                         │
│  │   └── ...                       │  ┌─────────────────────────────────┐   │
│  └── 🖥️ PDAM-NODE-003  ○ offline   │  │ Pressure    │ 3.2 bar  │ ▲     │   │
│       └── ...                       │  │ Temperature │ 28.5°C   │ ═     │   │
│                                    │  │ Battery     │ 85%      │ ▼     │   │
│  ─────────────────────────────────  │  └─────────────────────────────────┘   │
│  📊 Summary: 3 nodes, 8 sensors    │                                        │
│                                    │  [View Details] [Telemetry] [Configure] │
└────────────────────────────────────┴────────────────────────────────────────┘
```

---

## Tree Structure

### Hierarchy
```
Project
└── Node
    └── Sensor
        └── Channel (Metric)
```

### Node Item
```typescript
interface TreeNode {
  id: string;
  type: 'project' | 'node' | 'sensor' | 'channel';
  label: string;
  icon: string;
  status?: 'online' | 'offline' | 'warning';
  children?: TreeNode[];
  data: any;  // Original entity data
}
```

---

## Component Structure

```typescript
// assets-tab.component.ts
@Component({
  selector: 'app-assets-tab',
  templateUrl: './assets-tab.component.html'
})
export class AssetsTabComponent implements OnInit {
  @Input() projectId: string;
  
  treeData: TreeNode[] = [];
  selectedNode: TreeNode | null = null;
  
  // Filters
  searchQuery: string = '';
  statusFilter: string = 'all';
  typeFilter: string = 'all';
  
  // Loading
  loading: boolean = false;
  loadingDetail: boolean = false;
  
  ngOnInit() {
    this.loadAssetTree();
  }
  
  async loadAssetTree() {
    this.loading = true;
    const nodes = await this.nodesService.getByProject(this.projectId);
    this.treeData = this.buildTree(nodes);
    this.loading = false;
  }
  
  buildTree(nodes: NodeDto[]): TreeNode[] {
    return nodes.map(node => ({
      id: node.idNode,
      type: 'node',
      label: node.code,
      icon: 'fa-server',
      status: node.connectivityStatus === 'online' ? 'online' : 'offline',
      children: node.sensors?.map(sensor => ({
        id: sensor.idSensor,
        type: 'sensor',
        label: sensor.label,
        icon: 'fa-microchip',
        status: sensor.status === 'active' ? 'online' : 'offline',
        children: sensor.channels?.map(ch => ({
          id: ch.idChannel,
          type: 'channel',
          label: ch.metricCode,
          icon: 'fa-chart-line',
          data: ch
        })),
        data: sensor
      })),
      data: node
    }));
  }
  
  onNodeSelect(node: TreeNode) {
    this.selectedNode = node;
    this.loadNodeDetail(node);
  }
  
  onSearch() {
    // Filter tree based on searchQuery
  }
}
```

---

## Detail Panel

Shows different content based on selected item type:

### Node Selected
```html
<div *ngIf="selectedNode.type === 'node'">
  <h5>{{ selectedNode.data.code }}</h5>
  <div class="detail-row">
    <span class="label">Status:</span>
    <span class="badge" [class]="getStatusClass()">{{ selectedNode.data.connectivityStatus }}</span>
  </div>
  <div class="detail-row">
    <span class="label">Model:</span>
    <span>{{ selectedNode.data.nodeModel?.modelName }}</span>
  </div>
  <!-- Latest telemetry values table -->
  <table class="table table-sm">...</table>
  
  <div class="actions">
    <button routerLink="/iot/nodes/{{ selectedNode.id }}">View Details</button>
    <button>View Telemetry</button>
    <button>Send Command</button>
  </div>
</div>
```

### Sensor Selected
```html
<div *ngIf="selectedNode.type === 'sensor'">
  <h5>{{ selectedNode.data.label }}</h5>
  <!-- Sensor details -->
  <!-- Channel list with values -->
  <!-- Sparkline chart -->
</div>
```

### Channel Selected
```html
<div *ngIf="selectedNode.type === 'channel'">
  <h5>{{ selectedNode.data.metricCode }}</h5>
  <!-- Mini chart with recent values -->
  <!-- Threshold info -->
  <!-- Quick link to telemetry -->
</div>
```

---

## Filters

### Status Filter
```typescript
statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'warning', label: 'Warning' }
];
```

### Type Filter
```typescript
typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'node', label: 'Nodes Only' },
  { value: 'sensor', label: 'Sensors Only' }
];
```

### Search
Search across:
- Node code, serial number
- Sensor label, sensor code
- Channel metric code

---

## Actions

### Node Actions
| Action | Description |
|--------|-------------|
| View Details | Navigate to `/iot/nodes/:id` |
| View Telemetry | Navigate to telemetry with node filter |
| Send Command | Open command modal (restart, config) |
| Delete | Remove node (admin only) |

### Sensor Actions
| Action | Description |
|--------|-------------|
| View Details | Navigate to `/iot/sensors/:id` |
| Calibrate | Open calibration modal |
| Disable | Set sensor to inactive |

---

## API Endpoints

### Existing
```
GET /api/nodes?projectId=:projectId&include=sensors,channels
GET /api/nodes/:nodeId
GET /api/sensors/:sensorId
```

### Optimized (Optional)
```
GET /api/projects/:projectId/asset-tree
```
Returns pre-built tree structure for better performance.

---

## Tree Library Options

### Option 1: Native Angular (Recommended for Phase 1)
Custom recursive component:
```html
<ng-template #nodeTemplate let-node>
  <div class="tree-node" (click)="select(node)">
    <i [class]="node.icon"></i>
    {{ node.label }}
  </div>
  <div class="tree-children" *ngIf="node.expanded">
    <ng-container *ngFor="let child of node.children">
      <ng-container *ngTemplateOutlet="nodeTemplate; context: { $implicit: child }">
      </ng-container>
    </ng-container>
  </div>
</ng-template>
```

### Option 2: Angular Material Tree
```html
<mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
  <mat-tree-node *matTreeNodeDef="let node">
    {{ node.label }}
  </mat-tree-node>
</mat-tree>
```

### Option 3: PrimeNG Tree
More features, but adds dependency.

---

## Mobile Layout

On mobile, use full-width list view:
```
┌─────────────────────────────┐
│ [🔍 Search...]  [Filter ▼]  │
├─────────────────────────────┤
│ 🖥️ PDAM-NODE-001  ●  >     │
├─────────────────────────────┤
│ 🖥️ PDAM-NODE-002  ●  >     │
├─────────────────────────────┤
│ 🖥️ PDAM-NODE-003  ○  >     │
└─────────────────────────────┘
```
Tap opens detail page.

---

**Prev**: [04-MONITOR-TAB.md](04-MONITOR-TAB.md)  
**Next**: [06-MAP-TAB.md](06-MAP-TAB.md)

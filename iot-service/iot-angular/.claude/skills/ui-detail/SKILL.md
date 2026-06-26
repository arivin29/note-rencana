---
name: ui-detail
description: Standard detail/view page for the IoT Angular app — breadcrumb with Edit/Back actions, activeTab tab navigation, card/card-header/card-body info sections, related child collections, expandable list rows. Use when creating or editing any single-entity detail/view page.
---

# Standard Detail Page

Reference: `pages/iot/nodes/nodes-detail/`. Read `ui-coding-style` first.

## Component (TS)
```typescript
@Component({ selector: 'nodes-detail', templateUrl: './nodes-detail.html',
            styleUrls: ['./nodes-detail.scss'], standalone: false })
export class NodesDetailPage implements OnInit {
  nodeId: string | null = null;
  node: NodeDetailedResponseDto | null = null;
  loading = true; error: string | null = null;
  activeTab = 'overview';
  sensors: SensorResponseDto[] = []; sensorsLoading = false;
  expandedSensorId: string | null = null;

  constructor(private route: ActivatedRoute, private nodesService: NodesService,
              private sensorsService: SensorsService) {}

  ngOnInit() {
    this.route.paramMap.subscribe(p => { this.nodeId = p.get('nodeId'); if (this.nodeId) this.loadNodeDetail(); });
  }
  loadNodeDetail() {
    this.loading = true;
    this.nodesService.nodesControllerFindOneDetailed$Response({ id: this.nodeId! }).subscribe({
      next: (res) => { let b: any = res.body; if (typeof b === 'string') b = JSON.parse(b);
                       this.node = b as NodeDetailedResponseDto; this.loadSensors(); this.loading = false; },
      error: () => { this.error = 'Failed to load node details'; this.loading = false; }
    });
  }
  loadSensors() { /* child collection by parent id → this.sensors = body.data */ }
}
```
Use the `*Detailed` SDK endpoint when present (returns nested relations). A single entity comes back **directly** (no `{ data }` wrapper) per the contract.

## Template skeleton
```html
<!-- Header with Edit + Back -->
<div class="d-flex align-items-center mb-4" *ngIf="!loading">
  <div>
    <ul class="breadcrumb mb-1">
      <li class="breadcrumb-item"><a routerLink="/iot/nodes">Nodes</a></li>
      <li class="breadcrumb-item active">{{ node?.code }}</li>
    </ul>
    <h1 class="page-header mb-0">{{ node?.name || node?.code }}</h1>
  </div>
  <div class="ms-auto d-flex gap-2">
    <a [routerLink]="['/iot/nodes', node?.idNode, 'edit']" class="btn btn-outline-theme"><i class="fa fa-edit fa-fw me-1"></i> Edit</a>
    <a routerLink="/iot/nodes" class="btn btn-outline-default"><i class="fa fa-arrow-left fa-fw me-1"></i> Back</a>
  </div>
</div>

<!-- Tabs (plain activeTab string) -->
<ul class="nav nav-tabs nav-tabs-v2 mb-4">
  <li class="nav-item"><a href="javascript:;" class="nav-link" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'"><i class="fa fa-dashboard fa-fw me-2"></i> Overview</a></li>
  <li class="nav-item"><a href="javascript:;" class="nav-link" [class.active]="activeTab === 'sensors'" (click)="activeTab = 'sensors'"><i class="fa fa-thermometer fa-fw me-2"></i> Sensors ({{ sensors.length }})</a></li>
  <li class="nav-item"><a href="javascript:;" class="nav-link" [class.active]="activeTab === 'telemetry'" (click)="activeTab = 'telemetry'"><i class="fa fa-history fa-fw me-2"></i> Telemetry</a></li>
</ul>

<!-- Overview: info cards in a grid -->
<div *ngIf="activeTab === 'overview'">
  <div class="row g-3">
    <div class="col-lg-6">
      <card>
        <card-header class="border-bottom"><h5 class="mb-0"><i class="fa fa-info-circle fa-fw me-2"></i>General Information</h5></card-header>
        <card-body class="p-4">
          <div class="mb-3">
            <label class="text-muted text-uppercase small d-block">Name</label>
            <div class="fw-semibold">{{ node?.name }}</div>
          </div>
          <!-- repeat label + value pairs -->
        </card-body>
      </card>
    </div>
  </div>
</div>

<!-- Child collection tab with expandable rows -->
<div *ngIf="activeTab === 'sensors'">
  <card>
    <card-header class="border-bottom d-flex align-items-center">
      <h5 class="mb-0 flex-1">Sensors</h5>
      <button class="btn btn-sm btn-outline-theme" (click)="openAddSensorDrawer()"><i class="fa fa-plus fa-fw me-1"></i> Add Sensor</button>
    </card-header>
    <card-body>
      <div class="list-group list-group-flush">
        <button class="list-group-item list-group-item-action" *ngFor="let s of sensors"
                (click)="expandedSensorId = expandedSensorId === s.idSensor ? null : s.idSensor">
          <div class="d-flex align-items-center">
            <i class="fa fa-thermometer-half fa-fw me-3 text-theme"></i>
            <div class="flex-1"><div class="fw-semibold">{{ s.label }}</div><div class="text-muted small">{{ s.sensorType?.name }}</div></div>
            <i class="fa" [class.fa-chevron-down]="expandedSensorId !== s.idSensor" [class.fa-chevron-up]="expandedSensorId === s.idSensor"></i>
          </div>
          <div *ngIf="expandedSensorId === s.idSensor" class="mt-3 pt-3 border-top"><!-- detail grid --></div>
        </button>
      </div>
    </card-body>
  </card>
</div>
```

## Rules
- Header: breadcrumb (parent link + current code) + `h1.page-header`, with **Edit** (`btn-outline-theme`) and **Back** (`btn-outline-default`) top-right.
- Tabs = simple `activeTab` string toggled by `(click)`; tab labels carry counts.
- Sections = `<card><card-header><card-body>` with `label.text-muted.text-uppercase.small` + value pairs in a `row g-3`/`col-lg-6` grid.
- Load main entity from route `paramMap`, then load child collections by parent id (read `body.data`).
- Expandable child rows via `list-group-item-action` + an `expandedXId` toggle.
- Handle loading / error states.

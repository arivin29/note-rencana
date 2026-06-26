---
name: ui-form
description: Standard create/edit form for the IoT Angular app — template-driven [(ngModel)], flat form object matching the backend DTO, card sections, cascading dropdowns, dynamic nested arrays (sensors/channels), save handler. Use when building any add/edit/create form page.
---

# Standard Create/Edit Form

The app uses **template-driven forms** (`[(ngModel)]`), NOT reactive forms. Reference: `pages/iot/nodes/nodes-add/`. Read `ui-coding-style` first.

## Component (TS)
```typescript
interface NodeForm {           // flat object mirroring the backend Create DTO (camelCase)
  ownerId: string; projectId: string; nodeModelId: string; code: string;
  serialNumber: string; telemetryMode: 'push' | 'pull'; telemetryInterval: number;
  latitude: string; longitude: string; address: string;
}

@Component({ selector: 'nodes-add', templateUrl: './nodes-add.html',
            styleUrls: ['./nodes-add.scss'], standalone: false })
export class NodesAddPage implements OnInit {
  ownerOptions: OwnerOption[] = []; projectOptionsAll: ProjectOption[] = []; nodeModels: NodeModelOption[] = [];
  saving = false; error: string | null = null;

  form: NodeForm = { ownerId: '', projectId: '', nodeModelId: '', code: '', serialNumber: '',
                     telemetryMode: 'push', telemetryInterval: 120, latitude: '', longitude: '', address: '' };
  sensors: SensorDraft[] = [];   // dynamic nested arrays

  ngOnInit() { this.loadOwnerOptions(); this.loadProjectOptions(); this.loadNodeModels(); }

  // cascading dropdown: changing owner filters projects
  onOwnerChange(id: string) { this.form.ownerId = id;
    this.form.projectId = this.projectOptions[0]?.id || ''; }
  get projectOptions() { return this.projectOptionsAll.filter(p => p.ownerId === this.form.ownerId); }

  // dynamic rows
  addSensor() { this.sensors.push({ catalogId: '', label: '', channels: [] }); }
  removeSensor(i: number) { this.sensors.splice(i, 1); }
  addSensorChannel(i: number) { this.sensors[i].channels.push({ metricCode: '', unit: '', register: '' }); }

  saveNode() {
    this.saving = true;
    const body = { ...this.form, sensors: this.sensors };   // shape to the Create DTO
    this.nodesService.nodesControllerCreate$Response({ body }).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/iot/nodes']); },
      error: (err) => { this.error = err?.error?.message || 'Save failed'; this.saving = false; }
    });
  }
}
```
For **edit**: load the entity (direct object, no wrapper), copy fields into `this.form`, and call `…Update$Response({ id, body })`.

## Template skeleton
```html
<div class="d-flex align-items-center mb-3">
  <div>
    <ul class="breadcrumb mb-1">
      <li class="breadcrumb-item"><a routerLink="/iot/nodes">Nodes</a></li>
      <li class="breadcrumb-item active">Deploy Node</li>
    </ul>
    <h1 class="page-header mb-0">Deploy New Node</h1>
  </div>
  <div class="ms-auto">
    <a routerLink="/iot/nodes" class="btn btn-outline-default me-2"><i class="fa fa-arrow-left fa-fw me-1"></i> Back</a>
    <button class="btn btn-theme" [disabled]="saving" (click)="saveNode()"><i class="fa fa-save fa-fw me-1"></i> Save Node</button>
  </div>
</div>

<div class="row">
  <div class="col-xl-9">
    <!-- one card per logical section -->
    <card class="border-0 shadow-sm mb-4">
      <card-header class="border-0 bg-transparent"><h5 class="mb-0">Ownership</h5></card-header>
      <card-body class="p-4 border-top">
        <div class="row g-3">
          <div class="col-lg-6">
            <label class="form-label">Owner *</label>
            <select class="form-select" [(ngModel)]="form.ownerId" (ngModelChange)="onOwnerChange($event)">
              <option value="">-- Select Owner --</option>
              <option *ngFor="let o of ownerOptions" [value]="o.id">{{ o.name }}</option>
            </select>
          </div>
          <div class="col-lg-6">
            <label class="form-label">Project *</label>
            <select class="form-select" [(ngModel)]="form.projectId">
              <option value="">-- Select Project --</option>
              <option *ngFor="let p of projectOptions" [value]="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
      </card-body>
    </card>

    <!-- dynamic nested array section -->
    <card class="border-0 shadow-sm mb-4">
      <card-header class="border-0 bg-transparent d-flex align-items-center">
        <h5 class="mb-0 flex-1">Sensors</h5>
        <button type="button" class="btn btn-sm btn-outline-theme" (click)="addSensor()"><i class="fa fa-plus fa-fw me-1"></i> Add Sensor</button>
      </card-header>
      <card-body class="p-4 border-top">
        <div *ngFor="let s of sensors; let i = index" class="sensor-block mb-4 pb-4 border-bottom">
          <div class="d-flex align-items-center mb-3">
            <h6 class="mb-0">Sensor {{ i + 1 }}</h6>
            <button type="button" class="btn btn-sm btn-link text-danger ms-auto" (click)="removeSensor(i)"><i class="fa fa-trash fa-fw me-1"></i> Remove</button>
          </div>
          <div class="row g-3">
            <div class="col-lg-6"><label class="form-label">Label</label><input type="text" class="form-control" [(ngModel)]="s.label"></div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary mt-3" (click)="addSensorChannel(i)"><i class="fa fa-plus fa-fw me-1"></i> Add Channel</button>
        </div>
      </card-body>
    </card>
  </div>
  <div class="col-xl-3"><!-- optional sticky quick-ref / summary cards --></div>
</div>
```

## Rules
- Template-driven only: `[(ngModel)]` bound to a **flat `form` object** whose field names match the backend Create/Update DTO (camelCase). No `FormGroup`/reactive forms.
- Header carries **Back** (`btn-outline-default`) + **Save** (`btn-theme`, disabled while `saving`).
- Group fields into `<card>` sections (`card-header` title + `card-body.p-4.border-top`); use `row g-3` + `col-lg-6`; mark required labels with `*`.
- Cascading selects via `(ngModelChange)` + a filtered getter.
- Dynamic repeats via array + `add/remove` methods (`*ngFor … let i = index`).
- On submit call the SDK `…Create$Response({ body })` / `…Update$Response({ id, body })`; on success navigate back, on error surface `err.error.message`.

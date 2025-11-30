# Telemetry Cascading Filters Implementation

## 📋 Overview
Implemented **hierarchical cascading filter dropdowns** in telemetry page untuk memudahkan user melakukan filtering data sensor secara bertingkat dari owner hingga channel level.

## 🎯 Filter Hierarchy
```
Owner → Project → Node → Sensor → Channel
```

### Filter Flow:
1. **Owner** (Building icon) - Select owner untuk load projects
2. **Project** (Folder icon) - Auto-load setelah owner dipilih
3. **Node** (Server icon) - Auto-load setelah project dipilih
4. **Sensor** (Microchip icon) - Auto-load setelah node dipilih
5. **Channel** (Signal icon) - Auto-load setelah sensor dipilih

## 🔧 Technical Implementation

### Frontend Changes

#### 1. **telemetry-list.ts** - Component Logic
```typescript
// New interfaces
interface FilterOption {
  id: string;
  label: string;
}

// Cascading filter options
ownerOptions: FilterOption[] = [];
projectOptions: FilterOption[] = [];
nodeOptions: FilterOption[] = [];
sensorOptions: FilterOption[] = [];
channelOptions: FilterOption[] = [];

// Selected filter IDs
selectedOwnerId: string = '';
selectedProjectId: string = '';
selectedNodeId: string = '';
selectedSensorId: string = '';
selectedChannelId: string = '';

// URL filter params (for display)
ownerIdFilter: string | null = null;
projectIdFilter: string | null = null;
nodeIdFilter: string | null = null;
sensorIdFilter: string | null = null;
sensorChannelIdFilter: string | null = null;
```

#### 2. **Load Methods** - Cascading Data Loading
```typescript
loadOwners() {
  this.ownersService.ownersControllerFindAll$Response({ page: 1, limit: 1000 })
    .subscribe(response => {
      const owners = response.body.data || [];
      this.ownerOptions = owners.map(o => ({ id: o.idOwner, label: o.name }));
    });
}

loadProjects(ownerId: string) {
  this.projectsService.projectsControllerFindAll$Response({ 
    page: 1, limit: 1000, idOwner: ownerId 
  }).subscribe(response => {
    const projects = response.body.data || [];
    this.projectOptions = projects.map(p => ({ id: p.idProject, label: p.name }));
  });
}

loadNodes(projectId: string) {
  this.nodesService.nodesControllerFindAll$Response({ 
    page: 1, limit: 1000, idProject: projectId 
  }).subscribe(response => {
    const nodes = response.body.data || [];
    this.nodeOptions = nodes.map(n => ({ id: n.idNode, label: n.name || n.serialNumber }));
  });
}

loadSensors(nodeId: string) {
  this.sensorsService.sensorsControllerFindAll$Response({ 
    page: 1, limit: 1000, idNode: nodeId 
  }).subscribe(response => {
    const sensors = response.body.data || [];
    this.sensorOptions = sensors.map(s => ({ id: s.idSensor, label: s.label || s.sensorCode }));
  });
}

loadChannels(sensorId: string) {
  this.sensorChannelsService.sensorChannelsControllerFindAll$Response({ 
    page: 1, limit: 1000, idSensor: sensorId 
  }).subscribe(response => {
    const channels = response.body.data || [];
    this.channelOptions = channels.map(c => ({ id: c.idSensorChannel, label: c.label }));
  });
}
```

#### 3. **Change Handlers** - Cascading Reset Logic
```typescript
onOwnerChange(ownerId: string) {
  this.selectedOwnerId = ownerId;
  // Reset child filters
  this.selectedProjectId = '';
  this.selectedNodeId = '';
  this.selectedSensorId = '';
  this.selectedChannelId = '';
  
  // Clear child options
  this.projectOptions = [];
  this.nodeOptions = [];
  this.sensorOptions = [];
  this.channelOptions = [];
  
  if (ownerId) {
    this.loadProjects(ownerId);
  }
  this.applyFilters();
}

// Similar pattern for onProjectChange, onNodeChange, onSensorChange, onChannelChange
```

#### 4. **Apply Filters** - Update URL Query Params
```typescript
applyFilters() {
  const queryParams: any = {};
  
  if (this.selectedOwnerId) queryParams.idOwner = this.selectedOwnerId;
  if (this.selectedProjectId) queryParams.idProject = this.selectedProjectId;
  if (this.selectedNodeId) queryParams.idNode = this.selectedNodeId;
  if (this.selectedSensorId) queryParams.idSensor = this.selectedSensorId;
  if (this.selectedChannelId) queryParams.idSensorChannel = this.selectedChannelId;
  
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams,
    queryParamsHandling: 'merge'
  });
}

clearAllFilters() {
  this.selectedOwnerId = '';
  this.selectedProjectId = '';
  this.selectedNodeId = '';
  this.selectedSensorId = '';
  this.selectedChannelId = '';
  
  this.projectOptions = [];
  this.nodeOptions = [];
  this.sensorOptions = [];
  this.channelOptions = [];
  
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: {}
  });
}
```

#### 5. **telemetry-list.html** - Cascading Dropdowns UI
```html
<div class="row g-3 mb-4">
  <!-- Owner Filter -->
  <div class="col-lg-2 col-md-6">
    <label class="text-muted text-uppercase small d-block mb-1">
      <i class="fa fa-building me-1"></i>Owner
    </label>
    <select class="form-select form-select-sm" 
            [(ngModel)]="selectedOwnerId" 
            (change)="onOwnerChange(selectedOwnerId)">
      <option value="">All Owners</option>
      <option *ngFor="let opt of ownerOptions" [value]="opt.id">{{ opt.label }}</option>
    </select>
  </div>
  
  <!-- Project Filter -->
  <div class="col-lg-2 col-md-6">
    <label class="text-muted text-uppercase small d-block mb-1">
      <i class="fa fa-folder me-1"></i>Project
    </label>
    <select class="form-select form-select-sm" 
            [(ngModel)]="selectedProjectId" 
            (change)="onProjectChange(selectedProjectId)"
            [disabled]="!selectedOwnerId || projectOptions.length === 0">
      <option value="">All Projects</option>
      <option *ngFor="let opt of projectOptions" [value]="opt.id">{{ opt.label }}</option>
    </select>
  </div>
  
  <!-- Node Filter -->
  <div class="col-lg-2 col-md-6">
    <label class="text-muted text-uppercase small d-block mb-1">
      <i class="fa fa-server me-1"></i>Node
    </label>
    <select class="form-select form-select-sm" 
            [(ngModel)]="selectedNodeId" 
            (change)="onNodeChange(selectedNodeId)"
            [disabled]="!selectedProjectId || nodeOptions.length === 0">
      <option value="">All Nodes</option>
      <option *ngFor="let opt of nodeOptions" [value]="opt.id">{{ opt.label }}</option>
    </select>
  </div>
  
  <!-- Sensor Filter -->
  <div class="col-lg-2 col-md-6">
    <label class="text-muted text-uppercase small d-block mb-1">
      <i class="fa fa-microchip me-1"></i>Sensor
    </label>
    <select class="form-select form-select-sm" 
            [(ngModel)]="selectedSensorId" 
            (change)="onSensorChange(selectedSensorId)"
            [disabled]="!selectedNodeId || sensorOptions.length === 0">
      <option value="">All Sensors</option>
      <option *ngFor="let opt of sensorOptions" [value]="opt.id">{{ opt.label }}</option>
    </select>
  </div>
  
  <!-- Channel Filter -->
  <div class="col-lg-2 col-md-6">
    <label class="text-muted text-uppercase small d-block mb-1">
      <i class="fa fa-signal me-1"></i>Channel
    </label>
    <select class="form-select form-select-sm" 
            [(ngModel)]="selectedChannelId" 
            (change)="onChannelChange(selectedChannelId)"
            [disabled]="!selectedSensorId || channelOptions.length === 0">
      <option value="">All Channels</option>
      <option *ngFor="let opt of channelOptions" [value]="opt.id">{{ opt.label }}</option>
    </select>
  </div>
  
  <!-- Search -->
  <div class="col-lg-2 col-md-12">
    <label class="text-muted text-uppercase small d-block mb-1">Search</label>
    <div class="input-group input-group-sm">
      <span class="input-group-text bg-transparent border-end-0 text-muted">
        <i class="fa fa-search"></i>
      </span>
      <input type="text" class="form-control form-control-sm border-start-0 ps-0"
             placeholder="Search keyword..."
             [(ngModel)]="searchTerm">
    </div>
  </div>
</div>
```

#### 6. **Active Filters Card** - Visual Feedback
```html
<div class="col-lg-4 col-md-6" *ngIf="ownerIdFilter || projectIdFilter || nodeIdFilter || sensorIdFilter || sensorChannelIdFilter">
  <div class="border rounded-3 p-3 bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
    <div class="d-flex align-items-center justify-content-between mb-2">
      <div class="text-primary text-uppercase small fw-semibold">
        <i class="fa fa-filter me-1"></i>Active Filters
      </div>
      <button (click)="clearAllFilters()" class="btn btn-outline-primary btn-sm py-0 px-2">
        Clear
      </button>
    </div>
    <div class="d-flex flex-column gap-1">
      <div *ngIf="ownerIdFilter" class="small">
        <i class="fa fa-building text-primary me-1"></i>
        <span class="text-muted">Owner:</span> 
        <span class="fw-semibold">{{ ownerIdFilter }}</span>
      </div>
      <div *ngIf="projectIdFilter" class="small">
        <i class="fa fa-folder text-info me-1"></i>
        <span class="text-muted">Project:</span> 
        <span class="fw-semibold">{{ projectIdFilter }}</span>
      </div>
      <div *ngIf="nodeIdFilter" class="small">
        <i class="fa fa-server text-success me-1"></i>
        <span class="text-muted">Node:</span> 
        <span class="fw-semibold">{{ nodeIdFilter }}</span>
      </div>
      <div *ngIf="sensorIdFilter" class="small">
        <i class="fa fa-microchip text-warning me-1"></i>
        <span class="text-muted">Sensor:</span> 
        <span class="fw-semibold">{{ sensorIdFilter }}</span>
      </div>
      <div *ngIf="sensorChannelIdFilter" class="small">
        <i class="fa fa-signal text-theme me-1"></i>
        <span class="text-muted">Channel:</span> 
        <span class="fw-semibold">{{ sensorChannelIdFilter }}</span>
      </div>
    </div>
  </div>
</div>
```

#### 7. **Header Badges** - Quick Visual Indicators
```html
<h1 class="page-header mb-0">
  Telemetry Aggregates
  <span *ngIf="ownerIdFilter" class="badge bg-primary ms-2">
    <i class="fa fa-filter me-1"></i>Owner Filter
  </span>
  <span *ngIf="projectIdFilter" class="badge bg-info ms-2">
    <i class="fa fa-filter me-1"></i>Project Filter
  </span>
  <span *ngIf="nodeIdFilter" class="badge bg-success ms-2">
    <i class="fa fa-filter me-1"></i>Node Filter
  </span>
  <span *ngIf="sensorIdFilter" class="badge bg-warning ms-2">
    <i class="fa fa-filter me-1"></i>Sensor Filter
  </span>
  <span *ngIf="sensorChannelIdFilter" class="badge bg-theme ms-2">
    <i class="fa fa-filter me-1"></i>Channel Filter
  </span>
</h1>
```

#### 8. **Filter Scope Indicator**
```html
<div class="col-md-4">
  <div class="text-muted text-uppercase small">Active Filter Scope</div>
  <div class="fw-semibold" *ngIf="!ownerIdFilter && !projectIdFilter && !nodeIdFilter && !sensorIdFilter && !sensorChannelIdFilter">
    All Data (No Filters)
  </div>
  <div class="fw-semibold" *ngIf="sensorChannelIdFilter">
    <i class="fa fa-signal me-1"></i>Single Channel
  </div>
  <div class="fw-semibold" *ngIf="!sensorChannelIdFilter && sensorIdFilter">
    <i class="fa fa-microchip me-1"></i>All Channels in Sensor
  </div>
  <div class="fw-semibold" *ngIf="!sensorIdFilter && nodeIdFilter">
    <i class="fa fa-server me-1"></i>All Sensors in Node
  </div>
  <div class="fw-semibold" *ngIf="!nodeIdFilter && projectIdFilter">
    <i class="fa fa-folder me-1"></i>All Nodes in Project
  </div>
  <div class="fw-semibold" *ngIf="!projectIdFilter && ownerIdFilter">
    <i class="fa fa-building me-1"></i>All Projects in Owner
  </div>
</div>
```

#### 9. **Node Detail Integration** - Pass idNode
```html
<a [routerLink]="['/iot/telemetry']"
   [queryParams]="{
       idOwner: nodeMeta.ownerId,
       idProject: nodeMeta.projectId,
       idNode: nodeUuid,
       idSensor: sensor.id,
       idSensorChannel: channel.id
   }"
   target="_blank">
    <i class="fa fa-chart-area fa-fw me-2"></i>
    View Telemetry
    <i class="fa fa-external-link-alt fa-xs ms-1"></i>
</a>
```

## 📊 Services Used

### Injected Services:
```typescript
constructor(
  private sensorLogsService: SensorLogsService,
  private route: ActivatedRoute,
  private router: Router,
  private ownersService: OwnersService,
  private projectsService: ProjectsService,
  private nodesService: NodesService,
  private sensorsService: SensorsService,
  private sensorChannelsService: SensorChannelsService
) {}
```

### SDK Methods:
- `ownersService.ownersControllerFindAll$Response()`
- `projectsService.projectsControllerFindAll$Response({ idOwner })`
- `nodesService.nodesControllerFindAll$Response({ idProject })`
- `sensorsService.sensorsControllerFindAll$Response({ idNode })`
- `sensorChannelsService.sensorChannelsControllerFindAll$Response({ idSensor })`

## 🎨 UI/UX Features

### 1. **Disabled States**
- Dropdown otomatis disabled jika parent filter belum dipilih
- Disabled jika tidak ada options tersedia

### 2. **Visual Indicators**
- Icon untuk setiap level filter (building, folder, server, microchip, signal)
- Color-coded badges (primary, info, success, warning, theme)
- Active filter card dengan border dan background biru

### 3. **Clear Functionality**
- "Clear All Filters" button di header (muncul jika ada filter aktif)
- "Clear" button di Active Filters card
- Kedua button memanggil `clearAllFilters()` method

### 4. **URL Sync**
- Semua filter tersimpan di URL query parameters
- Deep linking support - user bisa bookmark filtered page
- Browser back/forward button support

## 🔄 User Flow Examples

### Example 1: Manual Filter Selection
```
1. User buka telemetry page → Semua data muncul
2. User pilih "PDAM Surabaya" di Owner dropdown
3. Project dropdown auto-load projects dari PDAM Surabaya
4. User pilih "Project A"
5. Node dropdown auto-load nodes dari Project A
6. User pilih "Node-001"
7. Sensor dropdown auto-load sensors dari Node-001
8. User pilih "Sensor Flow"
9. Channel dropdown auto-load channels dari Sensor Flow
10. User pilih "Channel-01-Flow-Rate"
11. Table menampilkan HANYA data dari Channel-01-Flow-Rate
12. URL: /iot/telemetry?idOwner=xxx&idProject=yyy&idNode=zzz&idSensor=aaa&idSensorChannel=bbb
```

### Example 2: Direct Link from Node Detail
```
1. User di node detail page
2. User klik dropdown action di channel row
3. User klik "View Telemetry ↗"
4. Buka new tab dengan URL sudah terisi 5 filter params
5. Telemetry page langsung menampilkan data channel tersebut
6. Dropdown filters sudah terpilih sesuai context
7. Active Filters card menunjukkan "Single Channel" scope
```

### Example 3: Clear Filters
```
1. User sedang filter ke specific channel
2. User klik "Clear All Filters" button
3. Semua dropdown reset ke "All ..."
4. URL berubah ke /iot/telemetry tanpa query params
5. Table menampilkan semua data telemetry
```

## 🚀 Performance Considerations

### 1. **Lazy Loading**
- Data hanya load saat dropdown parent dipilih
- Tidak load semua data upfront

### 2. **Limit 1000 Records**
- Semua findAll calls menggunakan `limit: 1000`
- Cukup untuk dropdown options
- Tidak membebani network/memory

### 3. **Conditional Rendering**
- Active Filters card hanya muncul jika ada filter aktif
- Badges hanya render jika filter aktif

## ✅ Testing Checklist

- [ ] Owner dropdown load semua owners
- [ ] Select owner → project dropdown enabled dan terisi
- [ ] Select project → node dropdown enabled dan terisi
- [ ] Select node → sensor dropdown enabled dan terisi
- [ ] Select sensor → channel dropdown enabled dan terisi
- [ ] Change owner → reset project/node/sensor/channel
- [ ] Change project → reset node/sensor/channel
- [ ] URL query params update saat filter change
- [ ] Reload page dengan URL params → dropdowns terpilih sesuai params
- [ ] Clear All Filters → reset semua dropdowns dan URL
- [ ] Node detail "View Telemetry" → open telemetry dengan filter pre-populated
- [ ] Active Filters card muncul saat ada filter
- [ ] Header badges muncul sesuai filter aktif
- [ ] Filter Scope indicator menunjukkan level filter yang benar
- [ ] Backend API call include semua filter params (idOwner, idProject, idNode, idSensor, idSensorChannel)

## 📝 Notes

### Known Limitations:
1. **Backend Support**: Backend sensor-logs endpoint mungkin belum support semua filter params (idOwner, idNode). Perlu enhancement di backend untuk full filtering support.

2. **Performance**: Jika ada ribuan records di dropdown, consider adding search/autocomplete feature.

3. **Caching**: Consider caching dropdown options untuk menghindari repeated API calls.

### Future Enhancements:
- [ ] Add search/autocomplete untuk dropdown dengan banyak options
- [ ] Cache dropdown options di localStorage/sessionStorage
- [ ] Add "Recently Used" filters feature
- [ ] Add filter preset/saved filters feature
- [ ] Show loading state di dropdown saat fetching data
- [ ] Add error handling dan retry mechanism

## 🔗 Related Files

### Frontend:
- `/iot-angular/src/app/pages/iot/telemetry/telemetry-list/telemetry-list.ts`
- `/iot-angular/src/app/pages/iot/telemetry/telemetry-list/telemetry-list.html`
- `/iot-angular/src/app/pages/iot/nodes/nodes-detail/nodes-detail.html`

### SDK Services:
- `/iot-angular/src/sdk/core/services/owners.service.ts`
- `/iot-angular/src/sdk/core/services/projects.service.ts`
- `/iot-angular/src/sdk/core/services/nodes.service.ts`
- `/iot-angular/src/sdk/core/services/sensors.service.ts`
- `/iot-angular/src/sdk/core/services/sensor-channels.service.ts`

### Backend (Future Enhancement):
- `/iot-backend/src/modules/sensor-logs/sensor-logs.service.ts` - Need to support all filter params

---

**Status**: ✅ Implementation Complete  
**Date**: 2025-01-23  
**Version**: 1.0.0

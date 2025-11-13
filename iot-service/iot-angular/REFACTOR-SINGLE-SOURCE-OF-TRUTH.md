# Refactor: Single Source of Truth Pattern ✅

## Problem Before
- Edit form menerima data dari parent component (`initialValue`)
- Data bisa stale/outdated jika ada perubahan di backend
- Dependency chain: Backend → Parent → Child
- Risk: UI menampilkan data lama jika parent belum reload

## Solution: Direct Backend Fetch
- **Add mode**: Form kosong
- **Edit mode**: Fetch langsung dari backend menggunakan `channelId`
- **No dependency** dari parent component
- **Always fresh data** dari server

---

## Architecture Changes

### Before (Stale Data Risk)
```
Backend
  ↓
Parent Component (nodes-detail / sensor-chanel-detail)
  ↓ [initialValue]
Drawer Component
  ↓
Form Display (might be outdated)
```

### After (Single Source of Truth)
```
Backend ←──────────────┐
  ↓                    │
Parent Component       │
  ↓ [channelId only]   │
Drawer Component ──────┘ (fetch fresh data)
  ↓
Form Display (always latest)
```

---

## Implementation Details

### 1. **Backend Enhancement**
**File**: `iot-backend/src/modules/sensor-channels/sensor-channels.service.ts`

Added `idSensorType` dan `precision` ke response `getReadings()`:
```typescript
const channelInfo = {
  idSensorChannel: channel.idSensorChannel,
  metricCode: channel.metricCode,
  unit: channel.unit,
  minThreshold: channel.minThreshold,
  maxThreshold: channel.maxThreshold,
  precision: channel.precision,        // ✅ Added
  idSensorType: channel.idSensorType,  // ✅ Added
  sensorCode: channel.sensor?.label,
  sensorType: channel.sensorType?.category,
  nodeCode: channel.sensor?.node?.code,
};
```

### 2. **Drawer Component Refactor**
**File**: `node-detail-add-channel-drawer.component.ts`

#### Removed
- ❌ `@Input() initialValue`
- ❌ Dependency pada parent data

#### Added
- ✅ `loadChannelData()` - fetch from backend
- ✅ `loadingChannel` state
- ✅ Auto-fetch saat drawer dibuka di edit mode

```typescript
ngOnChanges(changes: SimpleChanges): void {
  if (changes['isOpen']) {
    if (this.isOpen) {
      if (this.mode === 'edit' && this.channelId) {
        // ✅ Fetch fresh data from backend
        this.loadChannelData();
      } else {
        // Add mode: empty form
        this.formModel = this.createEmptyForm();
      }
    }
  }
}

loadChannelData() {
  if (!this.channelId) return;
  
  this.loadingChannel = true;
  this.sensorChannelsService.sensorChannelsControllerFindOne({ 
    id: this.channelId 
  }).subscribe({
    next: (response: any) => {
      const data = JSON.parse(response);
      
      // ✅ Populate form with fresh backend data
      this.formModel = {
        sensorId: data.idSensor || this.sensorId,
        channelId: data.metricCode || '',
        metricCode: data.metricCode || '',
        unit: data.unit || '',
        precision: data.precision ?? null,
        minThreshold: data.minThreshold ?? null,
        maxThreshold: data.maxThreshold ?? null,
        sensorTypeId: data.idSensorType || '' // ✅ Always fresh from DB
      };
      
      this.loadingChannel = false;
    },
    error: (err) => {
      console.error('Error loading channel data:', err);
      alert('Failed to load channel data');
      this.loadingChannel = false;
      this.close.emit();
    }
  });
}
```

### 3. **Parent Component Simplification**
**File**: `sensor-chanel-detail.ts`

#### Before
```typescript
openEditChannelDrawer() {
  this.channelDrawerMode = 'edit';
  // ❌ Manual data preparation
  this.channelFormValue = {
    sensorId: this.channelMeta.sensorId,
    channelId: this.channelMeta.channelId,
    metricCode: this.channelMeta.metricCode,
    unit: this.channelMeta.unit,
    precision: this.channelMeta.precision,
    minThreshold: this.channelMeta.minThreshold,
    maxThreshold: this.channelMeta.maxThreshold,
    sensorTypeId: this.channelMeta.sensorTypeId
  };
  this.isChannelDrawerOpen = true;
}

handleChannelSave(formValue: AddChannelFormValue) {
  // ❌ Manual state update
  this.channelMeta = {...this.channelMeta, ...formValue};
  this.sensorName = formValue.channelId;
  this.sensorUnit = formValue.unit;
  this.isChannelDrawerOpen = false;
  this.channelFormValue = null;
  this.loadChannelData();
}
```

#### After
```typescript
openEditChannelDrawer() {
  this.channelDrawerMode = 'edit';
  this.isChannelDrawerOpen = true;
  // ✅ That's it! Drawer will fetch data itself
}

handleChannelSave(formValue: AddChannelFormValue) {
  this.isChannelDrawerOpen = false;
  // ✅ Reload fresh data from backend
  this.loadChannelData();
}
```

### 4. **Template Update**
**File**: `sensor-chanel-detail.html`

#### Before
```html
<app-node-detail-add-channel-drawer
    [isOpen]="isChannelDrawerOpen"
    [sensorId]="channelMeta.sensorId"
    [channelId]="channelId"
    [sensorLabel]="channelMeta.channelId"
    [mode]="channelDrawerMode"
    [initialValue]="channelFormValue"  ❌ Removed
    (close)="handleChannelDrawerClose()"
    (save)="handleChannelSave($event)">
</app-node-detail-add-channel-drawer>
```

#### After
```html
<app-node-detail-add-channel-drawer
    [isOpen]="isChannelDrawerOpen"
    [sensorId]="channelMeta.sensorId"
    [channelId]="channelId"  ✅ Only pass ID
    [sensorLabel]="channelMeta.channelId"
    [mode]="channelDrawerMode"
    (close)="handleChannelDrawerClose()"
    (save)="handleChannelSave($event)">
</app-node-detail-add-channel-drawer>
```

---

## Data Flow

### Add Channel Flow
```
1. User clicks "Add Channel"
2. Parent: Set mode='add', isOpen=true
3. Drawer: Opens with empty form
4. Drawer: Load sensor types from backend
5. User: Fill form + submit
6. Drawer: POST /api/sensor-channels
7. Parent: Reload data from backend
```

### Edit Channel Flow
```
1. User clicks "Edit Channel"
2. Parent: Set mode='edit', channelId='xxx', isOpen=true
3. Drawer: Detects edit mode + channelId
4. Drawer: GET /api/sensor-channels/xxx ← ✅ Fresh data
5. Drawer: Load sensor types from backend
6. Drawer: Populate form with response data
7. User: Edit + submit
8. Drawer: PATCH /api/sensor-channels/xxx
9. Parent: Reload data from backend
```

---

## Benefits

### ✅ **Always Fresh Data**
- Edit form selalu tampilkan data terbaru dari database
- No stale data risk

### ✅ **Simplified Parent Component**
- No need to prepare `initialValue`
- No complex state management
- Only pass `channelId`

### ✅ **Single Source of Truth**
- Backend adalah satu-satunya source of truth
- UI reflect backend state accurately

### ✅ **Better Error Handling**
- If backend data missing → Show error + close drawer
- Clear failure path

### ✅ **Scalability**
- Easy to add more fields tanpa update parent
- Backend changes auto-reflected di UI

---

## API Endpoints Used

### Get Channel Detail (Edit Mode)
```http
GET /api/sensor-channels/:id
Response: {
  idSensorChannel: string,
  idSensor: string,
  idSensorType: string,    ← UUID for dropdown
  metricCode: string,
  unit: string,
  precision: number,
  minThreshold: number,
  maxThreshold: number,
  ...
}
```

### Get Sensor Types (Dropdown)
```http
GET /api/sensor-types?limit=100
Response: {
  data: [
    { idSensorType: "uuid", category: "current", defaultUnit: "ampere", ... }
  ]
}
```

### Update Channel
```http
PATCH /api/sensor-channels/:id
Body: {
  metricCode: string,
  unit: string,
  precision: number,
  minThreshold: number,
  maxThreshold: number,
  idSensorType: string
}
```

---

## Testing Checklist

### Edit Mode
- [x] Open edit drawer → Show loading spinner
- [x] Data loaded from backend (not from parent)
- [x] Sensor type dropdown pre-selected dengan value dari DB
- [x] Unit & precision pre-filled dari DB
- [x] Thresholds pre-filled dari DB
- [x] Submit → PATCH request → Success
- [x] After save → Parent reloads fresh data

### Add Mode
- [x] Open add drawer → Empty form
- [x] Sensor types loaded from backend
- [x] Select sensor type → Auto-fill unit & precision
- [x] Submit → POST request → Success
- [x] After save → Parent reloads fresh data

### Error Scenarios
- [x] Backend error → Show alert + close drawer
- [x] Invalid channelId → Show error
- [x] Network timeout → Proper error handling

---

## Files Changed

```
iot-backend/src/modules/sensor-channels/
├── sensor-channels.service.ts  ✏️ Added idSensorType + precision to response

iot-angular/src/app/pages/iot/nodes/nodes-detail/
├── node-detail-add-channel-drawer/
│   ├── node-detail-add-channel-drawer.component.ts   ✏️ Added loadChannelData()
│   └── node-detail-add-channel-drawer.component.html ✏️ Added loading state
└── sensor-chanel-detail/
    ├── sensor-chanel-detail.ts    ✏️ Simplified, removed initialValue
    └── sensor-chanel-detail.html  ✏️ Removed [initialValue] binding
```

---

## Migration Notes

### Breaking Changes
- ❌ `@Input() initialValue` removed from drawer component
- ✅ Now uses `@Input() channelId` + auto-fetch

### Migration Guide for Other Components
If you have similar components, follow this pattern:

1. **Remove** `initialValue` input
2. **Add** `id` input (UUID)
3. **Add** `loadData()` method that fetches from backend
4. **Call** `loadData()` in `ngOnChanges` when drawer opens
5. **Simplify** parent component - only pass ID

---

**Status**: ✅ **COMPLETE**  
**Date**: 2025-11-13  
**Pattern**: Single Source of Truth  
**Best Practice**: Always fetch from backend, never trust stale data

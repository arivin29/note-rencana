# Sensor Drawer Refactor - Single Source of Truth Pattern

## 📋 Overview

Refactored **Add/Edit Sensor Drawer** component to follow the **Single Source of Truth** pattern - always fetching fresh data from backend, eliminating dependency on parent component's stale data.

## ✅ What Changed

### **BEFORE (❌ Old Pattern)**

```typescript
// Parent component passes data to drawer
export class NodesDetailPage {
  sensorCatalogOptions: SensorCatalogOption[] = [
    { id: 'CAT-ROSEMOUNT-3051', label: 'Rosemount 3051 Pressure' }
  ];
  
  openAddSensorDrawer() {
    this.isAddSensorDrawerOpen = true;
  }
}

// Drawer component receives data via @Input
export class NodeDetailAddSensorDrawerComponent {
  @Input() catalogOptions: SensorCatalogOption[] = [];
  
  ngOnChanges(changes: SimpleChanges) {
    // Use stale data from parent
    this.formModel.sensorCatalogId = this.catalogOptions[0].id;
  }
}
```

**Problems:**
- Parent must maintain catalog data (hardcoded or fetched once)
- Drawer receives potentially stale data
- No way to refresh catalog list without reloading page
- Edit mode would require parent to pass sensor data
- Tight coupling between parent and child

---

### **AFTER (✅ New Pattern)**

```typescript
// Parent only passes IDs and state
export class NodesDetailPage {
  sensorDrawerState = {
    isOpen: false,
    sensorId: '' // Empty = add mode, UUID = edit mode
  };
  
  openAddSensorDrawer() {
    this.sensorDrawerState = { isOpen: true, sensorId: '' };
  }
  
  openEditSensorDrawer(sensor: SensorDetail) {
    this.sensorDrawerState = { isOpen: true, sensorId: sensor.id };
  }
}

// Drawer component fetches its own data
export class NodeDetailAddSensorDrawerComponent {
  @Input() nodeId = '';
  @Input() sensorId = ''; // Empty = add, UUID = edit
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.loadCatalogOptions(); // ✅ Fresh from backend
      
      if (this.sensorId) {
        this.loadSensorData(); // ✅ Fresh from backend
      }
    }
  }
}
```

**Benefits:**
- ✅ Always fresh data from backend
- ✅ Parent doesn't maintain catalog state
- ✅ Support for both add and edit modes
- ✅ Loose coupling (parent just passes IDs)
- ✅ Consistent with channel drawer pattern

---

## 🔄 Component Lifecycle

### **Add Mode Flow**

```
User clicks "Add Sensor"
    ↓
Parent sets: { isOpen: true, sensorId: '' }
    ↓
Drawer ngOnChanges triggered
    ↓
loadCatalogOptions() → GET /api/sensor-catalogs
    ↓
Form shows with empty fields + catalog dropdown
    ↓
User fills form and submits
    ↓
POST /api/sensors
    ↓
Emit save event → Parent reloads dashboard
    ↓
Close drawer
```

### **Edit Mode Flow**

```
User clicks "Edit" button on sensor
    ↓
Parent sets: { isOpen: true, sensorId: 'uuid-here' }
    ↓
Drawer ngOnChanges triggered
    ↓
loadCatalogOptions() → GET /api/sensor-catalogs
loadSensorData() → GET /api/sensors/:id
    ↓
Form shows pre-filled with backend data
    ↓
User modifies and submits
    ↓
PATCH /api/sensors/:id
    ↓
Emit save event → Parent reloads dashboard
    ↓
Close drawer
```

---

## 🎯 Key Features

### 1. **Dual Mode Support**
```typescript
// Drawer automatically detects mode
if (this.sensorId) {
  // Edit mode: load sensor data
  this.loadSensorData();
} else {
  // Add mode: empty form
  this.formModel = this.createEmptyForm();
}
```

### 2. **Smart API Calls**
```typescript
handleSubmit(formValid: boolean) {
  const dto = { /* prepare data */ };
  
  if (this.sensorId) {
    // Edit: PATCH
    this.sensorsService.sensorsControllerUpdate({ 
      id: this.sensorId, 
      body: dto 
    }).subscribe(/* ... */);
  } else {
    // Add: POST
    this.sensorsService.sensorsControllerCreate({ 
      body: dto 
    }).subscribe(/* ... */);
  }
}
```

### 3. **Loading States**
```typescript
loading = false;        // Loading catalog options
loadingSensor = false;  // Loading sensor data (edit mode)
saving = false;         // Submitting form
```

### 4. **Response Parsing**
```typescript
// Handles inconsistent backend responses (string JSON vs object)
private parseResponse(response: any): any {
  if (!response) return response;
  if (typeof response === 'object') return response;
  try {
    return JSON.parse(response);
  } catch (e) {
    console.warn('Failed to parse response:', e);
    return response;
  }
}
```

### 5. **Status Mapping**
```typescript
// Maps backend status values to form options
private mapStatus(status: string): SensorHealthOption {
  if (status === 'active' || status === 'online') return 'online';
  if (status === 'maintenance') return 'maintenance';
  return 'offline';
}
```

---

## 📄 Template Changes

### **Dynamic Title**
```html
<div class="text-muted text-uppercase small">
  {{ sensorId ? 'Edit Sensor' : 'New Sensor' }}
</div>
<h5 class="mb-0">
  {{ sensorId ? 'Edit Sensor Configuration' : 'Add Sensor To Node' }}
</h5>
```

### **Loading State**
```html
<div *ngIf="loading || loadingSensor" class="text-center py-5">
  <div class="spinner-border text-theme mb-3"></div>
  <div class="text-muted">
    {{ loadingSensor ? 'Loading sensor data...' : 'Loading catalog options...' }}
  </div>
</div>
```

### **Form Visibility**
```html
<form *ngIf="!loading && !loadingSensor" #addSensorForm="ngForm">
  <!-- Form fields -->
</form>
```

### **Dynamic Button**
```html
<button type="submit" [disabled]="addSensorForm.invalid || saving">
  <span *ngIf="!saving">
    {{ sensorId ? 'Update Sensor' : 'Save Sensor' }}
  </span>
  <span *ngIf="saving">
    <span class="spinner-border spinner-border-sm me-1"></span>
    Saving...
  </span>
</button>
```

### **Help Text**
```html
<div class="mb-3">
  <label>Sensor Code</label>
  <input name="sensorCode" [(ngModel)]="formModel.sensorCode" required
         placeholder="e.g., SENSOR-001">
  <div class="form-text">Unique identifier for this sensor</div>
</div>
```

---

## 🔌 Parent Component Integration

### **Template Binding**
```html
<app-node-detail-add-sensor-drawer 
    [isOpen]="sensorDrawerState.isOpen"
    [nodeId]="nodeUuid"
    [sensorId]="sensorDrawerState.sensorId"
    (close)="handleAddSensorDrawerClose()"
    (save)="handleAddSensorSave($event)">
</app-node-detail-add-sensor-drawer>
```

### **TypeScript Methods**
```typescript
openAddSensorDrawer() {
  this.sensorDrawerState = {
    isOpen: true,
    sensorId: '' // Add mode
  };
}

openEditSensorDrawer(sensor: SensorDetail) {
  this.sensorDrawerState = {
    isOpen: true,
    sensorId: sensor.id // Edit mode
  };
}

handleAddSensorSave(formValue: AddSensorFormValue) {
  this.handleAddSensorDrawerClose();
  this.loadNodeDashboard(); // ✅ Always Reload pattern
}
```

### **HTML Buttons**
```html
<!-- Add Button -->
<button type="button" class="btn btn-theme btn-sm" 
        (click)="openAddSensorDrawer()">
    <i class="fa fa-plus me-1"></i>
    Add Sensor
</button>

<!-- Edit Button (per sensor) -->
<button class="btn btn-outline-secondary btn-sm" 
        (click)="openEditSensorDrawer(sensor)">
    <i class="fa fa-pen me-1"></i>
    Edit
</button>
```

---

## 🧪 Testing Checklist

### **Add Mode**
- [ ] Click "Add Sensor" button
- [ ] Verify loading spinner appears
- [ ] Verify catalog dropdown populates from backend
- [ ] Verify all fields are empty
- [ ] Fill form and submit
- [ ] Verify POST /api/sensors called
- [ ] Verify dashboard reloads after save
- [ ] Verify new sensor appears in list

### **Edit Mode**
- [ ] Click "Edit" button on existing sensor
- [ ] Verify loading spinner appears
- [ ] Verify form pre-fills with sensor data
- [ ] Verify catalog dropdown shows correct selection
- [ ] Modify some fields
- [ ] Submit form
- [ ] Verify PATCH /api/sensors/:id called
- [ ] Verify dashboard reloads after save
- [ ] Verify changes reflected in list

### **Validation**
- [ ] Try submitting empty form (should be disabled)
- [ ] Try submitting with missing required fields
- [ ] Verify form validation messages appear
- [ ] Test cancel button (should close without saving)

### **Error Handling**
- [ ] Test with backend offline
- [ ] Verify error messages display
- [ ] Test with invalid sensor ID (edit mode)
- [ ] Test network timeout scenarios

---

## 📦 Backend API Requirements

### **Endpoints Used**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sensor-catalogs` | Load catalog dropdown options |
| GET | `/api/sensors/:id` | Load sensor data (edit mode) |
| POST | `/api/sensors` | Create new sensor |
| PATCH | `/api/sensors/:id` | Update existing sensor |

### **Expected DTO Structure**

```typescript
// Create/Update DTO
{
  idNode: string;           // Node UUID
  sensorCode: string;       // Unique code
  label: string;            // Display name
  idSensorCatalog: string;  // Catalog UUID
  location: string;         // Physical location
  status: string;           // 'active', 'maintenance', 'offline'
  protocolChannel: string;  // Communication channel
  samplingRate: number;     // Seconds between readings
}

// Response from GET /api/sensors/:id
{
  idSensor: string;
  sensorCode: string;
  label: string;
  idSensorCatalog: string;
  location: string;
  status: string;
  protocolChannel: string;
  samplingRate: number;
  // ... other fields
}

// Response from GET /api/sensor-catalogs
[
  {
    idSensorCatalog: string;
    catalogName: string;
    // ... other fields
  }
]
```

---

## 🎨 Consistency with Channel Drawer

This refactor brings sensor drawer in line with channel drawer pattern:

| Feature | Channel Drawer | Sensor Drawer |
|---------|----------------|---------------|
| **Single Source of Truth** | ✅ Yes | ✅ Yes (after refactor) |
| **Edit Mode** | ✅ Supported | ✅ Supported (new) |
| **Loading States** | ✅ Yes | ✅ Yes (new) |
| **Always Reload** | ✅ Yes | ✅ Yes |
| **Help Text** | ✅ Yes | ✅ Yes (new) |
| **Response Parsing** | ✅ Yes | ✅ Yes (new) |

---

## 🚀 Benefits Summary

1. **Data Integrity**: Always shows latest data from backend
2. **Reduced Coupling**: Parent doesn't manage sensor/catalog data
3. **Feature Parity**: Edit mode now works like channel drawer
4. **Better UX**: Loading states, help text, dynamic labels
5. **Maintainability**: Consistent pattern across all drawers
6. **Scalability**: Easy to add more fields or validations
7. **Testability**: Each component responsible for its own data

---

## 📝 Migration Notes

### **Breaking Changes**

- **Removed `@Input() catalogOptions`** - Drawer now loads from backend
- **Added `@Input() nodeId`** - Required for create sensor API
- **Added `@Input() sensorId`** - For edit mode support

### **Parent Component Changes Required**

```diff
// Remove hardcoded catalog options
- sensorCatalogOptions: SensorCatalogOption[] = [ /* ... */ ];

// Replace simple boolean with state object
- isAddSensorDrawerOpen = false;
+ sensorDrawerState = {
+   isOpen: false,
+   sensorId: ''
+ };

// Update template binding
<app-node-detail-add-sensor-drawer 
-   [isOpen]="isAddSensorDrawerOpen"
-   [catalogOptions]="sensorCatalogOptions"
+   [isOpen]="sensorDrawerState.isOpen"
+   [nodeId]="nodeUuid"
+   [sensorId]="sensorDrawerState.sensorId"
    (close)="handleAddSensorDrawerClose()"
    (save)="handleAddSensorSave($event)">
</app-node-detail-add-sensor-drawer>
```

---

## 🔗 Related Documentation

- [REFACTOR-SINGLE-SOURCE-OF-TRUTH.md](./REFACTOR-SINGLE-SOURCE-OF-TRUTH.md) - Architecture philosophy
- [CODING-STYLE-ALWAYS-RELOAD.md](./CODING-STYLE-ALWAYS-RELOAD.md) - Coding style guide
- [DELETE-PATTERN.md](./DELETE-PATTERN.md) - Delete functionality pattern

---

**Created**: November 13, 2025  
**Pattern**: Single Source of Truth + Always Reload  
**Status**: ✅ Complete

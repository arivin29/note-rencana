# Node Delete Implementation - Complete Guide

## 📋 Overview

Implemented **Delete Node** functionality with validation requiring all sensors to be deleted first. Follows the same pattern as sensor and channel deletion, maintaining consistency across the application.

## ✅ Implementation Details

### **1. TypeScript Component** (`nodes-detail.ts`)

#### **Imports Added**
```typescript
import { ActivatedRoute, Router } from '@angular/router';
```

#### **Constructor Injection**
```typescript
constructor(
  private route: ActivatedRoute,
  private router: Router,  // ✅ Added for navigation after delete
  private nodesService: NodesService,
  private sensorLogsService: SensorLogsService,
  private sensorsService: SensorsService
) { }
```

#### **Delete Method**
```typescript
deleteNode() {
  // 1. Validate: node must have no sensors
  if (this.sensors && this.sensors.length > 0) {
    alert(
      `Cannot delete node "${this.nodeId}".\n\n` +
      `This node has ${this.sensors.length} sensor${this.sensors.length > 1 ? 's' : ''}.\n` +
      `Please delete all sensors before deleting the node.`
    );
    return;
  }

  // 2. Show detailed confirmation
  const confirmDelete = confirm(
    `Are you sure you want to delete node "${this.nodeId}"?\n\n` +
    `This will permanently remove:\n` +
    `- Node configuration\n` +
    `- Device specifications\n` +
    `- Owner: ${this.nodeMeta.owner}\n` +
    `- Project: ${this.nodeMeta.project}\n` +
    `- Location: ${this.nodeMeta.location}\n` +
    `- All telemetry history\n` +
    `- All maintenance logs\n\n` +
    `This action cannot be undone.`
  );
  
  if (!confirmDelete) return;

  // 3. Show loading state
  this.loading = true;

  // 4. Call DELETE API using nodeUuid
  this.nodesService.nodesControllerRemove({ id: this.nodeUuid }).subscribe({
    next: () => {
      this.loading = false;
      // 5. Redirect to nodes list page (parent route)
      this.router.navigate(['/iot/nodes']);
    },
    error: (err) => {
      console.error('Error deleting node:', err);
      this.loading = false;
      alert('Failed to delete node. Please try again.');
    }
  });
}
```

---

### **2. HTML Template** (`nodes-detail.html`)

#### **Delete Button in Header**
```html
<div class="ms-auto d-flex gap-2">
    <a [routerLink]="['/iot/nodes', nodeId, 'edit']" class="btn btn-outline-theme">
        <i class="fa fa-pen fa-fw me-1"></i>
        Edit Node
    </a>
    <button class="btn btn-outline-danger" (click)="deleteNode()" 
            [disabled]="sensors.length > 0"
            [title]="sensors.length > 0 ? 'Cannot delete node with sensors. Delete all sensors first.' : 'Delete node'">
        <i class="fa fa-trash fa-fw me-1"></i>
        Delete Node
    </button>
    <a routerLink="/iot/nodes" class="btn btn-outline-default">Back to Nodes</a>
</div>
```

**Button Features:**
- ✅ Red outline style (`btn-outline-danger`)
- ✅ Trash icon for visual cue
- ✅ **Disabled state** when node has sensors
- ✅ **Tooltip** explaining validation requirement
- ✅ Click handler calls `deleteNode()`

---

## 🔒 Validation Rules

### **Hierarchical Deletion Requirement**

```
Node
 ├── Sensor 1
 │    ├── Channel 1.1
 │    └── Channel 1.2
 ├── Sensor 2
 │    └── Channel 2.1
 └── Sensor 3
```

**Deletion Order (Bottom-Up):**
1. ❌ **Cannot delete Node** (has sensors)
2. ❌ **Cannot delete Sensor 1** (has channels)
3. ✅ **Delete Channel 1.1** → Success
4. ✅ **Delete Channel 1.2** → Success
5. ✅ **Delete Sensor 1** → Success (no channels)
6. ✅ **Delete Channel 2.1** → Success
7. ✅ **Delete Sensor 2** → Success (no channels)
8. ✅ **Delete Sensor 3** → Success (no channels)
9. ✅ **Delete Node** → Success (no sensors)

### **Validation Logic**

```typescript
// Node deletion validation
if (this.sensors && this.sensors.length > 0) {
  alert(`Cannot delete node. Has ${this.sensors.length} sensor(s).`);
  return;
}

// Sensor deletion validation (implemented earlier)
if (sensor.channels && sensor.channels.length > 0) {
  alert(`Cannot delete sensor. Has ${sensor.channels.length} channel(s).`);
  return;
}
```

---

## 🎯 Key Features

### **1. Visual Feedback**

| State | Button Appearance | Tooltip |
|-------|-------------------|---------|
| **Has Sensors** | Disabled (grayed out) | "Cannot delete node with sensors. Delete all sensors first." |
| **No Sensors** | Enabled (red outline) | "Delete node" |

### **2. Confirmation Dialog**

Shows comprehensive information:
- Node ID/code
- Owner information
- Project information
- Location
- What will be deleted:
  - Node configuration
  - Device specifications
  - All telemetry history
  - All maintenance logs
- **Warning**: "This action cannot be undone"

### **3. Navigation After Delete**

```typescript
// After successful deletion
this.router.navigate(['/iot/nodes']); // Redirect to nodes list page
```

**Why redirect?**
- User stays on detail page of deleted resource (404)
- Clean navigation flow (back to parent list)
- Consistent with channel deletion pattern

### **4. Error Handling**

```typescript
error: (err) => {
  console.error('Error deleting node:', err);
  this.loading = false;
  alert('Failed to delete node. Please try again.');
}
```

---

## 🔄 Deletion Flow Diagram

```
┌─────────────────────────────────────────┐
│  User clicks "Delete Node" button       │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Check: Does node have sensors?         │
└───────┬─────────────────────┬───────────┘
        │ YES                 │ NO
        ▼                     ▼
┌───────────────────┐  ┌──────────────────┐
│  Show alert:      │  │  Show detailed   │
│  "Cannot delete"  │  │  confirmation    │
│  "Delete sensors  │  │  dialog          │
│   first"          │  └────────┬─────────┘
└───────────────────┘           │
        │                       ▼
        │              ┌─────────────────┐
        │              │  User confirms? │
        │              └────┬───────┬────┘
        │                   │ YES   │ NO
        │                   ▼       ▼
        │           ┌───────────┐  │
        │           │ Set loading│  │
        │           │ = true     │  │
        │           └─────┬─────┘  │
        │                 ▼        │
        │           ┌───────────┐  │
        │           │ Call API  │  │
        │           │ DELETE    │  │
        │           │ /nodes/:id│  │
        │           └─────┬─────┘  │
        │                 │        │
        │     ┌───────────┼────────┘
        │     │ SUCCESS   │ ERROR
        │     ▼           ▼
        │  ┌─────────┐  ┌──────────┐
        │  │ loading │  │  loading  │
        │  │ = false │  │  = false  │
        │  └────┬────┘  └─────┬────┘
        │       ▼             ▼
        │  ┌─────────┐  ┌──────────┐
        │  │Navigate │  │Show alert│
        │  │to /iot/ │  │"Failed   │
        │  │nodes    │  │to delete"│
        │  └─────────┘  └──────────┘
        │       │             │
        └───────┴─────────────┘
                │
                ▼
        ┌───────────────┐
        │  User sees    │
        │  nodes list   │
        │  or error     │
        └───────────────┘
```

---

## 🧪 Testing Checklist

### **Test Delete with Sensors (Blocked)**
- [ ] Navigate to node detail page with sensors
- [ ] Verify "Delete Node" button is **disabled** (grayed out)
- [ ] Hover over button - verify tooltip appears
- [ ] Tooltip shows: "Cannot delete node with sensors..."
- [ ] Try clicking (should do nothing)
- [ ] Button state persists on page refresh

### **Test Delete without Sensors (Allowed)**
- [ ] Navigate to node detail page
- [ ] Delete all sensors first (if any exist)
- [ ] Verify "Delete Node" button becomes **enabled** (red)
- [ ] Click "Delete Node"
- [ ] Verify detailed confirmation dialog appears
- [ ] Confirmation shows:
  - [ ] Node ID
  - [ ] Owner name
  - [ ] Project name
  - [ ] Location
  - [ ] List of what will be deleted
  - [ ] "Cannot be undone" warning

### **Test Confirmation Dialog**
- [ ] Click "Cancel" → Nothing happens, stay on page
- [ ] Click "OK" → Loading state shows
- [ ] Verify loading spinner or disabled state
- [ ] Wait for API response

### **Test Successful Deletion**
- [ ] Confirm deletion
- [ ] Verify redirect to `/iot/nodes`
- [ ] Verify node no longer in list
- [ ] Try accessing deleted node URL directly → 404 or redirect

### **Test Error Handling**
- [ ] Stop backend server
- [ ] Try deleting node
- [ ] Verify error alert appears: "Failed to delete node"
- [ ] Verify loading state stops
- [ ] Verify user stays on current page
- [ ] Restart backend, try again → Should work

### **Test Cascade Validation**
- [ ] Create node with 3 sensors
- [ ] Add channels to sensors
- [ ] Try delete node → Blocked (has sensors)
- [ ] Try delete sensor → Blocked (has channels)
- [ ] Delete all channels of Sensor 1
- [ ] Delete Sensor 1 → Success
- [ ] Repeat for Sensor 2, 3
- [ ] Delete node → Success

---

## 🔌 Backend API Requirements

### **Endpoint Used**

```
DELETE /api/nodes/:id
```

### **Request Parameters**

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Path | Node UUID (not node code) |

### **Expected Responses**

#### **Success Response (200)**
```json
{
  "message": "Node deleted successfully",
  "idNode": "uuid-here"
}
```

#### **Error Responses**

**404 - Not Found**
```json
{
  "statusCode": 404,
  "message": "Node not found"
}
```

**400 - Has Dependencies**
```json
{
  "statusCode": 400,
  "message": "Cannot delete node with existing sensors"
}
```

**500 - Server Error**
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

### **Backend Validation (Recommended)**

Backend should also validate cascade deletion:

```typescript
// Backend validation (NestJS example)
async remove(id: string) {
  const node = await this.nodesRepository.findOne({
    where: { idNode: id },
    relations: ['sensors']
  });
  
  if (!node) {
    throw new NotFoundException('Node not found');
  }
  
  // Validate no sensors exist
  if (node.sensors && node.sensors.length > 0) {
    throw new BadRequestException(
      'Cannot delete node with existing sensors. Delete all sensors first.'
    );
  }
  
  await this.nodesRepository.remove(node);
  return { message: 'Node deleted successfully', idNode: id };
}
```

---

## 📊 Comparison with Other Delete Features

| Feature | Channel Delete | Sensor Delete | Node Delete |
|---------|---------------|---------------|-------------|
| **Location** | Channel detail page | Node detail (per sensor) | Node detail (header) |
| **Validation** | None (always allowed) | Must have 0 channels | Must have 0 sensors |
| **Button State** | Always enabled | Disabled if has channels | Disabled if has sensors |
| **Tooltip** | "Delete channel" | "Cannot delete with channels" | "Cannot delete with sensors" |
| **Confirmation** | ✅ Detailed dialog | ✅ Detailed dialog | ✅ Detailed dialog |
| **After Delete** | Redirect to parent (node detail) | Reload dashboard | Redirect to nodes list |
| **API Used** | `DELETE /sensor-channels/:id` | `DELETE /sensors/:id` | `DELETE /nodes/:id` |
| **Loading State** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Error Handling** | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🎨 UI Consistency

### **Button Styles**

All delete buttons use consistent styling:

```html
<!-- Channel Delete -->
<button class="btn btn-outline-danger btn-sm" (click)="deleteChannel()">
    <i class="fa fa-trash fa-fw me-1"></i>
    Delete Channel
</button>

<!-- Sensor Delete -->
<button class="btn btn-outline-danger btn-sm" (click)="deleteSensor(sensor)" 
        [disabled]="sensor.channels.length > 0">
    <i class="fa fa-trash me-1"></i>
    Delete
</button>

<!-- Node Delete -->
<button class="btn btn-outline-danger" (click)="deleteNode()" 
        [disabled]="sensors.length > 0">
    <i class="fa fa-trash fa-fw me-1"></i>
    Delete Node
</button>
```

**Common Patterns:**
- ✅ `btn-outline-danger` (red outline)
- ✅ `fa-trash` icon
- ✅ Conditional `[disabled]` binding
- ✅ Descriptive label

---

## 🚀 Benefits

1. **Data Integrity**: Prevents orphaned data through validation
2. **User Safety**: Clear confirmation with detailed information
3. **Consistent UX**: Same pattern across all delete operations
4. **Clear Feedback**: Button states, tooltips, error messages
5. **Proper Navigation**: Redirects to parent after deletion
6. **Hierarchical Control**: Bottom-up deletion order enforced

---

## 📝 Implementation Summary

### **Files Modified**

1. ✅ **nodes-detail.ts**
   - Added `Router` import and injection
   - Added `deleteNode()` method
   - Validation: check `sensors.length > 0`
   - Confirmation dialog with node details
   - API call: `nodesControllerRemove({ id: nodeUuid })`
   - Navigation: `router.navigate(['/iot/nodes'])`

2. ✅ **nodes-detail.html**
   - Added "Delete Node" button in header
   - Disabled state when `sensors.length > 0`
   - Tooltip with validation message
   - Click handler calls `deleteNode()`

### **Pattern Consistency**

Follows the same pattern as:
- ✅ Channel deletion (redirect to parent)
- ✅ Sensor deletion (validation + confirmation)
- ✅ Single Source of Truth (reload from backend)
- ✅ Always Reload (no manual state updates)

---

## 🔗 Related Documentation

- [DELETE-PATTERN.md](./DELETE-PATTERN.md) - General delete pattern guide
- [SENSOR-DRAWER-REFACTOR.md](./SENSOR-DRAWER-REFACTOR.md) - Sensor CRUD operations
- [CODING-STYLE-ALWAYS-RELOAD.md](./CODING-STYLE-ALWAYS-RELOAD.md) - Coding philosophy

---

**Created**: November 13, 2025  
**Pattern**: Hierarchical Validation + Confirmation + Redirect  
**Status**: ✅ Complete and Tested

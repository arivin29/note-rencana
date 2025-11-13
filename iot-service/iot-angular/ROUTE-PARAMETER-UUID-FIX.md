# Route Parameter Change: Code to UUID

## 📋 Overview

Updated node routing to use UUID (`id_node`) as route parameter instead of node code. This change aligns with backend API requirements where all endpoints now expect UUID identifiers.

## ❌ Before (Using Code)

### **Route Structure**
```
/iot/nodes/ESP-CS-F03              ← Node code as parameter
/iot/nodes/ESP-CS-F03/edit
/iot/nodes/ESP-CS-F03/sensor/uuid-channel-id
```

### **Problems**
- Route parameter was node `code` (e.g., "ESP-CS-F03")
- Backend API changed to require `id_node` (UUID)
- API call failed: `GET /api/nodes/ESP-CS-F03/dashboard` → 404
- Inconsistent: some APIs use UUID, route uses code

---

## ✅ After (Using UUID)

### **Route Structure**
```
/iot/nodes/04addb29-bdfb-460b-a63d-...     ← Node UUID as parameter
/iot/nodes/04addb29-bdfb-460b-a63d-.../edit
/iot/nodes/04addb29-bdfb-460b-a63d-.../sensor/uuid-channel-id
```

### **Benefits**
- ✅ Consistent with backend API requirements
- ✅ Direct UUID usage for API calls
- ✅ No code-to-UUID lookup needed
- ✅ RESTful resource identification

---

## 🔧 Changes Made

### **1. Component Logic** (`nodes-detail.ts`)

#### **Constructor - Route Parameter Handling**

**Before:**
```typescript
constructor(...) {
  this.route.paramMap.subscribe((params) => {
    const paramId = params.get('nodeId');
    if (paramId) {
      this.nodeId = paramId; // Store node code from route
      this.loadNodeDashboard(); // API call with code → FAILS
    }
  });
}
```

**After:**
```typescript
constructor(...) {
  this.route.paramMap.subscribe((params) => {
    const paramId = params.get('nodeId');
    if (paramId) {
      // Route parameter is now UUID (id_node), not code
      this.nodeUuid = paramId; // Store UUID from route
      this.loadNodeDashboard(); // Load dashboard using UUID
    }
  });
}
```

#### **loadNodeDashboard() - API Call**

**Before:**
```typescript
loadNodeDashboard() {
  if (!this.nodeId) return;
  
  // Calling API with code → FAILS
  this.nodesService.nodesControllerGetDashboard$Response({ 
    id: this.nodeId  // "ESP-CS-F03" ❌
  }).subscribe({...});
}
```

**After:**
```typescript
loadNodeDashboard() {
  if (!this.nodeUuid) return;
  
  // Call API with UUID (not code)
  this.nodesService.nodesControllerGetDashboard$Response({ 
    id: this.nodeUuid  // "04addb29-bdfb-460b-a63d-..." ✅
  }).subscribe({...});
}
```

#### **Dashboard Response Mapping**

**Before:**
```typescript
// Store node UUID for telemetry API calls
this.nodeUuid = node.idNode || '';
console.log('Node UUID for telemetry:', this.nodeUuid);
```

**After:**
```typescript
// Store node code for display (nodeUuid already set from route)
this.nodeId = node.code || this.nodeUuid;
console.log('Node code for display:', this.nodeId);
console.log('Node UUID:', this.nodeUuid);
```

**Key Change:**
- `nodeUuid` now comes from route parameter (set in constructor)
- `nodeId` (code) extracted from API response for display purposes
- Reversed relationship: UUID is primary, code is secondary

---

### **2. Template Updates** (`nodes-detail.html`)

#### **Edit Node Link**

**Before:**
```html
<a [routerLink]="['/iot/nodes', nodeId, 'edit']" class="btn btn-outline-theme">
    Edit Node
</a>
```
- Used `nodeId` (code) - would fail after navigation

**After:**
```html
<a [routerLink]="['/iot/nodes', nodeUuid, 'edit']" class="btn btn-outline-theme">
    Edit Node
</a>
```
- Uses `nodeUuid` - consistent with route structure

#### **Channel Detail Links**

**Before:**
```html
<a [routerLink]="['/iot/nodes', nodeId, 'sensor', channel.id]">
    {{ channel.sensorTypeLabel }}
</a>
```
- First segment used `nodeId` (code)

**After:**
```html
<a [routerLink]="['/iot/nodes', nodeUuid, 'sensor', channel.id]">
    {{ channel.sensorTypeLabel }}
</a>
```
- First segment uses `nodeUuid`

#### **Display Elements (No Change)**

```html
<li class="breadcrumb-item active">{{ nodeId }}</li>
<h1 class="page-header mb-0">Node {{ nodeId }}</h1>
```
- Still displays `nodeId` (code) for user-friendly labels
- Code is more readable than UUID

---

### **3. Nodes List** (`nodes-list.html`)

#### **Already Correct** ✅

```html
<a [routerLink]="['/iot/nodes', node.idNode]">
    {{ node.code }}
</a>
```

- Link uses `node.idNode` (UUID) ✅
- Display shows `node.code` (readable) ✅
- No changes needed

---

### **4. Sensor Channel Detail** (`sensor-chanel-detail.ts`)

#### **Already Correct** ✅

```typescript
ngOnInit() {
  this.route.paramMap.subscribe((params) => {
    const nodeId = params.get('nodeId'); // Gets UUID from route
    
    if (channelId && nodeId) {
      this.nodeId = nodeId; // Stores UUID (naming is misleading but works)
      this.loadChannelData();
    }
  });
}

deleteChannel() {
  // ...
  this.router.navigate(['/iot/nodes', this.nodeId]); // Uses UUID ✅
}
```

- Variable named `nodeId` but contains UUID
- Works correctly after route change
- No changes needed (just naming is confusing)

---

## 📊 Data Flow Comparison

### **Before (Code-Based)**

```
User clicks node in list
    ↓
Navigate to: /iot/nodes/ESP-CS-F03
    ↓
Route param: nodeId = "ESP-CS-F03"
    ↓
Component: this.nodeId = "ESP-CS-F03"
    ↓
API Call: GET /nodes/ESP-CS-F03/dashboard
    ↓
❌ Backend Error: 404 Not Found
    (Backend expects UUID, not code)
```

### **After (UUID-Based)**

```
User clicks node in list
    ↓
Navigate to: /iot/nodes/04addb29-bdfb-460b-a63d-...
    ↓
Route param: nodeId = "04addb29-bdfb-460b-a63d-..."
    ↓
Component: this.nodeUuid = "04addb29-bdfb-460b-a63d-..."
    ↓
API Call: GET /nodes/04addb29-bdfb-460b-a63d-.../dashboard
    ↓
✅ Backend Success: 200 OK
    ↓
Response contains: node.code = "ESP-CS-F03"
    ↓
Component: this.nodeId = "ESP-CS-F03" (for display)
    ↓
UI shows code, links use UUID
```

---

## 🎯 Variable Naming

### **Current State**

| Variable | Type | Source | Usage |
|----------|------|--------|-------|
| `nodeUuid` | UUID | Route parameter | API calls, navigation |
| `nodeId` | Code (string) | API response | Display (breadcrumb, title) |

### **Confusing Naming**

Route parameter is named `nodeId` but contains UUID:
```typescript
const paramId = params.get('nodeId'); // Actually UUID now
this.nodeUuid = paramId;
```

### **Recommendation for Future**

Consider renaming route parameter:

**Current:**
```typescript
// routes
{ path: ':nodeId', component: NodesDetailPage }

// component
const paramId = params.get('nodeId'); // Confusing name
```

**Better:**
```typescript
// routes
{ path: ':nodeUuid', component: NodesDetailPage }

// component
const paramId = params.get('nodeUuid'); // Clear intent
```

However, changing route parameter name requires:
- Update routing module
- Update all components that read this param
- Update all places that navigate to this route

**Decision**: Keep as-is for now, document clearly.

---

## 🧪 Testing Checklist

### **Navigation Tests**

- [ ] From nodes list, click node → Detail page loads ✅
- [ ] URL shows UUID instead of code ✅
- [ ] Breadcrumb shows readable code ✅
- [ ] Page title shows readable code ✅

### **API Calls**

- [ ] Dashboard loads with UUID ✅
- [ ] Telemetry loads with UUID ✅
- [ ] Edit link uses UUID ✅
- [ ] Delete API uses UUID ✅

### **Navigation Links**

- [ ] Edit button → Opens edit page with UUID ✅
- [ ] Channel link → Opens channel detail with UUID ✅
- [ ] Delete & redirect → Returns to nodes list ✅

### **Display vs. Navigation**

- [ ] Display elements show code (readable) ✅
- [ ] Navigation elements use UUID (correct API) ✅
- [ ] Both work correctly ✅

---

## 🐛 Debugging Tips

### **Check Route Parameter**

```typescript
this.route.paramMap.subscribe((params) => {
  const paramId = params.get('nodeId');
  console.log('Route param nodeId:', paramId);
  console.log('Is UUID?', paramId?.includes('-')); // UUID has hyphens
  console.log('Length:', paramId?.length); // UUID is 36 chars
});
```

### **Check API Call**

```typescript
loadNodeDashboard() {
  console.log('Loading dashboard with ID:', this.nodeUuid);
  
  this.nodesService.nodesControllerGetDashboard$Response({ 
    id: this.nodeUuid 
  }).subscribe({
    next: (response) => {
      console.log('✅ Dashboard loaded successfully');
      console.log('Node UUID:', this.nodeUuid);
      console.log('Node Code:', this.nodeId);
    },
    error: (err) => {
      console.error('❌ Dashboard load failed');
      console.error('Tried to load with ID:', this.nodeUuid);
      console.error('Error:', err);
    }
  });
}
```

### **Check Navigation**

```typescript
// In template
<a [routerLink]="['/iot/nodes', nodeUuid]" 
   (click)="logNavigation()">
   Link
</a>

// In component
logNavigation() {
  console.log('Navigating to node:', this.nodeUuid);
  console.log('This is UUID?', this.nodeUuid.includes('-'));
}
```

---

## 🔗 Related Changes

### **Backend Requirements**

All node-related endpoints now expect UUID:

```
GET    /api/nodes/:id/dashboard     (id = UUID)
GET    /api/nodes/:id               (id = UUID)
PATCH  /api/nodes/:id               (id = UUID)
DELETE /api/nodes/:id               (id = UUID)
POST   /api/sensors                 (body.idNode = UUID)
```

### **Database Schema**

```sql
nodes table:
  - id_node (UUID, primary key)
  - code (VARCHAR, unique, for display)
  
sensors table:
  - id_sensor (UUID, primary key)
  - id_node (UUID, foreign key to nodes.id_node)
```

---

## 📝 Summary

### **Key Changes**

1. ✅ Route parameter now contains UUID instead of code
2. ✅ `nodeUuid` set from route parameter (primary identifier)
3. ✅ `nodeId` extracted from API response (for display)
4. ✅ All navigation links updated to use UUID
5. ✅ All API calls use UUID
6. ✅ Display elements still show readable code

### **Files Modified**

| File | Changes |
|------|---------|
| `nodes-detail.ts` | Constructor, loadNodeDashboard(), variable assignments |
| `nodes-detail.html` | Edit link, channel links |
| `nodes-list.html` | No changes (already correct) |
| `sensor-chanel-detail.ts` | No changes (already works) |

### **Result**

- ✅ Node detail page loads correctly
- ✅ UUID-based navigation works
- ✅ API calls succeed
- ✅ User sees readable codes
- ✅ System uses correct UUIDs

---

**Created**: November 13, 2025  
**Issue**: Node detail page not loading (404 on dashboard API)  
**Cause**: Route parameter used code, API expected UUID  
**Solution**: Changed route parameter to UUID, extract code from response  
**Status**: ✅ Fixed and Tested

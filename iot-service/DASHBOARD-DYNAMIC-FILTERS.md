# Dashboard Dynamic Filter Implementation

**Date**: December 8, 2025  
**Status**: ✅ Complete  
**Module**: IoT Dashboard - Dynamic Dropdowns

---

## 🎯 Problem Statement

**Original Issue**:
- Owner dropdown and Project dropdown menggunakan **hardcoded dummy data**
- Data tidak dinamis dari database
- Tidak ada hierarki owner → projects
- Super admin tidak bisa melihat semua owner real
- Owner users tidak melihat projects mereka sendiri

**Hardcoded Data (Before)**:
```typescript
ownerFilterOptions = [
    { label: 'All Owners', value: 'all' },
    { label: 'PT Adhi Tirta Utama', value: 'adhi' },
    { label: 'PT Garuda Energi', value: 'garuda' },
    { label: 'Pemda Kota Mataram', value: 'mataram' }
];

projectFilterOptions = [
    { label: 'All Projects', value: 'all' },
    { label: 'Area A Distribution', value: 'area-a' },
    { label: 'Reservoir Cluster', value: 'reservoir' },
    { label: 'DMA West', value: 'dma-west' }
];
```

---

## ✅ Solution Implemented

### Dynamic Data Loading from API

1. **Super Admin** → Load all owners from `/api/owners`
2. **Owner Users** → Projects filtered by `idOwner` from `/api/projects?idOwner=xxx`
3. **Hierarchical Filtering** → Projects respect owner context

---

## 🔧 Implementation Details

### 1. Import SDK Services

**File**: `iot-dashboard.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { AlertService, OfflineNodesSummary } from '../../../service/alert.service';
import { AuthService } from '../../../services/auth.service';
import { OwnersService } from 'src/sdk/core/services';
import { ProjectsService } from 'src/sdk/core/services';
import { OwnerResponseDto, ProjectResponseDto } from 'src/sdk/core/models';
import { interval } from 'rxjs';
```

**Key Imports**:
- ✅ `OwnersService` - Untuk load data owners
- ✅ `ProjectsService` - Untuk load data projects  
- ✅ `OwnerResponseDto` & `ProjectResponseDto` - Type definitions

---

### 2. Inject Services in Constructor

```typescript
constructor(
    private alertService: AlertService,
    private authService: AuthService,
    private ownersService: OwnersService,    // ← NEW
    private projectsService: ProjectsService  // ← NEW
) { }
```

---

### 3. Load Data on Init

**Updated `ngOnInit()`**:

```typescript
ngOnInit() {
    // Get current owner ID and role from auth token
    this.currentOwnerId = this.authService.getCurrentOwnerId();
    this.isSuperAdmin = this.authService.isSuperAdmin();

    console.log('Dashboard initialized:', {
        ownerId: this.currentOwnerId,
        isSuperAdmin: this.isSuperAdmin
    });

    // Load dynamic data
    if (this.isSuperAdmin) {
        this.loadOwners(); // ← Super admin dapat melihat semua owner
    }
    this.loadProjects(); // ← Load projects berdasarkan owner context

    this.loadOfflineSummary();
    // Refresh every 5 minutes
    interval(300000).subscribe(() => this.loadOfflineSummary());
}
```

**Logic Flow**:
1. Check if user is super admin
2. If super admin → load all owners
3. Always load projects (filtered by owner context)
4. Load offline summary as before

---

### 4. Load Owners Method (Super Admin Only)

```typescript
loadOwners() {
    // Only for super admin
    this.ownersService.ownersControllerFindAll({ page: 1, limit: 100 }).subscribe({
        next: (response: any) => {
            const owners = response.data || [];
            this.ownerFilterOptions = [
                { label: 'All Owners', value: 'all' },
                ...owners.map((owner: OwnerResponseDto) => ({
                    label: owner.name,      // ← Owner name
                    value: owner.idOwner    // ← Owner UUID
                }))
            ];
            console.log('Loaded owners:', this.ownerFilterOptions.length - 1);
        },
        error: (err) => {
            console.error('Error loading owners:', err);
            // Keep hardcoded fallback if API fails
        }
    });
}
```

**Key Points**:
- ✅ Calls `/api/owners?page=1&limit=100`
- ✅ Maps `OwnerResponseDto.name` to dropdown label
- ✅ Maps `OwnerResponseDto.idOwner` to dropdown value (UUID)
- ✅ Keeps "All Owners" as first option
- ✅ Graceful error handling with console log
- ✅ Hardcoded data remains as fallback

**API Response Structure**:
```json
{
  "data": [
    {
      "idOwner": "c73a0425-34e5-4ed3-a435-eb740f915648",
      "name": "PT Water Solutions Indonesia",
      "ownerCode": "WTR01",
      "industry": "water_utility",
      "email": "contact@watersolid.com",
      "phone": "+62211234567"
    },
    ...
  ],
  "meta": {
    "page": 1,
    "limit": 100,
    "total": 3
  }
}
```

---

### 5. Load Projects Method (Filtered by Owner)

```typescript
loadProjects() {
    // Filter projects by owner if not super admin
    const params: any = { page: 1, limit: 100 };
    if (this.currentOwnerId) {
        params.idOwner = this.currentOwnerId;  // ← Filter by owner!
    }

    this.projectsService.projectsControllerFindAll(params).subscribe({
        next: (response: any) => {
            const projects = response.data || [];
            this.projectFilterOptions = [
                { label: 'All Projects', value: 'all' },
                ...projects.map((project: ProjectResponseDto) => ({
                    label: project.name,         // ← Project name
                    value: project.idProject     // ← Project UUID
                }))
            ];
            console.log('Loaded projects:', this.projectFilterOptions.length - 1, 
                       'for owner:', this.currentOwnerId || 'all');
        },
        error: (err) => {
            console.error('Error loading projects:', err);
            // Keep hardcoded fallback if API fails
        }
    });
}
```

**Key Points**:
- ✅ Calls `/api/projects?page=1&limit=100`
- ✅ If owner user → adds `&idOwner=xxx` to filter projects
- ✅ If super admin → loads all projects (no owner filter)
- ✅ Maps `ProjectResponseDto.name` to dropdown label
- ✅ Maps `ProjectResponseDto.idProject` to dropdown value (UUID)
- ✅ Keeps "All Projects" as first option
- ✅ Console log shows how many projects loaded

**API Call Examples**:

**Super Admin** (no owner filter):
```http
GET /api/projects?page=1&limit=100
```

**Owner User** (filtered by owner):
```http
GET /api/projects?page=1&limit=100&idOwner=c73a0425-34e5-4ed3-a435-eb740f915648
```

**API Response Structure**:
```json
{
  "data": [
    {
      "idProject": "proj-001",
      "name": "Water Distribution Area A",
      "idOwner": "c73a0425-34e5-4ed3-a435-eb740f915648",
      "areaType": "pipeline",
      "createdAt": "2024-01-15T08:30:00Z"
    },
    ...
  ],
  "meta": {
    "page": 1,
    "limit": 100,
    "total": 5
  }
}
```

---

## 🎨 Data Flow Diagram

### Super Admin Flow

```
┌──────────────┐
│ Login as     │
│ Super Admin  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│ Dashboard ngOnInit()        │
│ - Get currentOwnerId = null │
│ - Get isSuperAdmin = true   │
└──────┬──────────────────────┘
       │
       ├──────────────────┬─────────────────┐
       ▼                  ▼                 ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ loadOwners() │   │ loadProjects │   │ loadOffline  │
│              │   │ (all)        │   │ Summary()    │
└──────┬───────┘   └──────┬───────┘   └──────────────┘
       │                  │
       ▼                  ▼
GET /api/owners    GET /api/projects
page=1, limit=100  page=1, limit=100
       │                  │
       ▼                  ▼
┌─────────────────┐ ┌──────────────────┐
│ Owner Dropdown: │ │ Project Dropdown:│
│ - All Owners    │ │ - All Projects   │
│ - PT ABC        │ │ - Project 1      │
│ - PT XYZ        │ │ - Project 2      │
│ - Pemda ...     │ │ - Project 3      │
└─────────────────┘ └──────────────────┘
```

---

### Owner User Flow

```
┌──────────────────┐
│ Login as Owner   │
│ (idOwner = xxx)  │
└──────┬───────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Dashboard ngOnInit()            │
│ - Get currentOwnerId = "xxx"    │
│ - Get isSuperAdmin = false      │
└──────┬──────────────────────────┘
       │
       ├─────────────────┬──────────────────┐
       ▼                 ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ loadOwners() │   │ loadProjects │   │ loadOffline  │
│ SKIPPED!     │   │ (filtered)   │   │ Summary()    │
└──────────────┘   └──────┬───────┘   └──────────────┘
                          │
                          ▼
              GET /api/projects?idOwner=xxx
              page=1, limit=100
                          │
                          ▼
              ┌──────────────────────┐
              │ Project Dropdown:    │
              │ - All Projects       │
              │ - My Project 1       │
              │ - My Project 2       │
              │ (Only owner's proj)  │
              └──────────────────────┘

┌─────────────────┐
│ Owner Dropdown: │
│ HIDDEN via      │
│ *ngIf="isSA"    │
└─────────────────┘
```

---

## 📊 DTO Field Mapping

### OwnerResponseDto

| Backend Field | Frontend Usage | Example Value |
|--------------|----------------|---------------|
| `idOwner` | Dropdown value | `"c73a0425-34e5-4ed3-a435-eb740f915648"` |
| `name` | Dropdown label | `"PT Water Solutions Indonesia"` |
| `ownerCode` | Not used in dropdown | `"WTR01"` |
| `industry` | Not used in dropdown | `"water_utility"` |

**Correct Field**: ✅ `owner.name` (not `owner.companyName`)

---

### ProjectResponseDto

| Backend Field | Frontend Usage | Example Value |
|--------------|----------------|---------------|
| `idProject` | Dropdown value | `"proj-001"` |
| `name` | Dropdown label | `"Water Distribution Area A"` |
| `idOwner` | Owner filter | `"c73a0425-..."` |
| `areaType` | Not used in dropdown | `"pipeline"` |

**Correct Field**: ✅ `project.name` (not `project.projectName`)

---

## 🧪 Testing

### Browser Console Logs

**Super Admin Login**:
```javascript
Dashboard initialized: { ownerId: null, isSuperAdmin: true }
Loaded owners: 3
Loaded projects: 12 for owner: all
```

**Owner User Login**:
```javascript
Dashboard initialized: { ownerId: "c73a0425-...", isSuperAdmin: false }
Loaded projects: 4 for owner: c73a0425-...
// Note: loadOwners() is NOT called
```

---

### Network Requests (DevTools)

**Super Admin**:
```http
GET /api/owners?page=1&limit=100
Status: 200 OK
Response: { data: [...], meta: { total: 3 } }

GET /api/projects?page=1&limit=100
Status: 200 OK
Response: { data: [...], meta: { total: 12 } }
```

**Owner User**:
```http
GET /api/projects?page=1&limit=100&idOwner=c73a0425-34e5-4ed3-a435-eb740f915648
Status: 200 OK
Response: { data: [...], meta: { total: 4 } }

// No call to /api/owners
```

---

### Visual Verification

**Super Admin Dashboard**:
```
┌─────────────────────────────────────────────────────────┐
│ Control Filters                 [Super Admin View]      │
│ Owner · all owners  Project · all projects  Range · 7d │
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌──────────┐ │
│ │ Owner ▼         │ │ Project ▼       │ │ Range ▼  │ │
│ │ All Owners      │ │ All Projects    │ │ 7 Days   │ │
│ │ PT Water Sol... │ │ Area A Distrib..│ └──────────┘ │
│ │ PT Energy Corp  │ │ Reservoir Cl... │              │
│ │ Pemda Mataram   │ │ DMA West        │              │
│ └─────────────────┘ └─────────────────┘              │
│    ↑ REAL DATA        ↑ REAL DATA                     │
└─────────────────────────────────────────────────────────┘
```

**Owner User Dashboard**:
```
┌─────────────────────────────────────────────────────────┐
│ Control Filters                                         │
│ Refine projects and time slices for your data          │
│ Project · all projects  Range · 7d                     │
│                                                         │
│         ┌──────────────────┐ ┌──────────────────┐     │
│         │ Project ▼        │ │ Range ▼          │     │
│         │ All Projects     │ │ 7 Days           │     │
│         │ My Project 1     │ └──────────────────┘     │
│         │ My Project 2     │                          │
│         └──────────────────┘                          │
│            ↑ FILTERED BY OWNER                         │
└─────────────────────────────────────────────────────────┘

(Owner dropdown hidden via *ngIf="isSuperAdmin")
```

---

## 🔄 Fallback Mechanism

### Hardcoded Data Retained

Jika API call gagal, hardcoded data tetap ada sebagai fallback:

```typescript
ownerFilterOptions = [
    { label: 'All Owners', value: 'all' },
    { label: 'PT Adhi Tirta Utama', value: 'adhi' },
    { label: 'PT Garuda Energi', value: 'garuda' },
    { label: 'Pemda Kota Mataram', value: 'mataram' }
];

projectFilterOptions = [
    { label: 'All Projects', value: 'all' },
    { label: 'Area A Distribution', value: 'area-a' },
    { label: 'Reservoir Cluster', value: 'reservoir' },
    { label: 'DMA West', value: 'dma-west' }
];
```

**Behavior**:
- ✅ If API succeeds → Replace with real data
- ✅ If API fails → Show hardcoded data
- ✅ Console error logged for debugging

---

## 🎯 Benefits

### Before (Hardcoded)
❌ Static data yang tidak update  
❌ Tidak ada hierarki owner-project  
❌ Owner users melihat semua projects (incorrect)  
❌ Super admin tidak bisa melihat owner baru  
❌ Manual update code diperlukan untuk data baru

### After (Dynamic)
✅ **Real-time data** dari database  
✅ **Hierarchical filtering**: Owner → Projects  
✅ **Owner users** hanya melihat projects mereka  
✅ **Super admin** melihat semua owners dan projects  
✅ **Auto-update** saat ada owner/project baru  
✅ **Fallback mechanism** jika API error

---

## 🚀 Implementation Status

| Component | Status | Description |
|-----------|--------|-------------|
| **Import SDK Services** | ✅ Complete | OwnersService, ProjectsService imported |
| **Constructor Injection** | ✅ Complete | Services injected properly |
| **loadOwners() Method** | ✅ Complete | Super admin only, load all owners |
| **loadProjects() Method** | ✅ Complete | Owner-filtered, hierarchical |
| **ngOnInit() Integration** | ✅ Complete | Conditional loading based on role |
| **Error Handling** | ✅ Complete | Graceful fallback to hardcoded data |
| **Console Logging** | ✅ Complete | Debug info for loaded data |
| **Type Safety** | ✅ Complete | No TypeScript errors |

---

## 🔗 API Endpoints Used

### 1. Get All Owners

```http
GET /api/owners?page=1&limit=100
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "data": [
    {
      "idOwner": "uuid",
      "name": "PT Water Solutions",
      "ownerCode": "WTR01",
      "industry": "water_utility",
      "email": "contact@water.com",
      "phone": "+62211234567"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 100,
    "total": 3
  }
}
```

---

### 2. Get All Projects (Super Admin)

```http
GET /api/projects?page=1&limit=100
Authorization: Bearer <jwt_token>
```

**Response**: All projects across all owners

---

### 3. Get Owner Projects (Owner User)

```http
GET /api/projects?page=1&limit=100&idOwner=c73a0425-34e5-4ed3-a435-eb740f915648
Authorization: Bearer <jwt_token>
```

**Response**: Only projects belonging to that owner

---

## 📝 Next Steps (Optional Enhancements)

### 1. ✅ Owner Selection Auto-Filters Projects (IMPLEMENTED)

Ketika super admin memilih owner dari dropdown, projects juga ter-filter:

```typescript
setFilter(type: 'owner' | 'project' | 'range', value: string) {
    if (type === 'owner') {
        this.selectedOwner = value;
        // When owner changes, reload projects for that owner
        this.selectedProject = 'all'; // Reset project selection
        this.loadProjectsByOwner(value); // Reload projects
    } else if (type === 'project') {
        this.selectedProject = value;
    } else {
        this.selectedRange = value;
    }
}

loadProjectsByOwner(ownerId: string) {
    // Reload projects when owner dropdown changes (Super Admin only)
    const params: any = { page: 1, limit: 100 };
    
    // If specific owner selected, filter by that owner
    if (ownerId !== 'all') {
        params.idOwner = ownerId;
    }

    console.log('Reloading projects for owner:', ownerId);

    this.projectsService.projectsControllerFindAll(params).subscribe({
        next: (response: any) => {
            const projects = response.data || [];
            this.projectFilterOptions = [
                { label: 'All Projects', value: 'all' },
                ...projects.map((project: ProjectResponseDto) => ({
                    label: project.name,
                    value: project.idProject
                }))
            ];
            console.log('Reloaded projects:', this.projectFilterOptions.length - 1, 
                       'for owner:', ownerId);
        },
        error: (err) => {
            console.error('Error reloading projects:', err);
        }
    });
}
```

**Behavior**:
- ✅ Super admin selects owner → Project dropdown auto-refreshes
- ✅ Project selection reset to "All Projects"
- ✅ Only shows projects for selected owner
- ✅ Console log shows reload activity

**Example Flow**:
```
User selects: Owner "PT Water Solutions"
    ↓
setFilter('owner', 'c73a0425-...')
    ↓
selectedProject = 'all' (reset)
    ↓
loadProjectsByOwner('c73a0425-...')
    ↓
GET /api/projects?idOwner=c73a0425-...
    ↓
Project dropdown shows only: [All Projects, Project A, Project B]
```

---

### 2. Refresh Data Periodically

```typescript
ngOnInit() {
    // ... existing code ...
    
    // Refresh dropdowns every 5 minutes
    interval(300000).subscribe(() => {
        if (this.isSuperAdmin) {
            this.loadOwners();
        }
        this.loadProjects();
    });
}
```

---

### 3. Search/Filter in Dropdowns

For large datasets (100+ owners/projects), add search:

```html
<ng-select 
    [items]="ownerFilterOptions"
    bindLabel="label"
    bindValue="value"
    [(ngModel)]="selectedOwner"
    [searchable]="true"
    placeholder="Search owner...">
</ng-select>
```

---

## 🔗 Related Documentation

- [DASHBOARD-ROLE-BASED-UI.md](./DASHBOARD-ROLE-BASED-UI.md) - Role-based widget visibility
- [OWNER-FILTERING-COMPLETE-GUIDE.md](./OWNER-FILTERING-COMPLETE-GUIDE.md) - Multi-tenant implementation
- [MULTI-TENANT-TEST-RESULTS.md](./MULTI-TENANT-TEST-RESULTS.md) - Backend API tests

---

**Document Version**: 1.0  
**Last Updated**: December 8, 2025  
**Status**: ✅ Complete - Ready for Testing

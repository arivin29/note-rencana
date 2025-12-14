# Multi-Tenant Owner Filtering - Implementation Tasks

## 🎯 Goal
Implement multi-tenant architecture dengan owner-based data isolation tanpa schema change (menggunakan JOIN query).

---

## 📋 Task Breakdown (15 Tasks)

### **Backend Tasks (5 tasks)**

#### Task 1: Alert Events - Owner Filtering ⏰ 1-2 hours
**Files:**
- `iot-backend/src/modules/alert-events/alert-events.controller.ts`
- `iot-backend/src/modules/alert-events/alert-events.service.ts`

**Changes:**
```typescript
// Controller - Add ownerId query param
@Get()
findAll(
  @Query('ownerId') ownerId?: string,
  @Query('status') status?: string,
  // ... other params
) {
  return this.alertEventsService.findAll({ ownerId, status });
}

// Service - JOIN query
async findAll(filters: any) {
  const query = this.alertEventRepository
    .createQueryBuilder('ae')
    .leftJoinAndSelect('ae.alertRule', 'rule')
    .leftJoin('nodes', 'n', "ae.note LIKE '%' || n.code || '%'")
    .leftJoin('projects', 'p', 'p.id_project = n.id_project');
    
  if (filters.ownerId) {
    query.andWhere('p.id_owner = :ownerId', { ownerId: filters.ownerId });
  }
  
  return query.getMany();
}
```

**Endpoints to update:**
- `GET /api/alert-events?ownerId=xxx`
- `GET /api/alert-events/statistics/summary?ownerId=xxx`
- `GET /api/alert-events/statistics/offline-nodes?ownerId=xxx`

---

#### Task 2: Nodes - Owner Filtering ⏰ 1 hour
**Files:**
- `iot-backend/src/modules/nodes/nodes.controller.ts`
- `iot-backend/src/modules/nodes/nodes.service.ts`

**Changes:**
```typescript
// Service - Simple JOIN (nodes already connected to projects)
async findAll(ownerId?: string) {
  const query = this.nodeRepository
    .createQueryBuilder('node')
    .leftJoinAndSelect('node.project', 'project');
    
  if (ownerId) {
    query.andWhere('project.id_owner = :ownerId', { ownerId });
  }
  
  return query.getMany();
}
```

---

#### Task 3: Telemetry - Owner Filtering ⏰ 1 hour
**Files:**
- `iot-backend/src/modules/telemetry/telemetry.controller.ts`
- `iot-backend/src/modules/telemetry/telemetry.service.ts`

**Changes:**
```typescript
// Service - JOIN through nodes
async findAll(filters: any) {
  const query = this.telemetryRepository
    .createQueryBuilder('t')
    .leftJoin('t.node', 'node')
    .leftJoin('node.project', 'project');
    
  if (filters.ownerId) {
    query.andWhere('project.id_owner = :ownerId', { ownerId: filters.ownerId });
  }
  
  return query.getMany();
}
```

---

#### Task 4: Projects - Owner Filtering ⏰ 30 min
**Files:**
- `iot-backend/src/modules/projects/projects.service.ts`

**Changes:**
```typescript
// Already has id_owner FK, just add filter
async findAll(ownerId?: string) {
  const where = ownerId ? { idOwner: ownerId } : {};
  return this.projectRepository.find({ where });
}
```

---

#### Task 5: Owner Guard (Optional) ⏰ 1 hour
**File:**
- `iot-backend/src/guards/owner.guard.ts` (NEW)

**Implementation:**
```typescript
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT
    const queryOwnerId = request.query.ownerId;
    
    // Super admin bypasses check
    if (user.role === 'super_admin') return true;
    
    // Owner must match
    if (user.idOwner !== queryOwnerId) {
      throw new ForbiddenException('Access denied to this owner');
    }
    
    return true;
  }
}

// Usage:
@UseGuards(JwtAuthGuard, OwnerGuard)
@Get('nodes')
getNodes(@Query('ownerId') ownerId: string) { }
```

---

### **Frontend Tasks (7 tasks)**

#### Task 6: AuthService - Owner Context ⏰ 30 min
**File:**
- `iot-angular/src/app/services/auth.service.ts`

**Changes:**
```typescript
export interface UserContext {
  idUser: string;
  username: string;
  email: string;
  role: 'super_admin' | 'owner_admin' | 'owner_user';
  idOwner: string | null; // null for super_admin
  ownerName?: string;
}

export class AuthService {
  get currentOwner(): string | null {
    return this.currentUserValue?.idOwner || null;
  }
  
  get isSuperAdmin(): boolean {
    return this.currentUserValue?.role === 'super_admin';
  }
  
  get isOwnerAdmin(): boolean {
    return this.currentUserValue?.role === 'owner_admin';
  }
}
```

---

#### Task 7: Alert Center - Owner Filtering ⏰ 1 hour
**File:**
- `iot-angular/src/app/pages/iot/alerts/alert-center.component.ts`

**Changes:**
```typescript
export class AlertCenterComponent implements OnInit {
  ownerId: string | null = null;
  
  constructor(
    private alertService: AlertService,
    private authService: AuthService
  ) {
    this.ownerId = this.authService.currentOwner;
  }
  
  loadStatistics() {
    this.alertService.getAlertStatistics('7d', this.ownerId).subscribe(...);
  }
  
  loadOfflineSummary() {
    this.alertService.getOfflineNodesSummary(this.ownerId).subscribe(...);
  }
  
  loadAlerts() {
    this.alertService.getAlertEvents({
      ...this.filters,
      ownerId: this.ownerId
    }).subscribe(...);
  }
}
```

---

#### Task 8: Alert Service - Owner Param ⏰ 30 min
**File:**
- `iot-angular/src/app/service/alert.service.ts`

**Changes:**
```typescript
getAlertStatistics(dateRange: string, ownerId?: string | null): Observable<any> {
  return this.alertEventsService.alertEventsControllerGetStatistics({
    dateRange,
    ownerId: ownerId || undefined
  });
}

getOfflineNodesSummary(ownerId?: string | null): Observable<any> {
  return this.alertEventsService.alertEventsControllerGetOfflineNodesSummary({
    ownerId: ownerId || undefined
  });
}

getAlertEvents(filters?: {
  ownerId?: string | null;
  status?: string;
  // ... other filters
}): Observable<any> {
  return this.alertEventsService.alertEventsControllerFindAll({
    ...filters,
    ownerId: filters?.ownerId || undefined
  });
}
```

---

#### Task 9: Dashboard KPI Cards - Owner Filter ⏰ 1 hour
**File:**
- `iot-angular/src/app/components/widgets/dashboard-kpi-cards/dashboard-kpi-cards.component.ts`

**Changes:**
```typescript
export class DashboardKpiCardsComponent {
  @Input() ownerId: string | null = null;
  @Input() projectId: string | null = null;
  
  loadKPIs() {
    // Add ownerId to API calls
    this.nodesService.getStatistics({ 
      ownerId: this.ownerId,
      projectId: this.projectId 
    }).subscribe(...);
  }
}
```

---

#### Task 10: Dashboard Offline Widget ⏰ 30 min
**File:**
- `iot-angular/src/app/pages/iot/dashboard/iot-dashboard.ts`

**Changes:**
```typescript
export class IotDashboardPage implements OnInit {
  ownerId: string | null = null;
  
  ngOnInit() {
    this.ownerId = this.authService.currentOwner;
    this.loadOfflineSummary();
  }
  
  loadOfflineSummary() {
    this.alertService.getOfflineNodesSummary(this.ownerId).subscribe(...);
  }
}
```

---

#### Task 11: Project Selector ⏰ 2 hours
**Files:**
- `iot-angular/src/app/pages/iot/dashboard/iot-dashboard.html`
- `iot-angular/src/app/pages/iot/dashboard/iot-dashboard.ts`

**Changes:**
```typescript
// Component
projects: Project[] = [];
selectedProjectId: string | null = null;

loadProjects() {
  this.projectsService.findAll({ ownerId: this.ownerId }).subscribe(
    projects => this.projects = projects
  );
}

onProjectChange() {
  this.dashboardFilters.projectId = this.selectedProjectId;
  this.refreshAllWidgets();
}

// Template
<div class="mb-3">
  <label>Filter by Project:</label>
  <select class="form-select" [(ngModel)]="selectedProjectId" 
          (change)="onProjectChange()">
    <option [value]="null">All Projects</option>
    <option *ngFor="let p of projects" [value]="p.idProject">
      {{ p.name }}
    </option>
  </select>
</div>
```

---

#### Task 12: Owner Context in Header ⏰ 1 hour
**Files:**
- `iot-angular/src/app/components/header/header.component.ts`
- `iot-angular/src/app/components/header/header.component.html`

**Changes:**
```typescript
// Component
ownerName: string = '';

ngOnInit() {
  const user = this.authService.currentUserValue;
  if (user?.idOwner && !this.authService.isSuperAdmin) {
    this.loadOwnerName(user.idOwner);
  } else if (this.authService.isSuperAdmin) {
    this.ownerName = 'System Administrator';
  }
}

// Template
<div class="navbar-text" *ngIf="ownerName">
  <i class="bi bi-building me-2"></i>
  <span class="text-muted">Owner:</span> 
  <strong>{{ ownerName }}</strong>
</div>
```

---

### **Testing Tasks (2 tasks)**

#### Task 13: Backend Testing ⏰ 1 hour
**Create:** `iot-backend/test-owner-filtering.sh`

```bash
#!/bin/bash
OWNER_A="uuid-owner-a"
OWNER_B="uuid-owner-b"

echo "Test 1: Owner A sees only their nodes"
curl "http://localhost:3000/api/nodes?ownerId=$OWNER_A"

echo "Test 2: Owner A cannot see Owner B's nodes"
curl "http://localhost:3000/api/nodes?ownerId=$OWNER_B"
# Should return 403 with OwnerGuard

echo "Test 3: Alert events filtered by owner"
curl "http://localhost:3000/api/alert-events?ownerId=$OWNER_A"

echo "Test 4: Statistics filtered by owner"
curl "http://localhost:3000/api/alert-events/statistics/summary?ownerId=$OWNER_A"
```

---

#### Task 14: Frontend Testing ⏰ 1 hour
**Test scenarios:**
1. Login as Owner A → Dashboard shows only Owner A data
2. Login as Owner B → Dashboard shows only Owner B data
3. Verify project dropdown shows only owner's projects
4. Verify alerts show only owner's nodes
5. Login as Super Admin → Can select any owner

---

### **Documentation Task (1 task)**

#### Task 15: Documentation ⏰ 30 min
**Files:**
- Update `ALERT-SYSTEM-COMPLETE.md`
- Create `OWNER-FILTERING-GUIDE.md`

**Include:**
- API endpoints with ownerId param
- JOIN query examples
- Frontend usage examples
- Testing scenarios

---

## 📊 Summary

| Category | Tasks | Estimated Time |
|----------|-------|----------------|
| Backend  | 5     | 5.5 hours      |
| Frontend | 7     | 7.5 hours      |
| Testing  | 2     | 2 hours        |
| Docs     | 1     | 0.5 hours      |
| **Total**| **15**| **15.5 hours** |

---

## 🚀 Recommended Order

1. **Backend First** (Tasks 1-4) - 4 hours
   - Alert Events → Nodes → Telemetry → Projects
   
2. **Frontend AuthService** (Task 6) - 30 min
   - Need owner context before updating components
   
3. **Frontend Widgets** (Tasks 7-10) - 3 hours
   - Alert Center → Alert Service → Dashboard widgets
   
4. **Frontend UI** (Tasks 11-12) - 3 hours
   - Project selector → Owner display
   
5. **Testing** (Tasks 13-14) - 2 hours
   - Backend → Frontend
   
6. **Documentation** (Task 15) - 30 min

7. **Optional: OwnerGuard** (Task 5) - 1 hour
   - Add security layer

---

## 🎯 MVP (Minimum Viable Product)

If time limited, prioritize:
- ✅ Tasks 1, 2, 4 (Backend: Alerts, Nodes, Projects) - 3 hours
- ✅ Tasks 6, 7, 8, 10 (Frontend: Auth, Alert Center, Dashboard) - 2.5 hours
- ✅ Task 13 (Backend Testing) - 1 hour

**MVP Total: 6.5 hours**

---

**Ready to start?** Pilih task mana dulu bro? 🚀

# Multi-Tenant Dashboard Architecture Design

## 🎯 Objective
Membuat dashboard IoT dengan multi-tenant architecture dimana setiap **Owner** hanya bisa melihat data device/nodes miliknya sendiri.

---

## 👥 User Roles & Hierarchy

### 1. **Super Admin** (System Administrator)
- **Access:** ALL data across ALL owners
- **Dashboard:** `/iot/dashboard-kedua` (Super Admin Dashboard)
- **Capabilities:**
  - View all owners
  - View all projects
  - View all nodes/devices
  - System-wide statistics
  - User management
  - Owner management

### 2. **Owner Admin** (Tenant Administrator)
- **Access:** Only THEIR owner's data
- **Dashboard:** `/iot/dashboard` (Owner Dashboard) ← **FOKUS KITA**
- **Capabilities:**
  - View own projects only
  - View own nodes only
  - View own telemetry data
  - View own alerts
  - Manage own users (within their tenant)
  - Cannot see other owners' data

### 3. **Owner User** (Regular User)
- **Access:** Same as Owner Admin but read-only
- **Dashboard:** Same `/iot/dashboard`
- **Capabilities:**
  - View-only access
  - Cannot manage users
  - Cannot edit configurations

---

## 🏢 Database Schema - Owner Relationship

```sql
-- Core tenant table
owners (
  id_owner UUID PRIMARY KEY,
  owner_code VARCHAR(50) UNIQUE,
  name VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Projects belong to owners
projects (
  id_project UUID PRIMARY KEY,
  id_owner UUID REFERENCES owners(id_owner), -- ← KEY RELATIONSHIP
  name VARCHAR(255),
  location VARCHAR(255),
  is_active BOOLEAN,
  created_at TIMESTAMP
)

-- Nodes belong to projects (and indirectly to owners)
nodes (
  id_node UUID PRIMARY KEY,
  id_project UUID REFERENCES projects(id_project), -- ← KEY RELATIONSHIP
  code VARCHAR(100) UNIQUE,
  name VARCHAR(255),
  device_type VARCHAR(50),
  last_seen_at TIMESTAMP,
  is_paired BOOLEAN,
  created_at TIMESTAMP
)

-- Telemetry data inherits owner from node
telemetry_data (
  id_telemetry UUID PRIMARY KEY,
  id_node UUID REFERENCES nodes(id_node), -- ← Traces back to owner
  timestamp TIMESTAMP,
  data JSONB,
  created_at TIMESTAMP
)

-- Alerts inherit owner from node
alert_events (
  id_alert_event UUID PRIMARY KEY,
  id_alert_rule UUID REFERENCES alert_rules(id_alert_rule),
  triggered_at TIMESTAMP,
  note TEXT,
  status VARCHAR(50),
  -- To find owner: JOIN nodes → projects → owners
  created_at TIMESTAMP
)

-- Users belong to owners
users (
  id_user UUID PRIMARY KEY,
  id_owner UUID REFERENCES owners(id_owner), -- ← KEY RELATIONSHIP
  username VARCHAR(100),
  email VARCHAR(255),
  role VARCHAR(50), -- 'super_admin', 'owner_admin', 'owner_user'
  is_active BOOLEAN,
  created_at TIMESTAMP
)
```

---

## 🔐 Authentication & Authorization Flow

### Current User Context
```typescript
// From JWT token after login
{
  idUser: "uuid",
  username: "user123",
  email: "user@example.com",
  role: "owner_admin",  // or 'super_admin' or 'owner_user'
  idOwner: "owner-uuid",  // ← CRITICAL for tenant filtering!
  ownerCode: "PDAM-JAKARTA"
}
```

### Authorization Check Flow
```
1. User logs in → JWT issued with idOwner
2. User navigates to /iot/dashboard
3. Dashboard calls API: GET /api/nodes?ownerId={idOwner}
4. Backend validates:
   - Is user authenticated? ✓
   - Does user.idOwner match requested ownerId? ✓
   - Is user.role = 'super_admin'? (bypass owner filter) ✓
5. Backend filters data by owner
6. Return ONLY owner's data
```

---

## 📊 Owner Dashboard - Data Widgets

### Dashboard Layout (`/iot/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│  IoT Dashboard - PDAM JAKARTA                               │
│  Owner: PT PDAM Jakarta | Projects: 3 | Nodes: 45          │
├─────────────────────────────────────────────────────────────┤
│  KPI Cards (Owner-filtered)                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │ Total Nodes │Active Nodes │Offline Nodes│ Total Data  │ │
│  │     45      │     42      │      3      │   12.5K     │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Offline Nodes Alert Widget (Owner-filtered)               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚠️ 3 Offline Nodes | Warning: 1 | Critical: 2         ││
│  │ [View All Alerts →]                                    ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Projects Overview (Owner-filtered)                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Project: Area A   | Nodes: 15 | Active: 14            ││
│  │ Project: Area B   | Nodes: 20 | Active: 19            ││
│  │ Project: Area C   | Nodes: 10 | Active: 9             ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Recent Telemetry (Owner-filtered)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Node: ESP-001 | Flow: 150 L/min | Pressure: 2.5 bar   ││
│  │ Node: RTU-002 | Flow: 200 L/min | Pressure: 3.0 bar   ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Telemetry Charts (Owner-filtered)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Line Chart: Flow Rate Last 24h]                       ││
│  │ [Bar Chart: Pressure Distribution]                     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Data Filtering Strategy

### Frontend Filter Component
```typescript
// Dashboard Filters
dashboardFilters = {
  ownerId: null,     // Set from currentUser.idOwner
  projectId: null,   // Optional: filter by specific project
  timeRange: '24h'   // 24h, 7d, 30d, custom
};
```

### Backend Query Pattern

#### Method 1: Always Filter by Owner (Recommended)
```typescript
// Backend Service
async getNodes(ownerId: string, projectId?: string) {
  const query = this.nodeRepository
    .createQueryBuilder('node')
    .leftJoinAndSelect('node.project', 'project')
    .where('project.idOwner = :ownerId', { ownerId });
  
  if (projectId) {
    query.andWhere('node.idProject = :projectId', { projectId });
  }
  
  return query.getMany();
}
```

#### Method 2: Role-Based Filtering
```typescript
async getNodes(user: JwtPayload, projectId?: string) {
  const query = this.nodeRepository
    .createQueryBuilder('node')
    .leftJoinAndSelect('node.project', 'project');
  
  // Super admin sees all
  if (user.role !== 'super_admin') {
    query.where('project.idOwner = :ownerId', { ownerId: user.idOwner });
  }
  
  if (projectId) {
    query.andWhere('node.idProject = :projectId', { projectId });
  }
  
  return query.getMany();
}
```

---

## 🛡️ Security Best Practices

### 1. **Never Trust Frontend Filters**
```typescript
// ❌ BAD - User can manipulate ownerId in frontend
GET /api/nodes?ownerId=other-owner-uuid

// ✅ GOOD - Get ownerId from JWT token
GET /api/nodes
// Backend: filters by req.user.idOwner from JWT
```

### 2. **Use JWT Token Claims**
```typescript
// Backend Guard
@UseGuards(JwtAuthGuard, OwnerGuard)
@Get('nodes')
getNodes(@Request() req) {
  const ownerId = req.user.idOwner; // From JWT!
  return this.nodesService.getNodesByOwner(ownerId);
}
```

### 3. **Row-Level Security (Optional - PostgreSQL)**
```sql
-- Enable RLS on nodes table
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see nodes from their owner
CREATE POLICY nodes_tenant_isolation ON nodes
  USING (
    id_project IN (
      SELECT id_project FROM projects 
      WHERE id_owner = current_setting('app.current_owner_id')::uuid
    )
  );
```

---

## 📋 Implementation Checklist

### Phase 1: Backend - Owner Filtering
- [ ] Add `OwnerGuard` decorator to protect routes
- [ ] Modify all queries to filter by `ownerId`
- [ ] Update DTOs to include owner context
- [ ] Add owner validation in services
- [ ] Create owner-specific statistics endpoints

### Phase 2: Frontend - Dashboard Widgets
- [ ] Get `currentUser.idOwner` from AuthService
- [ ] Pass `ownerId` to all API calls
- [ ] Update KPI cards to show owner-specific data
- [ ] Update offline alert widget with owner filter
- [ ] Add project selector dropdown (owner's projects only)
- [ ] Update telemetry charts with owner filter

### Phase 3: Testing
- [ ] Test Super Admin can see all owners
- [ ] Test Owner A cannot see Owner B's data
- [ ] Test API calls with wrong ownerId are rejected
- [ ] Test project dropdown shows only owner's projects
- [ ] Test alerts show only owner's nodes

### Phase 4: UI/UX
- [ ] Show current owner name in header
- [ ] Add owner context indicator
- [ ] Handle "No data" gracefully
- [ ] Add loading states
- [ ] Add error handling for unauthorized access

---

## 🎨 UI Components Mapping

### Existing Components (Need Owner Filter)
```
✅ dashboard-kpi-cards          → Add [ownerId] input
✅ dashboard-offline-alert      → Already filtered (from alert-center)
✅ dashboard-telemetry-chart    → Add [ownerId] input
✅ dashboard-projects-list      → Add [ownerId] input
❌ dashboard-owner-selector     → NEW (for super admin only)
```

### New Components Needed
```
1. dashboard-owner-context      → Shows current owner info
2. dashboard-project-selector   → Dropdown for owner's projects
3. dashboard-no-data-state      → Empty state when no nodes
```

---

## 🔄 Data Flow Examples

### Example 1: Owner Admin Logs In
```
1. User "john@pdam-jakarta.com" logs in
   └─> JWT issued: { idOwner: "owner-123", role: "owner_admin" }

2. Navigates to /iot/dashboard
   └─> Angular reads JWT → currentUser.idOwner = "owner-123"

3. Dashboard loads widgets:
   GET /api/nodes/statistics?ownerId=owner-123
   GET /api/alert-events?ownerId=owner-123
   GET /api/telemetry/latest?ownerId=owner-123
   
4. Backend validates:
   - req.user.idOwner === query.ownerId? ✓
   - Filter all queries by owner-123
   
5. Dashboard shows ONLY PDAM Jakarta's data
```

### Example 2: Super Admin Logs In
```
1. User "admin@system.com" logs in
   └─> JWT issued: { idOwner: null, role: "super_admin" }

2. Navigates to /iot/dashboard-kedua (Super Admin Dashboard)
   └─> Shows owner selector dropdown

3. Admin selects "PDAM Jakarta"
   └─> dashboardFilters.ownerId = "owner-123"

4. Dashboard loads:
   GET /api/nodes/statistics?ownerId=owner-123
   
5. Backend validates:
   - req.user.role === 'super_admin'? ✓ (bypass owner check)
   - Filter by selected ownerId
   
6. Dashboard shows selected owner's data
```

### Example 3: Malicious User Attempt
```
1. User "hacker@evil.com" with ownerId = "owner-456" 
   tries to access Owner 123's data

2. Manually crafts API call:
   GET /api/nodes?ownerId=owner-123
   
3. Backend OwnerGuard checks:
   - req.user.idOwner (456) !== query.ownerId (123)? ❌
   - req.user.role !== 'super_admin'? ❌
   
4. Backend returns: 403 Forbidden
   └─> "You don't have permission to access this owner's data"
```

---

## 📊 Owner Dashboard KPIs

### Primary KPIs (Owner-Specific)
```typescript
interface OwnerDashboardKPIs {
  // Node Statistics
  totalNodes: number;           // All nodes under this owner
  activeNodes: number;          // Nodes online in last 30 min
  offlineNodes: number;         // Nodes offline > 30 min
  criticalOfflineNodes: number; // Nodes offline > 1 hour
  
  // Project Statistics
  totalProjects: number;        // Active projects
  projectsWithIssues: number;   // Projects with offline nodes
  
  // Data Statistics
  totalDataPoints24h: number;   // Telemetry records last 24h
  avgDataRate: number;          // Records per minute
  
  // Alert Statistics
  openAlerts: number;
  criticalAlerts: number;
  acknowledgedAlerts: number;
  
  // Health Score (calculated)
  systemHealthScore: number;    // 0-100 based on uptime
}
```

---

## 🚀 Next Steps

1. **Review & Approve Design** ✋ ← **KITA DI SINI**
2. Create Backend OwnerGuard
3. Update Backend Services with Owner Filtering
4. Create Owner-Specific API Endpoints
5. Update Frontend Dashboard Components
6. Add Owner Context to AuthService
7. Implement Owner Selector (Super Admin only)
8. Testing & Validation

---

## 💡 Questions to Answer Before Coding

1. **Owner Assignment:**
   - Apakah setiap user HARUS punya idOwner?
   - Atau super_admin bisa tanpa owner?

2. **Project Hierarchy:**
   - Apakah 1 project HANYA bisa belong to 1 owner?
   - Atau multi-owner per project?

3. **Data Isolation:**
   - Apakah super_admin lihat dashboard sendiri atau pilih owner dulu?
   - Apakah owner_user bisa switch project dalam dashboard?

4. **Default Filters:**
   - Apakah dashboard default load ALL owner's projects?
   - Atau pilih 1 project dulu?

5. **URL Structure:**
   - `/iot/dashboard` = Owner Dashboard (auto-filtered by JWT)
   - `/iot/dashboard-kedua` = Super Admin (with owner selector)
   - Atau butuh route baru?

---

**Status:** 🎯 **DESIGN PHASE - Waiting for Review**  
**Next Action:** Diskusi design decisions sebelum implement

Gimana bro? Ada yang mau ditambah atau diubah dari design ini? 🤔

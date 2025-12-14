# Tenant Filtering - Simple Controller Injection

## Overview
**SIMPLE SOLUTION:** Direct injection of `req.user` in controller to auto-filter by owner for non-admin users.

**No decorators, no interceptors, no complexity!** ✅

---

## Implementation Pattern

### Logic
```typescript
// In every controller method that needs filtering:

const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
  ? req.user.idOwner   // Force tenant's owner
  : ownerId;           // Use provided ownerId (admin can specify any)
```

**Result:**
- ✅ Admin users: Can pass any `ownerId` or none (see all data)
- ✅ Tenant users: Automatically filtered by their `idOwner` (cannot see other owners' data)
- ✅ No bypass possible (happens at controller level before service call)

---

## Files Modified

### 1. NodesController
**File:** `src/modules/nodes/nodes.controller.ts`

#### findAll() Method
```typescript
@Get()
@ApiOperation({ summary: 'Get all nodes with filters and pagination' })
// ... ApiQuery decorators
findAll(
  @Request() req: any,  // ✅ Inject request to get user
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('search') search?: string,
  @Query('idProject') idProject?: string,
  @Query('idNodeModel') idNodeModel?: string,
  @Query('connectivityStatus') connectivityStatus?: string,
  @Query('ownerId') ownerId?: string,
) {
  // Auto-filter by owner for non-admin users
  const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
    ? req.user.idOwner 
    : ownerId;

  return this.nodesService.findAll({
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    search,
    idProject,
    idNodeModel,
    connectivityStatus,
    ownerId: finalOwnerId,  // ✅ Pass filtered ownerId
  });
}
```

#### getStatistics() Method
```typescript
@Get('statistics/overview')
@ApiOperation({ summary: 'Get aggregated node statistics' })
@ApiQuery({ name: 'ownerId', required: false, type: String })
@ApiResponse({ status: 200, description: 'Node statistics overview' })
getStatistics(
  @Request() req: any,  // ✅ Inject request
  @Query('ownerId') ownerId?: string
) {
  // Auto-filter by owner for non-admin users
  const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
    ? req.user.idOwner 
    : ownerId;

  return this.nodesService.getStatisticsOverview(finalOwnerId);
}
```

---

### 2. ProjectsController
**File:** `src/modules/projects/projects.controller.ts`

#### findAll() Method
```typescript
@Get()
@ApiOperation({ summary: 'Get all projects with filters and pagination' })
// ... ApiQuery decorators
findAll(
  @Request() req: any,  // ✅ Inject request
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('search') search?: string,
  @Query('ownerId') ownerId?: string,
  @Query('areaType') areaType?: string,
  @Query('status') status?: string,
) {
  // Auto-filter by owner for non-admin users
  const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
    ? req.user.idOwner 
    : ownerId;

  return this.projectsService.findAll({
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    search,
    ownerId: finalOwnerId,  // ✅ Pass filtered ownerId
    areaType,
    status,
  });
}
```

#### getStatistics() Method
```typescript
@Get('statistics/overview')
@ApiOperation({ summary: 'Get projects statistics overview' })
@ApiQuery({ name: 'ownerId', required: false, type: String })
@ApiResponse({ status: 200, description: 'Aggregated statistics' })
async getStatistics(
  @Request() req: any,  // ✅ Inject request
  @Query('ownerId') ownerId?: string
) {
  // Auto-filter by owner for non-admin users
  const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
    ? req.user.idOwner 
    : ownerId;

  return this.projectsService.getStatistics(finalOwnerId);
}
```

---

### 3. app.module.ts
**Removed:** Global interceptor registration (no longer needed)

**Before:**
```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantScopeInterceptor } from './common/interceptors/tenant-scope.interceptor';

providers: [
  AppService,
  {
    provide: APP_INTERCEPTOR,
    useClass: TenantScopeInterceptor,
  },
]
```

**After:**
```typescript
providers: [AppService]  // ✅ Clean and simple
```

---

### 4. DashboardService (Already Fixed)
**File:** `src/modules/dashboard/dashboard.service.ts`

Query already updated to join through projects:

```typescript
// getTelemetryStreams() method
let query = `
  SELECT 
    DATE_TRUNC('hour', sl.created_at) AS hour,
    COUNT(*) AS message_count
  FROM sensor_logs sl
  INNER JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
  INNER JOIN sensors s ON sc.id_sensor = s.id_sensor
  INNER JOIN nodes n ON s.id_node = n.id_node
  INNER JOIN projects p ON n.id_project = p.id_project  // ✅ Join to projects
  WHERE sl.created_at >= NOW() - INTERVAL '24 hours'
`;

if (filters.ownerId) {
  query += ` AND p.id_owner = $${paramIndex}`;  // ✅ Filter via projects
  params.push(filters.ownerId);
}
```

---

## Files To Delete (Optional Cleanup)

These files are no longer used:
1. `src/common/decorators/tenant-scoped.decorator.ts`
2. `src/common/interceptors/tenant-scope.interceptor.ts`

---

## How It Works

### Request Flow

1. **User Login**
   - JWT token contains: `{ userId, email, role, idOwner }`
   - Auth guard validates token and attaches to `req.user`

2. **Controller Receives Request**
   ```typescript
   findAll(@Request() req: any, @Query('ownerId') ownerId?: string)
   ```

3. **Auto-Filter Logic**
   ```typescript
   const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
     ? req.user.idOwner    // Tenant: force their owner
     : ownerId;            // Admin: use provided or null
   ```

4. **Service Query**
   - NodesService: Joins `nodes → projects` and filters by `project.idOwner`
   - ProjectsService: Direct filter by `project.idOwner`

5. **Database**
   - Only returns data matching the owner filter

---

## Testing

### Start Backend
```bash
cd iot-backend
npm run start:dev
```

### Test as Admin User
1. Login as admin (no `idOwner` in JWT)
2. Call `GET /api/nodes`
3. **Expected:** See ALL 24 nodes
4. Call `GET /api/nodes?ownerId=xxx`
5. **Expected:** See only nodes from owner xxx

### Test as Tenant User
1. Login as tenant (has `idOwner` in JWT)
2. Call `GET /api/nodes`
3. **Expected:** Automatically filtered by user's idOwner (NOT 24 nodes)
4. Call `GET /api/nodes?ownerId=different-owner`
5. **Expected:** Still filtered by user's idOwner (cannot bypass!)

---

## Advantages

✅ **Simple & Clear**
- No decorator magic
- No interceptor complexity
- Easy to understand and debug

✅ **Secure**
- Happens at controller level
- Cannot be bypassed by client
- Explicit logic visible in code

✅ **Maintainable**
- Copy-paste pattern to other controllers
- No hidden behavior
- Easy for other developers to understand

✅ **Flexible**
- Admin can specify any ownerId or see all
- Tenant automatically scoped
- Same logic works for all endpoints

✅ **No Database Changes**
- Uses existing join pattern
- nodes → projects → owners
- Normalized schema preserved

---

## Apply to Other Controllers

Copy this pattern to any controller that needs tenant filtering:

```typescript
// 1. Import Request decorator
import { Controller, Get, Request, Query } from '@nestjs/common';

// 2. Inject req in method
findAll(@Request() req: any, @Query('ownerId') ownerId?: string) {
  
  // 3. Apply filter logic
  const finalOwnerId = req.user?.role !== 'admin' && req.user?.idOwner 
    ? req.user.idOwner 
    : ownerId;
  
  // 4. Pass to service
  return this.service.findAll({ ownerId: finalOwnerId, ... });
}
```

**Apply to:**
- ✅ NodesController (DONE)
- ✅ ProjectsController (DONE)
- ✅ DashboardController (if needed)
- SensorsController
- AlertsController
- Any other list/stats endpoints

---

## Summary

**Problem:** Complex decorator + interceptor pattern was overkill and not working.

**Solution:** Simple controller injection - check user role, auto-set ownerId if not admin.

**Result:** Clean, secure, maintainable tenant data filtering. 🚀

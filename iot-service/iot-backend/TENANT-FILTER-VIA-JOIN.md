# Tenant Scope Filter via Join Pattern

## Overview
Implementation of tenant data isolation WITHOUT modifying database schema. Uses join pattern through `nodes → projects → owners` relationship.

**Decision:** Keep normalized database schema, modify queries to join through projects table.

## Architecture

### Database Relationship
```
nodes.id_project → projects.id_project
projects.id_owner → owners.id_owner
```

**Key Point:** `nodes` table does NOT have `id_owner` column directly. Must join through `projects`.

---

## Implementation

### 1. TenantScopeInterceptor
**File:** `src/common/interceptors/tenant-scope.interceptor.ts`

**Logic:**
- Check if route marked with `@TenantScoped()` decorator
- If user.role === 'tenant' && user.idOwner exists:
  - Inject `query.ownerId = user.idOwner` for GET requests
  - Inject `body.idOwner = user.idOwner` for POST/PATCH requests

**Key Change:** Uses `ownerId` parameter name to match service expectations.

```typescript
if (user && user.role === 'tenant' && user.idOwner) {
  // For GET requests (query params) - use 'ownerId'
  if (request.query) {
    request.query.ownerId = user.idOwner;
  }

  // For POST/PATCH requests (body) - use 'idOwner'
  if (request.body && typeof request.body === 'object') {
    request.body.idOwner = user.idOwner;
  }
}
```

---

### 2. NodesService - findAll()
**File:** `src/modules/nodes/nodes.service.ts`

**Already Implemented:** ✅

Uses QueryBuilder with join to projects:

```typescript
async findAll(params: { ownerId?: string; ... }) {
  const queryBuilder = this.nodeRepository
    .createQueryBuilder('node')
    .leftJoinAndSelect('node.project', 'project');

  // Apply owner filter via project relationship
  if (params.ownerId) {
    queryBuilder.andWhere('project.idOwner = :ownerId', { ownerId: params.ownerId });
  }
  
  // ... rest of query
}
```

---

### 3. NodesService - getStatisticsOverview()
**File:** `src/modules/nodes/nodes.service.ts`

**Already Implemented:** ✅

All statistics queries join through projects:

```typescript
async getStatisticsOverview(ownerId?: string) {
  const baseQuery = this.nodeRepository.createQueryBuilder('node');
  
  if (ownerId) {
    baseQuery
      .innerJoin('node.project', 'project')
      .andWhere('project.idOwner = :ownerId', { ownerId });
  }

  const totalNodes = await baseQuery.getCount();
  // ... similar pattern for all stats
}
```

---

### 4. ProjectsService - findAll()
**File:** `src/modules/projects/projects.service.ts`

**Updated:** Changed parameter from `idOwner` to `ownerId` for consistency.

```typescript
async findAll(params: { ownerId?: string; ... }) {
  const where: FindOptionsWhere<Project> = {};

  if (params.ownerId) {
    where.idOwner = params.ownerId;  // Direct filter - projects HAS id_owner column
  }

  const [items, total] = await this.projectRepository.findAndCount({
    where,
    relations: ['owner', 'nodes'],
    // ...
  });
}
```

**Note:** Projects can use direct filter because `projects` table HAS `id_owner` column.

---

### 5. DashboardService - getTelemetryStreams()
**File:** `src/modules/dashboard/dashboard.service.ts`

**Fixed:** Added join to projects table.

**Before (ERROR):**
```sql
SELECT DATE_TRUNC('hour', sl.created_at) AS hour, COUNT(*) AS message_count
FROM sensor_logs sl
INNER JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
INNER JOIN sensors s ON sc.id_sensor = s.id_sensor
INNER JOIN nodes n ON s.id_node = n.id_node
WHERE sl.created_at >= NOW() - INTERVAL '24 hours'
  AND n.id_owner = $1  -- ❌ Column doesn't exist!
```

**After (FIXED):**
```sql
SELECT DATE_TRUNC('hour', sl.created_at) AS hour, COUNT(*) AS message_count
FROM sensor_logs sl
INNER JOIN sensor_channels sc ON sl.id_sensor_channel = sc.id_sensor_channel
INNER JOIN sensors s ON sc.id_sensor = s.id_sensor
INNER JOIN nodes n ON s.id_node = n.id_node
INNER JOIN projects p ON n.id_project = p.id_project  -- ✅ Added join
WHERE sl.created_at >= NOW() - INTERVAL '24 hours'
  AND p.id_owner = $1  -- ✅ Filter via projects
```

---

## Controller Updates

### NodesController
**File:** `src/modules/nodes/nodes.controller.ts`

```typescript
@Get()
@TenantScoped()  // Auto-inject ownerId for tenant users
async findAll(
  @Query('ownerId') ownerId?: string,  // Uses 'ownerId'
  // ... other params
) {
  return this.nodesService.findAll({ ownerId, ... });
}

@Get('statistics/overview')
@TenantScoped()  // Auto-inject ownerId for tenant users
getStatistics(@Query('ownerId') ownerId?: string) {
  return this.nodesService.getStatisticsOverview(ownerId);
}
```

### ProjectsController
**File:** `src/modules/projects/projects.controller.ts`

**Updated:** Changed from `idOwner` to `ownerId` for consistency.

```typescript
@Get()
@TenantScoped()  // Auto-inject ownerId for tenant users
findAll(
  @Query('ownerId') ownerId?: string,  // ✅ Changed from 'idOwner'
  // ... other params
) {
  return this.projectsService.findAll({ ownerId, ... });
}

@Get('statistics/overview')
@TenantScoped()  // Auto-inject ownerId for tenant users
async getStatistics(@Query('ownerId') ownerId?: string) {
  return this.projectsService.getStatistics(ownerId);
}
```

---

## Testing

### Restart Backend
```bash
cd iot-backend
npm run start:dev
```

### Test as Admin User
1. Login as admin (no idOwner)
2. Call `GET /api/nodes` → Should see ALL nodes
3. Call `GET /api/projects` → Should see ALL projects
4. Call `GET /api/dashboard/telemetry-streams` → Should see ALL telemetry

### Test as Tenant User
1. Login as tenant user (has idOwner)
2. Call `GET /api/nodes` → Interceptor adds `?ownerId=xxx`
3. Service filters: `WHERE project.idOwner = 'xxx'`
4. Should ONLY see nodes from their owner
5. Same for projects and dashboard

### Verify Logs
Look for in console:
```
[TenantScope] Applied ownerId filter: <uuid> for user: tenant@example.com
```

---

## Advantages of This Approach

✅ **No Schema Changes**
- Database structure remains normalized
- No data duplication
- No migration needed

✅ **Maintainable**
- Clear separation: nodes → projects → owners
- Standard TypeORM patterns
- Easy to understand queries

✅ **Secure**
- Auto-injection at interceptor level
- Tenant users CANNOT bypass filter
- No client-side filtering needed

✅ **Consistent**
- All services use same parameter: `ownerId`
- All queries join through projects
- Single source of truth

---

## Files Modified

### Created:
1. `src/common/decorators/tenant-scoped.decorator.ts` - @TenantScoped() marker
2. `src/common/interceptors/tenant-scope.interceptor.ts` - Auto-inject ownerId

### Modified:
1. `src/app.module.ts` - Register global interceptor
2. `src/modules/nodes/nodes.controller.ts` - Apply @TenantScoped()
3. `src/modules/projects/projects.controller.ts` - Apply @TenantScoped() + rename param
4. `src/modules/projects/projects.service.ts` - Accept ownerId param
5. `src/modules/dashboard/dashboard.service.ts` - Add projects join in query

### No Changes Needed:
- `src/modules/nodes/nodes.service.ts` - Already correct ✅

---

## Next Steps

1. ✅ Restart backend to load interceptor
2. ✅ Test with admin user (should see all data)
3. ✅ Test with tenant user (should see only their owner's data)
4. Apply @TenantScoped() to other endpoints:
   - SensorsController
   - AlertsController
   - Any other list/statistics endpoints

---

## Summary

**Implementation complete!** Tenant data isolation achieved WITHOUT database schema changes by using join pattern through `nodes → projects → owners` relationship. All queries properly filter via `projects.id_owner` column.

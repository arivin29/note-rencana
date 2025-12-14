# Unpaired Devices - Owner Code Prefix Filtering

## Overview
Implemented tenant filtering for unpaired devices based on **owner code prefix** in hardware ID.

**Example:**
- Owner code: `DEMO1`
- Hardware ID format: `DEMO1-80F3DA6BE608`
- Tenant user with `DEMO1` owner → Only sees devices starting with `DEMO1-`

---

## Implementation

### Hardware ID Format
```
{OWNER_CODE}-{DEVICE_IDENTIFIER}

Examples:
DEMO1-80F3DA6BE608
DEMO1-00D3A6BE809
ACME-12345678ABCD
TEST-AABBCCDD1122
```

---

### 1. Controller - findAll()
**File:** `src/modules/unpaired-devices/unpaired-devices.controller.ts`

**Logic:**
```typescript
async findAll(
  @Request() req: any,
  @Query('status') status?: 'pending' | 'paired' | 'ignored',
  // ... other params
): Promise<UnpairedDeviceResponseDto[]> {
  // For non-admin users, get owner code and filter by hardware_id prefix
  let ownerCodePrefix: string | undefined;
  
  if (req.user?.role !== 'admin' && req.user?.idOwner) {
    // Get owner code from database
    const owner = await this.ownerRepository.findOne({
      where: { idOwner: req.user.idOwner },
      select: ['ownerCode'],
    });
    
    if (owner) {
      ownerCodePrefix = owner.ownerCode;
      console.log('Filtering unpaired devices for tenant user:', req.user.email, 'ownerCode:', ownerCodePrefix);
    }
  }
  
  return this.unpairedDevicesService.findAll({
    status,
    nodeModelId,
    projectId,
    ownerId,
    ownerCodePrefix, // ← Pass owner code prefix
    seenAfter,
    seenBefore,
    limit,
    offset,
  });
}
```

**Steps:**
1. Check if user is NOT admin and has `idOwner`
2. Query `owners` table to get `ownerCode` (e.g., 'DEMO1')
3. Pass `ownerCodePrefix` to service
4. Service filters by `hardware_id LIKE 'DEMO1-%'`

---

### 2. Controller - getStats()
**Logic:**
```typescript
async getStats(@Request() req: any): Promise<UnpairedDeviceStatsDto> {
  // For non-admin users, get owner code and filter stats
  let ownerCodePrefix: string | undefined;
  
  if (req.user?.role !== 'admin' && req.user?.idOwner) {
    const owner = await this.ownerRepository.findOne({
      where: { idOwner: req.user.idOwner },
      select: ['ownerCode'],
    });
    
    if (owner) {
      ownerCodePrefix = owner.ownerCode;
    }
  }
  
  return this.unpairedDevicesService.getStats(ownerCodePrefix);
}
```

**Result:**
- Admin: Stats for ALL unpaired devices
- Tenant: Stats for only devices with their owner code prefix

---

### 3. Service - findAll()
**File:** `src/modules/unpaired-devices/unpaired-devices.service.ts`

**Updated signature:**
```typescript
async findAll(filters?: {
  status?: 'pending' | 'paired' | 'ignored';
  nodeModelId?: string;
  projectId?: string;
  ownerId?: string;
  ownerCodePrefix?: string;  // ← NEW parameter
  seenAfter?: Date;
  seenBefore?: Date;
  limit?: number;
  offset?: number;
}): Promise<UnpairedDeviceResponseDto[]>
```

**Filter implementation:**
```typescript
// Filter by owner code prefix (e.g., 'DEMO1-')
if (filters?.ownerCodePrefix) {
  query.andWhere('device.hardwareId LIKE :prefix', { 
    prefix: `${filters.ownerCodePrefix}-%` 
  });
}
```

**SQL Generated:**
```sql
SELECT * FROM node_unpaired_devices device
WHERE device.hardwareId LIKE 'DEMO1-%'
-- Other filters...
ORDER BY device.lastSeenAt DESC
```

---

### 4. Service - getStats()
**Updated signature:**
```typescript
async getStats(ownerCodePrefix?: string): Promise<UnpairedDeviceStatsDto>
```

**Implementation:**
```typescript
// Build base query for filtering
const buildQuery = () => {
  const query = this.unpairedDeviceRepository.createQueryBuilder('device');
  if (ownerCodePrefix) {
    query.where('device.hardwareId LIKE :prefix', { 
      prefix: `${ownerCodePrefix}-%` 
    });
  }
  return query;
};

const [total, pending, paired, ignored] = await Promise.all([
  buildQuery().getCount(),
  buildQuery().andWhere('device.status = :status', { status: 'pending' }).getCount(),
  buildQuery().andWhere('device.status = :status', { status: 'paired' }).getCount(),
  buildQuery().andWhere('device.status = :status', { status: 'ignored' }).getCount(),
]);
```

**Benefit:**
- Each count query automatically includes owner filter
- No duplicate code
- Consistent filtering across all stats

---

### 5. Module Update
**File:** `src/modules/unpaired-devices/unpaired-devices.module.ts`

**Added Owner entity:**
```typescript
import { Owner } from '../../entities/owner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NodeUnpairedDevice, 
      Node, 
      Owner  // ← Added for repository injection
    ]),
  ],
  // ...
})
```

---

## Access Control Summary

| User Role | Behavior |
|-----------|----------|
| **Admin** | See ALL unpaired devices (no filter) |
| **Tenant** | Only devices with `{ownerCode}-*` hardware ID |

---

## Testing

### Test Data
```sql
-- Owner table
INSERT INTO owners (id_owner, owner_code, name) VALUES
  ('owner-1', 'DEMO1', 'Demo Company 1'),
  ('owner-2', 'ACME', 'Acme Corp');

-- Unpaired devices
INSERT INTO node_unpaired_devices (hardware_id) VALUES
  ('DEMO1-80F3DA6BE608'),  -- Belongs to DEMO1
  ('DEMO1-00D3A6BE809'),   -- Belongs to DEMO1
  ('ACME-12345678ABCD'),   -- Belongs to ACME
  ('TEST-AABBCCDD1122');   -- Belongs to TEST
```

---

### Test as Admin
```bash
# Login as admin
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}

# Get all unpaired devices
GET /api/unpaired-devices
# Expected: All 4 devices returned

# Get stats
GET /api/unpaired-devices/stats
# Expected: total = 4
```

---

### Test as Tenant (DEMO1)
```bash
# Login as tenant
POST /api/auth/login
{
  "email": "diki@iot.local",
  "password": "password123"
}
# User has: idOwner = 'owner-1' (DEMO1)

# Get unpaired devices
GET /api/unpaired-devices
# Expected: Only 2 devices:
# - DEMO1-80F3DA6BE608
# - DEMO1-00D3A6BE809

# Console log:
# "Filtering unpaired devices for tenant user: diki@iot.local ownerCode: DEMO1"

# Get stats
GET /api/unpaired-devices/stats
# Expected: total = 2 (only DEMO1 devices)
```

---

### Test as Tenant (ACME)
```bash
# Login as tenant from ACME company
POST /api/auth/login
{
  "email": "user@acme.com",
  "password": "password123"
}
# User has: idOwner = 'owner-2' (ACME)

# Get unpaired devices
GET /api/unpaired-devices
# Expected: Only 1 device:
# - ACME-12345678ABCD

# Get stats
GET /api/unpaired-devices/stats
# Expected: total = 1
```

---

## Frontend Impact

### Unpaired Devices Page
**Before (No Filter):**
```
Total devices: 100+
All companies' devices shown
```

**After (Tenant User - DEMO1):**
```
Total devices: 15
Only DEMO1-* devices shown
```

### Widget/Stats Cards
Stats automatically filtered:
- Total Devices: 15 (not 100+)
- Pending: 10
- Paired: 3
- Ignored: 2

---

## Console Logs

When tenant user calls `/api/unpaired-devices`:
```
Filtering unpaired devices for tenant user: diki@iot.local ownerCode: DEMO1
```

Helps with:
- Debugging
- Audit trail
- Verification of filtering

---

## Hardware ID Naming Convention

**Important:** Unpaired devices MUST follow naming convention:
```
{OWNER_CODE}-{UNIQUE_IDENTIFIER}
```

**Examples:**
- ✅ `DEMO1-80F3DA6BE608`
- ✅ `ACME-12345678ABCD`
- ✅ `TEST-AABBCCDD1122`
- ❌ `80F3DA6BE608` (no prefix - won't be filtered)
- ❌ `DEMO180F3DA6BE608` (no separator - won't match)

**Recommendation:**
Configure MQTT listener or device registration service to automatically prepend owner code when creating unpaired device records.

---

## SQL Queries Generated

### FindAll (Tenant with DEMO1)
```sql
SELECT device.*, nodeModel.*, project.*, owner.*
FROM node_unpaired_devices device
LEFT JOIN node_models nodeModel ON device.id_node_model = nodeModel.id_node_model
LEFT JOIN projects project ON device.suggested_project = project.id_project
LEFT JOIN owners owner ON device.suggested_owner = owner.id_owner
WHERE device.hardwareId LIKE 'DEMO1-%'
  AND device.status = 'pending'
ORDER BY device.lastSeenAt DESC
LIMIT 100;
```

### GetStats (Tenant with DEMO1)
```sql
-- Total count
SELECT COUNT(*) FROM node_unpaired_devices
WHERE hardwareId LIKE 'DEMO1-%';

-- Pending count
SELECT COUNT(*) FROM node_unpaired_devices
WHERE hardwareId LIKE 'DEMO1-%'
  AND status = 'pending';

-- Similar for paired, ignored, etc.
```

---

## Security Notes

1. **Owner Code Query**: Fetches only `ownerCode` field (not entire owner record)
2. **Prefix Pattern**: Uses `LIKE 'CODE-%'` with hyphen to avoid partial matches
3. **No Bypass**: Tenant users cannot override filter via query params
4. **Consistent**: Same filter applied to both list and stats

---

## Files Modified

1. `src/modules/unpaired-devices/unpaired-devices.controller.ts`
   - Added `@Request() req` parameter
   - Added owner code lookup logic
   - Updated findAll() and getStats()

2. `src/modules/unpaired-devices/unpaired-devices.service.ts`
   - Added `ownerCodePrefix` parameter to findAll()
   - Added `ownerCodePrefix` parameter to getStats()
   - Implemented `LIKE` filter on hardware_id

3. `src/modules/unpaired-devices/unpaired-devices.module.ts`
   - Added `Owner` entity to TypeOrmModule imports

---

## Summary

✅ **Unpaired devices filtered by owner code prefix!**
- Tenant users see only devices starting with their owner code
- Statistics automatically filtered
- Hardware ID format: `{OWNER_CODE}-{IDENTIFIER}`
- Secure and consistent filtering

**Result:** Tenant users at `/iot/unpaired-devices` will only see devices with their company's code prefix (e.g., DEMO1-*).

# Unpaired Devices Module - Test Report

## Pre-Testing Checklist

### ✅ Files Created & Issues Fixed

#### 1. Entity Export Fixed
- **Issue**: `NodeUnpairedDevice` was not exported in `entities/index.ts`
- **Fix**: Added export to [entities/index.ts:20](./src/entities/index.ts#L20)
- **Status**: ✅ Fixed

#### 2. Node Entity Field Mismatch Fixed
- **Issue**: Service tried to create Node with fields (`name`, `description`, `hardwareId`, `status`, `isOnline`) that don't exist in Node entity
- **Actual Fields**: `code`, `serialNumber`, `devEui`, `connectivityStatus`
- **Fix**: Updated `pairDevice()` method in service to use correct fields
- **Status**: ✅ Fixed

#### 3. Response DTO Mapping Fixed
- **Issue**: Tried to access `device.pairedNode?.name` but Node entity uses `code`
- **Fix**: Changed to `device.pairedNode?.code`
- **Status**: ✅ Fixed

---

## Testing Steps

### Step 1: Check Database Table
```bash
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-backend
node check-table.js
```

**Expected Output**:
- If table exists: ✅ Shows table structure and record count
- If table doesn't exist: ❌ Shows message to run migration

### Step 2: Run Migration (if needed)
```bash
npm run typeorm migration:run
```

**Expected Output**:
```
Migration CreateNodeUnpairedDevicesTable1700200000001 has been executed successfully
```

### Step 3: Build Backend
```bash
npm run build
```

**Expected Output**:
- No TypeScript errors
- Build completes successfully

**Common Errors to Watch For**:
- ❌ Entity not found errors → Check `entities/index.ts`
- ❌ Property does not exist on type → Check entity field names
- ❌ Cannot find module → Check imports

### Step 4: Start Development Server
```bash
npm run start:dev
```

**Expected Output**:
```
[Nest] [Application] Nest application successfully started
[Nest] [RoutesResolver] UnpairedDevicesController {/api/unpaired-devices}:
  - POST /api/unpaired-devices
  - GET /api/unpaired-devices
  - GET /api/unpaired-devices/stats
  - GET /api/unpaired-devices/by-hardware-id/:hardwareId
  - GET /api/unpaired-devices/:id
  - PUT /api/unpaired-devices/:id
  - DELETE /api/unpaired-devices/:id
  - POST /api/unpaired-devices/register-activity
  - POST /api/unpaired-devices/:id/pair
  - POST /api/unpaired-devices/:id/ignore
```

### Step 5: Access Swagger Documentation
```
http://localhost:3000/api
```

**Expected**:
- ✅ New section: "Unpaired Devices"
- ✅ Shows 10 endpoints with full documentation
- ✅ All DTOs visible with example values

---

## Manual API Testing

### Test 1: Create Unpaired Device
```bash
curl -X POST http://localhost:3000/api/unpaired-devices \
  -H "Content-Type: application/json" \
  -d '{
    "hardwareId": "TEST-DEVICE-001",
    "lastPayload": {"test": true},
    "lastTopic": "test/devices/001"
  }'
```

**Expected**: 201 Created with device details

### Test 2: Register Activity (Upsert)
```bash
curl -X POST http://localhost:3000/api/unpaired-devices/register-activity \
  -H "Content-Type: application/json" \
  -d '{
    "hardwareId": "TEST-DEVICE-001",
    "payload": {"temperature": 25.5, "battery": 85},
    "topic": "devices/test/001/up"
  }'
```

**Expected**: 200 OK, `seenCount` incremented, `lastSeenAt` updated

### Test 3: List All Devices
```bash
curl http://localhost:3000/api/unpaired-devices
```

**Expected**: Array of devices, sorted by `lastSeenAt` DESC

### Test 4: Get Statistics
```bash
curl http://localhost:3000/api/unpaired-devices/stats
```

**Expected**:
```json
{
  "total": 1,
  "pending": 1,
  "paired": 0,
  "ignored": 0,
  "seenLast24h": 1,
  "seenLast7d": 1,
  "withSuggestions": 0
}
```

### Test 5: Filter by Status
```bash
curl "http://localhost:3000/api/unpaired-devices?status=pending"
```

**Expected**: Only devices with status='pending'

### Test 6: Find by Hardware ID
```bash
curl http://localhost:3000/api/unpaired-devices/by-hardware-id/TEST-DEVICE-001
```

**Expected**: Device details for TEST-DEVICE-001

### Test 7: Update Device (Add Suggestions)
```bash
# First, get a valid project ID from your database
# Then update the device

curl -X PUT http://localhost:3000/api/unpaired-devices/{device-id} \
  -H "Content-Type: application/json" \
  -d '{
    "suggestedProject": "{valid-project-uuid}"
  }'
```

**Expected**: 200 OK with updated device

### Test 8: Pair Device (Main Feature)
```bash
# Get device ID and valid project ID first
curl -X POST http://localhost:3000/api/unpaired-devices/{device-id}/pair \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "{valid-project-uuid}",
    "nodeName": "Test-Node-001"
  }'
```

**Expected**:
- 200 OK
- Device status changed to 'paired'
- `pairedNodeId` is set
- New Node created in `nodes` table

**Verify**:
```bash
# Check nodes table
curl http://localhost:3000/api/nodes/{paired-node-id}
```

### Test 9: Mark as Ignored
```bash
curl -X POST http://localhost:3000/api/unpaired-devices/{device-id}/ignore
```

**Expected**: Status changed to 'ignored'

### Test 10: Delete Device
```bash
curl -X DELETE http://localhost:3000/api/unpaired-devices/{device-id}
```

**Expected**: 204 No Content, device deleted

---

## Error Testing

### Test Error 1: Duplicate Hardware ID
```bash
# Try to create device with same hardware_id twice
curl -X POST http://localhost:3000/api/unpaired-devices \
  -H "Content-Type: application/json" \
  -d '{"hardwareId": "TEST-DEVICE-001"}'
```

**Expected**: 409 Conflict error

### Test Error 2: Pair Device Without Node Model
```bash
# Create device without node model, then try to pair
curl -X POST http://localhost:3000/api/unpaired-devices/{device-id}/pair \
  -H "Content-Type: application/json" \
  -d '{"projectId": "{project-id}"}'
```

**Expected**: 400 Bad Request - "Cannot pair device without node model"

### Test Error 3: Pair Already Paired Device
```bash
# Try to pair a device that's already paired
curl -X POST http://localhost:3000/api/unpaired-devices/{paired-device-id}/pair \
  -H "Content-Type: application/json" \
  -d '{"projectId": "{project-id}"}'
```

**Expected**: 400 Bad Request - "Device is already paired"

### Test Error 4: Invalid UUID
```bash
curl http://localhost:3000/api/unpaired-devices/invalid-uuid
```

**Expected**: 400 Bad Request - Validation error

---

## Integration Testing

### Scenario: MQTT Device Discovery Flow

1. **Unknown device sends data**
   ```bash
   POST /api/unpaired-devices/register-activity
   {
     "hardwareId": "867584050123456",
     "payload": {"temp": 25.5},
     "topic": "devices/lora/867584050123456/up"
   }
   ```
   → Device created with status='pending'

2. **Admin reviews pending devices**
   ```bash
   GET /api/unpaired-devices?status=pending
   ```
   → Shows new device

3. **Admin assigns node model**
   ```bash
   PUT /api/unpaired-devices/{id}
   {
     "idNodeModel": "{node-model-uuid}"
   }
   ```

4. **Admin pairs device to project**
   ```bash
   POST /api/unpaired-devices/{id}/pair
   {
     "projectId": "{project-uuid}",
     "nodeName": "Field-Sensor-A1"
   }
   ```
   → Node created, device status='paired'

5. **Device continues sending data**
   - Now data goes to sensor_logs for the paired node
   - Device no longer appears in pending list

---

## Verification Checklist

After running all tests:

- [ ] All 10 endpoints respond correctly
- [ ] Database table exists with correct schema
- [ ] Can create unpaired device
- [ ] Can register activity (upsert works)
- [ ] Can list devices with filters
- [ ] Statistics are accurate
- [ ] Can pair device (creates Node)
- [ ] Can mark device as ignored
- [ ] Can delete device
- [ ] Duplicate hardware_id rejected
- [ ] Cannot pair without node model
- [ ] Cannot pair already paired device
- [ ] Swagger docs complete and accurate
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in logs

---

## Known Issues & Fixes Applied

### Issue 1: Entity Not Exported ✅ FIXED
**Problem**: `NodeUnpairedDevice` not in `entities/index.ts`
**Solution**: Added export statement
**File**: `src/entities/index.ts:20`

### Issue 2: Node Entity Field Mismatch ✅ FIXED
**Problem**: Used wrong field names when creating Node
**Solution**: Changed to use `code`, `serialNumber`, `devEui`, `connectivityStatus`
**File**: `src/modules/unpaired-devices/unpaired-devices.service.ts:238-242`

### Issue 3: Response DTO Mapping ✅ FIXED
**Problem**: Accessed non-existent `pairedNode.name`
**Solution**: Changed to `pairedNode.code`
**File**: `src/modules/unpaired-devices/unpaired-devices.service.ts:331`

---

## Next Steps After Testing

1. **If all tests pass**: ✅ Module ready for production
2. **Generate OpenAPI spec**: `npm run generate-api` in iot-angular
3. **Create Angular components**: Unpaired devices list page
4. **Integrate with MQTT**: Hook registerActivity into MQTT listener
5. **Add to dashboard**: Show pending devices count widget

---

## Performance Considerations

- Index on `hardware_id` ensures fast lookups
- Index on `status` optimizes filtering
- Index on `last_seen_at` speeds up sorting and time-based queries
- JSONB `last_payload` allows flexible payload storage without schema changes

---

**Test Date**: November 17, 2025
**Status**: Ready for Testing
**Module Version**: 1.0.0

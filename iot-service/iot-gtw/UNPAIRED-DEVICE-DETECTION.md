# Unpaired Device Detection - Implementation

**Date:** November 23, 2025  
**Status:** ✅ Complete  
**Module:** iot-gtw

---

## 📋 Overview

Implemented automatic detection and tracking of unpaired devices in MQTT message handler. Devices that are not registered in the `nodes` table are automatically tracked in `node_unpaired_devices` with automatic owner suggestion based on device_id format.

---

## 🔍 Device ID Format

### Standard Format
```
{OWNER_CODE}-{MAC_ADDRESS}
```

### Example
```
DEMO1-00D42390A994
  ↓       ↓
Owner   MAC Address
Code
```

---

## ✅ Implementation Flow

### 1. MQTT Message Received
```
Topic: sensor/DEMO1-00D42390A994/telemetry
Payload: {device_id: "DEMO1-00D42390A994", ...}
```

### 2. Extract Device ID
```typescript
const deviceId = extractDeviceId(payload);
// Result: "DEMO1-00D42390A994"
```

### 3. Extract Owner Code
```typescript
const ownerCode = extractOwnerCode(deviceId);
// Result: "DEMO1"
```

### 4. Check Pairing Status
```typescript
const isPaired = await isDevicePaired(deviceId);
// Check in nodes table by:
// - serialNumber
// - devEui
// - code
```

### 5A. If Device is Paired
```typescript
// Save to iot_log table (normal flow)
await iotLogService.create({
  label: 'telemetry',
  topic,
  payload,
  deviceId,
  timestamp: new Date()
});
```

### 5B. If Device is Unpaired
```typescript
// 1. Lookup owner by owner_code
const owner = await ownerRepository.findOne({
  where: { ownerCode: 'DEMO1' }
});

// 2. Track in node_unpaired_devices
await trackUnpairedDevice(deviceId, topic, payload);
// Sets suggestedOwner = owner.idOwner

// 3. Do NOT save to iot_log
```

---

## 🗄️ Database Schema

### node_unpaired_devices Table
```sql
CREATE TABLE node_unpaired_devices (
  id_node_unpaired_device UUID PRIMARY KEY,
  hardware_id TEXT NOT NULL,
  id_node_model UUID,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  last_payload JSONB,
  last_topic TEXT,
  seen_count INTEGER DEFAULT 1,
  suggested_project UUID,
  suggested_owner UUID,  -- ✅ Auto-populated from owner_code
  paired_node_id UUID,
  status TEXT DEFAULT 'pending'
);
```

---

## 📝 Implementation Files

### 1. MQTT Service
**File:** `src/modules/mqtt/mqtt.service.ts`

**Methods Added:**
```typescript
// Extract owner code from device_id
private extractOwnerCode(deviceId: string): string | null

// Check if device exists in nodes table
private async isDevicePaired(deviceId: string): Promise<boolean>

// Track unpaired device with owner suggestion
private async trackUnpairedDevice(
  deviceId: string,
  topic: string,
  payload: Record<string, any>
): Promise<void>
```

**Updated Method:**
```typescript
private async handleMessage(topic: string, message: Buffer): Promise<void> {
  // 1. Parse payload
  // 2. Extract device_id
  // 3. Check if device is paired
  // 4. If unpaired → track in unpaired_devices
  // 5. If paired → save to iot_log
}
```

### 2. MQTT Module
**File:** `src/modules/mqtt/mqtt.module.ts`

**Added Imports:**
```typescript
TypeOrmModule.forFeature([
  Node,              // For pairing check
  NodeUnpairedDevice, // For unpaired tracking
  Owner              // For owner lookup
])
```

### 3. Owner Entity
**File:** `src/entities/existing/owner.entity.ts`

**Updated Fields:**
```typescript
@Column('varchar', { length: 5, unique: true, name: 'owner_code' })
ownerCode: string; // NEW: For device_id parsing

@Column('text', { nullable: true })
email: string; // NEW

@Column('text', { nullable: true })
phone: string; // NEW

@Column('text', { nullable: true })
address: string; // NEW
```

---

## 🧪 Test Scenario

### Setup: Create Owner with Code
```sql
-- Update existing owner
UPDATE owners 
SET owner_code = 'DEMO1' 
WHERE name = 'PT DEVELOPMENT';

-- Or insert new owner
INSERT INTO owners (id_owner, owner_code, name, industry)
VALUES (
  'c73a0425-34e5-4ed3-a435-eb740f915648',
  'DEMO1',
  'PT DEVELOPMENT',
  'Water Treatment'
);
```

### Test 1: Unpaired Device Publishes
**MQTT Message:**
```json
{
  "device_id": "DEMO1-00D42390A994",
  "timestamp": "2025-11-23 00:41:16",
  "sensors": [...],
  "node": {...}
}
```

**Expected Behavior:**
```
1. ✅ Extract device_id: DEMO1-00D42390A994
2. ✅ Extract owner_code: DEMO1
3. ✅ Check pairing: device NOT found in nodes
4. ✅ Lookup owner: Found "PT DEVELOPMENT"
5. ✅ Track in unpaired_devices:
   - hardware_id: DEMO1-00D42390A994
   - suggested_owner: c73a0425-34e5-4ed3-a435-eb740f915648
   - status: pending
   - seen_count: 1
6. ✅ NOT saved to iot_log
```

**Database Result:**
```sql
SELECT * FROM node_unpaired_devices 
WHERE hardware_id = 'DEMO1-00D42390A994';
```

```
hardware_id          | DEMO1-00D42390A994
suggested_owner      | c73a0425-34e5-4ed3-a435-eb740f915648
first_seen_at        | 2025-11-23 00:41:16
last_seen_at         | 2025-11-23 00:41:16
seen_count           | 1
status               | pending
last_payload         | {...full payload...}
```

### Test 2: Device Publishes Again
**Expected Behavior:**
```
1. ✅ Device still unpaired
2. ✅ Update existing record:
   - last_seen_at: updated
   - seen_count: incremented
   - last_payload: updated
```

### Test 3: Device Gets Paired
```sql
-- Admin pairs the device in backend
INSERT INTO nodes (id_node, code, serial_number, ...)
VALUES (..., 'NODE-001', 'DEMO1-00D42390A994', ...);

-- Update unpaired_devices
UPDATE node_unpaired_devices
SET status = 'paired', paired_node_id = 'node-uuid'
WHERE hardware_id = 'DEMO1-00D42390A994';
```

**Next Message:**
```
1. ✅ Check pairing: device FOUND in nodes
2. ✅ Save to iot_log (normal flow)
3. ✅ Process telemetry normally
```

---

## 📊 Log Output Examples

### Unpaired Device Detected
```
[MqttService] 🔴 Unpaired device detected: DEMO1-00D42390A994
[MqttService] ✅ Found owner for code 'DEMO1': PT DEVELOPMENT
[MqttService] 🆕 Tracked new unpaired device: DEMO1-00D42390A994
[MqttService]    → Suggested owner: DEMO1
[MqttService] 📍 Device DEMO1-00D42390A994 tracked in unpaired_devices (not saved to iot_log)
```

### Paired Device Processed
```
[MqttService] ✅ Saved [telemetry] DEMO1-00D42390A994 → 40c5af83-f1ad-4fb4-9c62-257ffecf6456
```

### Owner Not Found
```
[MqttService] 🔴 Unpaired device detected: UNKNOWN-00D42390A994
[MqttService] ⚠️  Owner code 'UNKNOWN' not found in database
[MqttService] 🆕 Tracked new unpaired device: UNKNOWN-00D42390A994
[MqttService]    → Suggested owner: (none)
```

---

## 🔄 Benefits

### 1. Automatic Owner Detection
- ✅ No manual owner selection needed
- ✅ Based on device_id prefix
- ✅ Reduces admin workload

### 2. Prevents Orphan Data
- ✅ Unpaired devices don't pollute iot_log
- ✅ All unpaired data centralized
- ✅ Easy to review and pair later

### 3. Device Visibility
- ✅ See all unpaired devices in one table
- ✅ Track how many times device tried to connect
- ✅ View last payload for debugging

### 4. Pairing Workflow
```
1. Device publishes → Tracked in unpaired_devices
2. Admin reviews unpaired devices
3. Admin sees suggested_owner (auto-populated)
4. Admin creates node and pairs device
5. Device publishes → Saved to iot_log
```

---

## 🛠️ Configuration

### Device ID Format Rules
1. **Must contain hyphen:** `{CODE}-{ID}`
2. **Owner code:** 5 characters (alphanumeric)
3. **MAC address:** Any format after hyphen

### Supported Formats
```
✅ DEMO1-00D42390A994
✅ ABC12-1234567890AB
✅ XYZ99-AABBCCDDEEFF
❌ NODASHFORMAT (no owner code extracted)
```

---

## 📈 Future Enhancements

### 1. Auto-Pairing
```typescript
// If owner found and node_model detected
if (suggestedOwner && detectedNodeModel) {
  // Auto-create node
  // Auto-pair device
  // Send notification to owner
}
```

### 2. Multi-Tenant Support
```typescript
// Enforce owner isolation
if (payload.owner_code !== expectedOwnerCode) {
  reject('Unauthorized device');
}
```

### 3. Device Whitelist
```sql
CREATE TABLE owner_device_whitelist (
  id_owner UUID,
  device_prefix TEXT,
  allowed_models UUID[]
);
```

---

## 🔗 Related Files

- `src/modules/mqtt/mqtt.service.ts` - Main implementation
- `src/modules/mqtt/mqtt.module.ts` - Module configuration
- `src/entities/existing/owner.entity.ts` - Owner entity
- `src/entities/existing/node-unpaired-device.entity.ts` - Unpaired device entity
- `src/entities/existing/node.entity.ts` - Node entity

---

## ✅ Checklist

- [x] Extract owner_code from device_id
- [x] Check device pairing status
- [x] Lookup owner by owner_code
- [x] Track unpaired devices
- [x] Set suggested_owner automatically
- [x] Prevent unpaired data in iot_log
- [x] Update Owner entity with owner_code
- [x] Add email, phone, address fields
- [x] Inject repositories in module
- [x] Add comprehensive logging

---

**Status:** ✅ Complete  
**Ready for Testing:** ✅ Yes  

Unpaired devices are now automatically detected and tracked with owner suggestions! 🎉

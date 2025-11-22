# Unpaired Device Detection - Quick Reference

## ✅ Status: **FULLY WORKING**

## 🎯 What It Does
- Detects IoT devices that are **not registered** in `nodes` table
- Routes unpaired device messages to `node_unpaired_devices` (NOT `iot_log`)
- Auto-suggests owner based on device_id prefix (e.g., `DEMO1-xxx` → owner `DEMO1`)

## 📊 Test Results
```
Device: DEMO1-00D42390A994
✅ Detected as unpaired
✅ Routed to node_unpaired_devices
✅ Owner suggested: DEMO1 → PT DEVELOPMENT
✅ Seen count: 6+ messages
✅ NOT in iot_log after 17:58:36
```

## 🔧 How It Works

### 1. Message Flow
```
MQTT Message → handleMessage()
              ↓
              extractOwnerCode("DEMO1-00D42390A994") → "DEMO1"
              ↓
              isDevicePaired() → false
              ↓
              trackUnpairedDevice() 
              ↓ Lookup owner_code = "DEMO1"
              ↓ Found: PT DEVELOPMENT
              ↓
              Save to node_unpaired_devices ✅
              (NOT saved to iot_log)
```

### 2. Key Methods in `mqtt.service.ts`

#### `extractOwnerCode(deviceId)`
```typescript
private extractOwnerCode(deviceId: string): string | null {
  const parts = deviceId.split('-');
  return parts.length >= 2 ? parts[0] : null;
}
```

#### `isDevicePaired(deviceId)`
```typescript
private async isDevicePaired(deviceId: string): Promise<boolean> {
  const node = await this.nodeRepository.findOne({
    where: [
      { serialNumber: deviceId },
      { devEui: deviceId },
      { code: deviceId },
    ],
  });
  return !!node;
}
```

#### `trackUnpairedDevice(deviceId, topic, payload, ownerCode)`
```typescript
private async trackUnpairedDevice(...): Promise<void> {
  // Find or create unpaired device entry
  // Lookup owner by ownerCode
  // Save/update with:
  //   - hardwareId
  //   - suggestedOwner (from owners table)
  //   - seenCount (increment)
  //   - lastPayload (full MQTT message)
  //   - status: 'pending'
}
```

## 📂 Files Modified

### Core Implementation
- `src/modules/mqtt/mqtt.service.ts` - Main logic
- `src/modules/mqtt/mqtt.module.ts` - Added Node, NodeUnpairedDevice, Owner entities
- `src/app.module.ts` - Registered all entities in TypeORM

### Bug Fixes
- `src/entities/existing/owner.entity.ts` - Changed `code` → `ownerCode`
- `src/modules/telemetry-processor/telemetry-processor.service.ts` - Updated query to use `ownerCode`

## 🐛 Bugs Fixed

1. **TypeORM Metadata Error**
   - Problem: "No metadata for Node was found"
   - Fix: Added all entities to `app.module.ts` entities array (was only `[IotLog]`)

2. **Field Name Mismatch**
   - Problem: Query used `{ code: ... }` but entity has `ownerCode`
   - Fix: Changed all queries to use `ownerCode`

## 🧪 Testing

### Manual Verification
```bash
# Monitor unpaired devices real-time
cd iot-gtw
./monitor-unpaired-device.sh

# Verify setup
./verify-unpaired-setup.sh
```

### SQL Queries
```sql
-- Check unpaired device
SELECT * FROM node_unpaired_devices 
WHERE hardware_id = 'DEMO1-00D42390A994';

-- Get all unpaired with owner info
SELECT 
    np.hardware_id,
    o.owner_code,
    o.name as company,
    np.seen_count,
    np.status
FROM node_unpaired_devices np
LEFT JOIN owners o ON np.suggested_owner = o.id_owner
WHERE np.status = 'pending';

-- Verify NOT in iot_log (after service restart)
SELECT MAX(created_at) FROM iot_log 
WHERE device_id = 'DEMO1-00D42390A994';
```

## 🚀 Service Management

### Start Service
```bash
cd iot-gtw
npm run start:dev
```

### Check Logs
```
[MqttService] 🔴 Unpaired device detected: DEMO1-00D42390A994
[MqttService] ✅ Found owner for code 'DEMO1': PT DEVELOPMENT
[MqttService] 🆕 Tracked new unpaired device: DEMO1-00D42390A994
[MqttService]    → Suggested owner: DEMO1
[MqttService] 📍 Device tracked in unpaired_devices (not saved to iot_log)
```

## 📊 Database Schema

### `node_unpaired_devices`
```sql
- id_node_unpaired_device (UUID, PK)
- hardware_id (VARCHAR, UNIQUE) ← Device ID
- suggested_owner (UUID, FK → owners) ← Auto-detected!
- seen_count (INTEGER) ← Increments with each message
- first_seen_at (TIMESTAMP)
- last_seen_at (TIMESTAMP)
- last_payload (JSONB) ← Full MQTT message
- last_topic (VARCHAR)
- status (VARCHAR) ← 'pending' | 'paired'
```

### `owners` (Updated)
```sql
- owner_code (VARCHAR(5), UNIQUE) ← Used for matching
- name (VARCHAR)
- email (VARCHAR)
- phone (VARCHAR)
- address (TEXT)
```

## 🎯 Next Steps

1. **Frontend UI**
   - Create "Unpaired Devices" page in Angular
   - Show list with suggested owner
   - Add "Pair Device" button

2. **Auto-Pairing API**
   - Endpoint: `POST /api/unpaired-devices/:id/pair`
   - Auto-create node with suggested_owner

3. **Notifications**
   - Alert when new unpaired device detected
   - Email to suggested owner

## ✅ Verification Checklist

- [x] Device detected as unpaired
- [x] Routed to `node_unpaired_devices`
- [x] NOT saved to `iot_log`
- [x] Owner code extracted
- [x] Owner lookup working
- [x] `suggested_owner` populated
- [x] `seen_count` incrementing
- [x] Service restart successful
- [x] Hot-reload working
- [x] No compilation errors

---

**Last Updated**: 2025-11-23 01:07:00  
**Status**: ✅ Production Ready  
**Test Device**: DEMO1-00D42390A994 (6+ messages tracked)

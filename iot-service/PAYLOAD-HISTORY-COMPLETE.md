# Payload History Feature - Complete Summary

## 🎯 Feature Overview
Implemented payload history feature that stores the last 10 payloads for each unpaired device, allowing users to select from multiple recent payloads when mapping fields to sensor channels.

## 💡 Why This Feature?
**Problem:** Devices often send telemetry data in partial chunks:
- Sometimes only node information (battery, signal)
- Sometimes only sensor data (temperature, humidity)
- Sometimes complete payload with both

**Solution:** Store last 10 payloads so users can choose the most complete one for accurate field mapping.

---

## 🔧 Technical Implementation

### 1. Database Changes
**Table:** `node_unpaired_devices`  
**Column:** `last_payload` (JSONB)

**Old Format:**
```json
{
  "node": { "battery": 85 },
  "sensors": { "temp": 25.5 }
}
```

**New Format (Array):**
```json
[
  {
    "payload": { "node": {...}, "sensors": {...} },
    "timestamp": "2025-12-14T09:28:10Z"
  },
  {
    "payload": { "node": {...} },
    "timestamp": "2025-12-14T09:27:40Z"
  }
]
```

**Migration SQL:**
```sql
UPDATE node_unpaired_devices 
SET last_payload = jsonb_build_array(
  jsonb_build_object(
    'payload', last_payload,
    'timestamp', last_seen_at
  )
)
WHERE last_payload IS NOT NULL 
  AND jsonb_typeof(last_payload) = 'object';
```

---

### 2. Gateway (GTW) Updates

**Files Modified:**
- `iot-gtw/src/modules/mqtt/mqtt.service.ts`
- `iot-gtw/src/modules/telemetry-processor/telemetry-processor.service.ts`

**Logic:**
```typescript
// Update payload history (keep last 10)
const payloadHistory = Array.isArray(existing.lastPayload) 
  ? existing.lastPayload 
  : [];

payloadHistory.unshift({
  payload,
  timestamp: new Date(),
});

// Keep only last 10 payloads (FIFO)
existing.lastPayload = payloadHistory.slice(0, 10);
```

**Features:**
- ✅ Push new payload to front of array
- ✅ Automatically limit to 10 most recent
- ✅ Backward compatible (handles old single-object format)

---

### 3. Backend API Updates

**Files Modified:**
- `iot-backend/src/modules/unpaired-devices/unpaired-devices.service.ts`
- `iot-backend/src/modules/unpaired-devices/dto/unpaired-device-response.dto.ts`

**DTO Changes:**
```typescript
export class UnpairedDeviceResponseDto {
  lastPayload: any; // Single payload (most recent, for backward compat)
  
  @ApiProperty({
    description: 'History of last 10 payloads with timestamps',
    isArray: true,
  })
  payloadHistory?: Array<{ payload: any; timestamp: Date }>;
}
```

**Service Logic:**
```typescript
private mapToResponseDto(device: NodeUnpairedDevice): UnpairedDeviceResponseDto {
  let payloadHistory: Array<{ payload: any; timestamp: Date }> = [];
  let lastPayload: any = null;

  if (device.lastPayload) {
    if (Array.isArray(device.lastPayload)) {
      // New format: extract array
      payloadHistory = device.lastPayload;
      lastPayload = device.lastPayload[0]?.payload; // Most recent
    } else {
      // Old format: wrap in array
      lastPayload = device.lastPayload;
      payloadHistory = [{
        payload: device.lastPayload,
        timestamp: device.lastSeenAt,
      }];
    }
  }

  return {
    ...otherFields,
    lastPayload,      // For backward compatibility
    payloadHistory,   // New array field
  };
}
```

---

### 4. Frontend (Angular) Updates

**Files Modified:**
- `step-payload-mapping.component.ts`
- `step-payload-mapping.component.html`

**Component Properties:**
```typescript
selectedPayloadIndex = 0; // Track selected payload
samplePayloads: SamplePayload[] = []; // All available payloads
```

**Load Payload History:**
```typescript
private loadPayloadFromDevice(): void {
  const payloadHistory = (this.unpairedDevice as any)?.payloadHistory;
  
  if (payloadHistory && Array.isArray(payloadHistory) && payloadHistory.length > 0) {
    // Map each history item to SamplePayload format
    this.samplePayloads = payloadHistory.map((item: any, index: number) => ({
      id: `payload-${index + 1}`,
      receivedAt: item.timestamp,
      topic: this.unpairedDevice?.lastTopic || 'unknown',
      rawData: item.payload
    }));
  }
}
```

**Payload Selection Handler:**
```typescript
onPayloadSelectionChange(index: number): void {
  this.selectedPayloadIndex = index;
  if (this.samplePayloads[index]) {
    this.selectPayload(this.samplePayloads[index]);
    // This triggers field extraction and re-renders drag-drop sources
  }
}
```

**UI Component:**
```html
<div *ngIf="samplePayloads.length > 1" class="mb-3">
  <label class="form-label small fw-semibold">
    <i class="fa fa-history me-1"></i>
    Select Payload
    <span class="text-muted">({{ samplePayloads.length }} available)</span>
  </label>
  
  <select class="form-select form-select-sm" 
          [(ngModel)]="selectedPayloadIndex"
          (ngModelChange)="onPayloadSelectionChange($event)">
    <option *ngFor="let payload of samplePayloads; let i = index" [value]="i">
      #{{ i + 1 }} - {{ payload.receivedAt | date:'short' }} 
      ({{ countPayloadFields(payload) }} fields)
    </option>
  </select>
  
  <div class="form-text small">
    <i class="fa fa-info-circle me-1"></i>
    Choose the most complete payload for mapping
  </div>
</div>
```

---

## 📊 API Response Example

**Endpoint:** `GET /api/unpaired-devices/by-hardware-id/DOAM9-00D42390A994`

**Response:**
```json
{
  "idNodeUnpairedDevice": "c3d9277b-c3e9-40a0-980e-7e148436e1fc",
  "hardwareId": "DOAM9-00D42390A994",
  "firstSeenAt": "2025-12-14T02:17:44.015Z",
  "lastSeenAt": "2025-12-14T02:29:01.464Z",
  
  "lastPayload": {
    "node": { "lte": {...}, "csq": 22 },
    "sensors": { "adc16_A0": {...} }
  },
  
  "payloadHistory": [
    {
      "payload": {
        "node": { "lte": {...}, "csq": 22 },
        "sensors": { "adc16_A0": {...} }
      },
      "timestamp": "2025-12-14T09:28:10Z"
    },
    {
      "payload": {
        "node": { "battery": 85, "signal": -75 }
      },
      "timestamp": "2025-12-14T09:27:40Z"
    },
    {
      "payload": {
        "sensors": { "temperature": 25.5 }
      },
      "timestamp": "2025-12-14T09:27:10Z"
    }
  ],
  
  "seenCount": 37,
  "status": "pending"
}
```

---

## ✅ Testing Checklist

### Backend Testing:
```bash
# 1. Verify database structure
SELECT hardware_id, 
       jsonb_typeof(last_payload) as payload_type,
       jsonb_array_length(last_payload) as array_length
FROM node_unpaired_devices;

# Expected: payload_type = 'array', array_length = 1-10

# 2. Test API endpoint
curl -X GET http://localhost:3000/api/unpaired-devices/by-hardware-id/DOAM9-00D42390A994 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verify response has both lastPayload and payloadHistory
```

### GTW Testing:
```bash
# 1. Publish test MQTT message
mosquitto_pub -h localhost -t "sensor/DOAM9-00D42390A994/telemetry" \
  -m '{"node":{"battery":85},"sensors":{"temp":25.5}}'

# 2. Check database after multiple publishes
SELECT last_payload FROM node_unpaired_devices 
WHERE hardware_id = 'DOAM9-00D42390A994';

# Verify array grows up to 10 items
```

### Frontend Testing:
1. Open pairing workflow for unpaired device
2. Navigate to Step 3: Payload Mapping
3. **Verify dropdown appears** if device has multiple payloads
4. **Select different payloads** from dropdown
5. **Verify field list updates** when payload changes
6. **Check field count** displayed in dropdown matches actual fields

---

## 🎨 UI/UX Features

### Dropdown Shows:
- ✅ Payload number (#1, #2, #3...)
- ✅ Timestamp (formatted as short date)
- ✅ Field count (helps identify complete payloads)
- ✅ Only visible when multiple payloads exist

### User Benefits:
- 📊 See history of recent payloads
- 🔍 Compare field counts to find complete payload
- ⏰ Know when each payload was received
- 🎯 Select best payload for accurate channel mapping

---

## 🚀 Deployment Steps

1. **Database Migration:**
   ```bash
   cd iot-backend
   # Run migration to convert existing data
   npm run migration:run
   # OR run manual SQL
   ```

2. **Deploy GTW:**
   ```bash
   cd iot-gtw
   npm run build
   pm2 restart iot-gtw
   ```

3. **Deploy Backend:**
   ```bash
   cd iot-backend
   npm run build
   pm2 restart iot-backend
   ```

4. **Deploy Frontend:**
   ```bash
   cd iot-angular
   ng build --configuration production
   # Copy dist/ to web server
   ```

---

## 📝 Benefits Summary

### For Users:
✅ Can see multiple recent payloads  
✅ Choose most complete payload for mapping  
✅ Better understanding of device behavior  
✅ Reduced mapping errors from partial data  

### For System:
✅ No breaking changes (backward compatible)  
✅ Efficient storage (max 10 payloads)  
✅ Automatic cleanup (FIFO pattern)  
✅ Works with existing unpaired device flow  

### For Debugging:
✅ Historical context for device issues  
✅ Can identify partial data patterns  
✅ Timestamp tracking for troubleshooting  
✅ Easy to verify data completeness  

---

## 🔄 Future Enhancements

**Potential improvements:**
- Add visual indicator for "most complete" payload (highest field count)
- Color code payloads by completeness
- Add "Compare payloads" view (side-by-side)
- Filter payloads by field presence
- Export payload history as JSON
- Auto-select most complete payload

---

## 📚 Related Documentation
- `PAYLOAD-HISTORY-IMPLEMENTATION.md` - Detailed technical specs
- `UNPAIRED-DEVICE-QUICK-REF.md` - Unpaired device workflow
- `PAIRING-WIZARD-SPEC.md` - Complete pairing process

---

**Status:** ✅ COMPLETE  
**Version:** 1.0  
**Date:** December 15, 2025  
**Author:** Development Team

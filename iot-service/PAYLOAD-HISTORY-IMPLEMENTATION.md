# Payload History Implementation (Array-Based Storage)

## Overview
Modified the unpaired devices system to store the last 10 payloads in an array format directly in the `last_payload` JSONB field. This allows users to select from multiple recent payloads when mapping fields to sensor channels, which is important because devices often send data in partial chunks.

## Problem Statement
- Devices send telemetry data in chunks (sometimes only node info, sometimes only sensor data)
- Users need to see multiple recent payloads to choose the most complete one for field mapping
- The drag-and-drop payload mapping UI requires access to payload history
- `iot_log` table only contains data AFTER device is paired, not before

## Solution

### 1. Updated DTO
**File:** `iot-backend/src/modules/unpaired-devices/dto/unpaired-device-response.dto.ts`

Added `payloadHistory` property to response:
```typescript
@ApiProperty({
  description: 'History of last 10 payloads with timestamps',
  example: [
    { payload: { temperature: 25.5, humidity: 60 }, timestamp: '2025-01-17T14:45:00Z' },
    { payload: { temperature: 25.3, humidity: 61 }, timestamp: '2025-01-17T14:40:00Z' },
  ],
  nullable: true,
  isArray: true,
})
payloadHistory?: Array<{ payload: any; timestamp: Date }>;
```

### 2. Updated Service
**File:** `iot-backend/src/modules/unpaired-devices/unpaired-devices.service.ts`

**Changes:**
- Injected `IotLog` repository to access payload history
- Modified `findByHardwareId()` to query last 10 payloads from `iot_log` table

```typescript
// Fetch last 10 payloads from iot_log table
const payloadHistory = await this.iotLogRepository.find({
  where: { deviceId: hardwareId },
  order: { timestamp: 'DESC' },
  take: 10,
  select: ['payload', 'timestamp'],
});

const response = this.mapToResponseDto(device);
response.payloadHistory = payloadHistory.map((log) => ({
  payload: log.payload,
  timestamp: log.timestamp,
}));
```

### 3. Updated Module
**File:** `iot-backend/src/modules/unpaired-devices/unpaired-devices.module.ts`

Added `IotLog` entity to TypeORM imports:
```typescript
TypeOrmModule.forFeature([NodeUnpairedDevice, Node, Owner, IotLog])
```

## Database Schema
Uses existing `iot_log` table:
- `device_id` (varchar): Hardware ID of the device
- `payload` (jsonb): The telemetry data
- `timestamp` (timestamp): When the data was received
- `label` (enum): Log type (telemetry, event, etc.)

## API Response Example

**Endpoint:** `GET /api/unpaired-devices/by-hardware-id/:hardwareId`

**Response:**
```json
{
  "idNodeUnpairedDevice": "uuid...",
  "hardwareId": "DEMO1-ESP32-001",
  "lastPayload": {
    "node": { "battery": 85, "signal": -75 }
  },
  "payloadHistory": [
    {
      "payload": {
        "node": { "battery": 85, "signal": -75 },
        "sensors": {
          "temperature": { "value": 25.5, "unit": "C" },
          "humidity": { "value": 60, "unit": "%" }
        }
      },
      "timestamp": "2025-01-17T14:45:00Z"
    },
    {
      "payload": {
        "node": { "battery": 86, "signal": -73 }
      },
      "timestamp": "2025-01-17T14:40:00Z"
    },
    {
      "payload": {
        "sensors": {
          "temperature": { "value": 25.3, "unit": "C" }
        }
      },
      "timestamp": "2025-01-17T14:35:00Z"
    }
  ],
  "firstSeenAt": "2025-01-15T10:00:00Z",
  "lastSeenAt": "2025-01-17T14:45:00Z",
  "seenCount": 42,
  "status": "pending"
}
```

## Frontend Integration (COMPLETED ✅)

The frontend `step-payload-mapping.component` has been updated:

### Changes Made:

1. **Added Payload Selector UI:**
   ```html
   <select class="form-select form-select-sm" 
           [(ngModel)]="selectedPayloadIndex"
           (ngModelChange)="onPayloadSelectionChange($event)">
       <option *ngFor="let payload of samplePayloads; let i = index" [value]="i">
           #{{ i + 1 }} - {{ payload.receivedAt | date:'short' }} 
           ({{ countPayloadFields(payload) }} fields)
       </option>
   </select>
   ```

2. **Updated Component Logic:**
   ```typescript
   selectedPayloadIndex = 0; // Track which payload is selected
   
   // Load payload history from device
   private loadPayloadFromDevice(): void {
     const payloadHistory = (this.unpairedDevice as any)?.payloadHistory;
     
     if (payloadHistory && Array.isArray(payloadHistory)) {
       this.samplePayloads = payloadHistory.map((item: any, index: number) => ({
         id: `payload-${index + 1}`,
         receivedAt: item.timestamp,
         topic: this.unpairedDevice?.lastTopic || 'unknown',
         rawData: item.payload
       }));
     }
   }
   
   // Handle payload selection change
   onPayloadSelectionChange(index: number): void {
     this.selectedPayloadIndex = index;
     if (this.samplePayloads[index]) {
       this.selectPayload(this.samplePayloads[index]);
     }
   }
   
   // Count fields in payload for display
   countPayloadFields(payload: SamplePayload): number {
     return this.extractFields(payload.rawData).length;
   }
   ```

3. **Features:**
   - Dropdown shows all available payloads (up to 10)
   - Each option displays: index, timestamp, and field count
   - User can select the most complete payload for mapping
   - Auto-selects first (newest) payload by default
   - Only shows dropdown if multiple payloads exist

## Testing

### Backend Test
```bash
# Test endpoint
curl -X GET http://localhost:3000/api/unpaired-devices/by-hardware-id/DEMO1-ESP32-001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verify response includes payloadHistory array with up to 10 items
# Each item should have payload and timestamp properties
```

### Manual Test Steps
1. Ensure device has sent multiple telemetry messages to populate `iot_log`
2. Call the endpoint and verify `payloadHistory` contains multiple entries
3. Check that payloads are ordered by timestamp DESC (newest first)
4. Verify tenant filtering still works (owner code prefix filter)

## Benefits
✅ Users can see multiple recent payloads
✅ Better support for devices sending partial data
✅ Easier to find complete payload for accurate channel mapping
✅ Historical context helps with debugging device behavior
✅ No breaking changes (existing `lastPayload` field retained)

## Notes
- The `lastPayload` field is still populated for backward compatibility
- If no logs exist in `iot_log` table, `payloadHistory` will be an empty array
- Maximum 10 payloads returned to limit response size
- Ordered by timestamp descending (newest first)

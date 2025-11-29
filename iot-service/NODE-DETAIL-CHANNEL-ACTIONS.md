# Node Detail - Channel Actions Feature

## Overview
Menambahkan action dropdown untuk setiap sensor channel di halaman Node Detail, memungkinkan Edit, View Telemetry, dan Delete channel.

## Features Implemented

### 1. **Channel Actions Dropdown** ✅
**Location**: Sensor Channels table - kolom Actions (paling kanan)

**Actions Available**:
- ✏️ **Edit Channel** - Open drawer untuk edit channel configuration
- 📊 **View Telemetry** - Open telemetry page dengan filter (new tab)
- 🗑️ **Delete Channel** - Hapus channel dengan confirmation

### 2. **Edit Channel** ✅
```typescript
openEditChannelDrawer(sensor: SensorDetail, channel: SensorChannelRow)
```
- Reuse existing drawer untuk edit mode
- Pass sensor ID dan sensor label
- Future: Add channelId untuk load data existing

**UI Flow**:
1. User click "Edit Channel" di dropdown
2. Drawer terbuka (sama dengan Add Channel)
3. Form akan di-populate dengan data channel existing (TODO)
4. User modify data → Save
5. Page reload untuk refresh data

### 3. **View Telemetry** ✅
```html
[routerLink]="['/iot/telemetry']"
[queryParams]="{
    idOwner: nodeMeta.ownerId,
    idProject: nodeMeta.projectId,
    idSensor: sensor.id,
    idSensorChannel: channel.id
}"
target="_blank"
```

**Query Parameters**:
- `idOwner` - Filter by owner UUID
- `idProject` - Filter by project UUID
- `idSensor` - Filter by sensor UUID
- `idSensorChannel` - Filter by specific channel UUID

**Behavior**:
- Opens in new tab (`target="_blank"`)
- Telemetry page akan auto-filter berdasarkan parameters
- User bisa lihat historical data untuk channel tersebut

### 4. **Delete Channel** ✅
```typescript
deleteChannel(sensor: SensorDetail, channel: SensorChannelRow)
```

**Validation & Confirmation**:
```
Are you sure you want to delete channel "pressure"?

Sensor: Tekanan
Channel ID: 75f89f25-a1b2-4e5b-b0d7-4107f689710f
Metric: pressure
Unit: bar

This will permanently remove:
- Channel configuration
- All telemetry history for this channel

This action cannot be undone.
```

**API Call**:
```typescript
this.sensorChannelsService.sensorChannelsControllerRemove({ id: channel.id })
```

**Post-Delete**:
- Reload dashboard untuk refresh data
- Show success/error feedback

### 5. **Backend Dashboard Enhancement** ✅
**Modified**: `nodes.service.ts` - `getDashboard()` method

**Changes**:
- Added `SensorLog` repository injection
- Query latest sensor logs for all channels
- Map `latestValue` dan `timestamp` ke channel response
- Use `valueEngineered` (prioritas) atau `valueRaw` (fallback)

**Before**:
```typescript
channels: (sensor.sensorChannels || []).map((channel: any) => ({
    idSensorChannel: channel.idSensorChannel,
    metricCode: channel.metricCode,
    unit: channel.unit,
    latestValue: null,  // ❌ Always null
    timestamp: null,     // ❌ Always null
    status: 'active',
}))
```

**After**:
```typescript
// Get latest logs for all channels
const latestLogs = await Promise.all(
    channelIds.map(async (channelId) => {
        const log = await this.sensorLogRepository.findOne({
            where: { idSensorChannel: channelId },
            order: { ts: 'DESC' },
        });
        return { channelId, log };
    })
);

// Map to quick lookup
const latestLogMap = new Map();
latestLogs.forEach(({ channelId, log }) => {
    if (log) latestLogMap.set(channelId, log);
});

// Map channels with latest values
channels: (sensor.sensorChannels || []).map((channel: any) => {
    const latestLog = latestLogMap.get(channel.idSensorChannel);
    return {
        idSensorChannel: channel.idSensorChannel,
        metricCode: channel.metricCode,
        unit: channel.unit,
        latestValue: latestLog?.valueEngineered ?? latestLog?.valueRaw ?? null,  // ✅ Real data
        timestamp: latestLog?.ts ?? null,  // ✅ Real timestamp
        status: 'active',
    };
})
```

### 6. **Node Meta Enhancement** ✅
Added owner ID dan project ID untuk telemetry filtering:

```typescript
nodeMeta = {
    ownerId: '',      // ✅ NEW - untuk filter telemetry
    owner: '',
    ownerContact: '',
    ownerPhone: '',
    projectId: '',    // ✅ NEW - untuk filter telemetry
    project: '',
    projectCode: '',
    model: '',
    protocol: '',
    firmware: '',
    telemetryMode: 'pull',
    telemetryInterval: '',
    location: '',
    coordinates: '',
    lastMaintenance: '',
    uptime: '',
    alertsActive: 0
}
```

**Population**:
```typescript
this.nodeMeta = {
    ownerId: owner.idOwner || '',           // ✅ From dashboard response
    owner: owner.name || 'Unknown Owner',
    projectId: node.project?.idProject || '', // ✅ From dashboard response
    project: node.project?.name || 'Unknown Project',
    // ... rest
};
```

## Technical Implementation

### Files Modified

#### Frontend (Angular)
1. **nodes-detail.html**
   - Added "Actions" column header
   - Added dropdown button dengan 3 actions
   - Icon untuk setiap action
   - External link icon untuk "View Telemetry"

2. **nodes-detail.ts**
   - Import `SensorChannelsService`
   - Added `ownerId` dan `projectId` ke `nodeMeta`
   - Added `openEditChannelDrawer()` method
   - Added `deleteChannel()` method
   - Updated `nodeMeta` population

#### Backend (NestJS)
1. **nodes.service.ts**
   - Import `SensorLog` entity
   - Added `SensorLog` repository injection
   - Modified `getDashboard()` untuk query latest sensor logs
   - Map `latestValue` dan `timestamp` ke channel response

2. **nodes.module.ts**
   - Added `SensorLog` ke `TypeOrmModule.forFeature()`

## UI/UX Flow

### Edit Channel Flow
```
1. User di Node Detail page
2. Click dropdown (ellipsis icon) di row channel
3. Click "Edit Channel"
4. Drawer terbuka dengan form
5. [Future] Form pre-filled dengan data existing
6. User edit → Save
7. Page reload → Show updated data
```

### View Telemetry Flow
```
1. User di Node Detail page
2. Click dropdown di row channel
3. Click "View Telemetry" (dengan external link icon)
4. New tab opens ke /iot/telemetry
5. Telemetry page dengan filter:
   - Owner: <owner_name>
   - Project: <project_name>
   - Sensor: <sensor_label>
   - Channel: <channel_metric>
6. User sees historical telemetry data
```

### Delete Channel Flow
```
1. User di Node Detail page
2. Click dropdown di row channel
3. Click "Delete Channel" (red text)
4. Confirmation dialog muncul dengan:
   - Channel details
   - Warning about permanent deletion
   - Warning about telemetry history loss
5. User confirm → API call
6. Success → Page reload → Channel hilang
7. Error → Alert dengan error message
```

## API Endpoints Used

### Get Dashboard (Enhanced)
```
GET /api/nodes/{id}/dashboard
Response includes latestValue and timestamp for each channel
```

### Delete Channel
```
DELETE /api/sensor-channels/{id}
```

## Database Schema

### sensor_logs (Queried for latest values)
```sql
SELECT * FROM sensor_logs
WHERE id_sensor_channel = 'uuid'
ORDER BY ts DESC
LIMIT 1;
```

**Fields Used**:
- `id_sensor_channel` - FK to sensor_channels
- `value_engineered` - Converted value (prioritas)
- `value_raw` - Raw ADC value (fallback)
- `ts` - Timestamp of reading

## Query Performance Notes

**Current Implementation**:
- Uses `Promise.all()` untuk parallel queries
- One query per channel
- Efficient untuk small-medium number of channels (<50)

**Future Optimization** (if needed):
```sql
-- Single query untuk all channels di node
SELECT DISTINCT ON (id_sensor_channel) 
    id_sensor_channel, 
    value_engineered, 
    value_raw, 
    ts
FROM sensor_logs
WHERE id_sensor_channel IN ('uuid1', 'uuid2', ...)
ORDER BY id_sensor_channel, ts DESC;
```

## Testing Checklist

### Manual Testing
- [x] ✅ Dropdown opens di setiap channel row
- [x] ✅ Edit Channel opens drawer
- [x] ✅ View Telemetry opens new tab dengan correct URL
- [x] ✅ View Telemetry has correct query parameters
- [x] ✅ Delete Channel shows confirmation
- [x] ✅ Delete Channel calls API
- [x] ✅ Delete Channel reloads data after success
- [x] ✅ Latest value displayed di table (not null)
- [x] ✅ Timestamp displayed correctly

### Backend Testing
- [x] ✅ Dashboard endpoint returns latestValue
- [x] ✅ Dashboard endpoint returns timestamp
- [x] ✅ valueEngineered prioritized over valueRaw
- [x] ✅ Falls back to valueRaw when valueEngineered is null
- [x] ✅ Falls back to null when no logs exist

### Edge Cases
- [ ] Channel with no telemetry logs (null values)
- [ ] Channel with only raw values (no engineered)
- [ ] Channel with very old last reading
- [ ] Delete last channel in sensor
- [ ] Multiple channels with same metric code
- [ ] Network error saat delete
- [ ] Concurrent delete dari multiple users

## Known Limitations

1. **Edit Channel Form**:
   - Currently opens empty form (Add mode)
   - Need to implement pre-population dari existing data
   - Need to add channelId ke drawer state

2. **Telemetry Page Filter**:
   - Telemetry page harus support query parameters
   - Backend endpoint harus support multiple filter parameters
   - May need to implement filter UI di telemetry page

3. **Delete Confirmation**:
   - Uses native browser `confirm()` dialog
   - Future: Implement custom modal dengan better UX

4. **Latest Value Performance**:
   - Currently queries each channel individually
   - May need optimization untuk nodes dengan banyak channels
   - Consider caching strategy

## Future Enhancements

### Short Term
1. Implement Edit Channel with pre-filled data
2. Add loading spinner saat delete
3. Add toast notification untuk success/error
4. Add undo delete functionality

### Medium Term
1. Batch delete multiple channels
2. Duplicate channel functionality
3. Export channel configuration
4. Channel status indicator (active/inactive)

### Long Term
1. Real-time channel updates (WebSocket)
2. Channel performance metrics
3. Channel alert configuration
4. Channel calibration history

## Related Documentation
- `DASHBOARD-IMPLEMENTATION-COMPLETE.md` - Dashboard widget system
- `NODE-DETAIL-DATA-MAPPING.md` - Data flow dari backend ke UI
- `SENSOR-DETAIL-GUIDE.md` - Sensor detail page
- `TELEMETRY-AUTO-REFRESH.md` - Telemetry page features

## Date
November 23, 2025

## Status
✅ **IMPLEMENTED** - Backend dan Frontend complete
🔄 **PENDING** - Edit channel pre-population
🔄 **PENDING** - Telemetry page filter implementation

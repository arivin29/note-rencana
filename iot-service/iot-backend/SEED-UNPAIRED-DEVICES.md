# Seed Script: Unpaired Devices Dummy Data

## Overview

Script untuk membuat data dummy unpaired devices untuk keperluan testing dan development.

## File Location

```
iot-backend/src/database/seeds/seed-unpaired-devices.ts
```

## Usage

### Run Seed Script

```bash
cd iot-backend
npm run seed:unpaired
```

atau dengan command lengkap:

```bash
ts-node -r tsconfig-paths/register src/database/seeds/seed-unpaired-devices.ts
```

## Data Created

Script ini akan membuat **8 unpaired devices** dengan berbagai skenario:

### 1. Active Device (< 1 hour)
- **Hardware ID**: `867584050123456`
- **Status**: pending
- **Last Seen**: 30 minutes ago
- **Seen Count**: 45 times
- **Has Node Model**: ✅
- **Has Suggestions**: ✅ (project & owner)
- **Payload**: Temperature, humidity, battery sensor

### 2. Recent Device (< 24 hours)
- **Hardware ID**: `867584050123457`
- **Status**: pending
- **Last Seen**: 2 hours ago
- **Seen Count**: 12 times
- **Has Node Model**: ✅
- **Has Suggestions**: ✅ (project only)
- **Payload**: Temperature, humidity, battery sensor

### 3. Unknown Device (No Model)
- **Hardware ID**: `867584050123458`
- **Status**: pending
- **Last Seen**: 5 minutes ago (very recent)
- **Seen Count**: 3 times
- **Has Node Model**: ❌ (needs manual assignment)
- **Has Suggestions**: ❌
- **Payload**: Unknown format with raw bytes

### 4. Stale Device (> 7 days)
- **Hardware ID**: `867584050123459`
- **Status**: pending
- **Last Seen**: 10 days ago
- **Seen Count**: 156 times
- **Has Node Model**: ✅
- **Has Suggestions**: ✅ (project & owner)
- **Payload**: Temperature, humidity, battery, signal strength

### 5. Active Device (20 min ago)
- **Hardware ID**: `867584050123460`
- **Status**: pending
- **Last Seen**: 20 minutes ago
- **Seen Count**: 8 times
- **Has Node Model**: ✅
- **Has Suggestions**: ❌
- **Payload**: Temperature, humidity, battery (100%)

### 6. Ignored Device
- **Hardware ID**: `867584050123461`
- **Status**: **ignored**
- **Last Seen**: 3 days ago
- **Seen Count**: 234 times
- **Has Node Model**: ✅
- **Has Suggestions**: ✅ (project)
- **Payload**: Temperature, humidity, battery, pressure

### 7. WiFi Device (MAC Address)
- **Hardware ID**: `00:1A:2B:3C:4D:5E`
- **Status**: pending
- **Last Seen**: 45 minutes ago
- **Seen Count**: 67 times
- **Has Node Model**: ❌
- **Has Suggestions**: ❌
- **Payload**: Voltage, current, power meter

### 8. ESP32 Development Device
- **Hardware ID**: `ESP32-DEV-001`
- **Status**: pending
- **Last Seen**: 10 minutes ago
- **Seen Count**: 1890 times (high activity)
- **Has Node Model**: ❌
- **Has Suggestions**: ❌
- **Payload**: Nested JSON with device status

## Statistics After Seeding

```
Total Devices:     8
Pending:           7
Paired:            0
Ignored:           1
Active (24h):      6
With Suggestions:  4
```

## Use Cases Covered

### 1. Filter by Status
- **All**: Shows all 8 devices
- **Active (< 1h)**: Shows devices seen in last hour (2 devices)
- **Recent (< 24h)**: Shows devices seen in last 24 hours (6 devices)
- **Stale (> 7d)**: Shows devices not seen for 7+ days (1 device)

### 2. Filter by Node Model
- Devices **with model**: 5 devices
- Devices **without model**: 3 devices (need manual assignment)

### 3. Suggestions
- Devices **with suggested project**: 4 devices
- Devices **without suggestions**: 4 devices

### 4. Search Functionality
Test search with:
- Hardware ID: `867584050123456`
- Topic: `lora`, `wifi`, `esp32`
- Partial match: `8675`, `ESP32`

### 5. Pairing Workflow
Try pairing devices with node model:
1. Select device `867584050123456`
2. Click "Pair to Project"
3. Should show suggested project pre-selected
4. Enter node name
5. Complete pairing

### 6. Ignore Workflow
Test ignoring spam devices:
1. Select device `867584050123458` (unknown format)
2. Click "Ignore"
3. Device status changes to 'ignored'

## Prerequisites

Script akan otomatis:
1. ✅ Check jika ada node_models, jika tidak ada akan create sample model
2. ✅ Get reference project dan owner jika ada (optional)
3. ✅ Handle duplicate hardware_id dengan UPDATE

## Payload Examples

### LoRa Sensor Payload
```json
{
  "temperature": 25.5,
  "humidity": 60,
  "battery": 85
}
```

### Unknown Device Payload
```json
{
  "data": "unknown_format",
  "raw": [1, 2, 3]
}
```

### ESP32 Device Payload
```json
{
  "sensors": {
    "temp": 26.4,
    "hum": 58
  },
  "device": {
    "uptime": 86400,
    "heap": 45000
  }
}
```

## Re-running Seed

Script menggunakan `ON CONFLICT (hardware_id) DO UPDATE`, jadi aman untuk dijalankan berulang kali. Data akan di-update, tidak duplicate.

## Testing Checklist

Setelah seed berhasil, test feature berikut:

- [ ] Page loads at `/iot/unpaired-devices`
- [ ] Shows 8 devices total
- [ ] Statistics widget shows correct counts
- [ ] Filter by "All" shows 8 devices
- [ ] Filter by "Active (< 1h)" shows 2 devices
- [ ] Filter by "Stale (> 7d)" shows 1 device
- [ ] Search by hardware ID works
- [ ] Click "View Payload" shows JSON
- [ ] Can open pairing dialog
- [ ] Pairing dialog pre-selects suggested project
- [ ] Can mark device as ignored
- [ ] Pagination works
- [ ] Sorting by columns works

## Clean Up Data

Untuk menghapus semua test data:

```sql
DELETE FROM node_unpaired_devices
WHERE hardware_id IN (
  '867584050123456',
  '867584050123457',
  '867584050123458',
  '867584050123459',
  '867584050123460',
  '867584050123461',
  '00:1A:2B:3C:4D:5E',
  'ESP32-DEV-001'
);
```

atau truncate semua:

```sql
TRUNCATE TABLE node_unpaired_devices RESTART IDENTITY CASCADE;
```

## Notes

- **First Seen**: Semua device di-set 30 hari yang lalu sebagai first_seen_at
- **Last Seen**: Varies untuk simulate berbagai skenario waktu
- **Suggestions**: Hanya set jika project/owner ada di database
- **Status**: Default 'pending', kecuali 1 device 'ignored'

---

**Created**: November 18, 2025
**Script**: `src/database/seeds/seed-unpaired-devices.ts`
**Command**: `npm run seed:unpaired`

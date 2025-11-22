# MQTT Logging Troubleshooting - Fix Applied ✅

## 🔥 CRITICAL FIX - Nov 22, 2025 @ 12:10 PM

### ❌ ROOT CAUSE IDENTIFIED:
**Label Detection Bug** - Data disimpan dengan `label='log'` tapi processor cari `label='telemetry'`!

#### Problem:
```typescript
// Payload structure dari ESP32:
{
  "device_id": "DEMO1-00D42390A994",
  "sensors": {...},    // ← NOT DETECTED (hanya cek "sensor" singular)
  "signal": {...},     // ← NOT DETECTED
  "system": {...}      // ← NOT DETECTED
}

// Old detectLabel() function:
if (payload.sensor !== undefined) { ... }  // ❌ Cuma cek "sensor", bukan "sensors"
```

#### Impact:
- ✅ Data masuk database
- ❌ Label = `'log'` (salah!)
- ❌ Processor cari `label='telemetry'` → tidak ketemu
- ❌ Data tidak diproses
- ❌ Tidak masuk unpaired devices

### ✅ SOLUTION APPLIED:
Updated `iot-log.service.ts` - `detectLabel()` function:
```typescript
// Check for telemetry data (sensor readings, measurements)
if (payload.sensors !== undefined ||  // ← NEW: Support plural
    payload.signal !== undefined ||   // ← NEW: Support signal data  
    payload.system !== undefined ||   // ← NEW: Support system data
    payload.sensor !== undefined ||   // ← Keep singular
    payload.temperature !== undefined ||
    payload.humidity !== undefined) {
  return LogLabel.TELEMETRY;
}
```

### 📊 Expected Result:
- ✅ Label akan jadi `'telemetry'`
- ✅ Scheduler akan proses setiap 30 detik
- ✅ Device ID akan dicek
- ✅ Masuk ke `node_unpaired_devices` jika belum paired

---

## Masalah yang Ditemukan Sebelumnya

1. **Log Level `debug` tidak terlihat**: Di `mqtt.service.ts`, message yang diterima menggunakan `logger.debug()` yang tidak muncul secara default
2. **Kurang detail logging**: Tidak ada tracking detail untuk setiap step (parse, detect label, save to DB)
3. **Tidak ada visibility**: Sulit mengetahui apakah message benar-benar diterima dan diproses

## Perubahan yang Dilakukan ✅

### 1. Enhanced Logging di `mqtt.service.ts`
- ✅ Changed `logger.debug()` → `logger.log()` agar selalu terlihat
- ✅ Added emoji indicators untuk mudah dibaca:
  - 📨 Message received
  - 📦 JSON parsed successfully  
  - 🏷️  Label detected
  - 🔌 Device ID detected/not found
  - 💾 Saving to database
  - ✅ Successfully saved
  - ❌ Error occurred
  - ⚠️  Warning/Non-JSON message

### 2. Enhanced Logging di `iot-log.service.ts`
- ✅ Added detailed logging saat create log entry
- ✅ Show label, topic, device ID, dan payload preview
- ✅ Clear success/error messages

## Tools untuk Testing

### 1. **test-mqtt-publish.js** - MQTT Publisher untuk Testing
```bash
node test-mqtt-publish.js
```
Script ini akan:
- Connect ke MQTT broker
- Publish 3 sample messages dengan format berbeda
- Show status setiap publish

### 2. **check-iot-logs.js** - Database Checker
```bash
node check-iot-logs.js
```
Script ini akan:
- Connect ke database
- Check apakah table `iot_log` exists
- Show total logs
- Show statistics by label
- Show last 5 logs dengan detail

## Cara Testing

### Step 1: Restart NestJS Service
```bash
cd /Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-gtw
npm run start:dev
```

**Expected Output:**
```
[Nest] LOG [MqttService] Connecting to MQTT broker: mqtt://109.105.194.174:8366
[Nest] LOG [MqttService] ✅ Connected to MQTT broker
[Nest] LOG [MqttService] ✅ Subscribed to MQTT topic: 'sensor'
```

### Step 2: Publish Test Message
**Option A - Manual MQTT Client (jika sudah install):**
```bash
mosquitto_pub -h 109.105.194.174 -p 8366 -t sensor -m '{"deviceId":"TEST-001","temperature":25.5,"humidity":60}'
```

**Option B - Use Test Script:**
```bash
node test-mqtt-publish.js
```

### Step 3: Monitor NestJS Logs
Anda seharusnya melihat output seperti ini:

```
[Nest] LOG [MqttService] 📨 Received MQTT message from topic 'sensor': {"deviceId":"TEST-001","temperature":25.5}
[Nest] LOG [MqttService] 📦 Parsed as JSON: {"deviceId":"TEST-001","temperature":25.5}
[Nest] LOG [MqttService] 🏷️  Detected label: TELEMETRY
[Nest] LOG [MqttService] 🔌 Detected device ID: TEST-001
[Nest] LOG [MqttService] 💾 Saving to database...
[Nest] LOG [IotLogService] 🔵 Creating IoT log entry...
[Nest] LOG [IotLogService]    Label: TELEMETRY
[Nest] LOG [IotLogService]    Topic: sensor
[Nest] LOG [IotLogService]    Device ID: TEST-001
[Nest] LOG [IotLogService]    Payload: {"deviceId":"TEST-001","temperature":25.5}
[Nest] LOG [IotLogService] 🔵 Saving to database...
[Nest] LOG [IotLogService] ✅ IoT log created successfully: abc-123-uuid [TELEMETRY]
[Nest] LOG [MqttService] ✅ Successfully saved to database with ID: abc-123-uuid [TELEMETRY] from topic 'sensor'
```

### Step 4: Verify Database
```bash
node check-iot-logs.js
```

**Expected Output:**
```
✅ Connected to database
✅ Table "iot_log" exists

📊 Total logs in database: 3

📈 Logs by label:
   TELEMETRY: 2
   LOG: 1

📋 Last 5 logs:
1. ID: abc-123-uuid
   Label: TELEMETRY
   Topic: sensor
   Device ID: TEST-001
   Payload: {"deviceId":"TEST-001","temperature":25.5}
   Created: 2025-11-20 11:59:32
```

### Step 5: Check via API
```bash
# Get all logs
curl http://localhost:4000/api/iot-logs/stats

# Get unprocessed logs
curl http://localhost:4000/api/iot-logs/unprocessed

# Get logs by label
curl http://localhost:4000/api/iot-logs/by-label/TELEMETRY
```

## Common Issues & Solutions

### ❌ "No logs in database" setelah publish message

**Possible Causes:**
1. **Database connection issue**
   ```bash
   # Check database config in .env
   cat .env | grep DB_
   
   # Test connection
   node check-iot-logs.js
   ```

2. **Table tidak ada**
   ```bash
   # Run migrations
   npm run migration:run
   ```

3. **MQTT message tidak sampai**
   ```bash
   # Test dengan mosquitto_sub (subscribe)
   mosquitto_sub -h 109.105.194.174 -p 8366 -t sensor -v
   
   # Di terminal lain, publish
   mosquitto_pub -h 109.105.194.174 -p 8366 -t sensor -m "test"
   ```

4. **Topic salah**
   ```bash
   # Check MQTT_TOPIC di .env
   echo $MQTT_TOPIC
   # atau
   cat .env | grep MQTT_TOPIC
   ```

### ❌ "Cannot connect to MQTT broker"

**Solutions:**
1. Check broker URL dan port di `.env`
2. Check network/firewall
3. Test dengan MQTT client: `mosquitto_sub -h 109.105.194.174 -p 8366 -t test`

### ❌ Error saat save ke database

**Check:**
1. Database credentials di `.env`
2. Table `iot_log` sudah dibuat (run migrations)
3. PostgreSQL service running

## Label Detection Rules

Service akan auto-detect label berdasarkan payload:

- **TELEMETRY**: Jika ada `temperature`, `humidity`, `sensor`, `value`, `reading`
- **ERROR**: Jika ada `error` atau `status: 'error'`
- **WARNING**: Jika ada `warning` atau `status: 'warning'`
- **COMMAND**: Jika ada `command`, `cmd`, `action`
- **RESPONSE**: Jika ada `response`, `reply`
- **PAIRING**: Jika ada `action: 'pair'` atau `type: 'pairing'`
- **DEBUG**: Jika ada `debug` atau `level: 'debug'`
- **INFO**: Jika ada `info` atau `level: 'info'`
- **LOG**: Default jika tidak ada yang match

## Device ID Extraction

Service akan extract device ID dari salah satu field ini (priority order):
1. `deviceId`
2. `device_id`
3. `nodeId`
4. `node_id`
5. `id`
6. `clientId`

## Next Steps

Setelah logging bekerja:

1. ✅ **Monitor real device messages** - pastikan format sesuai
2. ✅ **Implement processor** - process unprocessed logs
3. ✅ **Connect to unpaired-devices** - auto-register unknown devices
4. ✅ **Add alerting** - notify on errors
5. ✅ **Add dashboard** - visualize incoming data

---

## Summary

**What was fixed:**
- Log visibility (debug → log level)
- Added detailed step-by-step logging
- Added emoji indicators
- Created test tools

**What to do now:**
1. Restart NestJS service
2. Publish test message (node test-mqtt-publish.js)
3. Monitor NestJS logs (should see detailed processing)
4. Check database (node check-iot-logs.js)
5. If still no logs → check database connection/migrations

**Expected Behavior:**
Setiap MQTT message yang diterima akan:
1. ✅ Di-log dengan detail lengkap
2. ✅ Di-parse (JSON atau raw)
3. ✅ Detect label otomatis
4. ✅ Extract device ID (jika ada)
5. ✅ Save ke database
6. ✅ Show success message dengan ID

---

**Created:** 2025-11-20  
**Project:** iot-gtw (NestJS MQTT Consumer)
